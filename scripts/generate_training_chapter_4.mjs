import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/4 树的应用')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/4 树的应用')

const items = [
  { order: 1, source: 'B3642.cpp', pid: 'B3642' },
  { order: 2, source: 'p1305.cpp', pid: 'P1305' },
  {
    order: 3,
    source: 'poj1521.cpp',
    pid: 'POJ1521',
    manualTitle: '信息熵与哈夫曼编码（推断）',
    manualContent: `## 题目描述\n给定若干个仅由大写字母 \`A\` 到 \`Z\` 以及下划线 \`_\` 组成的字符串。对于每个字符串，统计其中各字符出现次数，并据此构造最优前缀编码（哈夫曼编码）。\n\n设原始存储方案中每个字符固定占用 8 位，请输出：\n\n- 原始编码所需总位数；\n- 使用哈夫曼编码后的总位数；\n- 原始编码位数与哈夫曼编码位数的比值。\n\n当字符串只包含一种字符时，压缩后总位数按字符串长度计算。\n\n## 输入格式\n输入包含多组数据，每组一行一个字符串。\n\n当输入行为 \`END\` 时结束，不处理该行。\n\n## 输出格式\n对于每组数据，输出一行三个值：\n\n- 原始编码总位数；\n- 哈夫曼编码总位数；\n- 压缩比，保留 1 位小数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，建议后续人工复核。`
  },
  {
    order: 4,
    source: 'poj1577.cpp',
    pid: 'POJ1577',
    manualTitle: '二叉搜索树前序输出（推断）',
    manualContent: `## 题目描述\n给定若干组由大写字母组成的数据。对于每组数据，按给定顺序将字符依次插入一棵二叉搜索树中：若字符小于当前节点则进入左子树，若大于当前节点则进入右子树。\n\n请输出该二叉搜索树的前序遍历结果。\n\n## 输入格式\n输入包含多组数据。每组数据由若干行字符串组成，每行一个字符串。\n\n- 当某行的首字符为 \`*\` 时，表示当前这组数据结束，接着处理下一组；\n- 当某行的首字符为 \`$\` 时，表示最后一组数据结束，输入终止。\n\n同一组中除结束标记外的所有字符串按出现顺序连接后，作为插入二叉搜索树的字符序列。\n\n## 输出格式\n对于每组数据，输出一行，表示构造出的二叉搜索树的前序遍历结果。\n\n## 说明\n该题面根据 AC 代码行为推断生成，建议后续人工复核。`
  },
  {
    order: 5,
    source: 'poj2309.cpp',
    pid: 'POJ2309',
    manualTitle: '二叉搜索树区间（推断）',
    manualContent: `## 题目描述\n对于一棵满足中序遍历为连续整数序列的满二叉搜索树，给定其中某个节点的编号 $n$，请输出以该节点为根的子树中最小编号和最大编号。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n接下来 $T$ 行，每行输入一个整数 $n$。\n\n## 输出格式\n对于每组数据，输出一行两个整数，分别表示该节点所在子树的最小编号和最大编号。\n\n## 提示\n根据代码实现，可利用 $lowbit(n)$ 计算答案：若 $k = lowbit(n) - 1$，则结果为 $n-k$ 和 $n+k$。\n\n## 说明\n该题面根据 AC 代码行为推断生成，建议后续人工复核。`
  },
  {
    order: 6,
    source: 'poj3253.cpp',
    pid: 'POJ3253',
    manualTitle: '木板切割代价（推断）',
    manualContent: `## 题目描述\n有 $n$ 块木板，需要将它们不断两两合并，直到最终只剩下一块。每次合并两块木板的代价等于这两块木板长度之和。合并后会得到一块长度为两者之和的新木板，并可继续参与后续合并。\n\n请计算完成全部合并所需的最小总代价。\n\n## 输入格式\n多组输入。每组数据第一行输入一个整数 $n$，表示木板数量。\n\n接下来输入 $n$ 个整数，表示每块木板的长度。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最小总代价。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用小根堆贪心求解，建议后续人工复核。`
  },
]

const skipped = ['bst.cpp', 'huffman.cpp', 'traverse.cpp']

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

const readme = `# 4 树的应用\n\n本目录按原始教材顺序整理第四章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n${missing.length ? `## 未生成\n\n${missing.join('\n')}\n\n` : ''}## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 洛谷题题面优先来自 Document 集合中 domainId = luogu 的文档。\n- POJ 题面的中文描述根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
if (missing.length) {
  console.log(`Missing ${missing.length} entries`)
}
process.exit(0)
