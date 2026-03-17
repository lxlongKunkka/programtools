import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）源码/5 可持久化数据结构')
const outputChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）题目/5 可持久化数据结构')

const items = [
  {
    order: 1,
    source: 'hdu4348.cpp',
    pid: 'HDU4348',
    manualTitle: '可持久化区间加与历史查询（推断）',
    manualContent: `## 题目描述\n给定一个初始数列，支持以下操作：\n\n- C l r d：在当前版本中把区间 $[l,r]$ 的每个数都加上 $d$，并生成一个新版本；\n- Q l r：查询当前版本区间 $[l,r]$ 的元素和；\n- H l r t：查询历史版本 $t$ 中区间 $[l,r]$ 的元素和；\n- B t：将当前版本回退到版本 $t$。\n\n## 输入格式\n输入数列长度、操作数、初始数列以及若干条操作。\n\n## 输出格式\n对于每个查询操作，输出一行一个整数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用带懒标记的可持久化线段树，建议后续人工复核。`,
  },
  {
    order: 2,
    source: 'hdu4417.cpp',
    pid: 'HDU4417',
    manualTitle: '主席树区间小于等于计数（推断）',
    manualContent: `## 题目描述\n给定一个整数序列，回答若干次区间查询。每次查询给定区间 $[l,r]$ 和整数 $h$，需要统计区间内有多少个数小于等于 $h$。\n\n## 输入格式\n第一行输入测试组数。对于每组数据，输入序列长度、查询次数、初始序列以及若干条查询。源码中区间端点会整体加一处理。\n\n## 输出格式\n对于每组数据，先输出 Case x:，随后对每次查询输出一行一个整数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用离散化加可持久化权值线段树处理区间计数，建议后续人工复核。`,
  },
  {
    order: 3,
    source: 'p4735.cpp',
    pid: 'P4735',
    manualTitle: '最大异或和',
    manualContent: `## 题目描述\n维护一个动态序列，支持在末尾加入一个数，以及在指定区间内查询某个值与该区间前缀异或和集合的最大异或结果。\n\n## 输入格式\n输入初始序列长度、操作数、初始序列以及若干条操作。\n\n## 输出格式\n对于每个查询操作，输出一行一个整数。\n\n## 说明\n若本地存在 Luogu P4735 文档，则优先使用文档题面；否则以上题面根据 AC 代码行为推断生成。`,
  },
]

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: ['P4735'] },
}).select('pid title content').lean()
const docMap = new Map(docs.map(doc => [String(doc.pid).toUpperCase(), doc]))

function normalizeTitle(rawTitle, pid) {
  const title = String(rawTitle || '').trim()
  if (!title) return pid
  return title.replace(/^【[^】]+】\s*/, '').replace(/^\[[^\]]+\]\s*/, '').trim() || pid
}

function sanitizeSegment(value) {
  return String(value).replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim()
}

function buildProblemMarkdown(item) {
  const doc = docMap.get(String(item.pid).toUpperCase())
  if (doc) return `# ${item.pid} ${normalizeTitle(doc.title, item.pid)}\n\n${String(doc.content || '').trim()}\n`
  return `# ${item.pid} ${item.manualTitle}\n\n${item.manualContent}\n`
}

function resolveTitle(item) {
  const doc = docMap.get(String(item.pid).toUpperCase())
  return doc ? normalizeTitle(doc.title, item.pid) : item.manualTitle
}

fs.mkdirSync(outputChapterDir, { recursive: true })
const generated = []
for (const item of items) {
  const title = resolveTitle(item)
  const folderName = `${String(item.order).padStart(2, '0')}-${item.pid}-${sanitizeSegment(title)}`
  const folderPath = path.join(outputChapterDir, folderName)
  const sourcePath = path.join(sourceChapterDir, item.source)
  fs.mkdirSync(folderPath, { recursive: true })
  fs.copyFileSync(sourcePath, path.join(folderPath, 'source.cpp'))
  fs.copyFileSync(sourcePath, path.join(folderPath, 'std.cpp'))
  fs.writeFileSync(path.join(folderPath, 'problem.md'), buildProblemMarkdown(item), 'utf8')
  generated.push(`- ${folderName}`)
}

const readme = `# 5 可持久化数据结构\n\n本目录按原始教材顺序整理进阶篇第五章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n- 无\n\n## 同题其他实现\n\n- 无\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- P4735 若本地存在 Luogu 文档，则优先使用文档题面；其余题面根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')
console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
