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

function option(key, text) {
  return {
    key,
    text,
    textPlain: text,
    images: []
  }
}

function buildJudgeOptions() {
  return [
    option('true', '正确'),
    option('false', '错误')
  ]
}

const questionPatches = new Map([
  ['downloads-1119-q12', {
    options: [
      option('A', '5'),
      option('B', '6'),
      option('C', '7'),
      option('D', '8')
    ],
    answer: 'B',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1036-q13', {
    stem: '考虑如下递归算法，则调用 solve(7) 得到的返回结果为（ ）\n\n```cpp\nint solve(int n) {\n    if (n <= 1) return 1;\n    return n * solve(n - 2);\n}\n```',
    stemText: '考虑如下递归算法，则调用 solve(7) 得到的返回结果为（ ） cpp int solve(int n) { if (n <= 1) return 1; return n * solve(n - 2); }',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-06-cpp-4-q19', {
    stem: '下面程序两个输出结果是一样的。（ ）\n\n```python\na = 10\nb = 10\nprint(a is b)\nprint(a == b)\n```',
    stemText: '下面程序两个输出结果是一样的。（ ） python a = 10 b = 10 print(a is b) print(a == b)',
    options: buildJudgeOptions(),
    answer: 'true',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-09-cpp-1-q15', {
    stem: '如果一个正整数 N 能够表示为 X * (X + 1) 的形式，这里称它是一个“兄弟数”。例如，输入 6，则输出“6是一个兄弟数”。下面 C++ 代码用来判断 N 是否为一个“兄弟数”，在横线处应填入的代码可从 i)-iv) 中选择，则有几个能完成功能？（ ）\n\n```cpp\nint N;\ncin >> N;\nfor (int i = 0; i <= N; i++)\n    if (___)\n        cout << N << "是一个兄弟数\\n";\n\n// i) N == i * (i + 1)\n// ii) N == i * (i - 1)\n// iii) N / (i + 1) == i\n// iv) N / (i - 1) == i\n```',
    stemText: '如果一个正整数 N 能够表示为 X * (X + 1) 的形式，这里称它是一个兄弟数。例如，输入 6，则输出 6是一个兄弟数。下面 C++ 代码用来判断 N 是否为一个兄弟数，在横线处应填入的代码可从 i)-iv) 中选择，则有几个能完成功能？（ ） cpp int N; cin >> N; for (int i = 0; i <= N; i++) if (___) cout << N << "是一个兄弟数"; i) N == i * (i + 1) ii) N == i * (i - 1) iii) N / (i + 1) == i iv) N / (i - 1) == i',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-09-cpp-4-q15', {
    stem: '运行下面的代码，屏幕上将输出（ ）\n\n```cpp\n#include <iostream>\n#include <stdexcept>\nusing namespace std;\n\nint divide(int a, int b) {\n    if (b == 0) {\n        throw runtime_error("division by zero error");\n    }\n    return a / b;\n}\n\nint main() {\n    int x = 10;\n    int y = 0;\n    try {\n        int result = divide(x, y);\n        cout << "result: " << result << endl;\n    } catch (const runtime_error& e) {\n        cout << "caught an exception: " << e.what() << endl;\n    }\n    return 0;\n}\n```',
    stemText: '运行下面的代码，屏幕上将输出（ ） cpp #include <iostream> #include <stdexcept> using namespace std; int divide(int a, int b) { if (b == 0) { throw runtime_error("division by zero error"); } return a / b; } int main() { int x = 10; int y = 0; try { int result = divide(x, y); cout << "result: " << result << endl; } catch (const runtime_error& e) { cout << "caught an exception: " << e.what() << endl; } return 0; }',
    explanation: '调用 divide(10, 0) 时，由于 b == 0，会抛出 runtime_error("division by zero error")。异常一旦抛出，try 块中后续的 cout << "result: " << result 不会执行，程序直接跳转到 catch 块输出 caught an exception: division by zero error，因此正确答案是 C。',
    explanationText: '调用 divide(10, 0) 时，由于 b == 0，会抛出 runtime_error("division by zero error")。异常一旦抛出，try 块中后续的 cout << result 不会执行，程序直接跳转到 catch 块输出 caught an exception: division by zero error，因此正确答案是 C。',
    answer: 'C',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2023-12-cpp-5-q10', {
    enabled: false,
    reviewStatus: 'rejected',
    explanation: '该题题干直接引用“上题的 _binarySearch 算法”，但当前记录并未携带上一题中的算法内容，学员无法仅凭本题独立作答。为避免继续投放不完整题，已先停用，待补齐依赖题面后再恢复。',
    explanationText: '该题题干直接引用上题的 _binarySearch 算法，但当前记录并未携带上一题中的算法内容，学员无法仅凭本题独立作答。为避免继续投放不完整题，已先停用，待补齐依赖题面后再恢复。'
  }]
])

const issueActions = new Map([
  ['downloads-1119-q12', { status: 'resolved', adminNote: '已修正选项文本中的重复数字排版。' }],
  ['downloads-1036-q13', { status: 'resolved', adminNote: '已补回缺失的递归函数代码。' }],
  ['gesp-2024-06-cpp-4-q19', { status: 'resolved', adminNote: '已补回缺失代码并修正判断题标准选项。' }],
  ['gesp-2024-09-cpp-1-q15', { status: 'resolved', adminNote: '已修正题干中的公式和代码排版。' }],
  ['gesp-2024-09-cpp-4-q15', { status: 'resolved', adminNote: '已修正题干中的异常类型和缺失头文件，并重写解析。' }],
  ['gesp-2023-12-cpp-5-q10', { status: 'resolved', adminNote: '题干依赖上一题算法内容，当前记录不完整，已先停用。' }],
  ['downloads-1103-q13', { status: 'ignored', adminNote: '已按流程图逻辑复核，输入 1、2、3 时输出最大值 3，当前答案 D 正确。' }],
  ['gesp-2025-03-cpp-1-q10', { status: 'ignored', adminNote: '已核对，当前选项与输出结论一致，本条“选项有误”上报不成立。' }],
  ['gesp-2025-09-cpp-2-q13', { status: 'ignored', adminNote: '已核对，题目给出的图形规律与答案 A 一致，当前题面不存在会导致多解的歧义。' }]
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