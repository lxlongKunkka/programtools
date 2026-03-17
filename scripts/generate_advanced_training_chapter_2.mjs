import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）源码/2 字符串算法进阶')
const outputChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）题目/2 字符串算法进阶')

const items = [
  {
    order: 1,
    source: '2.1 AC自动机/hdu2896  AC automaton.cpp',
    pid: 'HDU2896',
    title: '多模式串网页匹配（推断）',
    content: `## 题目描述\n给定若干个病毒模式串和若干个网页文本。对于每个网页，判断其中出现了哪些模式串，并输出所有含病毒的网页编号以及匹配到的模式串编号。\n\n## 输入格式\n第一部分输入若干个模式串。第二部分输入若干个网页文本。具体数量和格式以原题为准。\n\n## 输出格式\n按网页编号输出匹配结果，并在最后输出含病毒的网页总数。\n\n## 说明\n该题面根据 AC 自动机源码行为和经典原题推断生成，默认代码使用 AC 自动机进行多模式匹配，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '2.1 AC自动机/poj2778 AC automaton.cpp',
    pid: 'POJ2778',
    title: 'DNA 禁忌串计数（推断）',
    content: `## 题目描述\n给定若干个禁止出现的 DNA 模式串，字符集为 A、C、G、T。求长度为 $n$ 的 DNA 串中，不包含任意禁止模式串的方案数。\n\n## 输入格式\n输入模式串数量、目标长度以及各个模式串。\n\n## 输出格式\n输出满足条件的 DNA 串数量，通常需要对给定模数取模。\n\n## 说明\n该题面根据 AC 自动机结合矩阵快速幂的经典做法推断生成，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '2.2 后缀数组/poj1743.cpp',
    pid: 'POJ1743',
    title: '最长重复旋律（推断）',
    content: `## 题目描述\n给定一段由整数表示的旋律，求一个最长的片段，使它在旋律中至少出现两次，且这两次出现不能重叠。\n\n## 输入格式\n输入一个整数序列，通常先给出长度，再给出各个音高。\n\n## 输出格式\n输出满足条件的最长重复片段长度；若长度不足题目要求，则输出 0。\n\n## 说明\n该题面根据后缀数组源码行为和经典原题推断生成，默认代码使用后缀数组加二分答案，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '2.2 后缀数组/poj3261.cpp',
    pid: 'POJ3261',
    title: '至少出现 K 次的最长子串（推断）',
    content: `## 题目描述\n给定一个整数序列和整数 $k$，求一个最长连续子串，使它在整个序列中至少出现 $k$ 次。\n\n## 输入格式\n输入序列长度、参数 $k$ 以及序列本身。\n\n## 输出格式\n输出满足条件的最长子串长度。\n\n## 说明\n该题面根据后缀数组源码行为和经典原题推断生成，默认代码使用后缀数组加 height 数组判断重复长度，建议后续人工复核。`,
  },
]

const skipped = ['2.1 AC自动机/AC automaton.cpp', '2.2 后缀数组/radix sort.cpp', '2.2 后缀数组/suffix array.cpp']

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

const readme = `# 2 字符串算法进阶\n\n本目录按原始教材顺序整理进阶篇第二章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n- 无\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')
console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
