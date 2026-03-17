import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/7 高精度算法')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/7 高精度算法')

const items = [
  { order: 1, source: 'P1303.cpp', pid: 'P1303' },
  { order: 2, source: 'P1480.cpp', pid: 'P1480' },
  { order: 3, source: 'P1601.cpp', pid: 'P1601' },
  { order: 4, source: 'P2142.cpp', pid: 'P2142' },
]

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
for (const entry of fs.readdirSync(outputChapterDir)) {
  fs.rmSync(path.join(outputChapterDir, entry), { recursive: true, force: true })
}

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

const readme = `# 7 高精度算法\n\n本目录按原始教材顺序整理第七章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n${missing.length ? `## 未生成\n\n${missing.join('\n')}\n\n` : ''}## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 题面优先来自 Document 集合中 domainId = luogu 的文档。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
if (missing.length) {
  console.log(`Missing ${missing.length} entries`)
}
process.exit(0)
