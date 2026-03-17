import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）源码/1 STL模版')
const outputChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）题目/1 STL模版')

const items = [
  {
    order: 1,
    source: 'hdu1263 map 2D.cpp',
    pid: 'HDU1263',
    title: '双关键字统计输出（推断）',
    content: `## 题目描述\n给定若干条记录，每条记录包含一个名称、一个类别以及一个数量。请按类别字典序输出，每个类别下再按名称字典序汇总输出对应的总数量。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n对于每组数据：\n\n- 第一行输入一个整数 $m$，表示记录条数；\n- 接下来 $m$ 行，每行输入一个名称、一个类别和一个整数数量。\n\n## 输出格式\n对于每组数据，先按类别字典序输出类别名称。\n\n随后输出该类别下各名称的汇总数量，格式为三个空格后接竖线和横线，再接名称与数量。\n\n不同测试组之间输出一个空行。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用二维 map 统计并排序输出，建议后续人工复核。`,
  },
  {
    order: 2,
    source: 'hdu1412 set.cpp',
    pid: 'HDU1412',
    title: '两个集合的并集（推断）',
    content: `## 题目描述\n给定两个整数集合，请输出它们的并集，并按从小到大的顺序排列。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入两个整数 $n,m$，分别表示两个集合中的元素个数。\n\n接下来输入 $n+m$ 个整数，前 $n$ 个属于第一个集合，后 $m$ 个属于第二个集合。\n\n## 输出格式\n对于每组数据，输出一行，表示并集中的所有元素，元素之间用空格分隔，按升序输出。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 set 自动去重并排序，建议后续人工复核。`,
  },
  {
    order: 3,
    source: 'hdu4006 priority.cpp',
    pid: 'HDU4006',
    title: '动态维护第 K 大数（推断）',
    content: `## 题目描述\n给定一系列操作，支持向数据结构中插入一个整数，以及查询当前所有已插入整数中的第 $k$ 大值。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入两个整数 $n,k$，表示操作总数和查询的排名。\n\n接下来有 $n$ 个操作，每个操作为以下两种之一：\n\n- I x：插入一个整数 $x$；\n- Q：查询当前第 $k$ 大的整数。\n\n## 输出格式\n对于每个查询操作，输出一行一个整数，表示当前第 $k$ 大值。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用大小为 $k$ 的小根堆维护答案，建议后续人工复核。`,
  },
  {
    order: 4,
    source: 'hdu6375 deque.cpp',
    pid: 'HDU6375',
    title: '多端队列操作模拟（推断）',
    content: `## 题目描述\n维护 $n$ 个双端队列，支持在指定队列的两端插入元素、从两端弹出元素，以及把一个队列的全部元素按顺序或逆序拼接到另一个队列末尾。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入两个整数 $n,m$，表示双端队列数量和操作次数。\n\n接下来有 $m$ 个操作，操作类型如下：\n\n- 1 u w val：向第 $u$ 个队列插入元素 val，若 $w=0$ 插入到队首，否则插入到队尾；\n- 2 u w：从第 $u$ 个队列弹出元素并输出，若 $w=0$ 弹出队首，否则弹出队尾；若队列为空输出 -1；\n- 3 u v w：将第 $v$ 个队列整体拼接到第 $u$ 个队列末尾；若 $w=1$，则先将第 $v$ 个队列逆序后再拼接。拼接后第 $v$ 个队列变为空。\n\n## 输出格式\n对于每个类型 2 的操作，按要求输出结果。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 deque 模拟，建议后续人工复核。`,
  },
  {
    order: 5,
    source: 'poj1256 next_permutation.cpp',
    pid: 'POJ1256',
    title: '自定义字典序全排列（推断）',
    content: `## 题目描述\n给定若干个由大小写字母组成的字符串，请按照一种特殊字典序输出其所有不同排列。\n\n比较规则为：先按字母的不区分大小写顺序比较；若字母相同，则大写字母排在对应小写字母前面，例如 A < a < B < b < ... < Z < z。\n\n## 输入格式\n第一行输入一个整数 $n$，表示测试数据组数。\n\n接下来 $n$ 行，每行输入一个字符串。\n\n## 输出格式\n对于每组数据，按上述规则从小到大输出该字符串的所有不同排列，每个排列占一行。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 sort 和 next_permutation 配合自定义比较器实现，建议后续人工复核。`,
  },
  {
    order: 6,
    source: 'poj1281 multiset.cpp',
    pid: 'POJ1281',
    title: '双端优先队列事件模拟（推断）',
    content: `## 题目描述\n维护一个支持插入、切换删除方向、按顺序删除元素的数据结构。删除方向可以是删除当前最小值，也可以是删除当前最大值。\n\n另外，给定若干个删除操作编号，当执行到这些编号的删除操作时，需要输出本次被删除的元素。若删除时结构为空，则输出 -1。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入两个整数 $m,n$。\n\n- 接下来输入 $n$ 个整数，表示需要输出结果的删除操作编号；\n- 随后是一串命令，以字符 e 结束当前测试组。命令包括：\n- a x：插入元素 $x$；\n- p x：设置删除方向，$x=1$ 表示删除最小值，其他情况表示删除最大值；\n- r：执行一次删除操作。\n\n## 输出格式\n对于需要输出的删除操作，按要求输出删除的元素值；每组数据结束后输出一个空行。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 multiset 维护有序集合，建议后续人工复核。`,
  },
  {
    order: 7,
    source: 'poj2388 nth_element.cpp',
    pid: 'POJ2388',
    title: '中位数（推断）',
    content: `## 题目描述\n给定 $n$ 个整数，求其中的中位数。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入一个整数 $n$。\n\n第二行输入 $n$ 个整数。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示中位数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 nth_element 在线性期望时间内求中位数，建议后续人工复核。`,
  },
  {
    order: 8,
    source: 'poj2418 map.cpp',
    pid: 'POJ2418',
    title: '树种出现频率统计（推断）',
    content: `## 题目描述\n给定若干行字符串，每行表示一种树的名称。请统计每种树出现的百分比，并按树名的字典序输出。\n\n## 输入格式\n输入若干行，每行一个树名，直到文件结束。\n\n## 输出格式\n对于每种树，输出一行：树名和其出现百分比，百分比保留 4 位小数。输出顺序按树名字典序排列。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 map 统计频率，建议后续人工复核。`,
  },
  {
    order: 9,
    source: 'poj2443 bitset.cpp',
    pid: 'POJ2443',
    title: '集合交集查询（推断）',
    content: `## 题目描述\n有 $N$ 个集合，每个集合中包含若干个正整数。随后给出若干次查询，每次查询两个整数 $x,y$，判断是否存在某个集合同时包含 $x$ 和 $y$。\n\n## 输入格式\n第一行输入一个整数 $N$。\n\n接下来 $N$ 组数据，每组先输入一个整数 num，表示该集合元素个数；随后输入 num 个整数，表示集合中的元素。\n\n然后输入一个整数 $Q$，表示查询次数。\n\n接下来 $Q$ 行，每行输入两个整数 $x,y$。\n\n## 输出格式\n对于每次查询，若存在某个集合同时包含 $x$ 和 $y$，输出 Yes，否则输出 No。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 bitset 加速集合交判断，建议后续人工复核。`,
  },
  {
    order: 10,
    source: 'poj2833 Priority.cpp',
    pid: 'POJ2833',
    title: '去极值平均数（推断）',
    content: `## 题目描述\n给定 $n$ 个整数，删除其中最小的 $n_1$ 个数和最大的 $n_2$ 个数后，求剩余数字的平均值。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入三个整数 $n_1,n_2,n$。\n\n接下来输入 $n$ 个整数。\n\n当 $n_1,n_2,n$ 同时不再满足题意约束时输入结束；代码中以 n1 && n2 && n 作为结束判定。\n\n## 输出格式\n对于每组数据，输出删除两端极值后的平均数，保留 6 位小数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用两个优先队列分别维护最大端和最小端需要剔除的元素，建议后续人工复核。`,
  },
]

const skipped = ['next_permutation.cpp']
const alternateImplementations = {
  HDU6375: ['hdu6375 list.cpp'],
  POJ2833: ['poj2833_2 Priority.cpp'],
}

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

const alternateLines = Object.entries(alternateImplementations)
  .map(([pid, files]) => `- ${pid}: ${files.join('、')}`)
  .join('\n')

const readme = `# 1 STL模版\n\n本目录按原始教材顺序整理提高篇第一章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
