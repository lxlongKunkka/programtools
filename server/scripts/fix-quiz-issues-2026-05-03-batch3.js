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
  ['gesp-2025-03-cpp-4-q8', {
    stem: '假设 `int arr[2][3] = {{1,2,3}, {4,5,6}}`；则 `arr[1][2]` 的值是（）。',
    stemText: '假设 int arr[2][3] = {{1,2,3}, {4,5,6}}；则 arr[1][2] 的值是（）。',
    explanation: '题目中定义了一个二维整型数组 `arr`，其大小为 `[2][3]`，表示有 2 行 3 列。初始化语句 `{{1,2,3}, {4,5,6}}` 表示第一行为 `1,2,3`，第二行为 `4,5,6`。数组下标从 0 开始，因此 `arr[1][2]` 表示第二行第三列的元素，值为 `6`，所以正确答案是 D。',
    explanationText: '题目中定义了一个二维整型数组 arr，其大小为 [2][3]，表示有 2 行 3 列。初始化语句 {{1,2,3}, {4,5,6}} 表示第一行为 1,2,3，第二行为 4,5,6。数组下标从 0 开始，因此 arr[1][2] 表示第二行第三列的元素，值为 6，所以正确答案是 D。',
    reviewStatus: 'reviewed'
  }]
])

const issueActions = new Map([
  ['gesp-2025-03-cpp-4-q8', { status: 'resolved', adminNote: '已修正数组初始化中的笔误，题面与解析已同步更新。' }],
  ['gesp-2024-12-cpp-1-q18', { status: 'ignored', adminNote: '已核对，`cin >> X, cout << X` 使用逗号运算符是合法写法，当前答案 true 成立。' }],
  ['gesp-2024-12-cpp-1-q21', { status: 'ignored', adminNote: '已核对，题干陈述本身就是错误命题，当前 answer=false 与解析一致，本条上报不成立。' }],
  ['downloads-1104-q23', { status: 'ignored', adminNote: '已核对，当前答案 false 与解析一致；此前同类问题已修复，本条为重复误报。' }]
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