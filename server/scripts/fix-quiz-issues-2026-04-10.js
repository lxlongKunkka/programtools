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
  ['gesp-2024-06-cpp-2-q1', {
    explanation: '已核对 GESP 原卷配置，官方答案为 B。题目问的是 GESP 一级可选择的认证语言数量，标准答案为 2，因此应选 B。',
    explanationText: '已核对 GESP 原卷配置，官方答案为 B。题目问的是 GESP 一级可选择的认证语言数量，标准答案为 2，因此应选 B。',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1109-q3', {
    reviewStatus: 'reviewed'
  }],
  ['downloads-1110-q4', {
    reviewStatus: 'reviewed'
  }],
  ['gesp-2025-09-cpp-3-q11', {
    answer: 'D',
    explanation: '这段代码通过不断取末位并累积到 reversed 中，实现十进制整数反转。但 reversed 使用的是 int，如果反转后的结果超过 32 位有符号整数上界，就会溢出。32 位 int 的最大值是 2147483647。要让反转结果仍然不超过这个上界，原数的最大可取值应当是 1463847412，因为它反转后是 2147483641，仍在 int 范围内；而像 2147483647 这样更大的数反转后会变成 7463847412，已经超出 int 范围。因此正确答案是 D。',
    explanationText: '这段代码通过不断取末位并累积到 reversed 中，实现十进制整数反转。但 reversed 使用的是 int，如果反转后的结果超过 32 位有符号整数上界，就会溢出。32 位 int 的最大值是 2147483647。要让反转结果仍然不超过这个上界，原数的最大可取值应当是 1463847412，因为它反转后是 2147483641，仍在 int 范围内；而像 2147483647 这样更大的数反转后会变成 7463847412，已经超出 int 范围。因此正确答案是 D。',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-06-cpp-5-q8', {
    enabled: false,
    explanation: '题面引用了“上题代码”，但当前题目数据中并未包含对应代码，无法独立作答。为避免继续向学员投放错误题，已先停用该题，待补齐完整题源后再恢复。',
    explanationText: '题面引用了上题代码，但当前题目数据中并未包含对应代码，无法独立作答。为避免继续向学员投放错误题，已先停用该题，待补齐完整题源后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['downloads-1115-q14', {
    enabled: false,
    explanation: '题干明确依赖配图判断最短路，但当前题目数据缺少原图，无法独立作答。为避免误导学员，已先停用该题，待补齐图片资源后再恢复。',
    explanationText: '题干明确依赖配图判断最短路，但当前题目数据缺少原图，无法独立作答。为避免误导学员，已先停用该题，待补齐图片资源后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['downloads-1041-q17', {
    enabled: false,
    explanation: '该题在导入时把整组阅读题的多道判断题和单选题误合并成了一条单题记录，当前题面与选项结构已损坏，无法安全作答。已先停用该题，后续应按原卷重新拆分导入。',
    explanationText: '该题在导入时把整组阅读题的多道判断题和单选题误合并成了一条单题记录，当前题面与选项结构已损坏，无法安全作答。已先停用该题，后续应按原卷重新拆分导入。',
    reviewStatus: 'rejected'
  }]
])

const issueActions = new Map([
  ['downloads-1110-q4', { status: 'ignored', adminNote: '已核对，主办方为北京计算机学会，当前答案 C 正确。' }],
  ['gesp-2025-09-cpp-2-q18', { status: 'ignored', adminNote: '已核对，当前是判断题，不需要额外单选选项。' }],
  ['gesp-2024-06-cpp-2-q1', { status: 'ignored', adminNote: '已核对 GESP 原卷 config，官方答案为 B。' }],
  ['downloads-1109-q3', { status: 'ignored', adminNote: '已核对，题目答案 B 正确，现有表达式等价。' }],
  ['gesp-2024-09-cpp-3-q20', { status: 'ignored', adminNote: '已核对，当前是判断题，不需要额外单选选项。' }],
  ['gesp-2025-09-cpp-3-q11', { status: 'resolved', adminNote: '已补缺失答案 D，并补充整数反转溢出边界解析。' }],
  ['gesp-2024-06-cpp-5-q8', { status: 'resolved', adminNote: '题面缺少上题代码，无法独立作答，已先停用该题。' }],
  ['downloads-1115-q14', { status: 'resolved', adminNote: '题面缺图，无法独立作答，已先停用该题。' }],
  ['downloads-1041-q17', { status: 'resolved', adminNote: '导入时误把整组阅读题合并成单题，当前结构损坏，已先停用该题。' }],
  ['gesp-2024-03-cpp-3-q21', { status: 'ignored', adminNote: '已核对，当前是判断题，不需要额外单选选项。' }]
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