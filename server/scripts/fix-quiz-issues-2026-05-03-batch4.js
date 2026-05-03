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
  ['downloads-1119-q20', {
    enabled: false,
    explanation: '当前记录把原题中的多处填空与多组选项压缩进了一道单题，选项内容已经串位，题目结构损坏，学员无法可靠作答。为避免继续投放错误内容，已先停用，待按原卷重新拆分整理后再恢复。',
    explanationText: '当前记录把原题中的多处填空与多组选项压缩进了一道单题，选项内容已经串位，题目结构损坏，学员无法可靠作答。为避免继续投放错误内容，已先停用，待按原卷重新拆分整理后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['downloads-1036-q18', {
    enabled: false,
    explanation: '当前记录只有“完成下面的判断题和单选题”这类总说明，却没有把对应程序段和各小问完整展开，已经不是可独立作答的单题。为避免继续误导学员，已先停用，待按原卷重新拆分整理后再恢复。',
    explanationText: '当前记录只有完成下面的判断题和单选题这类总说明，却没有把对应程序段和各小问完整展开，已经不是可独立作答的单题。为避免继续误导学员，已先停用，待按原卷重新拆分整理后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['downloads-1041-q18', {
    enabled: false,
    explanation: '当前记录同样只保留了组合题的总说明，缺少关键程序段与小问边界，不再是可安全投放的单题。为避免继续误导学员，已先停用，待按原卷重新拆分整理后再恢复。',
    explanationText: '当前记录同样只保留了组合题的总说明，缺少关键程序段与小问边界，不再是可安全投放的单题。为避免继续误导学员，已先停用，待按原卷重新拆分整理后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['gesp-2024-09-cpp-4-q12', {
    enabled: false,
    explanation: '该题直接引用“上一题算法”的时间复杂度，但当前记录未包含上一题算法内容，学员无法仅凭本题独立判断答案。为避免继续投放不完整题，已先停用，待补齐依赖内容后再恢复。',
    explanationText: '该题直接引用上一题算法的时间复杂度，但当前记录未包含上一题算法内容，学员无法仅凭本题独立判断答案。为避免继续投放不完整题，已先停用，待补齐依赖内容后再恢复。',
    reviewStatus: 'rejected'
  }]
])

const issueActions = new Map([
  ['downloads-1119-q20', { status: 'resolved', adminNote: '多处填空和选项被压成一题，结构损坏，已先停用。' }],
  ['downloads-1036-q18', { status: 'resolved', adminNote: '组合题缺少程序段与小问边界，当前记录不完整，已先停用。' }],
  ['downloads-1041-q18', { status: 'resolved', adminNote: '组合题缺少关键程序段与小问边界，当前记录不完整，已先停用。' }],
  ['gesp-2024-09-cpp-4-q12', { status: 'resolved', adminNote: '题干直接引用上一题算法，当前记录缺少依赖内容，已先停用。' }]
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