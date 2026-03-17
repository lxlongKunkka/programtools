import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）源码/4 复杂树')
const outputChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）题目/4 复杂树')

const items = [
  {
    order: 1,
    source: '4.1 KD树/hdu2966_1.cpp',
    pid: 'HDU2966',
    manualTitle: '最近点距离查询（推断）',
    manualContent: `## 题目描述\n给定平面上的若干个点。对于每个点，求它与其他点之间的最小距离。\n\n## 输入格式\n输入点数以及所有点的坐标。\n\n## 输出格式\n按输入顺序输出每个点到最近其他点的距离平方或距离值，具体以原题为准。\n\n## 说明\n该题面根据 KD 树专题源码和经典原题推断生成，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '4.1 KD树/hdu4347.cpp',
    pid: 'HDU4347',
    manualTitle: 'K 维空间最近点查询（推断）',
    manualContent: `## 题目描述\n给定 $k$ 维空间中的 $n$ 个点，随后给出若干查询点。对于每个查询，输出距离它最近的 $m$ 个点。\n\n## 输入格式\n输入点数 $n$、维度 $k$、所有点坐标，然后输入查询次数。每次查询给出目标点坐标和参数 $m$。\n\n## 输出格式\n对于每个查询，按从近到远输出最近的 $m$ 个点。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 KD 树加优先队列进行最近邻搜索，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '4.2 左偏树/hdu1512.cpp',
    pid: 'HDU1512',
    manualTitle: '可并堆对战（推断）',
    manualContent: `## 题目描述\n有若干个堆，每个堆顶有一个权值。每次选择两个堆：若它们属于同一堆则输出 -1；否则先分别取出两个堆的堆顶，将堆顶值减半后重新放回各自堆中，再把两个堆合并，并输出新堆的堆顶值。\n\n## 输入格式\n输入初始堆数和各堆的初始值，随后输入若干次操作，每次给出两个堆编号。\n\n## 输出格式\n对于每次操作，输出合并后的堆顶值，或在非法情况下输出 -1。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用左偏树维护可并堆，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '4.2 左偏树/p3377.cpp',
    pid: 'P3377',
    manualTitle: '可并堆',
    manualContent: `## 题目描述\n维护若干个可并堆，支持合并两个堆以及删除并输出某个元素所在堆的最小值。\n\n## 输入格式\n输入结点个数、操作数、各结点初始权值以及若干条操作。\n\n## 输出格式\n对于查询删除操作，输出对应堆当前的最小值；若该元素已被删除则输出 -1。\n\n## 说明\n若本地存在 Luogu P3377 文档，则优先使用文档题面；否则以上题面根据 AC 代码行为推断生成。`,
  },
  {
    order: 5,
    source: '4.3 动态树/hdu4010.cpp',
    pid: 'HDU4010',
    manualTitle: '动态树路径操作（推断）',
    manualContent: `## 题目描述\n维护一片动态森林，支持连接边、删除边、修改路径信息以及查询路径信息等操作。\n\n## 输入格式\n输入结点数、初始权值及若干条动态树操作。\n\n## 输出格式\n对查询操作输出对应结果。\n\n## 说明\n该题面根据动态树专题源码与常见 Link-Cut Tree 原题推断生成，建议后续人工复核。`,
  },
  {
    order: 6,
    source: '4.3 动态树/p3690.cpp',
    pid: 'P3690',
    manualTitle: '动态树（Link Cut Tree）',
    manualContent: `## 题目描述\n维护一片森林，支持以下操作：\n\n- 连接两个结点；\n- 删除一条边；\n- 查询两点路径上的异或和；\n- 修改某个结点的点权。\n\n## 输入格式\n输入结点数、操作数、初始点权和若干条操作。\n\n## 输出格式\n对于查询操作，输出一行一个整数。\n\n## 说明\n若本地存在 Luogu P3690 文档，则优先使用文档题面；否则以上题面根据 AC 代码行为推断生成。`,
  },
  {
    order: 7,
    source: '4.4 树套树/hdu4819.cpp',
    pid: 'HDU4819',
    manualTitle: '二维动态排名查询（推断）',
    manualContent: `## 题目描述\n给定一个二维平面点集或矩阵型数据，支持按子区域进行排名相关查询与更新。\n\n## 输入格式\n输入数据规模、初始数据以及若干条查询和修改操作。\n\n## 输出格式\n对每个查询输出对应结果。\n\n## 说明\n该题面根据树套树专题源码和常见二维数据结构用法推断生成，建议后续人工复核。`,
  },
  {
    order: 8,
    source: '4.4 树套树/p3380.cpp',
    pid: 'P3380',
    manualTitle: '二逼平衡树',
    manualContent: `## 题目描述\n给定一个数列，支持以下区间操作：\n\n- 查询区间内某个数的排名；\n- 查询区间内排名为 $k$ 的数；\n- 修改某个位置的值；\n- 查询区间内某个数的前驱；\n- 查询区间内某个数的后继。\n\n## 输入格式\n输入数列长度、操作数、初始数列以及若干条操作。\n\n## 输出格式\n对于查询操作输出对应结果。\n\n## 说明\n若本地存在 Luogu P3380 文档，则优先使用文档题面；否则以上题面根据 AC 代码行为推断生成。`,
  },
]

const skipped = ['4.2 左偏树/leftist tree.cpp']
const alternateImplementations = {
  HDU2966: ['4.1 KD树/hdu2966_2.cpp'],
}

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: ['P3377', 'P3690', 'P3380'] },
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

const alternateLines = Object.entries(alternateImplementations).map(([pid, files]) => `- ${pid}: ${files.join('、')}`).join('\n')
const readme = `# 4 复杂树\n\n本目录按原始教材顺序整理进阶篇第四章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- P3377、P3690、P3380 若本地存在 Luogu 文档，则优先使用文档题面；其余题面根据源码行为推断生成，建议后续人工复核。\n`
fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')
console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)