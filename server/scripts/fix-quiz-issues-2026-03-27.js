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
    .replace(/[#>*_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildOptions(items) {
  return items.map((item) => ({
    key: String(item.key || '').trim(),
    text: String(item.text || '').trim(),
    textPlain: String(item.text || '').trim(),
    images: []
  }))
}

const FIXED_AT = new Date().toISOString()

const questionPatches = new Map([
  ['gesp-2024-09-cpp-1-q4', {
    answer: 'B',
    explanation: '在 C++ 中，乘法优先级高于减法。先算 3 * 2 = 6，再算 10 - 6 = 4，所以正确答案是 B。',
    explanationText: '在 C++ 中，乘法优先级高于减法。先算 3 * 2 = 6，再算 10 - 6 = 4，所以正确答案是 B。',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1015-q19', {
    stem: '若有如下程序段，其中 s、a、b、c 均已定义为整型变量，且 a、c 均已赋值，c > 0。则与上述程序段功能等价的赋值语句是（ ）\n\n```cpp\ns = a;\nfor (b = 1; b <= c; b++) s += 1;\n```',
    stemText: '若有如下程序段，其中 s、a、b、c 均已定义为整型变量，且 a、c 均已赋值，c > 0。则与上述程序段功能等价的赋值语句是（ ） cpp s = a; for (b = 1; b <= c; b++) s += 1;',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1102-q18', {
    answer: 'false',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1103-q4', {
    stem: '若有以下代码，则数组 arr 的长度是（ ）？\n\n```cpp\nint arr[] = {1, 2, 3, 4, 5};\n```',
    stemText: '若有以下代码，则数组 arr 的长度是（ ）？ cpp int arr[] = {1, 2, 3, 4, 5};',
    reviewStatus: 'reviewed'
  }],
  ['downloads-1104-q23', {
    answer: 'false',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2023-09-cpp-3-q17', {
    answer: 'true',
    explanation: 'C++ 中位运算符也有明确的优先级顺序，例如移位、按位与、按位异或、按位或的优先级并不相同。为了避免歧义，写表达式时应根据需要添加括号，因此题干说法正确。',
    explanationText: 'C++ 中位运算符也有明确的优先级顺序，例如移位、按位与、按位异或、按位或的优先级并不相同。为了避免歧义，写表达式时应根据需要添加括号，因此题干说法正确。',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2023-12-cpp-6-q21', {
    stem: '在下面 C++ 代码中，由于 `delete ptr` 释放了 ptr 指向的堆内存，因此最后一行代码被执行时，将报错。（ ）\n\n```cpp\nint * ptr = new int(10);\ncout << *ptr << endl;\ndelete ptr;\ncout << *ptr << endl;\n```',
    stemText: '在下面 C++ 代码中，由于 delete ptr 释放了 ptr 指向的堆内存，因此最后一行代码被执行时，将报错。（ ） cpp int * ptr = new int(10); cout << *ptr << endl; delete ptr; cout << *ptr << endl;',
    explanation: '题干说法是错误的。delete ptr 只会释放 ptr 指向的堆内存，不会删除变量 ptr 本身。随后再解引用 ptr 属于未定义行为，程序可能崩溃、可能输出旧值，也可能表现为其他结果，并不保证一定“报错”，所以本题应判断为 false。',
    explanationText: '题干说法是错误的。delete ptr 只会释放 ptr 指向的堆内存，不会删除变量 ptr 本身。随后再解引用 ptr 属于未定义行为，程序可能崩溃、可能输出旧值，也可能表现为其他结果，并不保证一定报错，所以本题应判断为 false。',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2023-12-cpp-6-q7', {
    explanation: '哈夫曼编码的目标是让加权路径长度最小。对字符串 hello world 统计频次可得：l 出现 3 次，o 出现 2 次，其余字符各出现 1 次。按哈夫曼构造过程合并后，可得到一种最优编码长度分配：l 的编码长度为 2，o 的编码长度为 3，其余 6 个低频字符的编码长度分别为 3、3、3、3、4、4。于是总比特数为 3×2 + 2×3 + 4×3 + 2×4 = 32，所以正确答案是 B。',
    explanationText: '哈夫曼编码的目标是让加权路径长度最小。对字符串 hello world 统计频次可得：l 出现 3 次，o 出现 2 次，其余字符各出现 1 次。按哈夫曼构造过程合并后，可得到一种最优编码长度分配：l 的编码长度为 2，o 的编码长度为 3，其余 6 个低频字符的编码长度分别为 3、3、3、3、4、4。于是总比特数为 3×2 + 2×3 + 4×3 + 2×4 = 32，所以正确答案是 B。',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-12-cpp-1-q3', {
    options: buildOptions([
      { key: 'A', text: '配对双引号内，可以有汉字' },
      { key: 'B', text: '配对双引号可以相应改为单引号，输出效果不变' },
      { key: 'C', text: '配对双引号可以相应改为三个连续单引号，输出效果不变' },
      { key: 'D', text: '配对双引号可以相应改为三个连续双引号，输出效果不变' }
    ]),
    answer: 'A',
    explanation: 'A 正确，因为字符串字面量中的内容可以包含汉字。B 错在单引号表示字符字面量，不能直接替代字符串字面量；C 和 D 都不是 C++ 中合法的字符串写法，所以正确答案应为 A。',
    explanationText: 'A 正确，因为字符串字面量中的内容可以包含汉字。B 错在单引号表示字符字面量，不能直接替代字符串字面量；C 和 D 都不是 C++ 中合法的字符串写法，所以正确答案应为 A。',
    reviewStatus: 'reviewed'
  }]
])

const issueActions = new Map([
  ['gesp-2024-09-cpp-1-q4', { status: 'resolved', adminNote: '已补回正确答案 B，并补充解析。' }],
  ['gesp-2024-09-cpp-3-q20', { status: 'ignored', adminNote: '已核对，题目为判断题，不需要单独展示 A/B/C/D 选项。' }],
  ['downloads-1015-q19', { status: 'resolved', adminNote: '已补回缺失的程序段代码块。' }],
  ['downloads-1102-q18', { status: 'resolved', adminNote: '已修正判断题答案编码，正确答案为 false。' }],
  ['downloads-1103-q13', { status: 'ignored', adminNote: '已核对流程图和答案，当前正确答案 D 无误。' }],
  ['downloads-1103-q4', { status: 'resolved', adminNote: '已补回缺失的代码块，题意恢复完整。' }],
  ['downloads-1104-q23', { status: 'resolved', adminNote: '已修正判断题答案编码，正确答案为 false。' }],
  ['downloads-1109-q3', { status: 'ignored', adminNote: '已核对，表达式 4 * x / 3 与题意等价，当前答案 B 正确。' }],
  ['gesp-2023-09-cpp-3-q17', { status: 'resolved', adminNote: '已补回判断题答案 true，并补充解析。' }],
  ['gesp-2023-12-cpp-6-q21', { status: 'resolved', adminNote: '已修正题面中错误的行号表述，并重写解析。' }],
  ['gesp-2023-12-cpp-6-q7', { status: 'resolved', adminNote: '已修正解析排版，避免树形示意在页面中错乱。' }],
  ['gesp-2024-03-cpp-1-q11', { status: 'ignored', adminNote: '已核对，选项与答案 D 正确，无需修改。' }],
  ['gesp-2024-03-cpp-3-q15', { status: 'ignored', adminNote: '已核对，王选的重大贡献应为发明汉字激光照排系统，答案 C 正确。' }],
  ['gesp-2024-03-cpp-3-q21', { status: 'ignored', adminNote: '已核对，题目为判断题，不需要额外单选选项。' }],
  ['gesp-2024-06-cpp-1-q2', { status: 'ignored', adminNote: '已核对运算过程，3 - 3 * 3 / 5 的结果为 2，答案 D 正确。' }],
  ['gesp-2024-12-cpp-1-q3', { status: 'resolved', adminNote: '已修正错误选项表述，并重写解析。' }],
  ['gesp-2024-12-cpp-3-q20', { status: 'ignored', adminNote: '已核对，00001111 为八进制常量，按位与后仍输出 A，当前答案 true 正确。' }],
  ['gesp-2025-03-cpp-1-q22', { status: 'ignored', adminNote: '已核对，循环中会输出 7 个 true，当前答案 true 正确。' }]
])

async function main() {
  const apply = hasFlag('apply')
  const outFile = String(getArg('out', '')).trim()
  const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()

  try {
    const questionCollection = conn.collection('quiz_questions')
    const issueCollection = conn.collection('quiz_question_issues')
    const report = {
      generatedAt: FIXED_AT,
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