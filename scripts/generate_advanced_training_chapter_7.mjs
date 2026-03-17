import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）源码/7 动态规划进阶')
const outputChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）题目/7 动态规划进阶')

const items = [
  {
    order: 1,
    source: '7.1 背包问题进阶/hdu1712 dp.cpp',
    pid: 'HDU1712',
    title: '分组投资最大收益（推断）',
    content: `## 题目描述\n有 $n$ 组投资项目和总资金上限 $m$。第 $i$ 组中，投入不同金额会得到不同收益。要求总投入不超过 $m$，求最大总收益。\n\n## 输入格式\n输入包含多组数据。每组数据输入 $n,m$，随后给出一个 $n \times m$ 的收益表。当 $n=0$ 且 $m=0$ 时结束。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最大总收益。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用分组背包，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '7.1 背包问题进阶/hdu2844_poj1742_1 dp.cpp',
    pid: 'HDU2844-POJ1742',
    title: '硬币可组成金额数（推断）',
    content: `## 题目描述\n给定若干种硬币，每种硬币面值固定、数量有限。请统计在不超过上限 $m$ 的前提下，能够凑出的不同正整数金额个数。\n\n## 输入格式\n输入硬币种类数、金额上限、各面值以及各自数量，包含多组数据。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示可组成的不同金额数。\n\n## 说明\n该题面根据源码文件名和经典原题推断生成，默认代码使用多重背包优化，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '7.1 背包问题进阶/poj3260 dp.cpp',
    pid: 'POJ3260',
    title: '支付与找零最少硬币数（推断）',
    content: `## 题目描述\n给定若干种硬币及其拥有数量，需要支付一个目标金额。你可以支付超过目标金额并由商家找零。求完成交易所需硬币总数的最小值。\n\n## 输入格式\n输入硬币种类数、目标金额、各面值及各自数量。\n\n## 输出格式\n输出一行一个整数，表示最少硬币总数；若无法完成支付则输出特定无解结果。\n\n## 说明\n该题面根据经典原题和源码文件名推断生成，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '7.2 树形DP进阶/hdu1561.cpp',
    pid: 'HDU1561',
    title: '树上选课最大收益（推断）',
    content: `## 题目描述\n给定一棵以 0 为虚根的课程依赖树，每门课程有收益值。若选择某门课程，则必须先选择它的父课程。要求恰好选择若干门课程，使总收益最大。\n\n## 输入格式\n输入结点数和选择上限，随后给出每门课程的父结点和收益值，多组数据直到 0 0 结束。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最大收益。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用树形背包，建议后续人工复核。`,
  },
  {
    order: 5,
    source: '7.2 树形DP进阶/hdu2196 dp.cpp',
    pid: 'HDU2196',
    title: '树上每点最远距离（推断）',
    content: `## 题目描述\n给定一棵带边权的树。对于每个结点，求它到树上其他结点的最远距离。\n\n## 输入格式\n输入结点数以及每个结点与其父结点之间的边权信息。\n\n## 输出格式\n按结点顺序输出每个结点的最远距离。\n\n## 说明\n该题面根据树形 DP 经典原题和源码文件名推断生成，建议后续人工复核。`,
  },
  {
    order: 6,
    source: '7.2 树形DP进阶/poj2486 dp.cpp',
    pid: 'POJ2486',
    title: '树上采集最大苹果数（推断）',
    content: `## 题目描述\n给定一棵树，每个结点有苹果数。你从根出发，在限定步数内在树上移动并采集苹果，求能得到的最大苹果总数。\n\n## 输入格式\n输入结点数、步数限制、各结点权值以及树边信息。\n\n## 输出格式\n输出一行一个整数，表示最大可获得苹果数。\n\n## 说明\n该题面根据树形 DP 经典原题和源码文件名推断生成，建议后续人工复核。`,
  },
  {
    order: 7,
    source: '7.2 树形DP进阶/poj3585 dp.cpp',
    pid: 'POJ3585',
    title: '树上最优汇聚代价（推断）',
    content: `## 题目描述\n给定一棵带权树，要求基于树结构计算某种全局最优汇聚代价或最优路径指标。\n\n## 输入格式\n输入树的结点数以及边权信息。\n\n## 输出格式\n输出一行一个整数，表示最优值。\n\n## 说明\n该题面根据教材章节位置和源码文件名推断生成，建议后续人工复核。`,
  },
]

const skipped = ['7.1 背包问题进阶/group knapsack.cpp', '7.1 背包问题进阶/multiple knapsack.cpp']
const alternateImplementations = {
  'HDU2844-POJ1742': ['7.1 背包问题进阶/hdu2844_poj1742_2 dp.cpp'],
  HDU1561: ['7.2 树形DP进阶/hdu1561_2.cpp'],
}

function sanitizeSegment(value) {
  return String(value).replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim()
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

const alternateLines = Object.entries(alternateImplementations).map(([pid, files]) => `- ${pid}: ${files.join('、')}`).join('\n')
const readme = `# 7 动态规划进阶\n\n本目录按原始教材顺序整理进阶篇第七章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')
console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
