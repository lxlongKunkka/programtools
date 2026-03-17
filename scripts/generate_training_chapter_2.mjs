import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/2 算法之美')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/2 算法之美')

const items = [
  { order: 1, source: 'exam1 P5737.cpp', pid: 'P5737' },
  { order: 2, source: 'exam4 B2057.cpp', pid: 'B2057' },
  { order: 3, source: 'exam5 P5739.cpp', pid: 'P5739' },
  { order: 4, source: 'exam6 B2064.cpp', pid: 'B2064' },
  { order: 5, source: 'exam7 P1427.cpp', pid: 'P1427' },
  { order: 6, source: 'exam8 B3634.cpp', pid: 'B3634' },
]

const skipped = ['2-1 add.cpp', '2-2 fib.cpp', '2-3 fac.cpp', 'exam2 swap1.cpp', 'exam3 swap2.cpp']

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: items.map(item => item.pid) },
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

fs.mkdirSync(outputChapterDir, { recursive: true })

const summary = []
for (const item of items) {
  const doc = docMap.get(item.pid)
  if (!doc) {
    summary.push(`- ${String(item.order).padStart(2, '0')} ${item.source}: 缺少 luogu 文档，未生成`)
    continue
  }

  const title = normalizeTitle(doc.title, item.pid)
  const folderName = `${String(item.order).padStart(2, '0')}-${item.pid}-${sanitizeSegment(title)}`
  const folderPath = path.join(outputChapterDir, folderName)
  fs.mkdirSync(folderPath, { recursive: true })

  const sourcePath = path.join(sourceChapterDir, item.source)
  fs.copyFileSync(sourcePath, path.join(folderPath, 'source.cpp'))
  fs.copyFileSync(sourcePath, path.join(folderPath, 'std.cpp'))

  const problemMd = `# ${item.pid} ${title}\n\n${String(doc.content || '').trim()}\n`
  fs.writeFileSync(path.join(folderPath, 'problem.md'), problemMd, 'utf8')
  summary.push(`- ${folderName}`)
}

const readme = `# 2 算法之美\n\n本目录按原始教材顺序整理第二章题目素材。\n\n## 已生成题目\n\n${summary.join('\n')}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 题面优先来自 Document 集合中 domainId = luogu 的文档。\n- 第二章中的性能对比和 swap 教学示例未纳入题目目录。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${summary.length} entries in ${outputChapterDir}`)
process.exit(0)
