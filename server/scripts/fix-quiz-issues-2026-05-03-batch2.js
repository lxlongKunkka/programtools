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
  ['downloads-1102-q16', {
    answer: 'false',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1102-q17', {
    answer: 'true',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1102-q21', {
    answer: 'true',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1102-q24', {
    answer: 'true',
    reviewStatus: 'reviewed'
  }]
])

const issueActions = new Map([
  ['downloads-1102-q16', { status: 'resolved', adminNote: '已将判断题答案从旧的 B 编码修正为 false。' }],
  ['downloads-1102-q17', { status: 'resolved', adminNote: '已将判断题答案从旧的 A 编码修正为 true。' }],
  ['downloads-1102-q18', { status: 'ignored', adminNote: '已核对，该题当前答案 false 与解析一致，本条上报不成立。' }],
  ['downloads-1102-q21', { status: 'resolved', adminNote: '已将判断题答案从旧的 A 编码修正为 true。' }],
  ['downloads-1102-q24', { status: 'resolved', adminNote: '已将判断题答案从旧的 A 编码修正为 true。' }]
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