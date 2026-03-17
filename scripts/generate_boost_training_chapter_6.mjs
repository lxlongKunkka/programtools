import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）源码/6 图论算法')
const outputChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）题目/6 图论算法')

const items = [
  {
    order: 1,
    source: '关键路径/poj1949.cpp',
    pid: 'POJ1949',
    title: '任务依赖最长完成时间（推断）',
    content: `## 题目描述\n有 $n$ 个任务，每个任务有自己的完成耗时，并且可能依赖若干个前置任务。只有当前置任务全部完成后，该任务才能开始。\n\n请计算完成全部任务所需的最短总时间。\n\n## 输入格式\n第一行输入一个整数 $n$，表示任务数量。\n\n接下来 $n$ 行，第 $i$ 行先输入两个整数 $w,k$，分别表示任务 $i$ 的耗时和它依赖的前置任务数量；随后输入 $k$ 个整数，表示这些前置任务的编号。\n\n## 输出格式\n输出一行一个整数，表示完成全部任务所需的最短总时间。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码按任务顺序做 DAG 最长路转移，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '关键路径/hdu4109.cpp',
    pid: 'HDU4109',
    title: '有向无环图最长路径（推断）',
    content: `## 题目描述\n给定一个带权有向无环图，求图中从任意入度为 0 的点出发所能达到的最长路径长度。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入两个整数 $n,m$，表示点数和边数。\n\n接下来 $m$ 行，每行输入三个整数 $u,v,w$，表示一条从 $u$ 到 $v$ 的有向边，边权为 $w$。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示图中的最长路径长度。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码先做拓扑排序，再在 DAG 上进行最长路动态规划，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '拓扑排序/poj2367.cpp',
    pid: 'POJ2367',
    title: '拓扑序输出（推断）',
    content: `## 题目描述\n给定一个有向无环图，请输出任意一个合法的拓扑序。\n\n## 输入格式\n第一行输入一个整数 $n$，表示点数。\n\n接下来 $n$ 行，第 $i$ 行输入若干个整数，表示从点 $i$ 指向的所有点，最后以 0 结束。\n\n## 输出格式\n输出一行，给出一个合法拓扑序，点编号之间用空格分隔。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用栈维护当前入度为 0 的点，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '拓扑排序/poj3687.cpp',
    pid: 'POJ3687',
    title: '按约束构造排名（推断）',
    content: `## 题目描述\n有 $n$ 个元素和若干条相对先后约束。每条约束给出一对 $(u,v)$，表示元素 $u$ 的排名必须在元素 $v$ 之前。\n\n请为每个元素分配一个从 1 到 $n$ 的不同排名，使所有约束都被满足，并且按照题目代码的策略得到一组字典序尽量大的可行解；如果无解则输出 -1。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试组数。\n\n每组数据第一行输入两个整数 $n,m$，表示元素个数和约束条数。\n\n接下来 $m$ 行，每行输入两个整数 $u,v$，表示一条约束。\n\n## 输出格式\n对于每组数据：\n\n- 若无解，输出一行 -1；\n- 否则输出一行 $n$ 个整数，第 $i$ 个整数表示元素 $i$ 的排名。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码逆序选择当前编号最大的入度为 0 结点来构造排名，建议后续人工复核。`,
  },
  {
    order: 5,
    source: '最小生成树/poj1251.cpp',
    pid: 'POJ1251',
    title: '字母结点最小生成树（推断）',
    content: `## 题目描述\n给定若干个用大写字母表示的结点以及它们之间的带权无向边，求连接所有结点的最小生成树权值之和。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入一个整数 $n$，表示结点数量。\n\n当 $n=0$ 时输入结束。\n\n随后给出 $n-1$ 行边信息：每行先输入一个字母和一个整数，表示起点以及与之相连的边数；接着输入若干对 字母 权值，表示对应边。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最小生成树的总权值。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 Prim 算法求解，建议后续人工复核。`,
  },
  {
    order: 6,
    source: '最小生成树/poj1287.cpp',
    pid: 'POJ1287',
    title: '网络最小连通代价（推断）',
    content: `## 题目描述\n给定一个无向带权图，求使所有点连通所需的最小总代价。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入一个整数 $n$，表示点数。\n\n当 $n=0$ 时输入结束。\n\n第二行输入一个整数 $m$，表示边数。\n\n接下来 $m$ 行，每行输入三个整数 $u,v,w$，表示一条连接 $u,v$ 的边，权值为 $w$。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最小生成树的总权值。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 Kruskal 算法求解，建议后续人工复核。`,
  },
  {
    order: 7,
    source: '最短路径/poj1797.cpp',
    pid: 'POJ1797',
    title: '最大瓶颈路径（推断）',
    content: `## 题目描述\n给定一个无向带权图，定义一条路径的容量为路径上所有边权的最小值。请找出从 1 号点到 $n$ 号点的一条路径，使其容量尽可能大。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试组数。\n\n对于每组数据：\n\n- 第一行输入两个整数 $n,m$，表示点数和边数；\n- 接下来 $m$ 行，每行输入三个整数 $u,v,w$，表示一条无向边及其容量。\n\n## 输出格式\n对于每组数据，按如下格式输出：\n\n- 先输出一行 Scenario #k:；\n- 再输出一行答案；\n- 每组数据后额外输出一个空行。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用基于优先队列的 Dijkstra 变形求最大瓶颈路，建议后续人工复核。`,
  },
  {
    order: 8,
    source: '最短路径/poj1860.cpp',
    pid: 'POJ1860',
    title: '汇率套利判定（推断）',
    content: `## 题目描述\n有若干种货币和若干条双向兑换规则。每条规则给出兑换汇率和手续费。\n\n给定初始持有的货币种类和金额，判断是否存在一系列兑换操作，使得最终回到初始货币时金额比初始更多。\n\n## 输入格式\n第一行输入四个数 $n,m,s,v$，分别表示货币种数、兑换规则数、初始货币编号和初始金额。\n\n接下来 $m$ 行，每行输入一条双向兑换规则，格式为 $a,b,r_{ab},c_{ab},r_{ba},c_{ba}$。\n\n## 输出格式\n如果存在套利方案，输出 YES，否则输出 NO。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 Bellman-Ford 判定正环，建议后续人工复核。`,
  },
  {
    order: 9,
    source: '最短路径/poj3259.cpp',
    pid: 'POJ3259',
    title: '虫洞负环判定（推断）',
    content: `## 题目描述\n给定一个包含普通双向道路和单向虫洞的图。普通道路的时间为正，虫洞会使时间倒流，等价于带负权的单向边。\n\n请判断图中是否存在负权回路。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试组数。\n\n对于每组数据：\n\n- 第一行输入三个整数 $n,m,w$，表示点数、双向道路数和虫洞数；\n- 接下来 $m$ 行，每行输入三个整数 $u,v,t$，表示一条双向道路，耗时为 $t$；\n- 接下来 $w$ 行，每行输入三个整数 $u,v,t$，表示一条虫洞，从 $u$ 到 $v$ 的耗时记为 $-t$。\n\n## 输出格式\n若存在负权回路，输出 YES，否则输出 NO。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 SPFA 判负环，建议后续人工复核。`,
  },
]

const skipped = [
  '关键路径/criticalpath.cpp',
  '拓扑排序/toposort.cpp',
  '最小生成树/prim.cpp',
  '最小生成树/kruskal.cpp',
  '最小生成树/kruskal_opt.cpp',
  '最短路径/dijkstra.cpp',
  '最短路径/dijkstra_opt.cpp',
  '最短路径/floyd.cpp',
  '最短路径/bellman-ford.cpp',
  '最短路径/spfa.cpp',
]

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

const readme = `# 6 图论算法\n\n本目录按原始教材顺序整理提高篇第六章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n- 无\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)