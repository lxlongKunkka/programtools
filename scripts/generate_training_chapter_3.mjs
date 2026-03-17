import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/3 线性表的应用')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/3 线性表的应用')

const items = [
  { order: 1, source: 'P1427 stack.cpp', pid: 'P1427' },
  { order: 2, source: 'P1739 stack.cpp', pid: 'P1739' },
  { order: 3, source: 'P5727 vector.cpp', pid: 'P5727' },
  {
    order: 4,
    source: 'hdu1276 list.cpp',
    pid: 'HDU1276',
    manualTitle: '士兵队列训练（推断）',
    manualContent: `## 题目描述\n给定若干组数据，每组数据输入一个正整数 $n$，表示编号为 $1$ 到 $n$ 的士兵排成一列。\n\n先按顺序删除所有当前队列中第 $2$ 个、第 $4$ 个、第 $6$ 个……位置的士兵；删除完成后，再按顺序删除当前队列中第 $3$ 个、第 $6$ 个、第 $9$ 个……位置的士兵；之后继续在 $2$ 和 $3$ 之间交替进行这种删除操作。\n\n当队列中只剩下 3 名士兵时停止，输出剩余士兵的编号。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n接下来 $T$ 行，每行输入一个整数 $n$。\n\n## 输出格式\n对于每组数据，输出一行，按从小到大的顺序输出最终剩余的 3 名士兵编号，整数之间用空格分隔。\n\n## 说明\n该题面根据 AC 代码行为推断生成，建议后续人工复核。`
  },
  {
    order: 5,
    source: 'poj1915 queue+bfs.cpp',
    pid: 'POJ1915',
    manualTitle: '骑士移动（推断）',
    manualContent: `## 题目描述\n在一个 $L \\times L$ 的国际象棋棋盘上，给定骑士的起点坐标和终点坐标，求骑士从起点移动到终点所需的最少步数。\n\n骑士每次移动遵循国际象棋规则，可以走到 8 个可能的位置之一。\n\n## 输入格式\n第一行输入一个整数 $N$，表示测试数据组数。\n\n对于每组数据：\n\n- 第一行输入一个整数 $L$，表示棋盘大小；\n- 第二行输入两个整数，表示起点坐标；\n- 第三行输入两个整数，表示终点坐标。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最少步数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码采用 BFS 求解最短路，建议后续人工复核。`
  },
]

const skipped = ['sqlist.cpp', 'sqstack.cpp', 'sqqueue.cpp', 'linklist.cpp']

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: items.filter(item => !item.manualContent).map(item => item.pid) },
}).select('pid title content').lean()

const docMap = new Map(docs.map(doc => [doc.pid, doc]))

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

const summary = []
for (const item of items) {
  const doc = item.manualContent ? null : docMap.get(item.pid)
  if (!item.manualContent && !doc) {
    summary.push(`- ${String(item.order).padStart(2, '0')} ${item.source}: 缺少题面，未生成`)
    continue
  }

  const title = item.manualTitle || normalizeTitle(doc.title, item.pid)
  const folderName = `${String(item.order).padStart(2, '0')}-${item.pid}-${sanitizeSegment(title)}`
  const folderPath = path.join(outputChapterDir, folderName)
  fs.mkdirSync(folderPath, { recursive: true })

  const sourcePath = path.join(sourceChapterDir, item.source)
  fs.copyFileSync(sourcePath, path.join(folderPath, 'source.cpp'))
  fs.copyFileSync(sourcePath, path.join(folderPath, 'std.cpp'))
  fs.writeFileSync(path.join(folderPath, 'problem.md'), buildProblemMarkdown(item, doc), 'utf8')

  summary.push(`- ${folderName}`)
}

const readme = `# 3 线性表的应用\n\n本目录按原始教材顺序整理第三章题目素材。\n\n## 已生成题目\n\n${summary.join('\n')}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 洛谷题题面优先来自 Document 集合中 domainId = luogu 的文档。\n- HDU1276 和 POJ1915 的题面根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${summary.length} entries in ${outputChapterDir}`)
process.exit(0)
