import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/8 搜索算法入门')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/8 搜索算法入门')

const items = [
  { order: 1, source: '二分搜索/P2249.cpp', pid: 'P2249' },
  { order: 2, source: '二分搜索/P2678.cpp', pid: 'P2678' },
  {
    order: 3,
    source: '二分搜索/poj1759.cpp',
    pid: 'POJ1759',
    manualTitle: '花环高度（推断）',
    manualContent: `## 题目描述\n有一串共 $n$ 个花环节点，第一个节点的高度为 $A$，其余节点的高度满足递推关系：\n\n$$h_i = 2h_{i-1} - h_{i-2} + 2 \\quad (i \\ge 3)$$\n\n你需要确定第二个节点的最小可能高度，使得所有节点的高度都严格大于 $0$。在满足条件时，输出最后一个节点的高度。\n\n## 输入格式\n每组输入一行，包含一个整数 $n$ 和一个实数 $A$，分别表示节点数量和第一个节点的高度。\n\n## 输出格式\n对于每组数据，输出最后一个节点的高度，保留两位小数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用二分搜索最小可行的第二项高度，建议后续人工复核。`
  },
  {
    order: 4,
    source: '广度优先搜索/poj3984.cpp',
    pid: 'POJ3984',
    manualTitle: '迷宫最短路径（推断）',
    manualContent: `## 题目描述\n给定一个 $5 \times 5$ 的网格迷宫，其中数字 $0$ 表示可以通行，数字 $1$ 表示障碍物。\n\n从左上角 $(0,0)$ 出发，只能向上、下、左、右四个方向移动，目标是到达右下角 $(4,4)$。请输出一条最短路径上的所有坐标。\n\n## 输入格式\n输入一个 $5 \times 5$ 的整数矩阵。\n\n## 输出格式\n按路径顺序逐行输出经过的坐标，格式为 $(x, y)$。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 BFS 并记录前驱恢复路径，建议后续人工复核。`
  },
  {
    order: 5,
    source: '广度优先搜索/poj3624_2.cpp',
    pid: 'POJ3624',
    manualTitle: '背包最优价值（推断）',
    manualContent: `## 题目描述\n有 $n$ 件物品和一个容量为 $m$ 的背包。第 $i$ 件物品的重量为 $w_i$，价值为 $v_i$。每件物品最多只能选择一次。\n\n请你求出在不超过背包容量的前提下，能够获得的最大总价值。\n\n## 输入格式\n第一行输入两个整数 $n$ 和 $m$。\n\n接下来 $n$ 行，每行输入两个整数 $w_i$ 和 $v_i$。\n\n## 输出格式\n输出一行一个整数，表示最大总价值。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用基于优先队列的分支限界搜索，建议后续人工复核。`
  },
  {
    order: 6,
    source: '深度优先搜索/hdu2553.cpp',
    pid: 'HDU2553',
    manualTitle: 'N 皇后方案数（推断）',
    manualContent: `## 题目描述\n给定一个整数 $n$，求在 $n \times n$ 的棋盘上放置 $n$ 个皇后，使得任意两个皇后都不在同一行、同一列、同一条对角线上的方案数。\n\n## 输入格式\n输入包含多组数据，每组一行一个整数 $n$。\n\n当输入为 $0$ 时结束。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示对应的方案数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码预处理了 $1$ 到 $10$ 皇后的答案，建议后续人工复核。`
  },
  { order: 7, source: '深度优先搜索/p2819.cpp', pid: 'P2819' },
]

const skipped = [
  '二分搜索/BinarySearch.cpp',
  '广度优先搜索/poj3624_2 test.cpp',
]

const alternateImplementations = {
  P2249: ['二分搜索/P2249_2.cpp'],
  POJ3624: ['深度优先搜索/poj3624.cpp'],
  HDU2553: ['深度优先搜索/hdu2553_2.cpp'],
}

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: items.filter(item => !item.manualContent).map(item => item.pid) },
}).select('pid title content').lean()

const docMap = new Map(docs.map(doc => [String(doc.pid).toUpperCase(), doc]))

function normalizeTitle(rawTitle, pid) {
  const title = String(rawTitle || '').trim()
  if (!title) return pid
  return title
    .replace(/^【[^】]+】\s*/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\//g, ' - ')
    .trim() || pid
}

function sanitizeSegment(value) {
  return String(value)
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildProblemMarkdown(item, doc) {
  if (item.manualContent) {
    return `# ${item.pid} ${item.manualTitle}\n\n${item.manualContent}\n`
  }
  const title = normalizeTitle(doc?.title, item.pid)
  return `# ${item.pid} ${title}\n\n${String(doc?.content || '').trim()}\n`
}

fs.mkdirSync(outputChapterDir, { recursive: true })

const generated = []
const missing = []
for (const item of items) {
  const doc = item.manualContent ? null : docMap.get(String(item.pid).toUpperCase())
  if (!item.manualContent && !doc) {
    missing.push(`- ${String(item.order).padStart(2, '0')} ${item.source}: 缺少题面，未生成`)
    continue
  }

  const title = item.manualTitle || normalizeTitle(doc.title, item.pid)
  const folderName = `${String(item.order).padStart(2, '0')}-${item.pid}-${sanitizeSegment(title)}`
  const folderPath = path.join(outputChapterDir, folderName)
  const sourcePath = path.join(sourceChapterDir, item.source)

  fs.mkdirSync(folderPath, { recursive: true })
  fs.copyFileSync(sourcePath, path.join(folderPath, 'source.cpp'))
  fs.copyFileSync(sourcePath, path.join(folderPath, 'std.cpp'))
  fs.writeFileSync(path.join(folderPath, 'problem.md'), buildProblemMarkdown(item, doc), 'utf8')

  generated.push(`- ${folderName}`)
}

const alternateLines = Object.entries(alternateImplementations)
  .map(([pid, files]) => `- ${pid}: ${files.join('、')}`)
  .join('\n')

const readme = `# 8 搜索算法入门\n\n本目录按原始教材顺序整理第八章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n${missing.length ? `## 未生成\n\n${missing.join('\n')}\n\n` : ''}## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 洛谷题题面优先来自 Document 集合中 domainId = luogu 的文档。\n- POJ/HDU 题面的中文描述根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
if (missing.length) {
  console.log(`Missing ${missing.length} entries`)
}
process.exit(0)
