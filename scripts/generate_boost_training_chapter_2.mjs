import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）源码/2 实用数据结构')
const outputChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）题目/2 实用数据结构')

const items = [
  {
    order: 1,
    source: '2.1 并查集/hdu1232 Union.cpp',
    pid: 'HDU1232',
    title: '连通分量补边数（推断）',
    content: `## 题目描述\n给定 $n$ 个点和若干条无向边，求至少还需要再添加多少条边，才能使整个图连通。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入一个整数 $n$，表示点数。\n\n当 $n=0$ 时输入结束。\n\n第二行输入一个整数 $m$，表示已有边数。\n\n接下来 $m$ 行，每行输入两个整数 $x,y$，表示一条无向边。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最少还需添加的边数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用并查集统计连通块数量，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '2.1 并查集/poj1988 Union.cpp',
    pid: 'POJ1988',
    title: '带距离的并查集查询（推断）',
    content: `## 题目描述\n维护若干个元素组成的堆，每个元素初始单独成堆。支持两种操作：\n\n- 将元素 $x$ 所在的整堆放到元素 $y$ 所在整堆的上方；\n- 查询某个元素下方有多少个元素。\n\n## 输入格式\n第一行输入一个整数 $n$，表示操作数。\n\n接下来 $n$ 行，每行是以下两种操作之一：\n\n- M x y：把包含 $x$ 的整堆移动到包含 $y$ 的整堆上方；\n- C x：查询元素 $x$ 下方的元素数量。\n\n## 输出格式\n对于每个查询操作，输出一行一个整数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用带距离维护的并查集求解，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '2.2 倍增、ST、RMQ/poj3264 RMQ.cpp',
    pid: 'POJ3264',
    title: '区间最大最小差（推断）',
    content: `## 题目描述\n给定一个长度为 $N$ 的整数序列，回答 $Q$ 次区间查询。每次查询给定区间 $[l,r]$，输出该区间内最大值与最小值的差。\n\n## 输入格式\n第一行输入两个整数 $N,Q$。\n\n第二行到第 $N+1$ 行输入序列中的各个整数。\n\n接下来 $Q$ 行，每行输入两个整数 $l,r$。\n\n## 输出格式\n对于每次查询，输出一行一个整数，表示区间最大值减最小值。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 ST 表进行 RMQ 查询，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '2.2 倍增、ST、RMQ/poj3368 RMQ.cpp',
    pid: 'POJ3368',
    title: '区间最高频数（推断）',
    content: `## 题目描述\n给定一个非递减整数序列，回答若干次区间查询。对于每个查询区间 $[l,r]$，求该区间中出现次数最多的数的出现次数。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入一个整数 $n$。\n\n当 $n=0$ 时输入结束。\n\n第二行输入一个整数 $q$，表示查询次数。\n\n第三行输入长度为 $n$ 的非递减序列。\n\n接下来 $q$ 行，每行输入两个整数 $l,r$。\n\n## 输出格式\n对于每次查询，输出一行一个整数，表示区间内的最高频数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码结合连续段信息和 ST 表求解，建议后续人工复核。`,
  },
  {
    order: 5,
    source: '2.3 最近公共祖先/POJ1330 LCA.cpp',
    pid: 'POJ1330',
    title: '最近公共祖先（推断）',
    content: `## 题目描述\n给定一棵有根树和两个结点，求它们的最近公共祖先。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n对于每组数据：\n\n- 第一行输入一个整数 $n$，表示结点数；\n- 接下来 $n-1$ 行，每行输入两个整数 $u,v$，表示 $u$ 是 $v$ 的父结点；\n- 最后一行输入两个整数，表示需要查询的两个结点。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示这两个结点的最近公共祖先。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用父链标记方式求 LCA，建议后续人工复核。`,
  },
  {
    order: 6,
    source: '2.3 最近公共祖先/LCA_st  HDU2586.cpp',
    pid: 'HDU2586',
    title: '树上两点距离查询（推断）',
    content: `## 题目描述\n给定一棵带边权的树，回答若干次两点距离查询。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n对于每组数据：\n\n- 第一行输入两个整数 $n,m$，表示结点数和查询数；\n- 接下来 $n-1$ 行，每行输入三个整数 $x,y,z$，表示一条连接 $x,y$ 的边，边权为 $z$；\n- 接下来 $m$ 行，每行输入两个整数 $x,y$，表示一次距离查询。\n\n## 输出格式\n对于每次查询，输出一行一个整数，表示两点之间的距离。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用倍增求 LCA 后计算距离，建议后续人工复核。`,
  },
  {
    order: 7,
    source: '2.4 树状数组/poj1195 bitree 2d.cpp',
    pid: 'POJ1195',
    title: '二维点修改矩形求和（推断）',
    content: `## 题目描述\n维护一个二维平面上的整数矩阵，支持单点增加和子矩形区域求和。\n\n## 输入格式\n输入由若干条操作组成：\n\n- 0 n：初始化一个边长为 $n$ 的矩阵；\n- 1 x y a：将位置 $(x,y)$ 的值增加 $a$；\n- 2 l b r t：查询左下角到右上角矩形内元素和；\n- 3：结束输入。\n\n## 输出格式\n对于每个类型 2 的操作，输出一行一个整数，表示查询结果。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用二维树状数组实现，建议后续人工复核。`,
  },
  {
    order: 8,
    source: '2.4 树状数组/poj2352 bitree.cpp',
    pid: 'POJ2352',
    title: '星级统计（推断）',
    content: `## 题目描述\n平面上依次给出若干颗星星的坐标。定义一颗星星的等级为：在它之前出现、且横坐标不大于它的星星数量。请统计每个等级分别出现了多少颗星星。\n\n## 输入格式\n第一行输入一个整数 $n$，表示星星数量。\n\n接下来 $n$ 行，每行输入两个整数 $x,y$，表示一颗星星的坐标。\n\n## 输出格式\n输出 $n$ 行，第 $i$ 行表示等级为 $i-1$ 的星星个数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用树状数组统计前缀频次，建议后续人工复核。`,
  },
  {
    order: 9,
    source: '2.5 线段树/hdu1166 segtree.cpp',
    pid: 'HDU1166',
    title: '单点修改区间求和（推断）',
    content: `## 题目描述\n给定一个长度为 $n$ 的整数序列，支持以下操作：\n\n- 查询某个区间的元素和；\n- 将某个位置的值增加一个数；\n- 将某个位置的值减少一个数。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n对于每组数据：\n\n- 第一行输入一个整数 $n$；\n- 第二行输入 $n$ 个整数，表示初始序列；\n- 接下来若干行操作，直到读到 E 结束当前测试组。\n\n操作格式包括：\n\n- Q i j：查询区间和；\n- A i j：位置 $i$ 增加 $j$；\n- S i j：位置 $i$ 减少 $j$；\n- E：结束。\n\n## 输出格式\n每组数据先输出 Case k:，然后对每次查询输出一行结果。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用线段树维护区间和，建议后续人工复核。`,
  },
  {
    order: 10,
    source: '2.5 线段树/poj3468 segtree.cpp',
    pid: 'POJ3468',
    title: '区间加区间求和（推断）',
    content: `## 题目描述\n给定一个长度为 $n$ 的整数序列，支持区间加法更新和区间求和查询。\n\n## 输入格式\n第一行输入两个整数 $n,m$，表示序列长度和操作次数。\n\n第二行输入 $n$ 个整数，表示初始序列。\n\n接下来 $m$ 行，每行是一条操作：\n\n- Q l r：查询区间 $[l,r]$ 的元素和；\n- C l r x：将区间 $[l,r]$ 中每个数都增加 $x$。\n\n## 输出格式\n对于每个查询操作，输出一行一个整数，表示区间和。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用带懒标记的线段树求解，建议后续人工复核。`,
  },
]

const skipped = [
  '2.2 倍增、ST、RMQ/RMQ_st.cpp',
  '2.4 树状数组/binary indexed tree.cpp',
  '2.4 树状数组/binary indexed tree 2d.cpp',
  '2.5 线段树/segment tree.cpp',
  '2.5 线段树/segment tree lazy.cpp',
]

const alternateImplementations = {
  HDU2586: ['2.3 最近公共祖先/LCA_rmq HDU2586.cpp', '2.3 最近公共祖先/LCA_tarjan HDU2586.cpp'],
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

const readme = `# 2 实用数据结构\n\n本目录按原始教材顺序整理提高篇第二章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
