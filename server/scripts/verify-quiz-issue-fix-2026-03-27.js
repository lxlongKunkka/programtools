#!/usr/bin/env node

import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../config.js'

const questionUids = [
  'gesp-2024-09-cpp-1-q4',
  'downloads-1015-q19',
  'downloads-1102-q18',
  'downloads-1103-q4',
  'downloads-1104-q23',
  'gesp-2023-09-cpp-3-q17',
  'gesp-2023-12-cpp-6-q21',
  'gesp-2023-12-cpp-6-q7',
  'gesp-2024-12-cpp-1-q3'
]

const issueQuestionUids = [
  'gesp-2024-09-cpp-1-q4',
  'gesp-2024-09-cpp-3-q20',
  'downloads-1015-q19',
  'downloads-1102-q18',
  'downloads-1103-q13',
  'downloads-1103-q4',
  'downloads-1104-q23',
  'downloads-1109-q3',
  'gesp-2023-09-cpp-3-q17',
  'gesp-2023-12-cpp-6-q21',
  'gesp-2023-12-cpp-6-q7',
  'gesp-2024-03-cpp-1-q11',
  'gesp-2024-03-cpp-3-q15',
  'gesp-2024-03-cpp-3-q21',
  'gesp-2024-06-cpp-1-q2',
  'gesp-2024-12-cpp-1-q3',
  'gesp-2024-12-cpp-3-q20',
  'gesp-2025-03-cpp-1-q22'
]

async function main() {
  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()

  try {
    const questions = await conn.collection('quiz_questions').find(
      { questionUid: { $in: questionUids } },
      {
        projection: {
          questionUid: 1,
          answer: 1,
          reviewStatus: 1,
          stem: 1,
          options: 1
        },
        sort: { questionUid: 1 }
      }
    ).toArray()

    const issueStatusSummary = await conn.collection('quiz_question_issues').aggregate([
      {
        $match: {
          questionUid: { $in: issueQuestionUids }
        }
      },
      {
        $group: {
          _id: {
            questionUid: '$questionUid',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.questionUid': 1,
          '_id.status': 1
        }
      }
    ]).toArray()

    console.log(JSON.stringify({ questions, issueStatusSummary }, null, 2))
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