import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）源码/9 动态规划入门')
const outputChapterDir = path.resolve('other/算法训练营：入门篇（全彩版）题目/9 动态规划入门')

const items = [
  {
    order: 1,
    source: '区间DP/hdu3506.cpp',
    pid: 'HDU3506',
    title: '环形石子合并（推断）',
    content: `## 题目描述\n给定 $n$ 堆按环形排列的石子，第 $i$ 堆石子的数量为 $a_i$。每次可以选择相邻的两堆石子合并，合并代价等于这两堆石子数量之和。合并后形成新的一堆，并继续参与后续合并。\n\n请计算将所有石子合并成一堆所需的最小总代价。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入一个整数 $n$。\n\n第二行输入 $n$ 个整数，表示每堆石子的数量。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最小总代价。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用区间 DP 处理环形合并问题，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '区间DP/poj1651.cpp',
    pid: 'POJ1651',
    title: '乘法表达式最小代价（推断）',
    content: `## 题目描述\n给定一个长度为 $n$ 的数列 $p_0, p_1, \dots, p_{n-1}$。你需要按照一定顺序不断在相邻位置之间进行划分与合并，使总代价最小。\n\n若当前把区间 $[i,j]$ 在位置 $k$ 处分成两部分，则产生的代价为 $p_{i-1} \times p_k \times p_j$，再加上左右两部分各自的最小代价。\n\n请输出最终的最小总代价。\n\n## 输入格式\n第一行输入一个整数 $n$。\n\n第二行输入 $n$ 个整数，表示数列 $p$。\n\n## 输出格式\n输出一行一个整数，表示最小总代价。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用区间 DP 求解，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '区间DP/poj2955.cpp',
    pid: 'POJ2955',
    title: '最长合法括号子序列（推断）',
    content: `## 题目描述\n给定一个仅由圆括号和方括号组成的字符串，求其中最长的合法括号子序列长度。\n\n合法括号子序列要求括号能够正确匹配，允许删除任意字符但不能改变剩余字符的相对顺序。\n\n## 输入格式\n输入包含多组数据，每组一行一个字符串。\n\n当输入行为 end 时结束。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最长合法括号子序列的长度。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用区间 DP 求解括号匹配子序列，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '区间DP/poj3280.cpp',
    pid: 'POJ3280',
    title: '回文串最小代价（推断）',
    content: `## 题目描述\n给定一个长度为 $m$ 的字符串，以及其中每种字符的插入或删除代价。你可以通过插入字符或删除字符的方式，把原字符串变成一个回文串。\n\n请计算所需的最小总代价。\n\n## 输入格式\n第一行输入两个整数 $n$ 和 $m$，分别表示给定字符种类数和字符串长度。\n\n第二行输入一个长度为 $m$ 的字符串。\n\n接下来 $n$ 行，每行输入一个字符以及两个整数，分别表示插入该字符和删除该字符的代价。\n\n## 输出格式\n输出一行一个整数，表示最小总代价。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用区间 DP 求解最小编辑代价，建议后续人工复核。`,
  },
  {
    order: 5,
    source: '线性DP/hdu1003 dp.cpp',
    pid: 'HDU1003',
    title: '最大连续子段和（推断）',
    content: `## 题目描述\n给定多组整数序列，求每组序列中连续子段和的最大值，并输出该最大值对应的起止位置。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n对于每组数据：\n\n- 第一行输入一个整数 $n$，表示序列长度；\n- 第二行输入 $n$ 个整数，表示该序列。\n\n## 输出格式\n对于每组数据，先输出一行 Case x:，再输出一行三个整数，分别表示最大连续子段和、起点位置、终点位置。\n\n相邻测试组之间输出一个空行。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用线性 DP 求最大子段和及区间位置，建议后续人工复核。`,
  },
  {
    order: 6,
    source: '线性DP/hdu1114 dp.cpp',
    pid: 'HDU1114',
    title: '存钱罐最小价值（推断）',
    content: `## 题目描述\n有一个空的存钱罐和一个装满硬币后的存钱罐，已知它们的重量差为 $W$。每种硬币都有自己的重量和价值，并且每种硬币可以使用任意多枚。\n\n请计算在总重量恰好为 $W$ 的前提下，硬币总价值的最小值；如果无法恰好达到该重量，则输出无解。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n对于每组数据：\n\n- 第一行输入两个整数 $E, F$，分别表示空存钱罐和装满硬币后的重量；\n- 第二行输入一个整数 $N$，表示硬币种类数；\n- 接下来 $N$ 行，每行输入两个整数，表示某种硬币的价值和重量。\n\n## 输出格式\n若有解，输出 The minimum amount of money in the piggy-bank is X.\n\n若无解，输出 This is impossible.\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用完全背包求最小价值，建议后续人工复核。`,
  },
  {
    order: 7,
    source: '线性DP/hdu2041 dp.cpp',
    pid: 'HDU2041',
    title: '楼梯走法计数（推断）',
    content: `## 题目描述\n有若干级台阶，每次可以走 1 级或 2 级。给定台阶数 $n$，求不同的走法总数。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n接下来 $T$ 行，每行输入一个整数 $n$。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示不同的走法总数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码预处理了递推结果，建议后续人工复核。`,
  },
  {
    order: 8,
    source: '线性DP/hdu2602 dp.cpp',
    pid: 'HDU2602',
    title: '01 背包最优价值（推断）',
    content: `## 题目描述\n有 $N$ 件物品和一个容量为 $V$ 的背包。第 $i$ 件物品的价值为 $val_i$，体积为 $v_i$，每件物品最多只能选一次。\n\n请计算在不超过背包容量的前提下，可以得到的最大总价值。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试数据组数。\n\n对于每组数据：\n\n- 第一行输入两个整数 $N, V$；\n- 第二行输入 $N$ 个整数，表示各物品价值；\n- 第三行输入 $N$ 个整数，表示各物品体积。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最大总价值。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用二维 01 背包 DP，建议后续人工复核。`,
  },
  {
    order: 9,
    source: '线性DP/poj1163 dp.cpp',
    pid: 'POJ1163',
    title: '数字三角形最大路径和（推断）',
    content: `## 题目描述\n给定一个由数字构成的三角形，从顶端出发，每次只能走到下一层相邻的一个位置。\n\n请计算从顶点到底边的路径中，数字和的最大值。\n\n## 输入格式\n第一行输入一个整数 $n$，表示三角形的层数。\n\n接下来 $n$ 行，第 $i$ 行输入 $i$ 个整数，表示该层数字。\n\n## 输出格式\n输出一行一个整数，表示最大路径和。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用二维 DP 求解，建议后续人工复核。`,
  },
  {
    order: 10,
    source: '线性DP/poj1458 dp.cpp',
    pid: 'POJ1458',
    title: '最长公共子序列（推断）',
    content: `## 题目描述\n给定两个字符串，求它们的最长公共子序列长度。\n\n子序列允许删除若干字符，但不能改变剩余字符的相对顺序。\n\n## 输入格式\n输入包含多组数据，每组输入两个字符串。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最长公共子序列长度。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用经典二维 DP 求解，建议后续人工复核。`,
  },
  {
    order: 11,
    source: '线性DP/poj2533 dp.cpp',
    pid: 'POJ2533',
    title: '最长上升子序列（推断）',
    content: `## 题目描述\n给定一个长度为 $n$ 的整数序列，求其中最长严格上升子序列的长度。\n\n## 输入格式\n第一行输入一个整数 $n$。\n\n第二行输入 $n$ 个整数，表示该序列。\n\n## 输出格式\n输出一行一个整数，表示最长上升子序列长度。\n\n## 说明\n该题面根据 AC 代码行为推断生成，代码使用 $O(n^2)$ 动态规划求解，建议后续人工复核。`,
  },
]

const skipped = [
  '线性DP/01 knapsack opt.cpp',
  '线性DP/01 knapsack.cpp',
]

const alternateImplementations = {
  HDU2602: ['线性DP/hdu2602_2 dp.cpp'],
  POJ1163: ['线性DP/poj1163_2 dp.cpp'],
  POJ2533: ['线性DP/poj2533_2 dp.cpp'],
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

const readme = `# 9 动态规划入门\n\n本目录按原始教材顺序整理第九章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
