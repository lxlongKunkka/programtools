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
const inputFile = path.join(workspaceRoot, 'other', '计算机基础测试题（含解析_完整111题）.txt')
const appUri = APP_MONGODB_URI
const apply = args.includes('--apply')
const source = 'computer-basics'
const sourceDocId = 7000
const paperUid = `computer-basics-${sourceDocId}`
const sourceTitle = '计算机基础测试题（含解析）'

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
  if (parsed.sectionStats.length > 0) {
    console.log(JSON.stringify({ sections: parsed.sectionStats }, null, 2))
  }
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
  const questions = []
  const warnings = []
  const skipped = []
  const sectionCountMap = new Map()
  let paperQuestionNo = 0

  const blocks = extractQuestionBlocks(content)

  for (const block of blocks) {
    const parsed = parseQuestionBlock(block, context)
    if (!parsed) {
      skipped.push({
        key: block.displayNo,
        section: block.sectionTitle,
        stem: block.stem,
        reason: block.skipReason || '解析失败或缺失关键信息'
      })
      continue
    }
    if (parsed.skipReason) {
      skipped.push({
        key: block.displayNo,
        section: block.sectionTitle,
        stem: block.stem,
        reason: parsed.skipReason
      })
      continue
    }
    paperQuestionNo += 1
    questions.push(buildQuestionRecord(parsed, { ...context, paperQuestionNo }))
    sectionCountMap.set(parsed.sectionTitle, (sectionCountMap.get(parsed.sectionTitle) || 0) + 1)
    if (!parsed.explanation) {
      warnings.push(`第${block.displayNo}题 缺少解析`)
    }
  }

  return {
    totalBlocks: blocks.length,
    questions,
    warnings,
    skipped,
    sectionStats: [...sectionCountMap.entries()].map(([section, count]) => ({ section, imported: count }))
  }
}

function extractQuestionBlocks(content) {
  const lines = String(content || '').split('\n')
  const blocks = []
  let currentSectionTitle = ''
  let currentBlock = null

  const flush = () => {
    if (!currentBlock) return
    blocks.push({
      ...currentBlock,
      lines: trimTrailingEmpty(currentBlock.lines)
    })
    currentBlock = null
  }

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim()
    const sectionMatch = line.match(/^第[一二三四五六七八九十]+部分：(.+?)(?:（\d+题）)?$/)
    if (sectionMatch) {
      flush()
      currentSectionTitle = sectionMatch[1].trim()
      continue
    }

    const questionMatch = line.match(/^(?:(\d+)\.\s*|【(G\d+)】)(.+?)\[(单选题|判断题)\]\[答案：([^\]]+)\]\[分数：([^\]]+)\]\s*$/)
    if (questionMatch) {
      flush()
      const displayNo = questionMatch[1] || questionMatch[2]
      currentBlock = {
        sectionTitle: currentSectionTitle || '未分组',
        displayNo,
        stem: String(questionMatch[3] || '').trim(),
        type: questionMatch[4] === '判断题' ? 'judge' : 'single',
        answerText: String(questionMatch[5] || '').trim(),
        scoreText: String(questionMatch[6] || '').trim(),
        lines: []
      }
      continue
    }

    if (currentBlock) {
      currentBlock.lines.push(rawLine)
    }
  }

  flush()
  return blocks
}

function parseQuestionBlock(block, context) {
  const mainLines = []
  const optionLines = []
  const explanationLines = []
  let parsingExplanation = false

  for (const rawLine of block.lines) {
    const line = String(rawLine || '').trim()
    if (!line) {
      if (parsingExplanation && explanationLines.length > 0) explanationLines.push('')
      continue
    }
    if (/^【答案】/.test(line)) {
      continue
    }
    if (/^【解析】/.test(line)) {
      parsingExplanation = true
      explanationLines.push(line.replace(/^【解析】\s*/, ''))
      continue
    }
    if (parsingExplanation) {
      explanationLines.push(line)
      continue
    }
    if (/^[A-E][\.．]/.test(line)) {
      optionLines.push(line)
      continue
    }
    mainLines.push(line)
  }

  const stemSegments = [block.stem, ...mainLines].filter(Boolean)
  const stem = trimMarkdownBlock(stemSegments.join('\n'))
  const explanation = trimMarkdownBlock(explanationLines.join('\n').trim())

  if (!stem || stem === '（练习题）') {
    return { skipReason: '题干不是独立可作答内容', sectionTitle: block.sectionTitle }
  }

  if (block.type === 'single') {
    const options = extractSingleOptions(optionLines)
    if (options.length < 2) {
      return { skipReason: '单选题缺少完整选项，无法导入现有 Quiz 模型', sectionTitle: block.sectionTitle }
    }
    const answer = normalizeSingleAnswer(block.answerText)
    if (!answer) {
      return { skipReason: '单选题答案无法识别', sectionTitle: block.sectionTitle }
    }
    return {
      type: 'single',
      sectionTitle: block.sectionTitle,
      stem,
      options,
      answer,
      explanation
    }
  }

  const answer = normalizeJudgeAnswer(block.answerText)
  if (!answer) {
    return { skipReason: '判断题答案无法识别', sectionTitle: block.sectionTitle }
  }
  return {
    type: 'judge',
    sectionTitle: block.sectionTitle,
    stem,
    options: [
      { key: 'true', text: '正确', textPlain: '正确', images: [] },
      { key: 'false', text: '错误', textPlain: '错误', images: [] }
    ],
    answer,
    explanation
  }
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
    sourceTitle: `${context.sourceTitle} · ${parsed.sectionTitle}`,
    enabled: true,
    reviewStatus: 'reviewed'
  }
}

function extractSingleOptions(lines) {
  const options = []
  let currentOption = null

  for (const line of lines) {
    const normalizedLine = String(line || '').replace(/\r$/, '')
    const optionMatch = normalizedLine.match(/^\s*([A-E])[\.．]\s*(.*)$/)
    if (optionMatch) {
      if (currentOption) options.push(currentOption)
      currentOption = { key: optionMatch[1], textLines: [optionMatch[2]] }
      continue
    }

    if (currentOption) {
      currentOption.textLines.push(normalizedLine)
    }
  }

  if (currentOption) options.push(currentOption)

  return options.map((item) => ({
    key: item.key,
    text: trimMarkdownBlock(item.textLines.join('\n')),
    textPlain: stripMarkdown(trimMarkdownBlock(item.textLines.join('\n'))),
    images: []
  }))
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
  if (parsed.sectionTitle) sourceTags.push(`分组:${parsed.sectionTitle}`)
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
