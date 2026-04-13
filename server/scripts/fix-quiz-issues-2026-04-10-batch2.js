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
  ['gesp-2025-06-cpp-1-q2', {
    reviewStatus: 'reviewed'
  }],
  ['downloads-1112-q12', {
    enabled: false,
    explanation: '原卷中的代码为 `int s = 0; for (int i = 1; i <= 10; i *= 2) s += i; cout << s << endl;`，实际输出应为 15，但当前题目选项为“1 4 14 / 1 5 15 / 5 5 55 / 7 7”，与题面代码完全不匹配，说明导入结果已损坏。为避免继续误导学员，已先停用该题，待按原卷重新整理后再恢复。',
    explanationText: '原卷中的代码为 int s = 0; for (int i = 1; i <= 10; i *= 2) s += i; cout << s << endl;，实际输出应为 15，但当前题目选项为“1 4 14 / 1 5 15 / 5 5 55 / 7 7”，与题面代码完全不匹配，说明导入结果已损坏。为避免继续误导学员，已先停用该题，待按原卷重新整理后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['downloads-1109-q12', {
    stem: '请问以下循环程序的输出结果是多少（ ）。\n```cpp\nint s = 1;\nfor (int i = 1; i <= 10; i *= 3) {\n    s *= i;\n}\ncout << s << endl;\n```',
    stemText: '请问以下循环程序的输出结果是多少（ ）。 cpp int s = 1; for (int i = 1; i <= 10; i *= 3) { s *= i; } cout << s << endl;',
    explanation: '原卷代码在导入时丢失了。补回代码后按顺序模拟：初始 `s = 1`；当 `i = 1` 时，`s = 1 * 1 = 1`；随后 `i *= 3` 变为 3，`s = 1 * 3 = 3`；再次循环时 `i = 9`，`s = 3 * 9 = 27`；再乘 3 后 `i = 27`，不再满足 `i <= 10`，循环结束。因此程序输出 27，对应选项 A。',
    explanationText: '原卷代码在导入时丢失了。补回代码后按顺序模拟：初始 s = 1；当 i = 1 时，s = 1 * 1 = 1；随后 i *= 3 变为 3，s = 1 * 3 = 3；再次循环时 i = 9，s = 3 * 9 = 27；再乘 3 后 i = 27，不再满足 i <= 10，循环结束。因此程序输出 27，对应选项 A。',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2025-06-cpp-6-q3', {
    enabled: false,
    explanation: '已核对 GESP 原卷，第 3 题题面确实写的是“代码同上一题”，且所需代码只出现在上一题配图中。当前题库记录并未携带上一题配图，学员无法独立作答。为避免继续投放不完整题，已先停用该题，待补齐依赖图片后再恢复。',
    explanationText: '已核对 GESP 原卷，第 3 题题面确实写的是“代码同上一题”，且所需代码只出现在上一题配图中。当前题库记录并未携带上一题配图，学员无法独立作答。为避免继续投放不完整题，已先停用该题，待补齐依赖图片后再恢复。',
    reviewStatus: 'rejected'
  }],
  ['gesp-2024-09-cpp-7-q12', {
    answer: 'C',
    explanation: '该题官方题面图片中的程序先初始化 `path[i][0] = i` 与 `path[0][j] = j`，再按 `path[i][j] = path[i - 1][j] + path[i][j - 1]` 递推。依次计算可得：`path[8][1] = 37`，`path[8][2] = 130`，`path[8][3] = 385`，最终 `path[8][4] = 627 + 385 = 1012`，因此输出为 1012，对应选项 C。该题在 GESP 原卷 config 中漏掉了第 12 题答案，现已按原题代码补齐。',
    explanationText: '该题官方题面图片中的程序先初始化 path[i][0] = i 与 path[0][j] = j，再按 path[i][j] = path[i - 1][j] + path[i][j - 1] 递推。依次计算可得：path[8][1] = 37，path[8][2] = 130，path[8][3] = 385，最终 path[8][4] = 627 + 385 = 1012，因此输出为 1012，对应选项 C。该题在 GESP 原卷 config 中漏掉了第 12 题答案，现已按原题代码补齐。',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1101-q20', {
    reviewStatus: 'reviewed'
  }],
  ['downloads-1109-q20', {
    enabled: false,
    explanation: '原卷这一题是带 5 个填空位置的程序填空题，当前导入结果却把 5 组小题和 20 个选项压成了一条单选题记录，题面与选项结构已经损坏，无法作为单题安全作答。为避免继续误导学员，已先停用该题，后续应按原卷重新拆分整理。',
    explanationText: '原卷这一题是带 5 个填空位置的程序填空题，当前导入结果却把 5 组小题和 20 个选项压成了一条单选题记录，题面与选项结构已经损坏，无法作为单题安全作答。为避免继续误导学员，已先停用该题，后续应按原卷重新拆分整理。',
    reviewStatus: 'rejected'
  }],
  ['gesp-2025-09-cpp-2-q19', {
    reviewStatus: 'reviewed'
  }]
])

const issueActions = new Map([
  ['downloads-1109-q20', { status: 'resolved', adminNote: '原卷是 5 空程序填空题，导入时被压成单题并混入全部选项，结构已损坏，已先停用。' }],
  ['gesp-2025-06-cpp-1-q2', { status: 'ignored', adminNote: '已核对 GESP 原卷 config，第 2 题官方答案就是 A，当前题目无误。' }],
  ['downloads-1112-q12', { status: 'resolved', adminNote: '原卷代码输出应为 15，但当前选项无正确项，说明导入结果损坏，已先停用。' }],
  ['gesp-2025-06-cpp-6-q3', { status: 'resolved', adminNote: '题面依赖上一题配图中的代码，当前记录不完整，已先停用。' }],
  ['gesp-2025-09-cpp-2-q19', { status: 'ignored', adminNote: '已核对，当前为判断题，题库不需要额外单选选项。' }],
  ['downloads-1109-q12', { status: 'resolved', adminNote: '已补回原卷代码，确认程序输出 27，答案 A 正确。' }],
  ['gesp-2024-09-cpp-7-q12', { status: 'resolved', adminNote: '已根据官方题面代码补算答案，输出为 1012，对应 C；原卷 config 漏了该题答案。' }],
  ['downloads-1101-q20', { status: 'ignored', adminNote: '已核对，3.0 不是 int 常量，当前判断题答案 B 正确。' }]
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