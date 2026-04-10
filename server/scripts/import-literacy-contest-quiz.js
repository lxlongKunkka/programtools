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
const inputDir = resolveArg('dir', path.join(workspaceRoot, 'other', '素养赛真题'))
const appUri = getArg('app-uri', APP_MONGODB_URI)
const apply = args.includes('--apply')

async function main() {
  const files = fs.readdirSync(inputDir)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))

  const papers = []
  const questions = []
  const warnings = []
  let sourceDocId = 6000

  for (const fileName of files) {
    const filePath = path.join(inputDir, fileName)
    const rawContent = fs.readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n')
    const docTitle = extractDocumentTitle(rawContent, fileName)
    const segments = splitPaperSegments(rawContent, docTitle)

    for (const segment of segments) {
      sourceDocId += 1
      const paperUid = `literacy-contest-${sourceDocId}`
      const parsed = parseObjectiveQuestions(segment.content, {
        fileName,
        sourceDocId,
        paperUid,
        sourceTitle: segment.title,
        segmentGroup: segment.group
      })

      warnings.push(...parsed.warnings)

      if (parsed.questions.length === 0) continue

      const paperMeta = buildPaperMeta(segment.title, rawContent, segment.group)
      papers.push({
        paperUid,
        source: 'literacy-contest',
        sourceDomainId: 'literacy-contest',
        sourceDocId,
        title: segment.title,
        year: paperMeta.year,
        month: paperMeta.month,
        subject: 'C++',
        level: null,
        paperType: 'exam',
        rawContentZh: segment.content,
        questionCount: parsed.questions.length,
        status: 'active'
      })
      questions.push(...parsed.questions)
    }
  }

  const summary = {
    inputDir,
    files: files.length,
    papers: papers.length,
    questions: questions.length,
    single: questions.filter((item) => item.type === 'single').length,
    judge: questions.filter((item) => item.type === 'judge').length,
    warnings: warnings.length,
    apply
  }

  console.log(JSON.stringify(summary, null, 2))
  if (warnings.length > 0) {
    console.log(JSON.stringify({ warnings: warnings.slice(0, 50) }, null, 2))
  }

  if (!apply) return
  if (!appUri) throw new Error('缺少 APP_MONGODB_URI，无法写入题库数据库')

  const conn = mongoose.createConnection(appUri)
  try {
    await conn.asPromise()
    const now = new Date()
    const paperOps = papers.map((paper) => ({
      updateOne: {
        filter: { paperUid: paper.paperUid },
        update: {
          $set: { ...paper, updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }))
    const questionOps = questions.map((question) => ({
      updateOne: {
        filter: { questionUid: question.questionUid },
        update: {
          $set: { ...question, updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }))

    if (paperOps.length) {
      await conn.collection('quiz_papers').bulkWrite(paperOps, { ordered: false })
    }
    if (questionOps.length) {
      await conn.collection('quiz_questions').bulkWrite(questionOps, { ordered: false })
    }

    console.log(JSON.stringify({ papersUpserted: paperOps.length, questionsUpserted: questionOps.length }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

function splitPaperSegments(content, docTitle) {
  const lines = String(content || '').split('\n')
  const segments = []
  let currentGroup = inferGroup(docTitle)
  let buffer = []
  let sawExplicitGroup = false

  const flush = () => {
    const body = buffer.join('\n').trim()
    if (!body) return
    segments.push({
      group: currentGroup,
      title: buildSegmentTitle(docTitle, currentGroup, sawExplicitGroup),
      content: body
    })
  }

  for (const line of lines) {
    const headingMatch = line.match(/^##\s*(小学组|初中组|高中组)\s*$/)
    if (headingMatch) {
      if (buffer.length > 0) flush()
      buffer = []
      currentGroup = headingMatch[1]
      sawExplicitGroup = true
      continue
    }
    buffer.push(line)
  }

  if (buffer.length > 0) flush()
  return segments.length ? segments : [{ group: currentGroup, title: docTitle, content: String(content || '') }]
}

function buildSegmentTitle(docTitle, group, explicitGroup) {
  const title = String(docTitle || '').trim()
  const groupText = String(group || '').trim()
  if (!groupText) return title
  if (title.includes(groupText)) return title
  return explicitGroup ? `${title} · ${groupText}` : title
}

function parseObjectiveQuestions(content, context) {
  const questions = []
  const warnings = []
  let paperQuestionNo = 0

  for (const section of extractObjectiveSections(content)) {
    for (const block of extractQuestionBlocks(section.body)) {
      const parsed = parseQuestionBlock(section.type, block.questionNo, block.lines, context)
      if (!parsed) {
        warnings.push(`[${context.fileName}] 第${block.questionNo}题 解析失败或缺失关键信息`)
        continue
      }
      paperQuestionNo += 1
      questions.push(buildQuestionRecord(parsed, { ...context, paperQuestionNo }))
    }
  }

  return { questions, warnings }
}

function extractObjectiveSections(content) {
  const lines = String(content || '').split('\n')
  const sections = []
  let currentType = ''
  let buffer = []

  const flush = () => {
    const body = buffer.join('\n').trim()
    if (currentType && body) {
      sections.push({ type: currentType, body })
    }
    buffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const heading = line.match(/^#{2,4}\s*(.+)$/)
    if (heading) {
      const title = heading[1]
      if (/问答题|编程题|答案汇总/.test(title)) {
        flush()
        currentType = ''
        continue
      }
      if (/单选题/.test(title)) {
        flush()
        currentType = 'single'
        continue
      }
      if (/判断题/.test(title)) {
        flush()
        currentType = 'judge'
        continue
      }
    }

    if (currentType) {
      buffer.push(rawLine)
    }
  }

  flush()
  return sections
}

function extractQuestionBlocks(sectionContent) {
  const lines = String(sectionContent || '').split('\n')
  const blocks = []
  let currentQuestionNo = ''
  let currentLines = []

  const flush = () => {
    if (!currentQuestionNo || currentLines.length === 0) return
    blocks.push({ questionNo: currentQuestionNo, lines: [...currentLines] })
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    const heading = line.match(/^#{3,4}\s*第\s*(\d+)\s*题\s*$/)
    if (heading) {
      flush()
      currentQuestionNo = heading[1]
      currentLines = []
      continue
    }
    if (currentQuestionNo) {
      currentLines.push(rawLine)
    }
  }

  flush()
  return blocks
}

function parseQuestionBlock(sectionType, questionNo, lines, context) {
  const cleanedLines = trimTrailingEmpty(lines)
  const raw = cleanedLines.join('\n').trim()
  if (!raw) return null

  const answerText = extractAnswerText(raw)
  if (!answerText) return null

  const explanation = extractExplanation(cleanedLines)
  const answerIndex = cleanedLines.findIndex((line) => /参考答案/.test(line))
  const explanationIndex = cleanedLines.findIndex((line) => /解析[:：]/.test(line))
  const blockEnd = [answerIndex, explanationIndex].filter((value) => value >= 0).sort((a, b) => a - b)[0] ?? cleanedLines.length
  const mainLines = trimTrailingEmpty(cleanedLines.slice(0, blockEnd))

  if (sectionType === 'single') {
    const optionParse = extractSingleOptions(mainLines)
    if (optionParse.options.length < 2) return null
    const answer = normalizeSingleAnswer(answerText)
    if (!answer) return null
    return {
      type: 'single',
      questionNo,
      stem: trimMarkdownBlock(optionParse.stemLines.join('\n')),
      options: optionParse.options.map((option) => ({
        key: option.key,
        text: option.text,
        textPlain: stripMarkdown(option.text),
        images: []
      })),
      answer,
      explanation
    }
  }

  const answer = normalizeJudgeAnswer(answerText)
  if (!answer) return null
  return {
    type: 'judge',
    questionNo,
    stem: trimMarkdownBlock(mainLines.join('\n')),
    options: [
      { key: 'true', text: '正确', textPlain: '正确', images: [] },
      { key: 'false', text: '错误', textPlain: '错误', images: [] }
    ],
    answer,
    explanation
  }
}

function buildQuestionRecord(parsed, context) {
  const tags = buildQuestionTags(context.sourceTitle, context.segmentGroup, parsed)
  return {
    questionUid: `${context.paperUid}-q${context.paperQuestionNo}`,
    paperUid: context.paperUid,
    source: 'literacy-contest',
    sourceDomainId: 'literacy-contest',
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

function extractSingleOptions(lines) {
  const stemLines = []
  const options = []
  let currentOption = null
  let optionStarted = false

  for (const line of lines) {
    const normalizedLine = String(line || '').replace(/\r$/, '')
    const optionMatch = normalizedLine.match(/^\s*(?:[-*]\s*)?([A-D])\.\s*(.*)$/)
    if (optionMatch) {
      optionStarted = true
      if (currentOption) options.push(currentOption)
      currentOption = { key: optionMatch[1], textLines: [optionMatch[2]] }
      continue
    }

    if (!optionStarted) {
      stemLines.push(normalizedLine)
      continue
    }

    if (currentOption) {
      currentOption.textLines.push(normalizedLine)
    }
  }

  if (currentOption) options.push(currentOption)

  return {
    stemLines,
    options: options.map((item) => ({
      key: item.key,
      text: trimMarkdownBlock(item.textLines.join('\n'))
    }))
  }
}

function extractAnswerText(raw) {
  const match = String(raw || '').match(/参考答案】\s*([^\n*]+)/)
  return match ? match[1].trim() : ''
}

function normalizeSingleAnswer(answerText) {
  const match = String(answerText || '').match(/[A-D]/i)
  return match ? match[0].toUpperCase() : ''
}

function normalizeJudgeAnswer(answerText) {
  const text = String(answerText || '').trim()
  if (/正确|对|true|^A\b/i.test(text)) return 'true'
  if (/错误|错|false|^B\b/i.test(text)) return 'false'
  return ''
}

function extractExplanation(lines) {
  const startIndex = lines.findIndex((line) => /解析[:：]/.test(line))
  if (startIndex < 0) return ''

  const collected = []
  for (let index = startIndex; index < lines.length; index += 1) {
    let line = lines[index]
    if (index === startIndex) {
      line = line.replace(/^>\s*/, '').replace(/\*\*解析[:：]\*\*\s*/, '').replace(/^解析[:：]\s*/, '')
    }
    collected.push(line.replace(/^>\s?/, ''))
  }

  return trimMarkdownBlock(collected.join('\n'))
}

function buildQuestionTags(sourceTitle, segmentGroup, parsed) {
  const sourceTags = ['专题:素养赛真题']
  const title = String(sourceTitle || '')
  const group = String(segmentGroup || inferGroup(title) || '').trim()

  if (title.includes('信息素养大赛')) sourceTags.push('赛事:信息素养大赛')
  if (title.includes('算法创意实践挑战赛')) sourceTags.push('赛事:算法创意实践挑战赛')
  if (title.includes('素养挑战赛')) sourceTags.push('赛事:素养挑战赛')
  if (group) sourceTags.push(`学段:${group}`)
  if (title.includes('初赛')) sourceTags.push('赛段:初赛')
  if (title.includes('复赛')) sourceTags.push('赛段:复赛')
  if (parsed.type === 'judge') sourceTags.push('题型:判断题')
  if (parsed.type === 'single') sourceTags.push('题型:单选题')

  const knowledgeTags = normalizeQuizKnowledgeTags(extractQuizKnowledgeTagsFromText(
    parsed.stem,
    parsed.explanation,
    title
  ))

  return [...new Set([...sourceTags, ...knowledgeTags])]
}

function buildPaperMeta(title, rawContent, group) {
  const text = `${title}\n${rawContent}`
  const yearMatch = text.match(/(20\d{2})\s*[-年]/)
  const monthMatch = text.match(/(20\d{2})\s*[-年]\s*(\d{1,2})\s*(?:月|-)?/)
  return {
    year: yearMatch ? Number(yearMatch[1]) : undefined,
    month: monthMatch ? Number(monthMatch[2]) : undefined,
    group: group || inferGroup(title)
  }
}

function extractDocumentTitle(rawContent, fileName) {
  const heading = String(rawContent || '').match(/^#\s+(.+)$/m)
  return heading ? heading[1].trim() : path.basename(fileName, path.extname(fileName))
}

function inferGroup(text) {
  const value = String(text || '')
  if (value.includes('小学组')) return '小学组'
  if (value.includes('初中组')) return '初中组'
  if (value.includes('高中组')) return '高中组'
  return ''
}

function trimTrailingEmpty(lines) {
  const items = [...lines]
  while (items.length > 0 && !String(items[items.length - 1] || '').trim()) {
    items.pop()
  }
  while (items.length > 0 && !String(items[0] || '').trim()) {
    items.shift()
  }
  return items
}

function trimMarkdownBlock(text) {
  return trimTrailingEmpty(String(text || '').split('\n')).join('\n').trim()
}

function stripMarkdown(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z]*\n?|```/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/[*_#-]/g, ' ')
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
  console.error('[import-literacy-contest-quiz] fatal:', error)
  process.exit(1)
})