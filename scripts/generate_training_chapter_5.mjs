import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/5 图论基础')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/5 图论基础')

const items = [
  { order: 1, source: 'p3916.cpp', pid: 'P3916' },
  {
    order: 2,
    source: 'uva572.cpp',
    pid: 'UVA572',
    manualTitle: '油田数量（推断）',
    manualContent: `## 题目描述\n给定一个由字符组成的二维网格，其中字符 \`@\` 表示油田单元，其他字符表示空地。若两个油田单元在 8 个方向之一相邻（包括上下左右和四个对角方向），则认为它们属于同一个油田。\n\n请统计网格中一共有多少个彼此独立的油田。\n\n## 输入格式\n输入包含多组数据。\n\n每组数据第一行输入两个整数 $m$ 和 $n$，表示网格的行数和列数。\n\n接下来输入 $m$ 行字符串，描述整个网格。\n\n当输入的 $m$ 和 $n$ 同时为 $0$ 时，表示输入结束。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示油田数量。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 DFS 统计 8 连通块，建议后续人工复核。`
  },
]

const skipped = [
  'BFS_AM.cpp',
  'BFS_ListGraph.cpp',
  'BFS_Vec.cpp',
  'createAM.cpp',
  'createEdgeSet.cpp',
  'createListGraph.cpp',
  'createVec.cpp',
  'createVec_2.cpp',
  'DFS_AM.cpp',
  'DFS_ListGraph.cpp',
]

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

const readme = `# 5 图论基础\n\n本目录按原始教材顺序整理第五章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n${missing.length ? `## 未生成\n\n${missing.join('\n')}\n\n` : ''}## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 洛谷题题面优先来自 Document 集合中 domainId = luogu 的文档。\n- UVA572 的中文描述根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
if (missing.length) {
  console.log(`Missing ${missing.length} entries`)
}
process.exit(0)
