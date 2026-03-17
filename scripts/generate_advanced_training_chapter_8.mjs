import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）源码/8 复杂动态规划及其优化')
const outputChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）题目/8 复杂动态规划及其优化')

const items = [
  {
    order: 1,
    source: '8.1 数位DP/hdu2089.cpp',
    pid: 'HDU2089',
    title: '不要 62（推断）',
    content: `## 题目描述\n统计闭区间 $[m,n]$ 内有多少个整数不包含数字 4，且其十进制表示中不包含连续子串 62。\n\n## 输入格式\n输入包含多组数据，每组输入两个整数 $m,n$。当 $m=0$ 且 $n=0$ 时结束。\n\n## 输出格式\n对于每组数据，输出一行一个整数。\n\n## 说明\n该题面根据 AC 代码行为和经典原题推断生成，默认代码使用数位 DP，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '8.1 数位DP/hdu3555.cpp',
    pid: 'HDU3555',
    title: '包含 49 的数字个数（推断）',
    content: `## 题目描述\n对于给定的整数 $n$，统计区间 $[0,n]$ 中十进制表示里包含子串 49 的数字个数。\n\n## 输入格式\n输入测试组数以及若干个待查询的整数。\n\n## 输出格式\n对于每个查询，输出一行一个整数。\n\n## 说明\n该题面根据数位 DP 经典原题和源码文件名推断生成，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '8.2 插头DP/hdu1693.cpp',
    pid: 'HDU1693',
    title: '网格回路方案计数（推断）',
    content: `## 题目描述\n给定一个网格，部分格子允许经过。要求在所有允许经过的格子上构造若干条不相交连接关系或整体回路，求合法方案数。\n\n## 输入格式\n输入测试组数、网格大小以及网格可用情况。\n\n## 输出格式\n对于每组数据，输出方案数。\n\n## 说明\n该题面根据插头 DP 专题和经典原题推断生成，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '8.2 插头DP/poj2411.cpp',
    pid: 'POJ2411',
    title: '骨牌铺放方案数（推断）',
    content: `## 题目描述\n给定一个 $n \times m$ 的棋盘，使用 $1 \times 2$ 骨牌恰好覆盖整个棋盘，求不同铺放方案数。\n\n## 输入格式\n输入包含多组数据，每组输入两个整数 $n,m$。当 $n=0$ 且 $m=0$ 时结束。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示方案数。\n\n## 说明\n该题面根据经典原题和源码文件名推断生成，默认代码使用轮廓线 DP 或插头 DP，建议后续人工复核。`,
  },
  {
    order: 5,
    source: '8.3 斜率优化/hdu3507.cpp',
    pid: 'HDU3507',
    title: '分段代价最小化（斜率优化）（推断）',
    content: `## 题目描述\n给定一个序列和常数参数，需要把序列划分为若干段，使目标代价最小。状态转移可化为一次函数斜率比较。\n\n## 输入格式\n输入序列长度、常数参数以及序列元素。\n\n## 输出格式\n输出一行一个整数，表示最优代价。\n\n## 说明\n该题面根据斜率优化专题和经典原题推断生成，建议后续人工复核。`,
  },
  {
    order: 6,
    source: '8.3 斜率优化/poj1180_1.cpp',
    pid: 'POJ1180',
    title: 'Batch Scheduling（推断）',
    content: `## 题目描述\n有若干任务需要按顺序分批处理。每个任务有处理时间和费用系数，批处理还存在固定启动代价。要求求出最小总代价。\n\n## 输入格式\n输入任务数、固定代价以及每个任务的时间与费用参数。\n\n## 输出格式\n输出一行一个整数，表示最小总代价。\n\n## 说明\n该题面根据 AC 代码行为和经典原题推断生成，默认代码使用斜率优化 DP，建议后续人工复核。`,
  },
  {
    order: 7,
    source: '8.4 四边不等式优化/hdu3480_1.cpp',
    pid: 'HDU3480',
    title: 'Division（推断）',
    content: `## 题目描述\n给定一个已排序或可排序的序列，需要把它划分成若干组，使某种组内平方代价之和最小。\n\n## 输入格式\n输入测试组数、序列长度、分组数以及序列元素。\n\n## 输出格式\n对于每组数据，输出最小代价。\n\n## 说明\n该题面根据四边不等式优化专题和经典原题推断生成，建议后续人工复核。`,
  },
]

const alternateImplementations = {
  HDU2089: ['8.1 数位DP/hdu2089_2.cpp'],
  HDU3555: ['8.1 数位DP/hdu3555_2.cpp'],
  POJ1180: ['8.3 斜率优化/poj1180_2.cpp'],
  HDU3480: ['8.4 四边不等式优化/hdu3480_2.cpp'],
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
const readme = `# 8 复杂动态规划及其优化\n\n本目录按原始教材顺序整理进阶篇第八章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n- 无\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')
console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)