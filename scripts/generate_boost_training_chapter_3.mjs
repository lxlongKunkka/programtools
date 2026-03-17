import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）源码/3 查找算法')
const outputChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）题目/3 查找算法')

const items = [
  { order: 1, source: 'p1308 kmp.cpp', pid: 'P1308' },
  { order: 2, source: 'p3375 kmp.cpp', pid: 'P3375' },
  {
    order: 3,
    source: 'poj2503 Trie.cpp',
    pid: 'POJ2503',
    manualTitle: '双语词典查询（推断）',
    manualContent: `## 题目描述\n给定一个双语词典，每条词典记录包含一对单词，前者表示原语言单词，后者表示外语单词。随后给出若干个外语单词查询，请输出其对应的原语言单词；如果词典中不存在，则输出 eh。\n\n## 输入格式\n前若干行每行包含两个字符串，表示一条词典记录。\n\n当读到一个空行时，表示词典输入结束。\n\n之后每行输入一个待查询的外语单词，直到文件结束。\n\n## 输出格式\n对于每个查询，输出对应的原语言单词；若不存在则输出 eh。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 Trie 存储外语单词并映射到原语言单词，建议后续人工复核。`,
  },
  {
    order: 4,
    source: 'poj3349 hash+链式前向星.cpp',
    pid: 'POJ3349',
    manualTitle: '雪花判重（推断）',
    manualContent: `## 题目描述\n给定若干片雪花，每片雪花由按顺时针顺序给出的 6 个整数描述。若两片雪花在旋转后完全相同，或翻转后再旋转可以完全相同，则认为这两片雪花相同。\n\n请判断输入中是否存在两片相同的雪花。\n\n## 输入格式\n第一行输入一个整数 $n$，表示雪花数量。\n\n接下来 $n$ 行，每行输入 6 个整数，描述一片雪花的六个角。\n\n## 输出格式\n如果存在两片相同的雪花，输出 Twin snowflakes found.；否则输出 No two snowflakes are alike.。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用哈希加链式前向星做判重，建议后续人工复核。`,
  },
]

const skipped = ['BF.cpp', 'hash.cpp', 'KMP.cpp', 'Trie.cpp']
const alternateImplementations = {
  POJ3349: ['poj3349 hash+vector.cpp'],
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

const readme = `# 3 查找算法\n\n本目录按原始教材顺序整理提高篇第三章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n${missing.length ? `## 未生成\n\n${missing.join('\n')}\n\n` : ''}## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 洛谷题题面优先来自 Document 集合中 domainId = luogu 的文档。\n- POJ 题面的中文描述根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
if (missing.length) {
  console.log(`Missing ${missing.length} entries`)
}
process.exit(0)
