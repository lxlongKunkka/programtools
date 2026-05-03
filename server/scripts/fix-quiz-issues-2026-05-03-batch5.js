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

const questionPatches = new Map([
  ['downloads-1028-q16', {
    enabled: false,
    explanation: '该题要求同时填写甲、乙、丁和天气四个位置，但当前记录把四组二选一选项压平为一题，导致“答案与选项不匹配”。为避免继续投放结构损坏的题目，已先停用，待按原卷重新整理为可独立作答的形式后再恢复。',
    explanationText: '该题要求同时填写甲、乙、丁和天气四个位置，但当前记录把四组二选一选项压平为一题，导致答案与选项不匹配。为避免继续投放结构损坏的题目，已先停用，待按原卷重新整理为可独立作答的形式后再恢复。',
    reviewStatus: 'rejected'
  }]
])

const issueActions = new Map([
  ['gesp-2024-06-cpp-6-q9', { status: 'ignored', adminNote: '已核对，先序遍历第一个访问根节点，当前答案 A 与解析一致。' }],
  ['gesp-2025-03-cpp-6-q3', { status: 'ignored', adminNote: '已核对，代码是标准前序遍历，当前答案 A 与解析一致。' }],
  ['literacy-contest-6001-q5', { status: 'ignored', adminNote: '已核对，当前答案 B 与题意、解析一致，本条上报不成立。' }],
  ['literacy-contest-6001-q9', { status: 'ignored', adminNote: '已核对，循环在 j=3 时 break，输出 1 2，当前答案 A 正确。' }],
  ['literacy-contest-6006-q4', { status: 'ignored', adminNote: '已核对，错误说法确实是 C，当前答案与解析一致。' }],
  ['literacy-contest-6006-q3', { status: 'ignored', adminNote: '已核对，应填 char(\'a\' - 1 + i)，当前答案 B 与解析一致。' }],
  ['downloads-1028-q16', { status: 'resolved', adminNote: '题目是四空组合题，但当前记录被压平成一题，选项结构已损坏，已先停用。' }]
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