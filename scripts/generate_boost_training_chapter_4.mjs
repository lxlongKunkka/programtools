import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）源码/4 平衡二叉树')
const outputChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）题目/4 平衡二叉树')

const items = [
  {
    order: 1,
    source: 'hdu3487 splay.cpp',
    pid: 'HDU3487',
    title: '数列剪切与翻转（推断）',
    content: `## 题目描述\n给定一个初始为 $1,2,\\ldots,n$ 的序列，支持以下两类区间操作：\n\n- Cut a b c：将区间 $[a,b]$ 从当前序列中剪下，再插入到位置 $c$ 的后面；\n- Flip a b：将区间 $[a,b]$ 整体翻转。\n\n所有操作完成后，输出最终序列。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入两个整数 $n,m$，表示序列长度和操作数。\n\n当输入为 $-1 -1$ 时结束。\n\n随后输入一个整数，表示本组实际操作数。\n\n接下来若干行，每行是一条操作，格式为 Cut a b c 或 Flip a b。\n\n## 输出格式\n对于每组数据，输出一行，按顺序给出最终序列中的所有元素，元素之间用空格分隔。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 Splay 维护数列并支持区间剪切、翻转，建议后续人工复核。`,
  },
  {
    order: 2,
    source: 'HDU4585 Treap.cpp',
    pid: 'HDU4585',
    title: '按分值最近匹配（推断）',
    content: `## 题目描述\n现有若干个编号和分值各不相同的对象按顺序到来。第一个对象直接与编号 $1$ 配对输出。\n\n从第二个对象开始，每当一个新对象到来时，需要在之前已经出现过的对象中，找到一个分值与它最接近的对象作为匹配对象；若存在两个候选对象与它的分值差相同，则选择分值较小的那个。\n\n对于每个到来的对象，输出它自己的编号以及与之匹配的对象编号。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入一个整数 $n$，表示对象数量。\n\n当 $n=0$ 时输入结束。\n\n接下来 $n$ 行，每行输入两个整数 $id,val$，表示对象编号和分值。\n\n## 输出格式\n对于每组数据：\n\n- 第一行输出第一个对象的编号和数字 1；\n- 对于之后每个对象，输出一行两个整数，分别表示当前对象编号和它匹配到的对象编号。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 Treap 维护已有分值并查找前驱后继，建议后续人工复核。`,
  },
  {
    order: 3,
    source: 'poj3481 avl.cpp',
    pid: 'POJ3481',
    title: '双端优先队列（推断）',
    content: `## 题目描述\n维护一个空集合，支持以下操作：\n\n- 1 k p：插入一个编号为 $k$、优先级为 $p$ 的元素；\n- 2：输出并删除当前优先级最高的元素编号；如果集合为空，输出 0；\n- 3：输出并删除当前优先级最低的元素编号；如果集合为空，输出 0。\n\n## 输入格式\n输入由若干行操作组成，每行首先输入一个整数表示操作类型。\n\n- 当操作类型为 1 时，后续再输入两个整数 $k,p$；\n- 当操作类型为 2 或 3 时，无额外输入；\n- 当输入为 0 时，表示结束。\n\n## 输出格式\n对于每个 2 或 3 操作，输出一行一个整数，表示被删除元素的编号；若集合为空则输出 0。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 AVL 树维护最小值和最大值删除，建议后续人工复核。`,
  },
  {
    order: 4,
    source: 'POJ3580 splay.cpp',
    pid: 'POJ3580',
    title: '区间旋转与最小值维护（推断）',
    content: `## 题目描述\n给定一个整数序列，支持以下操作：\n\n- ADD l r d：将区间 $[l,r]$ 内每个数都加上 $d$；\n- REVERSE l r：将区间 $[l,r]$ 翻转；\n- REVOLVE l r t：将区间 $[l,r]$ 循环右移 $t$ 位；\n- INSERT pos x：在指定位置插入一个整数；\n- DELETE pos：删除指定位置的整数；\n- MIN l r：查询区间 $[l,r]$ 的最小值。\n\n## 输入格式\n第一行输入一个整数 $n$，表示初始序列长度。\n\n第二行输入 $n$ 个整数，表示初始序列。\n\n第三行输入一个整数 $m$，表示操作数。\n\n接下来 $m$ 行，每行输入一条操作，格式如题目描述所示。\n\n## 输出格式\n对于每个 MIN 操作，输出一行一个整数，表示对应区间的最小值。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 Splay 维护序列并支持区间加、翻转、旋转和区间最小值查询，建议后续人工复核。`,
  },
]

const skipped = ['avl.cpp', 'Splay.cpp', 'Treap.cpp']

function sanitizeSegment(value) {
  return String(value)
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildProblemMarkdown(item) {
  return `# ${item.pid} ${item.title}\n\n${item.content}\n`
}

fs.mkdirSync(outputChapterDir, { recursive: true })

const generated = []
for (const item of items) {
  const folderName = `${String(item.order).padStart(2, '0')}-${item.pid}-${sanitizeSegment(item.title)}`
  const folderPath = path.join(outputChapterDir, folderName)
  const sourcePath = path.join(sourceChapterDir, item.source)

  fs.mkdirSync(folderPath, { recursive: true })
  fs.copyFileSync(sourcePath, path.join(folderPath, 'source.cpp'))
  fs.copyFileSync(sourcePath, path.join(folderPath, 'std.cpp'))
  fs.writeFileSync(path.join(folderPath, 'problem.md'), buildProblemMarkdown(item), 'utf8')

  generated.push(`- ${folderName}`)
}

const readme = `# 4 平衡二叉树\n\n本目录按原始教材顺序整理提高篇第四章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n- 无\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)