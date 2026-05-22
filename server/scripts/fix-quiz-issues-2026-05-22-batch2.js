#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../config.js'

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function getArg(name, fallback = '') {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

function toPlainText(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-z]*\n?/gi, '').replace(/```/g, ' '))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[>#*_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function option(key, text) {
  return {
    key,
    text,
    textPlain: text,
    images: []
  }
}

const disabledBecauseMalformed = {
  enabled: false,
  reviewStatus: 'rejected'
}

const questionPatches = new Map([
  ['downloads-1103-q3', {
    options: [
      option('A', '+'),
      option('B', '*'),
      option('C', '&')
    ],
    answer: 'C',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1039-q8', {
    options: [
      option('A', '8、18'),
      option('B', '10、18'),
      option('C', '8、19'),
      option('D', '10、19')
    ],
    answer: 'C',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1042-q13', {
    options: [
      option('A', '1'),
      option('B', '2'),
      option('C', '3'),
      option('D', '4')
    ],
    answer: 'B',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1034-q20', {
    ...disabledBecauseMalformed,
    explanation: '该题原始内容属于多空“完善程序”题，但当前题库被错误导入成单选题，多个空的候选项被串接到同一道题里，结构已损坏，无法作为正常客观题作答。现已先停用，待按原题结构重新整理后再恢复。',
    explanationText: '该题原始内容属于多空完善程序题，但当前题库被错误导入成单选题，多个空的候选项被串接到同一道题里，结构已损坏，无法作为正常客观题作答。现已先停用，待按原题结构重新整理后再恢复。'
  }],
  ['downloads-1041-q19', {
    ...disabledBecauseMalformed,
    explanation: '该题原始内容属于多空“完善程序”题，但当前题库被错误导入成单选题，五个空位的候选项被合并到了同一道题中，当前结构无法准确作答或判分。现已先停用，待按原题结构重新整理后再恢复。',
    explanationText: '该题原始内容属于多空完善程序题，但当前题库被错误导入成单选题，五个空位的候选项被合并到了同一道题中，当前结构无法准确作答或判分。现已先停用，待按原题结构重新整理后再恢复。'
  }],
  ['downloads-1041-q20', {
    ...disabledBecauseMalformed,
    explanation: '该题原始内容属于多空“完善程序”题，但当前题库被错误导入成单选题，多个空位的候选项被直接拼接，导致题目结构损坏。现已先停用，待按原题结构重新整理后再恢复。',
    explanationText: '该题原始内容属于多空完善程序题，但当前题库被错误导入成单选题，多个空位的候选项被直接拼接，导致题目结构损坏。现已先停用，待按原题结构重新整理后再恢复。'
  }],
  ['downloads-1110-q20', {
    ...disabledBecauseMalformed,
    explanation: '该题原始内容属于多空“最优选项补全程序”题，但当前题库被错误导入成单选题，五个空位的整组选项被重复拼接进同一题目，当前结构不可用。现已先停用，待按原题结构重新整理后再恢复。',
    explanationText: '该题原始内容属于多空最优选项补全程序题，但当前题库被错误导入成单选题，五个空位的整组选项被重复拼接进同一题目，当前结构不可用。现已先停用，待按原题结构重新整理后再恢复。'
  }]
])

const issueActions = new Map([
  ['downloads-1102-q16', { status: 'ignored', adminNote: '已核对，当前答案 false 与解析一致；题目所说的高级语言程序不能被 CPU 直接执行，本条上报不成立。' }],
  ['downloads-1102-q17', { status: 'ignored', adminNote: '已核对，B 表示 Byte（字节），当前答案 true 正确，本条上报不成立。' }],
  ['downloads-1102-q21', { status: 'ignored', adminNote: '已核对，汉字不属于 ASCII 编码范围，当前答案 true 正确，本条上报不成立。' }],
  ['downloads-1102-q24', { status: 'ignored', adminNote: '已核对，当 (a % 2 == 0) 为假时，a 为奇数，当前答案 true 正确，本条上报不成立。' }],
  ['downloads-1104-q23', { status: 'ignored', adminNote: '已核对，C++ 中不存在 ** 这个独立运算符，因此题干说法错误，当前答案 false 正确，本条上报不成立。' }],
  ['gesp-2024-06-cpp-8-q5', { status: 'ignored', adminNote: '已核对，已知两个孩子中至少有一个是女孩时，另一个是男孩的概率为 2/3，当前答案 A 正确。' }],
  ['gesp-2025-09-cpp-1-q4', { status: 'ignored', adminNote: '已核对，代码中的 // 会截断表达式，题面代码实际无法形成题目给出的任一正常输出，当前答案 D 正确。' }],
  ['downloads-1103-q3', { status: 'resolved', adminNote: '已修正该题选项编号缺失和错位问题。' }],
  ['downloads-1039-q8', { status: 'resolved', adminNote: '已修正该题选项文本中的重复数字和错位排版。' }],
  ['downloads-1042-q13', { status: 'resolved', adminNote: '已修正该题选项文本中的重复数字和错位排版。' }],
  ['downloads-1034-q20', { status: 'resolved', adminNote: '该题被错误导入为单选题，结构已损坏，现已先停用。' }],
  ['downloads-1041-q19', { status: 'resolved', adminNote: '该题被错误导入为单选题，结构已损坏，现已先停用。' }],
  ['downloads-1041-q20', { status: 'resolved', adminNote: '该题被错误导入为单选题，结构已损坏，现已先停用。' }],
  ['downloads-1110-q20', { status: 'resolved', adminNote: '该题被错误导入为单选题，结构已损坏，现已先停用。' }]
])

async function main() {
  const apply = hasFlag('apply')
  const outFile = String(getArg('out', '')).trim()
  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()

  try {
    const questionCollection = conn.collection('quiz_questions')
    const issueCollection = conn.collection('quiz_question_issues')
    const report = {
      generatedAt: new Date().toISOString(),
      apply,
      questions: [],
      issues: []
    }

    for (const [questionUid, patch] of questionPatches.entries()) {
      const question = await questionCollection.findOne({ questionUid })
      if (!question) {
        report.questions.push({ questionUid, found: false })
        continue
      }

      const nextUpdate = {
        ...patch,
        updatedAt: new Date()
      }

      if (typeof nextUpdate.explanation === 'string' && !nextUpdate.explanationText) {
        nextUpdate.explanationText = toPlainText(nextUpdate.explanation)
      }

      report.questions.push({
        questionUid,
        found: true,
        patch: Object.keys(nextUpdate)
      })

      if (apply) {
        await questionCollection.updateOne(
          { _id: question._id },
          { $set: nextUpdate }
        )
      }
    }

    for (const [questionUid, action] of issueActions.entries()) {
      const filter = {
        questionUid,
        status: { $in: ['pending', 'reviewing'] }
      }
      const openIssues = await issueCollection.find(filter, { projection: { _id: 1 } }).toArray()

      report.issues.push({
        questionUid,
        matched: openIssues.length,
        status: action.status
      })

      if (apply && openIssues.length > 0) {
        await issueCollection.updateMany(
          filter,
          {
            $set: {
              status: action.status,
              adminNote: action.adminNote,
              handledAt: new Date(),
              handledByName: 'Copilot batch repair',
              updatedAt: new Date()
            }
          }
        )
      }
    }

    if (outFile) {
      const outputPath = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8')
    }

    console.log(JSON.stringify(report, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
}

main().catch(async (error) => {
  console.error(error?.stack || error?.message || String(error))
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})