import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）源码/8 动态规划提高')
const outputChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）题目/8 动态规划提高')

const items = [
  {
    order: 1,
    source: 'hdu1423_2.cpp',
    pid: 'HDU1423',
    title: '最长公共上升子序列（推断）',
    content: `## 题目描述\n给定两个整数序列，求它们的最长公共上升子序列长度。这里“公共”表示该子序列同时是两个序列的子序列，“上升”表示子序列中的数严格递增。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试组数。\n\n对于每组数据：\n\n- 第一行输入一个整数 $n$，表示第一个序列长度；\n- 第二行输入 $n$ 个整数，表示第一个序列；\n- 第三行输入一个整数 $m$，表示第二个序列长度；\n- 第四行输入 $m$ 个整数，表示第二个序列。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最长公共上升子序列长度。不同测试组之间按源码行为保留空行分隔。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 LCIS 动态规划优化写法，建议后续人工复核。`,
  },
  {
    order: 2,
    source: 'poj1463.cpp',
    pid: 'POJ1463',
    title: '树上最小点覆盖（推断）',
    content: `## 题目描述\n给定一棵树，请选择尽量少的结点，使得树中每条边至少有一个端点被选中。\n\n请输出最少需要选择多少个结点。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入一个整数 $n$，表示结点数，结点编号从 0 开始。\n\n接下来 $n$ 行，每行采用 u:(k) v1 v2 ... vk 的形式，表示结点 $u$ 有 $k$ 个子结点。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示树的最小点覆盖大小。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用树形 DP，建议后续人工复核。`,
  },
  {
    order: 3,
    source: 'poj2823.cpp',
    pid: 'POJ2823',
    title: '滑动窗口最值（推断）',
    content: `## 题目描述\n给定一个长度为 $n$ 的整数序列和窗口大小 $k$，请分别求出每个长度为 $k$ 的连续子区间中的最小值和最大值。\n\n## 输入格式\n第一行输入两个整数 $n,k$。\n\n第二行输入 $n$ 个整数，表示序列元素。\n\n## 输出格式\n输出两行：\n\n- 第一行按顺序输出每个窗口中的最小值；\n- 第二行按顺序输出每个窗口中的最大值。\n\n同一行中的数字之间用空格分隔。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用单调队列线性求解，建议后续人工复核。`,
  },
  {
    order: 4,
    source: 'poj3254.cpp',
    pid: 'POJ3254',
    title: '玉米田种植方案数（推断）',
    content: `## 题目描述\n给定一个 $m \\times n$ 的农田网格，部分格子可以种植，部分格子贫瘠不可种植。要求在可种植格子上放置若干株作物，并满足同一行中任意两株作物不能相邻。\n\n请计算合法种植方案总数，并对 $100000000$ 取模。\n\n## 输入格式\n第一行输入两个整数 $m,n$，表示农田的行数和列数。\n\n接下来 $m$ 行，每行输入 $n$ 个整数。代码中 1 表示可种植，0 表示贫瘠不可种植。\n\n## 输出格式\n输出一行一个整数，表示合法种植方案数模 $100000000$ 的结果。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用状态压缩 DP，建议后续人工复核。`,
  },
  {
    order: 5,
    source: 'uva12186.cpp',
    pid: 'UVA12186',
    title: '树形汇报最少人数（推断）',
    content: `## 题目描述\n公司结构是一棵以 0 号结点为根的树。每个非叶子员工若想把消息继续向上汇报，必须至少有其若干下属先完成汇报。具体来说，若某员工有 $k$ 个直接下属，则至少需要其中 $\\lceil kT/100 \\rceil$ 个人完成汇报，该员工才能完成汇报。叶子员工只需自己汇报即可。\n\n请计算为了让根节点最终收到消息，最少需要多少名叶子员工主动开始汇报。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入两个整数 $n,T$。\n\n当 $n=0$ 时输入结束。\n\n接下来输入 $n$ 个整数，第 $i$ 个整数表示结点 $i$ 的父结点编号，结点编号从 1 到 $n$，根为 0。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示所需的最少叶子员工数量。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用树形 DP，自底向上选择代价最小的若干个子树，建议后续人工复核。`,
  },
]

const skipped = ['TSP.cpp']

const alternateImplementations = {
  HDU1423: ['hdu1423_1.cpp'],
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

const readme = `# 8 动态规划提高\n\n本目录按原始教材顺序整理提高篇第八章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)