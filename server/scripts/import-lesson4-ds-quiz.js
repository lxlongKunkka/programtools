#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { fileURLToPath } from 'url'
import { APP_MONGODB_URI } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
const inputFile = resolveArg('file', path.join(workspaceRoot, 'docs', '第4节_数据结构_题目与解析整理.md'))
const outDir = resolveArg('out-dir', '')
const appUri = getArg('app-uri', APP_MONGODB_URI)
const apply = args.includes('--apply')

const SOURCE = 'lesson-ds4'
const SOURCE_DOC_ID = 7104
const PAPER_UID = `${SOURCE}-${SOURCE_DOC_ID}`
const SOURCE_TITLE = '第4节 数据结构（栈/队列/链表/二叉树）题目与解析整理'
const COMMON_TAG = '专题:第4节数据结构'

async function main() {
  if (!fs.existsSync(inputFile)) {
    throw new Error(`输入文件不存在: ${inputFile}`)
  }

  const rawContent = fs.readFileSync(inputFile, 'utf-8').replace(/\r\n/g, '\n')
  const parsed = parseQuestions(rawContent)

  const paper = {
    paperUid: PAPER_UID,
    source: SOURCE,
    sourceDomainId: SOURCE,
    sourceDocId: SOURCE_DOC_ID,
    title: SOURCE_TITLE,
    year: 2026,
    month: 6,
    subject: 'C++',
    level: null,
    paperType: 'exam',
    rawContentZh: rawContent,
    questionCount: parsed.questions.length,
    status: 'active'
  }

  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'quiz_papers.json'), JSON.stringify([paper], null, 2), 'utf-8')
    fs.writeFileSync(path.join(outDir, 'quiz_questions.json'), JSON.stringify(parsed.questions, null, 2), 'utf-8')
    fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify({
      paperUid: PAPER_UID,
      questions: parsed.questions.length,
      skipped: parsed.skipped.length,
      tag: COMMON_TAG
    }, null, 2), 'utf-8')
  }

  console.log(JSON.stringify({
    inputFile,
    outDir,
    paperUid: PAPER_UID,
    questions: parsed.questions.length,
    skipped: parsed.skipped.length,
    apply
  }, null, 2))

  if (parsed.skipped.length > 0) {
    console.log(JSON.stringify({ skipped: parsed.skipped.slice(0, 40) }, null, 2))
  }

  if (!apply) return

  if (!appUri) {
    throw new Error('缺少 APP_MONGODB_URI，无法写入题库数据库')
  }

  const conn = mongoose.createConnection(appUri)
  try {
    await conn.asPromise()
    const now = new Date()

    await conn.collection('quiz_papers').bulkWrite([
      {
        updateOne: {
          filter: { paperUid: paper.paperUid },
          update: {
            $set: { ...paper, updatedAt: now },
            $setOnInsert: { createdAt: now }
          },
          upsert: true
        }
      }
    ], { ordered: false })

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

    if (questionOps.length > 0) {
      await conn.collection('quiz_questions').bulkWrite(questionOps, { ordered: false })
    }

    console.log(JSON.stringify({
      papersUpserted: 1,
      questionsUpserted: questionOps.length,
      tag: COMMON_TAG
    }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

function parseQuestions(markdown) {
  const lines = String(markdown || '').split('\n')
  const chunks = []

  let current = []
  let currentTitle = ''

  const flush = () => {
    if (!current.length) return
    chunks.push({ title: currentTitle, body: current.join('\n') })
    current = []
    currentTitle = ''
  }

  for (const line of lines) {
    const heading = line.match(/^#{3,4}\s+(.+)$/)
    if (heading) {
      flush()
      currentTitle = heading[1].trim()
      continue
    }
    if (currentTitle) current.push(line)
  }
  flush()

  const questions = []
  const skipped = []
  let no = 0

  for (const chunk of chunks) {
    if (!chunk.body.includes('题目：')) continue

    const parsed = parseQuestionChunk(chunk.body)
    if (!parsed.ok) {
      skipped.push({ section: chunk.title, reason: parsed.reason })
      continue
    }

    no += 1
    questions.push({
      questionUid: `${PAPER_UID}-q${no}`,
      paperUid: PAPER_UID,
      source: SOURCE,
      sourceDomainId: SOURCE,
      sourceDocId: SOURCE_DOC_ID,
      paperQuestionNo: no,
      type: 'single',
      stem: parsed.stem,
      stemText: parsed.stem,
      options: parsed.options,
      answer: parsed.answer,
      explanation: parsed.explanation,
      explanationText: plainText(parsed.explanation),
      images: [],
      tags: [COMMON_TAG],
      levelTag: 'gesp6',
      subject: 'C++',
      difficulty: null,
      sourceTitle: SOURCE_TITLE,
      enabled: true,
      reviewStatus: 'reviewed'
    })
  }

  return { questions, skipped }
}

function parseQuestionChunk(text) {
  const stemMatch = text.match(/题目：([\s\S]*?)(?:\n-\s*[A-D]\.\s|\n答案：)/)
  if (!stemMatch) return { ok: false, reason: '缺少题干' }

  const stem = normalizeLineBreaks(stemMatch[1]).trim()
  const optionReg = /^-\s*([A-D])\.\s*(.+)$/gm
  const options = []
  let optionMatch
  while ((optionMatch = optionReg.exec(text)) !== null) {
    options.push({
      key: optionMatch[1],
      text: optionMatch[2].trim(),
      textPlain: plainText(optionMatch[2]),
      images: []
    })
  }

  if (options.length < 2) {
    return { ok: false, reason: '选项不足' }
  }

  const answerLine = (text.match(/答案：([^\n]+)/) || [])[1] || ''
  const answer = normalizeAnswer(answerLine)
  if (!answer) {
    return { ok: false, reason: `答案不可识别: ${answerLine.trim()}` }
  }

  const explanationLine = (text.match(/解析：([\s\S]*)$/) || [])[1] || ''
  const explanation = normalizeLineBreaks(explanationLine).trim() || `标准答案：${answer}`

  return { ok: true, stem, options, answer, explanation }
}

function normalizeAnswer(raw) {
  const text = String(raw || '').trim()
  const letter = text.match(/[A-D]/i)
  if (letter) return letter[0].toUpperCase()
  if (/^true$/i.test(text) || /正确/.test(text)) return 'true'
  if (/^false$/i.test(text) || /错误|错/.test(text)) return 'false'
  return ''
}

function plainText(value) {
  return String(value || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeLineBreaks(value) {
  return String(value || '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
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
  console.error('[import-lesson4-ds-quiz] fatal:', error)
  process.exit(1)
})
