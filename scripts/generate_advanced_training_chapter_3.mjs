import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）源码/3 树上操作')
const outputChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）题目/3 树上操作')

const items = [
  {
    order: 1,
    source: '3.1 树链剖分/HDU2586.cpp',
    pid: 'HDU2586',
    title: '树上两点距离查询（推断）',
    content: `## 题目描述\n给定一棵带边权的树，回答若干次两点间距离查询。\n\n## 输入格式\n第一行输入测试组数。对于每组数据，先输入结点数和查询数，再输入 $n-1$ 条带权边，最后输入若干组询问点对。\n\n## 输出格式\n对于每次查询，输出一行一个整数，表示两点间距离。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用树链剖分求 LCA 后计算距离，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '3.1 树链剖分/POJ3237.cpp',
    pid: 'POJ3237',
    title: '树链剖分路径最大值与取反（推断）',
    content: `## 题目描述\n给定一棵带权树，支持以下操作：\n\n- CHANGE i v：把第 $i$ 条边的权值修改为 $v$；\n- NEGATE u v：把路径 $u$ 到 $v$ 上所有边权同时取相反数；\n- QUERY u v：查询路径 $u$ 到 $v$ 上边权最大值。\n\n## 输入格式\n第一行输入测试组数。对于每组数据，先输入结点数和树边信息，随后输入若干条操作，直到读到 DONE 结束。\n\n## 输出格式\n对于每个 QUERY 操作，输出一行一个整数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用树链剖分加线段树维护路径信息，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '3.2 点分治/poj1741 point divide.cpp',
    pid: 'POJ1741',
    title: '树上距离不超过 K 的点对数（推断）',
    content: `## 题目描述\n给定一棵带权树和整数 $k$，统计有多少对不同结点满足它们之间的距离不超过 $k$。\n\n## 输入格式\n输入包含多组数据。每组数据输入结点数 $n$ 和参数 $k$，随后输入 $n-1$ 条带权边。当 $n=0$ 且 $k=0$ 时结束。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示满足条件的点对数量。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用点分治统计树上路径，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '3.2 点分治/poj2114 point divide.cpp',
    pid: 'POJ2114',
    title: '树上路径长度可达性查询（推断）',
    content: `## 题目描述\n给定一棵带权树。对于每个给定的整数 $k$，判断树上是否存在一对结点，其简单路径长度恰好等于 $k$。\n\n## 输入格式\n输入包含多组数据。每组数据先输入结点数 $n$，然后给出树的邻接表形式边信息。之后输入若干个查询值 $k$，当读到 0 时结束当前树的查询，并输出一个句点分隔。\n\n## 输出格式\n对于每个查询，若存在满足条件的点对输出 AYE，否则输出 NAY。每组数据结束后输出一行 .。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用点分治判断距离可达性，建议后续人工复核。`,
  },
  {
    order: 5,
    source: '3.3 边分治/spoj QTREE4 edge divide.cpp',
    pid: 'SPOJ-QTREE4',
    title: '动态黑点最远距离查询（推断）',
    content: `## 题目描述\n给定一棵带权树，所有点初始为黑色。支持两类操作：\n\n- C x：切换结点 $x$ 的颜色；\n- A：查询当前所有黑点中最远两点之间的距离。\n\n若当前没有黑点，则输出特定提示信息。\n\n## 输入格式\n先输入树的结点数和边信息，再输入操作数，随后输入若干条操作。\n\n## 输出格式\n对于每个 A 操作，若存在黑点对则输出最大距离；否则输出 They have disappeared.。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用边分治维护分治树上的距离信息，建议后续人工复核。`,
  },
]

const skipped = ['3.3 边分治/edge divide.cpp']
const alternateImplementations = {
  POJ1741: ['3.3 边分治/poj 1741 edge divide.cpp'],
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
const readme = `# 3 树上操作\n\n本目录按原始教材顺序整理进阶篇第三章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`
fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')
console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
