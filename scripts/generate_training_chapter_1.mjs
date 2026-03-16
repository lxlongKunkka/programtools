import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/1 语言基础')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/1 语言基础')

const items = [
  { order: 1, source: 'exam1 B2104.cpp', pid: 'B2104', variant: '', manualTitle: '圆的周长和面积（推断）', manualContent: `## 题目描述\n输入圆的半径，计算并输出圆的直径、周长和面积。\n\n取圆周率 PI = 3.14159。输出结果保留 4 位小数。\n\n## 输入格式\n输入一个实数 $r$，表示圆的半径。\n\n## 输出格式\n输出一行，依次输出圆的直径、周长、面积，数字之间用空格分隔，均保留 4 位小数。\n\n\`\`\`input1\n3\n\`\`\`\n\n\`\`\`output1\n6.0000 18.8495 28.2743\n\`\`\`\n\n## 说明\n该题面根据 AC 代码行为推断生成，原题号与文档库中的洛谷题目标题不一致，需后续人工复核。` },
  { order: 2, source: 'exam2 B2050.cpp', pid: 'B2050' },
  { order: 3, source: 'exam3 B2037.cpp', pid: 'B2037' },
  { order: 4, source: 'exam4 P5711.cpp', pid: 'P5711' },
  { order: 5, source: 'exam5 P5714.cpp', pid: 'P5714' },
  { order: 6, source: 'exam6 B2043.cpp', pid: 'B2043' },
  { order: 7, source: 'exam7 B2047.cpp', pid: 'B2047' },
  { order: 8, source: 'exam8 B2048.cpp', pid: 'B2048' },
  { order: 9, source: 'exam9 P5716.cpp', pid: 'P5716' },
  { order: 10, source: 'exam10 P5722_for.cpp', pid: 'P5722', variant: 'for' },
  { order: 11, source: 'exam11 B2098.cpp', pid: 'B2098' },
  { order: 12, source: 'exam12 B2059.cpp', pid: 'B2059' },
  { order: 13, source: 'exam13 B2128.cpp', pid: 'B2128' },
  { order: 14, source: 'exam14 P5722_while.cpp', pid: 'P5722', variant: 'while' },
  { order: 15, source: 'exam15 P5722_do while.cpp', pid: 'P5722', variant: 'do-while' },
  { order: 16, source: 'exam16 B2077.cpp', pid: 'B2077' },
  { order: 17, source: 'exam17 B2064.cpp', pid: 'B2064' },
  { order: 18, source: 'exam18 P5731.cpp', pid: 'P5731' },
  { order: 19, source: 'exam19 P5015.cpp', pid: 'P5015' },
  { order: 20, source: 'exam20 P5740.cpp', pid: 'P5740' },
]

const skipped = ['hello world.cpp', 'datatype.cpp', 'ptr.cpp', 'str.cpp']

const uniquePids = [...new Set(items.filter(item => !item.manualContent).map(item => item.pid))]
const docs = await Document.find({ domainId: 'luogu', pid: { $in: uniquePids } })
  .select('pid title content')
  .lean()

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
  const normalizedTitle = normalizeTitle(doc?.title, item.pid)
  const content = String(doc?.content || '').trim()
  return `# ${item.pid} ${normalizedTitle}\n\n${content}\n`
}

fs.mkdirSync(outputChapterDir, { recursive: true })

const summary = []
for (const item of items) {
  const doc = docMap.get(item.pid)
  if (!item.manualContent && !doc) {
    summary.push(`- ${String(item.order).padStart(2, '0')} ${item.source}: 缺少 luogu 文档，未生成`)
    continue
  }

  const title = item.manualTitle || normalizeTitle(doc.title, item.pid)
  const suffix = item.variant ? `-${item.variant}` : ''
  const folderName = `${String(item.order).padStart(2, '0')}-${item.pid}${suffix}-${sanitizeSegment(title)}`
  const folderPath = path.join(outputChapterDir, folderName)
  fs.mkdirSync(folderPath, { recursive: true })

  const sourcePath = path.join(sourceChapterDir, item.source)
  const sourceTargetPath = path.join(folderPath, 'source.cpp')
  const stdTargetPath = path.join(folderPath, 'std.cpp')
  fs.copyFileSync(sourcePath, sourceTargetPath)
  fs.copyFileSync(sourcePath, stdTargetPath)

  const problemMd = buildProblemMarkdown(item, doc)
  fs.writeFileSync(path.join(folderPath, 'problem.md'), problemMd, 'utf8')

  summary.push(`- ${folderName}`)
}

const readme = `# 1 语言基础\n\n本目录按原始教材顺序整理第一章题目素材。\n\n## 已生成题目\n\n${summary.join('\n')}\n\n## 跳过的演示文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- B2104 的题面根据源码行为推断生成，因为其题号与 luogu 文档库中的标题不一致。\n- P5722 在本章中分别保留了 for、while、do-while 三个实现版本。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${summary.length} entries in ${outputChapterDir}`)
process.exit(0)
