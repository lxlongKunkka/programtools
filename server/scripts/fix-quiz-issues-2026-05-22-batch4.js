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

const questionPatches = new Map([
  ['downloads-1114-q19', {
    options: [
      option('A', '300=2^2*3*5^2'),
      option('B', '2^2*5^2'),
      option('C', '300=2*10*15'),
      option('D', '300=2^2*5^2*3')
    ],
    answer: 'A',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-06-cpp-4-q3', {
    stem: '下面程序输出的是（ ）\n\n```cpp\nint a = 2;\nint b = a + 8;\nint c = a + 1;\nint d = c * c;\ncout << a << " " << b << " " << c << " " << d << endl;\n```',
    stemText: '下面程序输出的是（ ） cpp int a = 2; int b = a + 8; int c = a + 1; int d = c * c; cout << a << " " << b << " " << c << " " << d << endl;',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2024-06-cpp-8-q15', {
    enabled: false,
    reviewStatus: 'rejected',
    explanation: '当前记录只剩“下面程序的输出为”这一句，原始程序代码已经丢失；现有解析推导出的结果是 70，但题目选项中并不存在 70，说明题面和选项至少有一处导入损坏。为避免继续投放错误题目，已先停用，待补齐原题代码后再恢复。',
    explanationText: '当前记录只剩下面程序的输出为这一句，原始程序代码已经丢失；现有解析推导出的结果是 70，但题目选项中并不存在 70，说明题面和选项至少有一处导入损坏。为避免继续投放错误题目，已先停用，待补齐原题代码后再恢复。'
  }],
  ['gesp-2024-09-cpp-7-q11', {
    enabled: false,
    reviewStatus: 'rejected',
    explanation: '当前记录只剩“下面程序的输出为”这一句，原始代码没有保留下来；现有解析把表达式解释为 2 ^ 3 并推出结果 1，但题目选项中并没有 1，说明题面和答案结构已损坏。为避免继续投放错误题目，已先停用，待补齐原题代码后再恢复。',
    explanationText: '当前记录只剩下面程序的输出为这一句，原始代码没有保留下来；现有解析把表达式解释为 2 ^ 3 并推出结果 1，但题目选项中并没有 1，说明题面和答案结构已损坏。为避免继续投放错误题目，已先停用，待补齐原题代码后再恢复。'
  }],
  ['gesp-2024-09-cpp-3-q10', {
    answer: 'D',
    explanation: '先看第一行：a = 123，b = 1。按位与时，1 的二进制只有最低位为 1，因此 123 & 1 的结果只保留 123 的最低位，得到 1。再看第二行：b2 被初始化为 -1，在题目考查语境下可视为所有二进制位都是 1；任何数与全 1 按位与都保持原值，因此 a2 & b2 的结果仍是 -123。故 result 和 result2 的输出分别为 1 和 -123，正确答案是 D。',
    explanationText: '先看第一行：a = 123，b = 1。按位与时，1 的二进制只有最低位为 1，因此 123 & 1 的结果只保留 123 的最低位，得到 1。再看第二行：b2 被初始化为 -1，在题目考查语境下可视为所有二进制位都是 1；任何数与全 1 按位与都保持原值，因此 a2 & b2 的结果仍是 -123。故 result 和 result2 的输出分别为 1 和 -123，正确答案是 D。',
    reviewStatus: 'reviewed'
  }],
  ['gesp-2025-03-cpp-7-q9', {
    stem: '给定一个无向图，图的节点编号从 0 到 n - 1，图的边以邻接表的形式给出。下面的程序使用深度优先搜索（DFS）遍历该图，并输出遍历的节点顺序。横线处应该填入的是（ ）\n\n```cpp\n#include <iostream>\n#include <vector>\n#include <stack>\nusing namespace std;\n\nvoid DFS(int start, vector<vector<int>>& graph, vector<bool>& visited) {\n    stack<int> s;\n    s.push(start);\n    visited[start] = true;\n\n    while (!s.empty()) {\n        int node = s.top();\n        s.pop();\n        cout << node << " ";\n        for (int neighbor : graph[node]) {\n            if (!visited[neighbor]) {\n                ___\n            }\n        }\n    }\n}\n\nint main() {\n    int n, m;\n    cin >> n >> m;\n    vector<vector<int>> graph(n);\n    for (int i = 0; i < m; i++) {\n        int u, v;\n        cin >> u >> v;\n        graph[u].push_back(v);\n        graph[v].push_back(u);\n    }\n    vector<bool> visited(n, false);\n    DFS(0, graph, visited);\n    return 0;\n}\n```',
    stemText: '给定一个无向图，图的节点编号从 0 到 n - 1，图的边以邻接表的形式给出。下面的程序使用深度优先搜索（DFS）遍历该图，并输出遍历的节点顺序。横线处应该填入的是（ ） cpp #include <iostream> #include <vector> #include <stack> using namespace std; void DFS(int start, vector<vector<int>>& graph, vector<bool>& visited) { stack<int> s; s.push(start); visited[start] = true; while (!s.empty()) { int node = s.top(); s.pop(); cout << node << " "; for (int neighbor : graph[node]) { if (!visited[neighbor]) { ___ } } } } int main() { int n, m; cin >> n >> m; vector<vector<int>> graph(n); for (int i = 0; i < m; i++) { int u, v; cin >> u >> v; graph[u].push_back(v); graph[v].push_back(u); } vector<bool> visited(n, false); DFS(0, graph, visited); return 0; }',
    answer: 'D',
    explanation: '在迭代版 DFS 中，当发现一个尚未访问的邻接点 neighbor 时，需要先把它标记为已访问，再把它压入栈中，等待后续继续深搜。因此横线处应填入的逻辑是 visited[neighbor] = true; s.push(neighbor);。四个选项中只有 D 同时满足“标记已访问”和“压入当前邻接点本身”这两个条件，所以正确答案是 D。',
    explanationText: '在迭代版 DFS 中，当发现一个尚未访问的邻接点 neighbor 时，需要先把它标记为已访问，再把它压入栈中，等待后续继续深搜。因此横线处应填入的逻辑是 visited[neighbor] = true; s.push(neighbor);。四个选项中只有 D 同时满足标记已访问和压入当前邻接点本身这两个条件，所以正确答案是 D。',
    reviewStatus: 'reviewed'
  }]
])

const issueActions = new Map([
  ['downloads-1114-q19', { status: 'resolved', adminNote: '已修正质因数分解选项中的幂符号和格式丢失问题。' }],
  ['gesp-2024-06-cpp-4-q3', { status: 'resolved', adminNote: '已补回缺失的程序代码，题意恢复完整。' }],
  ['gesp-2024-06-cpp-8-q15', { status: 'resolved', adminNote: '题面代码丢失且现有解析与选项不一致，已先停用。' }],
  ['gesp-2024-09-cpp-7-q11', { status: 'resolved', adminNote: '题面代码丢失且现有解析与选项不一致，已先停用。' }],
  ['gesp-2024-09-cpp-3-q10', { status: 'resolved', adminNote: '已补全正确答案 D，并补写解析。' }],
  ['gesp-2025-03-cpp-7-q9', { status: 'resolved', adminNote: '已修正题面代码和正确答案，当前答案应为 D。' }]
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