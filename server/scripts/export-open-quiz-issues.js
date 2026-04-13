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

async function main() {
  const outFile = String(getArg('out', '')).trim()
  const includeResolved = hasFlag('include-resolved')
  const statuses = includeResolved ? undefined : ['pending', 'reviewing']

  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()

  try {
    const issueCollection = conn.collection('quiz_question_issues')
    const questionCollection = conn.collection('quiz_questions')

    const query = statuses ? { status: { $in: statuses } } : {}
    const items = await issueCollection.find(query).sort({ reportedAt: -1 }).toArray()
    const questionUids = [...new Set(items.map((item) => item.questionUid).filter(Boolean))]

    const questions = await questionCollection.find(
      { questionUid: { $in: questionUids } },
      {
        projection: {
          questionUid: 1,
          source: 1,
          sourceTitle: 1,
          answer: 1,
          type: 1,
          enabled: 1,
          reviewStatus: 1,
          updatedAt: 1,
          stem: 1,
          stemText: 1,
          options: 1,
          explanation: 1,
          explanationText: 1,
          tags: 1,
          levelTag: 1
        }
      }
    ).toArray()

    const questionMap = new Map(questions.map((item) => [item.questionUid, item]))
    const result = {
      generatedAt: new Date().toISOString(),
      count: items.length,
      statuses: statuses || 'all',
      items: items.map((item) => ({
        ...item,
        question: questionMap.get(item.questionUid) || null
      }))
    }

    const json = `${JSON.stringify(result, null, 2)}\n`
    if (outFile) {
      const outputPath = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile)
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, json, 'utf-8')
    }

    process.stdout.write(json)
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