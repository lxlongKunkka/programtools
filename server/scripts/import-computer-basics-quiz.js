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
const inputFile = path.join(workspaceRoot, 'other', '计算机基础测试题.md')
const appUri = APP_MONGODB_URI
const apply = args.includes('--apply')

async function main() {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`输入文件不存在: ${inputFile}`)
  }

  const rawContent = fs.readFileSync(inputFile, 'utf-8').replace(/\r\n/g, '\n')
  const sourceDocId = 7000
  const paperUid = `computer-basics-${sourceDocId}`
  const sourceTitle = '计算机基础测试题'

  const parsed = parseObjectiveQuestions(rawContent, {
    sourceDocId,
    paperUid,
    sourceTitle
  })

  const paper = {
    paperUid,
    source: 'computer-basics',
    sourceDomainId: 'computer-basics',
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
    questions: parsed.questions.length,
    single: parsed.questions.filter((item) => item.type === 'single').length,
    warnings: parsed.warnings.length,
    apply
  }

  console.log(JSON.stringify(summary, null, 2))
  if (parsed.warnings.length > 0) {
    console.log(JSON.stringify({ warnings: parsed.warnings.slice(0, 50) }, null, 2))
  }

  if (!apply) return
  if (!appUri) throw new Error('缺少 APP_MONGODB_URI，无法写入题库数据库')

  const conn = mongoose.createConnection(appUri)
  try {
    await conn.asPromise()
    const now = new Date()

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
  const questions = []
  const warnings = []
  let paperQuestionNo = 0

  for (const section of extractObjectiveSections(content)) {
    for (const block of extractQuestionBlocks(section.body)) {
      const parsed = parseQuestionBlock(section.type, block.questionNo, block.lines, context)
      if (!parsed) {
        warnings.push(`第${block.questionNo}题 解析失败或缺失关键信息`)
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

  const answerIndex = cleanedLines.findIndex((line) => /参考答案/.test(line))
  const blockEnd = answerIndex >= 0 ? answerIndex : cleanedLines.length
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
      explanation: ''
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
    explanation: ''
  }
}

function buildQuestionRecord(parsed, context) {
  const tags = buildQuestionTags(context.sourceTitle, parsed)
  return {
    questionUid: `${context.paperUid}-q${context.paperQuestionNo}`,
    paperUid: context.paperUid,
    source: 'computer-basics',
    sourceDomainId: 'computer-basics',
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
    const optionMatch = normalizedLine.match(/^\s*([A-E])\.\s*(.*)$/)
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
  const match = String(answerText || '').match(/[A-E]/i)
  return match ? match[0].toUpperCase() : ''
}

function normalizeJudgeAnswer(answerText) {
  const text = String(answerText || '').trim()
  if (/正确|对|true|^A\b/i.test(text)) return 'true'
  if (/错误|错|false|^B\b/i.test(text)) return 'false'
  return ''
}

function buildQuestionTags(sourceTitle, parsed) {
  const sourceTags = ['专题:计算机基础']
  if (parsed.type === 'judge') sourceTags.push('题型:判断题')
  if (parsed.type === 'single') sourceTags.push('题型:单选题')

  const knowledgeTags = normalizeQuizKnowledgeTags(extractQuizKnowledgeTagsFromText(
    parsed.stem,
    parsed.explanation,
    sourceTitle
  ))

  return [...new Set([...sourceTags, ...knowledgeTags])]
}

function trimTrailingEmpty(lines) {
  const arr = [...lines]
  while (arr.length > 0 && !arr[arr.length - 1].trim()) {
    arr.pop()
  }
  return arr
}

function trimMarkdownBlock(text) {
  return String(text || '').trim().replace(/^```[\s\S]*?\n/, '').replace(/\n```\s*$/, '')
}

function stripMarkdown(text) {
  return String(text || '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
