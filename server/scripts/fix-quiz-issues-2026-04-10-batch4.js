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
  ['gesp-2024-03-cpp-1-q5', { reviewStatus: 'reviewed' }],
  ['gesp-2023-09-cpp-1-q10', { reviewStatus: 'reviewed' }],
  ['gesp-2025-06-cpp-2-q25', {
    answer: 'true',
    explanation: '题目中的判断条件是 `(j == N / 2) || (j == (N - 1) / 2)`。当 `N` 为奇数时，`N / 2` 与 `(N - 1) / 2` 相同，因此只有中间一列输出 `*`；当 `N` 为偶数时，这两个值分别对应中间两列，因此会输出两列 `*`。代码确实能实现题目要求，当前判断题正确答案应为 true。',
    explanationText: '题目中的判断条件是 (j == N / 2) || (j == (N - 1) / 2)。当 N 为奇数时，N / 2 与 (N - 1) / 2 相同，因此只有中间一列输出 *；当 N 为偶数时，这两个值分别对应中间两列，因此会输出两列 *。代码确实能实现题目要求，当前判断题正确答案应为 true。',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1030-q4', {
    stem: '若有如下程序段，其中 s、a、b、c 均已定义为整型变量，且 a、c 均已赋值（c 大于 0）则与上述程序段功能等价的赋值语句是（ ）。\n```cpp\ns = a;\nfor (b = 1; b <= c; b++)\n    s = s - 1;\n```',
    stemText: '若有如下程序段，其中 s、a、b、c 均已定义为整型变量，且 a、c 均已赋值（c 大于 0）则与上述程序段功能等价的赋值语句是（ ）。 cpp s = a; for (b = 1; b <= c; b++) s = s - 1;',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1019-q13', {
    stem: '有以下程序：程序运行后输出的结果是（ ）。\n```cpp\n#include <iostream>\nusing namespace std;\nint main() {\n    int k = 4, n = 0;\n    while (n < k) {\n        n++;\n        if (n % 3 != 0)\n            continue;\n        k--;\n    }\n    cout << k << "," << n << endl;\n    return 0;\n}\n```',
    stemText: '有以下程序：程序运行后输出的结果是（ ）。 cpp include <iostream> using namespace std; int main() { int k = 4, n = 0; while (n < k) { n++; if (n % 3 != 0) continue; k--; } cout << k << "," << n << endl; return 0; }',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1019-q12', {
    stem: '若有如下程序段，其中 s、a、b、c 均已定义为整型变量，且 a、c 均已赋值（c 大于 0）。则与上述程序段修改 s 值的功能等价的赋值语句是（ ）。\n```cpp\ns = a;\nfor (b = 1; b <= c; b++)\n    s = s + 1;\n```',
    stemText: '若有如下程序段，其中 s、a、b、c 均已定义为整型变量，且 a、c 均已赋值（c 大于 0）。则与上述程序段修改 s 值的功能等价的赋值语句是（ ）。 cpp s = a; for (b = 1; b <= c; b++) s = s + 1;',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2025-06-cpp-4-q23', { reviewStatus: 'reviewed' }],
  ['downloads-1119-q3', {
    stem: '函数 calc(n) 的定义如下，则 calc(5) 的返回值是多少？（ ）\n```cpp\nint calc(int n) {\n    if (n <= 1) return 1;\n    if (n % 2 == 0) return calc(n / 2) + 1;\n    else return calc(n - 1) + calc(n - 2);\n}\n```',
    stemText: '函数 calc(n) 的定义如下，则 calc(5) 的返回值是多少？（ ） cpp int calc(int n) { if (n <= 1) return 1; if (n % 2 == 0) return calc(n / 2) + 1; else return calc(n - 1) + calc(n - 2); }',
    explanation: '原卷中的递归函数在导入时丢失了。补回代码后可递推计算：`calc(0)=1`，`calc(1)=1`，`calc(2)=calc(1)+1=2`，`calc(3)=calc(2)+calc(1)=3`，`calc(4)=calc(2)+1=3`，所以 `calc(5)=calc(4)+calc(3)=3+3=6`。因此正确答案是 6，对应选项 B。',
    explanationText: '原卷中的递归函数在导入时丢失了。补回代码后可递推计算：calc(0)=1，calc(1)=1，calc(2)=calc(1)+1=2，calc(3)=calc(2)+calc(1)=3，calc(4)=calc(2)+1=3，所以 calc(5)=calc(4)+calc(3)=3+3=6。因此正确答案是 6，对应选项 B。',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2025-06-cpp-1-q19', { reviewStatus: 'reviewed' }],
  ['gesp-2025-03-cpp-1-q19', { reviewStatus: 'reviewed' }],
  ['gesp-2025-03-cpp-1-q22', { reviewStatus: 'reviewed' }]
])

const issueActions = new Map([
  ['gesp-2024-03-cpp-1-q5', { status: 'ignored', adminNote: '已核对，A 与 B 只是空格差异，printf 实际输出为 a+1=2，当前答案 B 正确。' }],
  ['gesp-2023-09-cpp-1-q10', { status: 'ignored', adminNote: '已核对，当前代码与答案逻辑成立，未发现真实题目错误。' }],
  ['gesp-2025-06-cpp-2-q25', { status: 'resolved', adminNote: '已将判断题答案编码从异常值 e 修正为 true。' }],
  ['downloads-1030-q4', { status: 'resolved', adminNote: '已补回原卷程序段，确认等价语句为 s = a - c。' }],
  ['downloads-1019-q13', { status: 'resolved', adminNote: '已补回原卷代码，确认程序输出 3,3，答案 D 正确。' }],
  ['downloads-1019-q12', { status: 'resolved', adminNote: '已补回原卷程序段，确认等价语句为 s = a + c。' }],
  ['gesp-2025-06-cpp-4-q23', { status: 'ignored', adminNote: '已核对，当前题面代码中已使用 !=，现有题目数据无误。' }],
  ['downloads-1119-q3', { status: 'resolved', adminNote: '已补回原卷递归函数，确认 calc(5)=6，答案 B 正确。' }],
  ['gesp-2025-06-cpp-1-q19', { status: 'ignored', adminNote: '已核对，删除 continue 后仍会输出 END，因此当前判断题答案 false 正确。' }],
  ['gesp-2025-03-cpp-1-q19', { status: 'ignored', adminNote: '已核对，删除 continue 不影响该程序执行效果，当前判断题答案 true 正确。' }],
  ['gesp-2025-03-cpp-1-q22', { status: 'ignored', adminNote: '已核对，代码确实会输出 7 个 true，当前判断题答案 true 正确。' }]
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