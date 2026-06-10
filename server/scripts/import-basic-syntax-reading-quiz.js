#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { APP_MONGODB_URI } from '../config.js'
import { extractQuizKnowledgeTagsFromText, normalizeQuizKnowledgeTags } from '../utils/quizKnowledgeTags.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
const inputFile = resolveArg('file', path.join(workspaceRoot, 'other', '基础语法程序阅读_完整版（含解析和代码）.md'))
const appUri = getArg('app-uri', APP_MONGODB_URI)
const apply = args.includes('--apply')
const source = 'basic-syntax-reading'
const sourceDocId = 7002
const paperUid = `${source}-${sourceDocId}`
const sourceTitle = '基础语法与程序阅读'

async function main() {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`输入文件不存在: ${inputFile}`)
  }

  const rawContent = fs.readFileSync(inputFile, 'utf-8').replace(/\r\n/g, '\n')
  const parsed = parseObjectiveQuestions(rawContent, {
    sourceDocId,
    paperUid,
    sourceTitle
  })

  const paper = {
    paperUid,
    source,
    sourceDomainId: source,
    sourceDocId,
    title: sourceTitle,
    year: 2026,
    month: 6,
    subject: 'C++',
    level: null,
    paperType: 'exam',
    rawContentZh: rawContent,
    questionCount: parsed.questions.length,
    status: 'active'
  }

  const summary = {
    inputFile,
    paper: paperUid,
    totalBlocks: parsed.totalBlocks,
    questions: parsed.questions.length,
    single: parsed.questions.filter((item) => item.type === 'single').length,
    judge: parsed.questions.filter((item) => item.type === 'judge').length,
    skipped: parsed.skipped.length,
    warnings: parsed.warnings.length,
    apply
  }

  console.log(JSON.stringify(summary, null, 2))
  if (parsed.skipped.length > 0) {
    console.log(JSON.stringify({ skipped: parsed.skipped.slice(0, 50) }, null, 2))
  }
  if (parsed.warnings.length > 0) {
    console.log(JSON.stringify({ warnings: parsed.warnings.slice(0, 50) }, null, 2))
  }

  if (!apply) return
  if (!appUri) throw new Error('缺少 APP_MONGODB_URI，无法写入题库数据库')

  const conn = mongoose.createConnection(appUri)
  try {
    await conn.asPromise()
    const now = new Date()

    await conn.collection('quiz_questions').deleteMany({ source })
    await conn.collection('quiz_papers').deleteMany({ source })

    const paperOp = {
      updateOne: {
        filter: { paperUid: paper.paperUid },
        update: {
          $set: { ...paper, updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }

    const questionOps = parsed.questions.map((question) => ({
      updateOne: {
        filter: { questionUid: question.questionUid },
        update: {
          $set: { ...question, updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }))

    await conn.collection('quiz_papers').bulkWrite([paperOp], { ordered: false })
    await conn.collection('quiz_questions').bulkWrite(questionOps, { ordered: false })

    console.log(JSON.stringify({ papersUpserted: 1, questionsUpserted: questionOps.length }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

function parseObjectiveQuestions(content, context) {
  const blocks = extractQuestionBlocks(content)
  const questions = []
  const warnings = []
  const skipped = []
  let paperQuestionNo = 0

  for (const block of blocks) {
    const parsed = parseQuestionBlock(block)
    if (!parsed) {
      skipped.push({
        key: block.displayNo,
        reason: '题块缺少可识别的题干/选项/答案'
      })
      continue
    }
    if (parsed.skipReason) {
      skipped.push({
        key: block.displayNo,
        reason: parsed.skipReason
      })
      continue
    }
    if (!parsed.explanation) {
      warnings.push(`第${block.displayNo}题 缺少解析`)
    }
    paperQuestionNo += 1
    questions.push(buildQuestionRecord(parsed, { ...context, paperQuestionNo }))
  }

  return {
    totalBlocks: blocks.length,
    questions,
    warnings,
    skipped
  }
}

function extractQuestionBlocks(content) {
  const text = String(content || '').replace(/\r\n/g, '\n')
  const pattern = /^###\s*第\s*(\d+)\s*题\s*$/gm
  const headers = []
  let match

  while ((match = pattern.exec(text)) !== null) {
    headers.push({ displayNo: Number(match[1]), index: match.index })
  }

  const blocks = []
  for (let index = 0; index < headers.length; index += 1) {
    const start = headers[index].index
    const end = index + 1 < headers.length ? headers[index + 1].index : text.length
    blocks.push({
      displayNo: headers[index].displayNo,
      raw: text.slice(start, end).trim()
    })
  }

  return blocks
}

function parseQuestionBlock(block) {
  const raw = String(block.raw || '').trim()
  if (!raw) return null

  const lines = raw.split('\n')
  const answerIndex = lines.findIndex((line) => /^\*\*答案[:：]/.test(line.trim()))
  if (answerIndex < 0) {
    return { skipReason: '缺少答案行' }
  }

  const explanationIndex = lines.findIndex((line) => /^\*\*解析[:：]/.test(line.trim()))
  const beforeAnswer = trimLines(lines.slice(1, answerIndex))
  if (beforeAnswer.length === 0) {
    return { skipReason: '缺少题干内容' }
  }

  const answerText = extractAnswerText(lines[answerIndex])
  if (!answerText) {
    return { skipReason: '答案无法识别' }
  }

  const explanation = explanationIndex >= 0 ? extractExplanation(lines.slice(explanationIndex)) : ''
  if (/\*\*答案[:：]/.test(explanation)) {
    return { skipReason: '解析内容疑似损坏（嵌入重复答案块）' }
  }

  const optionParse = extractOptionsAndStem(beforeAnswer)
  if (optionParse.options.length < 2) {
    return { skipReason: '单选题缺少完整选项' }
  }

  const judgeLike = isJudgeOptions(optionParse.options)
  if (judgeLike) {
    const answer = normalizeJudgeAnswer(answerText)
    if (!answer) {
      return { skipReason: '判断题答案无法识别' }
    }
    return {
      type: 'judge',
      stem: trimMarkdownBlock(optionParse.stemLines.join('\n')),
      options: [
        { key: 'true', text: '正确', textPlain: '正确', images: [] },
        { key: 'false', text: '错误', textPlain: '错误', images: [] }
      ],
      answer,
      explanation
    }
  }

  const answer = normalizeSingleAnswer(answerText, optionParse.options)
  if (!answer) {
    return { skipReason: '单选题答案不在选项范围内' }
  }

  return {
    type: 'single',
    stem: trimMarkdownBlock(optionParse.stemLines.join('\n')),
    options: optionParse.options,
    answer,
    explanation
  }
}

function extractOptionsAndStem(lines) {
  const stemLines = []
  const options = []
  let currentOption = null
  let optionStarted = false

  for (const rawLine of lines) {
    const line = String(rawLine || '').replace(/\r$/, '')
    if (/^---\s*$/.test(line.trim())) continue
    if (/^\*来源：/.test(line.trim())) continue

    const optionMatch = line.match(/^\s*([A-D])\.\s*(.*)$/)
    if (optionMatch) {
      optionStarted = true
      if (currentOption) options.push(currentOption)
      currentOption = { key: optionMatch[1], textLines: [optionMatch[2]] }
      continue
    }

    if (!optionStarted) {
      stemLines.push(line)
      continue
    }

    if (currentOption) {
      currentOption.textLines.push(line)
    }
  }

  if (currentOption) options.push(currentOption)

  return {
    stemLines: trimLines(stemLines),
    options: options
      .map((item) => {
        const text = trimMarkdownBlock(item.textLines.join('\n'))
        return {
          key: item.key,
          text,
          textPlain: stripMarkdown(text),
          images: []
        }
      })
      .filter((item) => item.text)
  }
}

function extractAnswerText(line) {
  const match = String(line || '').match(/^\*\*答案[:：]\s*(.+?)\*\*\s*$/)
  return match ? match[1].trim() : ''
}

function extractExplanation(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return ''
  const collected = [...lines]
  collected[0] = collected[0].replace(/^\*\*解析[:：]\*\*\s*/, '')
  return trimMarkdownBlock(collected.join('\n'))
}

function isJudgeOptions(options) {
  if (!Array.isArray(options) || options.length !== 2) return false
  const normalized = options.map((item) => stripMarkdown(item.text))
  return normalized[0] === '正确' && normalized[1] === '错误'
}

function normalizeSingleAnswer(answerText, options) {
  const answerMatch = String(answerText || '').match(/[A-D]/i)
  if (!answerMatch) return ''
  const answer = answerMatch[0].toUpperCase()
  return options.some((item) => item.key === answer) ? answer : ''
}

function normalizeJudgeAnswer(answerText) {
  const text = String(answerText || '').trim()
  if (/正确|对|true|^A\b/i.test(text)) return 'true'
  if (/错误|错|false|^B\b/i.test(text)) return 'false'
  return ''
}

function buildQuestionRecord(parsed, context) {
  const tags = buildQuestionTags(context.sourceTitle, parsed)
  return {
    questionUid: `${context.paperUid}-q${context.paperQuestionNo}`,
    paperUid: context.paperUid,
    source,
    sourceDomainId: source,
    sourceDocId: context.sourceDocId,
    paperQuestionNo: context.paperQuestionNo,
    type: parsed.type,
    stem: parsed.stem,
    stemText: stripMarkdown(parsed.stem),
    options: parsed.options,
    answer: parsed.answer,
    explanation: parsed.explanation,
    explanationText: stripMarkdown(parsed.explanation),
    images: [],
    tags,
    levelTag: '',
    subject: 'C++',
    difficulty: null,
    sourceTitle: context.sourceTitle,
    enabled: true,
    reviewStatus: 'reviewed'
  }
}

function buildQuestionTags(sourceTitle, parsed) {
  const sourceTags = ['专题:基础语法与程序阅读']
  if (parsed.type === 'judge') sourceTags.push('题型:判断题')
  if (parsed.type === 'single') sourceTags.push('题型:单选题')

  const knowledgeTags = normalizeQuizKnowledgeTags(extractQuizKnowledgeTagsFromText(
    parsed.stem,
    parsed.explanation,
    sourceTitle
  ))

  return [...new Set([...sourceTags, ...knowledgeTags])]
}

function trimLines(lines) {
  const result = [...lines]
  while (result.length > 0 && !String(result[0] || '').trim()) result.shift()
  while (result.length > 0 && !String(result[result.length - 1] || '').trim()) result.pop()
  return result
}

function trimMarkdownBlock(text) {
  return trimLines(String(text || '').split('\n')).join('\n').trim()
}

function stripMarkdown(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z]*\n?|```/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/[\*_#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveArg(name, fallbackValue) {
  const value = getArg(name, '')
  return value ? path.resolve(value) : fallbackValue
}

function getArg(name, fallbackValue) {
  const prefix = `--${name}=`
  const match = args.find((item) => item.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallbackValue
}

main().catch((error) => {
  console.error('[import-basic-syntax-reading-quiz] fatal:', error)
  process.exit(1)
})