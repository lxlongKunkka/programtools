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
  ['gesp-2023-12-cpp-6-q5', {
    enabled: false,
    explanation: '该题题干直接依赖“第 4 题的定义”，但当前题库记录并没有把第 4 题的上下文一起带入，学员无法仅凭本题独立作答。为避免继续投放不完整题，已先停用，待补齐依赖上下文或重写题面后再恢复。',
    explanationText: '该题题干直接依赖第 4 题的定义，但当前题库记录并没有把第 4 题的上下文一起带入，学员无法仅凭本题独立作答。为避免继续投放不完整题，已先停用，待补齐依赖上下文或重写题面后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['gesp-2024-06-cpp-6-q15', {
    enabled: false,
    explanation: '该题直接引用“上题的树”，当前题库记录缺少上一题中的树结构，导致本题无法独立判断答案。为避免继续误导学员，已先停用，待补齐题干依赖内容后再恢复。',
    explanationText: '该题直接引用上题的树，当前题库记录缺少上一题中的树结构，导致本题无法独立判断答案。为避免继续误导学员，已先停用，待补齐题干依赖内容后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['downloads-1105-q13', {
    enabled: false,
    explanation: '该题题干直接引用“上一题中的 sortB 函数”，但当前题库中没有把上一题代码一并呈现，因此本题信息不完整，无法独立作答。已先停用，待补齐被引用代码或改写为独立题面后再恢复。',
    explanationText: '该题题干直接引用上一题中的 sortB 函数，但当前题库中没有把上一题代码一并呈现，因此本题信息不完整，无法独立作答。已先停用，待补齐被引用代码或改写为独立题面后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['downloads-1116-q21', {
    enabled: false,
    explanation: '该题题干只写了“对于下面的程序段”，但当前记录缺少实际程序代码，学员无法据此计算结果。为避免继续投放损坏题目，已先停用，待补回程序段后再恢复。',
    explanationText: '该题题干只写了对于下面的程序段，但当前记录缺少实际程序代码，学员无法据此计算结果。为避免继续投放损坏题目，已先停用，待补回程序段后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['literacy-contest-6002-q18', {
    answer: 'true',
    explanation: '题干给出的代码是：`int i = 5; while (i > 0) { i -= 2; }`。按顺序执行后，`i` 的变化为 `5 -> 3 -> 1 -> -1`，循环结束时最终值确实是 `-1`，因此题干陈述正确，本题应判为 true。',
    explanationText: '题干给出的代码是：int i = 5; while (i > 0) { i -= 2; }。按顺序执行后，i 的变化为 5 -> 3 -> 1 -> -1，循环结束时最终值确实是 -1，因此题干陈述正确，本题应判为 true。',
    reviewStatus: 'reviewed'
  }]
])

const issueActions = new Map([
  ['gesp-2025-09-cpp-2-q18', { status: 'ignored', adminNote: '已核对，该题是判断题，题库不需要额外展示 A/B/C/D 选项；当前答案与解析一致。' }],
  ['gesp-2025-09-cpp-2-q19', { status: 'ignored', adminNote: '已核对，该题是判断题，题库不需要额外展示 A/B/C/D 选项；当前答案与解析一致。' }],
  ['gesp-2024-09-cpp-3-q20', { status: 'ignored', adminNote: '已核对，该题是判断题，当前 answer=false 即表示题干说法错误，不存在“缺答案”。' }],
  ['gesp-2025-06-cpp-5-q16', { status: 'ignored', adminNote: '已核对，该题是判断题，题库不需要额外展示 A/B/C/D 选项；当前答案与解析一致。' }],
  ['gesp-2023-12-cpp-6-q5', { status: 'resolved', adminNote: '题干依赖第 4 题定义，当前记录不完整，已先停用。' }],
  ['gesp-2024-06-cpp-6-q15', { status: 'resolved', adminNote: '题干直接引用上题树结构，当前记录不完整，已先停用。' }],
  ['downloads-1105-q13', { status: 'resolved', adminNote: '题干直接引用上一题中的 sortB 函数，当前记录缺少被引用代码，已先停用。' }],
  ['downloads-1116-q21', { status: 'resolved', adminNote: '题干缺少实际程序段，当前记录不完整，已先停用。' }],
  ['literacy-contest-6002-q18', { status: 'resolved', adminNote: '已修正答案为 true，并重写解析。' }]
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