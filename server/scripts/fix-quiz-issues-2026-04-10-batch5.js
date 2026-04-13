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
  ['gesp-2024-09-cpp-1-q15', {
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-06-cpp-1-q14', {
    reviewStatus: 'reviewed'
  }],
  ['gesp-2023-09-cpp-6-q9', {
    reviewStatus: 'reviewed'
  }],
  ['downloads-1028-q15', {
    enabled: false,
    explanation: '该题依赖题干配图判断数据结构，但当前导入数据与原始 Downloads 文档都未保留图片，题干关键信息缺失，无法保证作答公平性。因此本题应从题库中停用，而不是继续保留一个缺图版本。',
    explanationText: '该题依赖题干配图判断数据结构，但当前导入数据与原始 Downloads 文档都未保留图片，题干关键信息缺失，无法保证作答公平性。因此本题应从题库中停用，而不是继续保留一个缺图版本。',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1034-q11', {
    enabled: false,
    explanation: '该题需要依据配图识别数据结构，但当前导入题面与原始 Downloads 文档都缺少图片，用户无法根据现有内容唯一作答。为避免继续误导做题，本题应停用。',
    explanationText: '该题需要依据配图识别数据结构，但当前导入题面与原始 Downloads 文档都缺少图片，用户无法根据现有内容唯一作答。为避免继续误导做题，本题应停用。',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-06-cpp-8-q10', {
    enabled: false,
    explanation: '官方 GESP 原卷配置将本题答案标为 B，但按现有题干表述，B“两个质数一定是互质数”和 D“相邻的两个质数不一定是互质数”都存在可判错空间，题目具有歧义。为避免单选题出现多项可争议错误，本题在题库中停用处理。',
    explanationText: '官方 GESP 原卷配置将本题答案标为 B，但按现有题干表述，B“两个质数一定是互质数”和 D“相邻的两个质数不一定是互质数”都存在可判错空间，题目具有歧义。为避免单选题出现多项可争议错误，本题在题库中停用处理。',
    reviewStatus: 'reviewed'
  }]
])

const issueActions = new Map([
  ['gesp-2024-09-cpp-1-q15', {
    status: 'ignored',
    adminNote: '已核对 2024 年 9 月一级官方原卷与答案，Q15 官方答案为 B，当前题面与答案一致；本题两条上报均按误报关闭。'
  }],
  ['gesp-2024-06-cpp-1-q14', {
    status: 'ignored',
    adminNote: '已核对 2024 年 6 月一级官方原卷与答案，Q14 官方答案为 A，当前题库答案无误。'
  }],
  ['gesp-2023-09-cpp-6-q9', {
    status: 'ignored',
    adminNote: '已核对 2023 年 9 月六级官方原卷与答案，Q9 官方答案为 C，现有图片与答案一致。'
  }],
  ['downloads-1028-q15', {
    status: 'resolved',
    adminNote: '题目依赖图片作答，但当前导入数据与原始 Downloads 文档均缺图，已停用该题。'
  }],
  ['downloads-1034-q11', {
    status: 'resolved',
    adminNote: '题目依赖图片作答，但当前导入数据与原始 Downloads 文档均缺图，已停用该题。'
  }],
  ['gesp-2024-06-cpp-8-q10', {
    status: 'resolved',
    adminNote: '已核对官方原卷答案键为 B，但题干存在多项可判错的歧义，已按题目缺陷停用处理。'
  }]
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