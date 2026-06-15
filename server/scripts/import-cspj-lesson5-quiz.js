#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const workspaceRoot = path.resolve(__dirname, '../..')

const args = process.argv.slice(2)
const inputFile = resolveArg('file', path.join(workspaceRoot, 'docs', 'CSP-J 初赛第5节 · 排序 + 递归 + 枚举 + 图论练习题与解析.md'))
const appUri = getArg('app-uri', process.env.APP_MONGODB_URI || '')
const apply = args.includes('--apply')

const SOURCE = 'cspj-prelim-lesson5'
const SOURCE_DOC_ID = 7105
const PAPER_UID = `${SOURCE}-${SOURCE_DOC_ID}`
const SOURCE_TITLE = 'CSP-J 初赛第5节 · 排序 + 递归 + 枚举 + 图论练习题与解析'
const COMMON_TAG = '专题:CSP-J初赛第5节'

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

  console.log(JSON.stringify({
    inputFile,
    paperUid: PAPER_UID,
    totalBlocks: parsed.totalBlocks,
    imported: parsed.questions.length,
    skipped: parsed.skipped.length,
    apply
  }, null, 2))

  if (parsed.skipped.length > 0) {
    console.log(JSON.stringify({ skipped: parsed.skipped.slice(0, 50) }, null, 2))
  }

  if (!apply) return

  if (!appUri) {
    throw new Error('缺少 APP_MONGODB_URI，无法写入题库数据库')
  }

  const { default: mongoose } = await import('mongoose')
  const conn = mongoose.createConnection(appUri)
  try {
    await conn.asPromise()
    const now = new Date()

    // 幂等导入：清理该专题历史数据后重建。
    await conn.collection('quiz_questions').deleteMany({ source: SOURCE })
    await conn.collection('quiz_papers').deleteMany({ source: SOURCE })

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

  const headers = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    const normal = line.match(/^\*\*题目(\d+)\*\*\s*(.+)$/)
    if (normal) {
      headers.push({ key: normal[1], label: normal[0], title: `题目${normal[1]} ${normal[2]}`.trim(), lineIndex: i })
      continue
    }

    const practice = line.match(/^\*\*练习(\d+)\*\*\s*(.+)$/)
    if (practice) {
      headers.push({ key: `L${practice[1]}`, label: practice[0], title: `练习${practice[1]} ${practice[2]}`.trim(), lineIndex: i })
      continue
    }

    const gesp = line.match(/^\*\*G(\d+)\*\*\s*(.+)$/)
    if (gesp) {
      headers.push({ key: `G${gesp[1]}`, label: gesp[0], title: `G${gesp[1]} ${gesp[2]}`.trim(), lineIndex: i })
    }
  }

  const questions = []
  const skipped = []

  for (let i = 0; i < headers.length; i += 1) {
    const start = headers[i].lineIndex
    const end = i + 1 < headers.length ? headers[i + 1].lineIndex : lines.length
    const blockLines = lines.slice(start, end)
    const parsed = parseQuestionBlock(headers[i], blockLines)
    if (!parsed.ok) {
      skipped.push({ key: headers[i].key, reason: parsed.reason })
      continue
    }

    const no = questions.length + 1
    questions.push({
      questionUid: `${PAPER_UID}-q${no}`,
      paperUid: PAPER_UID,
      source: SOURCE,
      sourceDomainId: SOURCE,
      sourceDocId: SOURCE_DOC_ID,
      paperQuestionNo: no,
      type: 'single',
      stem: parsed.stem,
      stemText: plainText(parsed.stem),
      options: parsed.options,
      answer: parsed.answer,
      explanation: parsed.explanation,
      explanationText: plainText(parsed.explanation),
      images: [],
      tags: [COMMON_TAG],
      levelTag: 'csp-j',
      subject: 'C++',
      difficulty: null,
      sourceTitle: SOURCE_TITLE,
      enabled: true,
      reviewStatus: 'reviewed',
      stats: {
        totalAttempts: 0,
        totalCorrect: 0,
        accuracy: 0,
        totalWrong: 0
      }
    })
  }

  return {
    totalBlocks: headers.length,
    questions,
    skipped
  }
}

function parseQuestionBlock(header, blockLines) {
  const block = blockLines.join('\n')
  const stem = normalizeBlock(header.title)

  const options = []
  const optionPattern = /^([A-D])\.\s+(.+)$/
  for (const raw of blockLines) {
    const line = raw.trim()
    const match = line.match(optionPattern)
    if (!match) continue
    options.push({
      key: match[1],
      text: normalizeBlock(match[2]),
      textPlain: plainText(match[2]),
      images: []
    })
  }

  if (options.length < 2) {
    return { ok: false, reason: '选项不足' }
  }

  const answer = extractAnswer(block)
  if (!answer) {
    return { ok: false, reason: '答案识别失败' }
  }

  const explanation = extractExplanation(block)

  return {
    ok: true,
    stem,
    options,
    answer,
    explanation: explanation || `标准答案：${answer}`
  }
}

function extractAnswer(block) {
  const answerLineMatch = block.match(/\*\*答案[:：]\s*([^\n*]+?)(?:\*\*|\n|$)/)
  const line = answerLineMatch ? answerLineMatch[1].trim() : ''
  let letter = pickLetter(line)
  if (letter) return letter

  const chooseMatch = block.match(/选\s*([A-D])/)
  if (chooseMatch) return chooseMatch[1]

  const detailMatch = block.match(/答案[：:][\s\S]{0,80}?([A-D])/) // fallback
  if (detailMatch) return detailMatch[1]

  return ''
}

function pickLetter(text) {
  if (!text) return ''

  // 优先匹配“答案：X”形式。
  const direct = text.match(/^([A-D])(?:\b|[）)\s，,。])/)
  if (direct) return direct[1]

  // “A、B、C 都正确，D 错误”这类题，默认取“选X/错误描述X/正确选项X”。
  const explicit = text.match(/(?:选|错误|正确).*?([A-D])/)
  if (explicit) return explicit[1]

  const any = text.match(/([A-D])/)
  return any ? any[1] : ''
}

function extractExplanation(block) {
  const openTag = block.indexOf('<details')
  const closeTag = block.indexOf('</details>')
  if (openTag < 0 || closeTag < 0 || closeTag <= openTag) return ''

  let body = block.slice(openTag, closeTag)
  body = body.replace(/<details[^>]*>/g, '')
  body = body.replace(/<summary>[\s\S]*?<\/summary>/g, '')
  body = body.replace(/^\s*\*\*答案[:：].*$/gm, '')
  body = body.trim()
  return normalizeBlock(body)
}

function normalizeBlock(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function plainText(markdown) {
  return String(markdown || '')
    .replace(/!\[[^\]]*\]\(([^)]+)\)/g, ' ')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^(#{1,6})\s*/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/`{1,3}/g, '')
    .replace(/<[^>]+>/g, ' ')
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
  console.error('[import-cspj-lesson5-quiz] fatal:', error)
  process.exit(1)
})
