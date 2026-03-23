#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import axios from 'axios'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { APP_MONGODB_URI, YUN_API_KEY, YUN_API_URL } from '../config.js'
import { ANSWER_GEN_PROMPT } from '../prompts/answer_gen.js'
import { markdownToPlainText, extractMarkdownImages } from '../utils/gesp/objectiveImport.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
const inputDir = resolveArg('dir', path.join(workspaceRoot, 'Downloads'))
const outDir = resolveArg('out-dir', path.join(workspaceRoot, 'Downloads', 'quiz-import'))
const model = getArg('model', 'gemini-3-flash-preview')
const appUri = getArg('app-uri', APP_MONGODB_URI)
const backendApiUrl = getArg('backend-api-url', '')
const authToken = getArg('auth-token', '')
const aiConcurrency = Math.max(parsePositiveInt(getArg('ai-concurrency', '3')) || 3, 1)
const dryRun = args.includes('--dry-run')
const exportOnly = args.includes('--export-only')
const aiFillMissing = args.includes('--ai-fill-missing')
const limitPapers = parsePositiveInt(getArg('limit-papers', ''))
const limitQuestions = parsePositiveInt(getArg('limit-questions', ''))

async function main() {
  const files = fs.readdirSync(inputDir)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const selectedFiles = limitPapers ? files.slice(0, limitPapers) : files
  console.log(`[downloads-import] matched markdown files: ${selectedFiles.length}`)

  const papers = []
  const questions = []
  const failures = []

  for (const fileName of selectedFiles) {
    try {
      const filePath = path.join(inputDir, fileName)
      const markdown = fs.readFileSync(filePath, 'utf-8')
      const parsed = parsePaperFile(fileName, markdown)
      papers.push(parsed.paper)
      questions.push(...parsed.questions)
    } catch (error) {
      failures.push({ fileName, error: error.message })
    }
  }

  const allQuestions = limitQuestions ? questions.slice(0, limitQuestions) : questions
  const directAnswerCount = allQuestions.filter((item) => item.answer).length
  const pendingQuestions = allQuestions.filter((item) => !item.answer)

  if (aiFillMissing) {
    if (!backendApiUrl && !YUN_API_KEY) {
      throw new Error('缺少 YUN_API_KEY，且未提供 backend-api-url，无法执行 AI 补全')
    }

    let completed = 0
    await runWithConcurrency(pendingQuestions, aiConcurrency, async (question) => {
      try {
        const generated = await generateAnswerAndExplanation(question, model)
        if (generated.answer) {
          question.answer = generated.answer
          question.explanation = generated.explanation
          question.explanationText = markdownToPlainText(generated.explanation)
          question.enabled = true
          question.reviewStatus = 'pending'
        }
      } catch (error) {
        failures.push({ fileName: question.sourceTitle, questionUid: question.questionUid, error: error.message })
      } finally {
        completed += 1
        console.log(`[downloads-import] AI ${completed}/${pendingQuestions.length} ${question.questionUid} -> ${question.answer || 'N/A'}`)
      }
    })
  }

  const resolvedQuestions = allQuestions.filter((item) => item.answer)
  const unresolvedQuestions = allQuestions.filter((item) => !item.answer)
  const enabledPaperUidSet = new Set(resolvedQuestions.map((item) => item.paperUid))
  const resolvedPapers = papers
    .map((paper) => ({
      ...paper,
      questionCount: resolvedQuestions.filter((item) => item.paperUid === paper.paperUid).length,
      status: enabledPaperUidSet.has(paper.paperUid) ? 'active' : 'draft'
    }))
    .filter((paper) => paper.questionCount > 0)

  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'quiz_papers.json'), JSON.stringify(resolvedPapers, null, 2), 'utf-8')
  fs.writeFileSync(path.join(outDir, 'quiz_questions.json'), JSON.stringify(resolvedQuestions, null, 2), 'utf-8')
  fs.writeFileSync(path.join(outDir, 'unresolved_questions.json'), JSON.stringify(unresolvedQuestions, null, 2), 'utf-8')
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
    papers: papers.length,
    resolvedPapers: resolvedPapers.length,
    questions: allQuestions.length,
    directAnswerCount,
    resolvedQuestions: resolvedQuestions.length,
    unresolvedQuestions: unresolvedQuestions.length,
    aiFillMissing,
    failures
  }, null, 2), 'utf-8')

  console.log('[downloads-import] export complete')
  console.log(JSON.stringify({
    papers: papers.length,
    resolvedPapers: resolvedPapers.length,
    questions: allQuestions.length,
    directAnswerCount,
    resolvedQuestions: resolvedQuestions.length,
    unresolvedQuestions: unresolvedQuestions.length,
    failures: failures.length,
    outDir
  }, null, 2))

  if (dryRun || exportOnly) {
    return
  }

  if (!appUri) {
    throw new Error('缺少 APP_MONGODB_URI，无法写入题库数据库')
  }

  const conn = mongoose.createConnection(appUri)
  try {
    await conn.asPromise()
    const now = new Date()

    const paperOps = resolvedPapers.map((paper) => ({
      updateOne: {
        filter: { paperUid: paper.paperUid },
        update: {
          $set: { ...paper, updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }))

    const questionOps = resolvedQuestions.map((question) => ({
      updateOne: {
        filter: { questionUid: question.questionUid },
        update: {
          $set: { ...question, updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }))

    if (paperOps.length > 0) {
      await conn.collection('quiz_papers').bulkWrite(paperOps, { ordered: false })
    }
    if (questionOps.length > 0) {
      await conn.collection('quiz_questions').bulkWrite(questionOps, { ordered: false })
    }

    console.log('[downloads-import] database import complete')
    console.log(JSON.stringify({
      papersUpserted: paperOps.length,
      questionsUpserted: questionOps.length,
      unresolvedQuestions: unresolvedQuestions.length
    }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

function parsePaperFile(fileName, markdown) {
  const sourceDocId = parseSourceDocId(fileName)
  const title = parseHeading(markdown) || fileName.replace(/\.md$/i, '')
  const sourceUrl = parseSourceUrl(markdown)
  const paperUid = `downloads-${sourceDocId}`
  const meta = parsePaperMeta(title)
  const blocks = splitQuestionBlocks(markdown)
  const questions = []

  for (const block of blocks) {
    const parsed = parseQuestionBlock(block, {
      paperUid,
      sourceDocId,
      sourceTitle: title,
      sourceUrl,
      tags: buildPaperTags(title),
      subject: meta.subject
    })
    if (parsed) questions.push(parsed)
  }

  return {
    paper: {
      paperUid,
      source: 'downloads',
      sourceDomainId: 'luogu',
      sourceDocId,
      title,
      year: meta.year,
      month: meta.month,
      subject: meta.subject,
      level: meta.level,
      paperType: 'exam',
      rawContentZh: markdown,
      questionCount: questions.length,
      status: 'draft'
    },
    questions
  }
}

function parseHeading(markdown) {
  const match = String(markdown || '').match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

function parseSourceUrl(markdown) {
  const match = String(markdown || '').match(/^来源：(.+)$/m)
  return match ? match[1].trim() : ''
}

function parseSourceDocId(fileName) {
  const match = String(fileName || '').match(/^(\d+)/)
  if (!match) throw new Error(`无法从文件名解析 sourceDocId: ${fileName}`)
  return Number(match[1])
}

function splitQuestionBlocks(markdown) {
  const content = String(markdown || '').replace(/\r\n/g, '\n')
  const headerPattern = /^##\s*第\s*(\d+)\s*题\s*$/gm
  const headers = []
  let match

  while ((match = headerPattern.exec(content)) !== null) {
    headers.push({ questionNo: Number(match[1]), index: match.index })
  }

  const blocks = []
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index
    const end = i + 1 < headers.length ? headers[i + 1].index : content.length
    blocks.push(content.slice(start, end).trim())
  }
  return blocks
}

function parseQuestionBlock(block, context) {
  const questionNoMatch = block.match(/^##\s*第\s*(\d+)\s*题\s*$/m)
  const typeMatch = block.match(/^>\s*题型：([^|\n]+)(?:\|\s*分值：([^\n]+))?$/m)
  if (!questionNoMatch || !typeMatch) return null

  const rawType = typeMatch[1].trim()
  const normalizedType = normalizeQuestionType(rawType)
  if (!normalizedType) return null

  const stem = extractSection(block, '题干')
  const options = parseOptionsSection(extractSection(block, '选项'))
  if (!stem || options.length === 0) return null

  const explicitAnswer = parseExplicitAnswer(extractSection(block, '答案'), normalizedType, options)
  const explanation = extractSection(block, '解析').trim()

  return {
    questionUid: `${context.paperUid}-q${Number(questionNoMatch[1])}`,
    paperUid: context.paperUid,
    source: 'downloads',
    sourceDomainId: 'luogu',
    sourceDocId: context.sourceDocId,
    paperQuestionNo: Number(questionNoMatch[1]),
    type: normalizedType,
    stem,
    stemText: markdownToPlainText(stem),
    options: options.map((option) => ({
      ...option,
      textPlain: markdownToPlainText(option.text),
      images: extractMarkdownImages(option.text)
    })),
    answer: explicitAnswer,
    explanation,
    explanationText: markdownToPlainText(explanation),
    images: extractMarkdownImages(stem),
    tags: context.tags,
    levelTag: deriveDownloadsLevelTag(context.sourceTitle),
    subject: context.subject,
    difficulty: null,
    sourceTitle: context.sourceTitle,
    enabled: !!explicitAnswer,
    reviewStatus: explicitAnswer ? 'pending' : 'draft',
    stats: {
      totalAttempts: 0,
      totalCorrect: 0,
      accuracy: 0,
      totalWrong: 0
    },
    sourceUrl: context.sourceUrl
  }
}

function deriveDownloadsLevelTag(sourceTitle) {
  const text = String(sourceTitle || '')
  const chineseLevelMatch = text.match(/([一二三四五六七八九十])级/)
  if (chineseLevelMatch) {
    const map = {
      '一': 1,
      '二': 2,
      '三': 3,
      '四': 4,
      '五': 5,
      '六': 6,
      '七': 7,
      '八': 8,
      '九': 9,
      '十': 10
    }
    const level = map[chineseLevelMatch[1]]
    if (level) return `gesp${level}`
  }

  if (/BCSP-X.*小学低年级/.test(text)) return 'gesp1'
  if (/BCSP-X.*小学高年级/.test(text)) return 'gesp2'
  if (/BCSP-X.*初中组/.test(text)) return 'gesp3'
  if (/海淀区信息学竞赛/.test(text)) return 'gesp5'
  if (/LMCC/.test(text)) return 'gesp4'
  if (/NOIP/i.test(text) && /提高组/.test(text)) return 'gesp9'
  if (/NOIP/i.test(text) && /普及组/.test(text)) return 'gesp4'
  if (/(CSP|SCP)/i.test(text) && /提高级/.test(text)) return 'gesp9'
  if (/(CSP|SCP)/i.test(text) && /入门级/.test(text)) return 'gesp4'
  if (/(CSP|SCP)/i.test(text)) return 'gesp9'
  if (/NOI(?!P)/i.test(text)) return 'gesp10'
  if (/普及组|入门级/.test(text)) return 'gesp4'
  if (/提高组|提高级/.test(text)) return 'gesp9'
  return ''
}

function extractSection(block, sectionName) {
  const escaped = escapeRegExp(sectionName)
  const pattern = new RegExp(
    `^###\\s+${escaped}\\s*$(?:\\n+)([\\s\\S]*?)(?=^###\\s+|^##\\s*第\\s*\\d+\\s*题\\s*$|^\\*\\*\\*\\s*$|(?![\\s\\S]))`,
    'm'
  )
  const match = String(block || '').match(pattern)
  return match ? match[1].trim() : ''
}

function parseOptionsSection(sectionText) {
  const options = []
  let current = null

  for (const rawLine of String(sectionText || '').split('\n')) {
    const line = rawLine.replace(/\r/g, '')
    const optionMatch = line.match(/^\s*-\s*\*\*([A-Z])\.\*\*\s*(.*)$/)
    if (optionMatch) {
      if (current) {
        current.text = cleanupOptionText(current.text)
        options.push(current)
      }
      current = { key: optionMatch[1], text: optionMatch[2] || '' }
      continue
    }

    if (current) {
      current.text += `${current.text ? '\n' : ''}${line}`
    }
  }

  if (current) {
    current.text = cleanupOptionText(current.text)
    options.push(current)
  }

  return options.filter((item) => item.text)
}

function cleanupOptionText(text) {
  return String(text || '')
    .replace(/\s+本题共\s*[\d.]+\s*分\s*$/u, '')
    .trim()
}

function normalizeQuestionType(rawType) {
  if (/单选题/.test(rawType)) return 'single'
  if (/判断题/.test(rawType)) return 'judge'
  return ''
}

function parseExplicitAnswer(answerSection, type, options) {
  const text = String(answerSection || '').trim()
  if (!text) return ''

  const directOption = text.match(/\b([A-D])\b/i)
  if (directOption) return directOption[1].toUpperCase()

  if (type === 'judge') {
    if (/正确|对|true/i.test(text)) {
      return findOptionKeyByKeyword(options, ['正确', '对', 'true']) || 'A'
    }
    if (/错误|错|false/i.test(text)) {
      return findOptionKeyByKeyword(options, ['错误', '错', 'false']) || 'B'
    }
  }

  return ''
}

function findOptionKeyByKeyword(options, keywords) {
  for (const option of options || []) {
    const normalized = String(option.text || '').toLowerCase()
    if (keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()))) {
      return option.key
    }
  }
  return ''
}

function parsePaperMeta(title) {
  const text = String(title || '')
  const yearMatch = text.match(/(19|20)\d{2}/)
  const year = yearMatch ? Number(yearMatch[0]) : null
  const subject = /python/i.test(text) ? 'Python' : 'C++'
  const level = /一级/.test(text) ? 1
    : /二级/.test(text) ? 2
    : /三级/.test(text) ? 3
    : /四级/.test(text) ? 4
    : /五级/.test(text) ? 5
    : /六级/.test(text) ? 6
    : /七级/.test(text) ? 7
    : /八级/.test(text) ? 8
    : null
  return { year, month: null, subject, level }
}

function buildPaperTags(title) {
  const text = String(title || '')
  const tags = ['downloads-import', 'objective']
  if (/NOIP/i.test(text)) tags.push('noip')
  if (/CSP/i.test(text)) tags.push('csp')
  if (/GESP/i.test(text)) tags.push('gesp')
  if (/BCSP/i.test(text)) tags.push('bcsp')
  if (/普及组|入门级/.test(text)) tags.push('beginner')
  if (/提高组|提高级/.test(text)) tags.push('advanced')
  if (/样题/.test(text)) tags.push('sample')
  return [...new Set(tags)]
}

async function generateAnswerAndExplanation(question, modelId) {
  if (backendApiUrl) {
    return await generateAnswerAndExplanationViaBackend(question, modelId)
  }

  const optionLines = (question.options || [])
    .map((option) => `${option.key}. ${option.textPlain || option.text}`)
    .join('\n')
  const userContent = `题目：${question.stemText || question.stem}\n选项：\n${optionLines}`

  const resp = await axios.post(YUN_API_URL, {
    model: modelId,
    messages: [
      { role: 'system', content: ANSWER_GEN_PROMPT },
      { role: 'user', content: userContent }
    ],
    temperature: 0.1,
    max_tokens: 4096
  }, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${YUN_API_KEY}`
    },
    timeout: 120000
  })

  const content = extractResponseText(resp.data)
  const parsed = parseGeneratedAnswer(content)
  if (!parsed.answer) {
    throw new Error(`AI 未返回可用答案: ${question.questionUid}`)
  }

  const normalizedAnswer = normalizeGeneratedAnswer(parsed.answer, question)
  if (!normalizedAnswer) {
    throw new Error(`AI 返回答案不在可选项内: ${question.questionUid} -> ${parsed.answer}`)
  }

  return {
    answer: normalizedAnswer,
    explanation: parsed.explanation || ''
  }
}

async function generateAnswerAndExplanationViaBackend(question, modelId) {
  if (!authToken) {
    throw new Error('使用 backend-api-url 时必须提供 auth-token')
  }

  const resp = await axios.post(`${backendApiUrl.replace(/\/$/, '')}/api/generate-answer`, {
    model: modelId,
    problem: {
      stem: question.stemText || question.stem,
      options: (question.options || []).map((option) => option.textPlain || option.text || '')
    }
  }, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    timeout: 120000
  })

  const normalizedAnswer = normalizeGeneratedAnswer(resp?.data?.answer, question)
  if (!normalizedAnswer) {
    throw new Error(`后端未返回可用答案: ${question.questionUid}`)
  }

  return {
    answer: normalizedAnswer,
    explanation: String(resp?.data?.explanation || '').trim()
  }
}

function extractResponseText(data) {
  if (data?.choices?.[0]?.message?.content) return data.choices[0].message.content
  if (data?.choices?.[0]?.text) return data.choices[0].text
  return JSON.stringify(data)
}

function parseGeneratedAnswer(content) {
  const text = String(content || '')
  const answerMatch = text.match(/\[ANSWER\]:\s*([^\n]+)/i)
  const explanationMatch = text.match(/\[EXPLANATION\]:\s*([\s\S]*)/i)
  return {
    answer: answerMatch ? answerMatch[1].trim() : '',
    explanation: explanationMatch ? explanationMatch[1].trim() : ''
  }
}

function normalizeGeneratedAnswer(answer, question) {
  const normalized = String(answer || '').trim().toUpperCase()
  const optionKeys = new Set((question.options || []).map((item) => item.key.toUpperCase()))
  if (optionKeys.has(normalized)) return normalized

  if (question.type === 'judge') {
    if (['T', 'TRUE'].includes(normalized)) {
      return findOptionKeyByKeyword(question.options, ['正确', '对', 'true']) || 'A'
    }
    if (['F', 'FALSE'].includes(normalized)) {
      return findOptionKeyByKeyword(question.options, ['错误', '错', 'false']) || 'B'
    }
  }

  return ''
}

function getArg(name, fallback = '') {
  const value = args.find((arg) => arg.startsWith(`--${name}=`))
  return value ? value.slice(name.length + 3) : fallback
}

function resolveArg(name, fallback) {
  const value = getArg(name, '')
  return path.resolve(value || fallback)
}

function parsePositiveInt(value) {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : null
}

async function runWithConcurrency(items, concurrency, worker) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      await worker(items[currentIndex], currentIndex)
    }
  })
  await Promise.all(workers)
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

main().catch((error) => {
  console.error('[downloads-import] failed:', error?.stack || error?.message || error)
  process.exit(1)
})