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

const questionPatches = new Map([
  ['gesp-2025-03-cpp-7-q18', { reviewStatus: 'reviewed' }],
  ['gesp-2025-03-cpp-6-q12', { reviewStatus: 'reviewed' }],
  ['gesp-2024-03-cpp-7-q10', { reviewStatus: 'reviewed' }],
  ['gesp-2025-06-cpp-6-q11', { reviewStatus: 'reviewed' }],
  ['downloads-1101-q24', { reviewStatus: 'reviewed' }],
  ['downloads-1113-q20', {
    enabled: false,
    explanation: '原卷这一题是带 5 个填空位置的程序填空题，当前导入结果把全部小题与选项压成了一条单选题记录，题面和选项结构已经损坏，无法作为单题安全作答。为避免继续误导学员，已先停用该题，后续应按原卷重新拆分整理。',
    explanationText: '原卷这一题是带 5 个填空位置的程序填空题，当前导入结果把全部小题与选项压成了一条单选题记录，题面和选项结构已经损坏，无法作为单题安全作答。为避免继续误导学员，已先停用该题，后续应按原卷重新拆分整理。',
    reviewStatus: 'rejected'
  }],
  ['gesp-2024-12-cpp-8-q15', {
    enabled: false,
    explanation: '已核对 GESP 原卷，第 15 题题面确实写的是“上题程序的时间复杂度”，需要依赖第 14 题中的快速排序程序图片才能独立作答。当前题库记录未携带上题程序内容，作为单题投放时题面不完整。为避免继续误导学员，已先停用该题，待补齐依赖题面后再恢复。',
    explanationText: '已核对 GESP 原卷，第 15 题题面确实写的是“上题程序的时间复杂度”，需要依赖第 14 题中的快速排序程序图片才能独立作答。当前题库记录未携带上题程序内容，作为单题投放时题面不完整。为避免继续误导学员，已先停用该题，待补齐依赖题面后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['downloads-1104-q23', { reviewStatus: 'reviewed' }],
  ['downloads-1102-q18', { reviewStatus: 'reviewed' }],
  ['gesp-2023-12-cpp-1-q13', { reviewStatus: 'reviewed' }],
  ['gesp-2024-09-cpp-1-q4', { reviewStatus: 'reviewed' }],
  ['gesp-2024-03-cpp-1-q4', { reviewStatus: 'reviewed' }]
])

const issueActions = new Map([
  ['gesp-2025-03-cpp-7-q18', { status: 'ignored', adminNote: '已核对，快速排序一般不稳定，当前判断题答案 true 正确。' }],
  ['gesp-2025-03-cpp-6-q12', { status: 'ignored', adminNote: '已核对，格雷码补全题当前答案 A 正确。' }],
  ['gesp-2024-03-cpp-7-q10', { status: 'ignored', adminNote: '已核对，当前 DFS 序列答案 A 合理，未发现题目数据错误。' }],
  ['gesp-2025-06-cpp-6-q11', { status: 'ignored', adminNote: '已核对，当前 DFS 补全题答案 A 正确，题目图片与选项均完整。' }],
  ['downloads-1101-q24', { status: 'ignored', adminNote: '已核对，a % 4 == 0 为真时，a 确为 4 的倍数，当前答案 A 正确。' }],
  ['downloads-1113-q20', { status: 'resolved', adminNote: '原卷是 5 空程序填空题，导入时被压成单题并混入全部选项，结构已损坏，已先停用。' }],
  ['gesp-2024-12-cpp-8-q15', { status: 'resolved', adminNote: '题面依赖上题中的快速排序程序图片，当前单题记录不完整，已先停用。' }],
  ['downloads-1104-q23', { status: 'ignored', adminNote: '已核对，** 不是 C++ 独立运算符，当前判断题答案 false 正确。' }],
  ['downloads-1102-q18', { status: 'ignored', adminNote: '已核对，注释不会拖慢程序运行速度，当前判断题答案 false 正确。' }],
  ['gesp-2023-12-cpp-1-q13', { status: 'ignored', adminNote: '已核对 GESP 原卷 config，第 13 题官方答案为 B，当前题目无误。' }],
  ['gesp-2024-09-cpp-1-q4', { status: 'ignored', adminNote: '已核对，10 - 3 * 2 = 4，当前答案 B 正确。' }],
  ['gesp-2024-03-cpp-1-q4', { status: 'ignored', adminNote: '已核对，cout 会输出字符串 a+1= 2，当前答案 A 正确。' }],
  ['gesp-2024-12-cpp-3-q20', { status: 'ignored', adminNote: '已核对，当前为判断题，不需要额外单选选项。' }]
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