import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）源码/1 数据结构进阶')
const outputChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）题目/1 数据结构进阶')

const items = [
  {
    order: 1,
    source: '1.1 分块/hdu4417 blocks.cpp',
    pid: 'HDU4417',
    manualTitle: '区间小于等于计数（推断）',
    manualContent: `## 题目描述\n给定一个长度为 $n$ 的整数序列，回答若干次区间查询。每次查询给定区间 $[l,r]$ 和整数 $h$，需要统计该区间内有多少个数小于等于 $h$。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试组数。\n\n对于每组数据：\n\n- 第一行输入两个整数 $n,m$，表示序列长度和查询次数；\n- 第二行输入 $n$ 个整数，表示初始序列；\n- 接下来 $m$ 行，每行输入三个整数 $l,r,h$，表示一次查询。源码中下标会整体加一处理。\n\n## 输出格式\n对于每组数据，先输出一行 Case x:，随后对每次查询输出一行一个整数，表示区间内小于等于 $h$ 的元素个数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用分块加块内排序处理静态区间计数，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '1.1 分块/hdu5057 blocks.cpp',
    pid: 'HDU5057',
    manualTitle: '单点修改区间数位统计（推断）',
    manualContent: `## 题目描述\n给定一个长度为 $n$ 的整数序列，支持两类操作：\n\n- S x y：将位置 $x$ 的数修改为 $y$；\n- Q l r d p：查询区间 $[l,r]$ 内有多少个数的第 $d$ 位数字等于 $p$。\n\n其中第 1 位表示个位。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试组数。\n\n对于每组数据：\n\n- 第一行输入两个整数 $n,m$；\n- 第二行输入 $n$ 个整数，表示初始序列；\n- 接下来 $m$ 行，每行输入一条操作。\n\n## 输出格式\n对于每个查询操作，输出一行一个整数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用分块维护每个块在各数位上的数字频次，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '1.2 跳跃表/hdu4006.cpp',
    pid: 'HDU4006',
    manualTitle: '动态维护第 K 大数（推断）',
    manualContent: `## 题目描述\n维护一个动态整数集合，支持插入操作以及查询当前集合中第 $k$ 大的元素。\n\n## 输入格式\n第一行输入两个整数，表示操作总数和参数 $k$。\n\n接下来若干行，每行是一条操作：\n\n- I x：插入一个整数 $x$；\n- Q：查询当前集合中的第 $k$ 大元素。\n\n## 输出格式\n对于每个查询操作，输出一行一个整数。\n\n## 说明\n该题面根据教材源码文件名和同题常见做法推断生成，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '1.2 跳跃表/p1486.cpp',
    pid: 'P1486',
    manualTitle: '工资表排名查询（推断）',
    manualContent: `## 题目描述\n维护一组员工工资，设有最低工资线 $Min$。支持以下操作：\n\n- I k：当 $k \ge Min$ 时插入一名工资为 $k$ 的员工；\n- A k：所有员工工资增加 $k$；\n- S k：所有员工工资减少 $k$，并将工资降到 $Min$ 以下的员工移除；\n- F k：查询当前第 $k$ 高的工资。\n\n最后还需要输出整个过程中被移除的员工总数。\n\n## 输入格式\n第一行输入两个整数 $n,Min$，表示操作数和最低工资线。\n\n接下来 $n$ 行，每行输入一条操作。\n\n## 输出格式\n对于每个 F 操作，输出一行结果；若当前员工数不足 $k$ 人则输出 -1。\n\n所有操作结束后，再输出一行一个整数，表示被移除的员工总数。\n\n## 说明\n若本地存在 Luogu P1486 文档，则优先使用文档题面；否则以上题面根据 AC 代码行为推断生成。`,
  },
]

const skipped = ['1.1 分块/blocks.cpp', '1.2 跳跃表/skip list.cpp']

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: ['P1486'] },
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
  if (doc) {
    const title = normalizeTitle(doc.title, item.pid)
    return `# ${item.pid} ${title}\n\n${String(doc.content || '').trim()}\n`
  }
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

const readme = `# 1 数据结构进阶\n\n本目录按原始教材顺序整理进阶篇第一章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n- 无\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- P1486 若本地 Document 集合存在 Luogu 文档，则优先使用文档题面；其余题面根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')
console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
