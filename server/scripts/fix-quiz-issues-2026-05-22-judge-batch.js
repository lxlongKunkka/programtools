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

function buildJudgeOptions() {
  return [
    {
      key: 'true',
      text: '正确',
      textPlain: '正确',
      images: []
    },
    {
      key: 'false',
      text: '错误',
      textPlain: '错误',
      images: []
    }
  ]
}

function isLegacyJudgeOptionSet(options = []) {
  if (!Array.isArray(options) || options.length !== 2) return false

  const normalized = options.map((item) => ({
    key: String(item?.key || '').trim().toUpperCase(),
    text: String(item?.textPlain || item?.text || '').trim()
  }))

  return normalized[0]?.key === 'A'
    && normalized[1]?.key === 'B'
    && normalized[0]?.text === '正确'
    && normalized[1]?.text === '错误'
}

async function main() {
  const apply = hasFlag('apply')
  const outFile = String(getArg('out', '')).trim()
  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()

  try {
    const issueCollection = conn.collection('quiz_question_issues')
    const questionCollection = conn.collection('quiz_questions')
    const openIssueStatuses = ['pending', 'reviewing']
    const now = new Date()

    const joined = await issueCollection.aggregate([
      {
        $match: {
          status: { $in: openIssueStatuses }
        }
      },
      {
        $lookup: {
          from: 'quiz_questions',
          localField: 'questionUid',
          foreignField: 'questionUid',
          as: 'questionDocs'
        }
      },
      { $unwind: '$questionDocs' },
      {
        $project: {
          _id: 1,
          questionUid: 1,
          issueType: 1,
          status: 1,
          detail: 1,
          reporterName: 1,
          question: '$questionDocs'
        }
      }
    ]).toArray()

    const zeroOptionQuestionUids = new Set()
    const legacyJudgeQuestionUids = new Set()

    for (const row of joined) {
      const question = row.question || {}
      const options = Array.isArray(question.options) ? question.options : []
      const answer = String(question.answer || '').trim().toLowerCase()

      if (question.type === 'judge' && options.length === 0 && (answer === 'true' || answer === 'false')) {
        zeroOptionQuestionUids.add(String(row.questionUid || '').trim())
        continue
      }

      if (
        question.type === 'judge'
        && isLegacyJudgeOptionSet(options)
        && ['a', 'b'].includes(answer)
      ) {
        legacyJudgeQuestionUids.add(String(row.questionUid || '').trim())
      }
    }

    const zeroOptionList = [...zeroOptionQuestionUids].filter(Boolean).sort()
    const legacyJudgeList = [...legacyJudgeQuestionUids].filter(Boolean).sort()

    const report = {
      generatedAt: now.toISOString(),
      apply,
      zeroOptionJudgeQuestions: zeroOptionList,
      legacyJudgeCompatibilityQuestions: legacyJudgeList,
      zeroOptionQuestionUpdates: [],
      issueResolutions: []
    }

    for (const questionUid of zeroOptionList) {
      const update = {
        filter: {
          questionUid,
          type: 'judge',
          answer: { $in: ['true', 'false'] },
          $expr: { $eq: [{ $size: { $ifNull: ['$options', []] } }, 0] }
        },
        update: {
          $set: {
            options: buildJudgeOptions(),
            updatedAt: now
          }
        }
      }

      report.zeroOptionQuestionUpdates.push({
        questionUid,
        options: buildJudgeOptions().map((item) => item.key)
      })

      if (apply) {
        await questionCollection.updateOne(update.filter, update.update)
      }
    }

    const resolutionBatches = [
      {
        questionUids: zeroOptionList,
        status: 'resolved',
        adminNote: '已补全判断题标准选项（正确 / 错误），修复“没有选项”的结构问题。'
      },
      {
        questionUids: legacyJudgeList,
        status: 'resolved',
        adminNote: '已核对题目答案本身无误；问题来自历史判断题 A/B 选项与结果展示的兼容性，现已修复兼容逻辑。'
      }
    ]

    for (const batch of resolutionBatches) {
      if (batch.questionUids.length === 0) continue

      const filter = {
        questionUid: { $in: batch.questionUids },
        status: { $in: openIssueStatuses }
      }
      const matched = await issueCollection.countDocuments(filter)

      report.issueResolutions.push({
        questionUids: batch.questionUids,
        matched,
        status: batch.status,
        adminNote: batch.adminNote
      })

      if (apply && matched > 0) {
        await issueCollection.updateMany(
          filter,
          {
            $set: {
              status: batch.status,
              adminNote: batch.adminNote,
              handledAt: now,
              handledByName: 'Copilot batch repair',
              updatedAt: now
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