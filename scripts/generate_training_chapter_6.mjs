import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/6 算法入门')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/6 算法入门')

const items = [
  { order: 1, source: 'P1177 quicksort2.cpp', pid: 'P1177' },
  { order: 2, source: 'P1223.cpp', pid: 'P1223' },
  { order: 3, source: 'P1803.cpp', pid: 'P1803' },
  { order: 4, source: 'P1923.cpp', pid: 'P1923' },
  { order: 5, source: 'P2240.cpp', pid: 'P2240' },
]

const skipped = ['greedy.cpp']
const alternateImplementations = {
  P1177: ['P1177 mergesort.cpp', 'P1177 quicksort0.cpp', 'P1177 quicksort1.cpp'],
}

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: items.map(item => item.pid) },
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
  const title = normalizeTitle(doc?.title, item.pid)
  return `# ${item.pid} ${title}\n\n${String(doc?.content || '').trim()}\n`
}

fs.mkdirSync(outputChapterDir, { recursive: true })

const generated = []
const missing = []
for (const item of items) {
  const doc = docMap.get(String(item.pid).toUpperCase())
  if (!doc) {
    missing.push(`- ${String(item.order).padStart(2, '0')} ${item.source}: 缺少题面，未生成`)
    continue
  }

  const title = normalizeTitle(doc.title, item.pid)
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

const readme = `# 6 算法入门\n\n本目录按原始教材顺序整理第六章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n${missing.length ? `## 未生成\n\n${missing.join('\n')}\n\n` : ''}## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 题面优先来自 Document 集合中 domainId = luogu 的文档。\n- P1177 目录默认保留 P1177 quicksort2.cpp 作为 AC 代码，其余实现仍保留在源码目录中。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
if (missing.length) {
  console.log(`Missing ${missing.length} entries`)
}
process.exit(0)
