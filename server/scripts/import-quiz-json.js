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
const inputDir = resolveArg('dir', path.join(workspaceRoot, 'Downloads', 'quiz-import-final-fixed'))
const appUri = getArg('app-uri', APP_MONGODB_URI)
const dryRun = args.includes('--dry-run')

async function main() {
  const papers = readJson(path.join(inputDir, 'quiz_papers.json'))
  const questions = readJson(path.join(inputDir, 'quiz_questions.json'))

  console.log(JSON.stringify({
    inputDir,
    papers: papers.length,
    questions: questions.length,
    dryRun
  }, null, 2))

  if (dryRun) {
    return
  }

  if (!appUri) {
    throw new Error('缺少 APP_MONGODB_URI，无法写入题库数据库')
  }

  const conn = mongoose.createConnection(appUri)
  try {
    await conn.asPromise()
    const now = new Date()

    const paperOps = papers.map((paper) => ({
      updateOne: {
        filter: { paperUid: paper.paperUid },
        update: {
          $set: { ...paper, updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }))

    const questionOps = questions.map((question) => ({
      updateOne: {
        filter: { questionUid: question.questionUid },
        update: {
          $set: { ...question, updatedAt: now },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }))

    if (paperOps.length > 0) {
      await conn.collection('quiz_papers').bulkWrite(paperOps, { ordered: false })
    }
    if (questionOps.length > 0) {
      await conn.collection('quiz_questions').bulkWrite(questionOps, { ordered: false })
    }

    console.log(JSON.stringify({
      papersUpserted: paperOps.length,
      questionsUpserted: questionOps.length
    }, null, 2))
  } finally {
    await conn.close().catch(() => {})
  }
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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

main().catch((error) => {
  console.error('[import-quiz-json] fatal:', error)
  process.exit(1)
})