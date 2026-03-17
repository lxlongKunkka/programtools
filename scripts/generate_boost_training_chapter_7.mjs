import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）源码/7 搜索算法提高')
const outputChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）题目/7 搜索算法提高')

const items = [
  {
    order: 1,
    source: 'hdu1043 Astar.cpp',
    pid: 'HDU1043',
    manualTitle: '八数码最短操作序列（推断）',
    manualContent: `## 题目描述\n给定一个 $3 \\times 3$ 的八数码棋盘，包含数字 1 到 8 以及一个空格 x。每次可以将空格与其上、下、左、右相邻的数字交换。\n\n请输出将当前状态变为目标状态 1 2 3 / 4 5 6 / 7 8 x 的一条最短操作序列。\n\n## 输入格式\n输入包含多组数据。每组数据一行，共 9 个字符，表示棋盘当前状态，字符之间以空格分隔，空格位置用 x 表示。\n\n## 输出格式\n对于每组数据：\n\n- 若无解，输出 unsolvable；\n- 否则输出一行，仅由字符 d、r、u、l 构成，表示一条最短操作序列。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 A* 加康托展开求最短路，建议后续人工复核。`,
  },
  {
    order: 2,
    source: 'hdu3085.cpp',
    pid: 'HDU3085',
    manualTitle: '人鬼追逐最短相遇时间（推断）',
    manualContent: `## 题目描述\n在一个网格地图中，有一名男孩 M、一名女孩 G 和两个鬼 Z。\n\n- 男孩每个时间单位最多可以移动 3 步；\n- 女孩每个时间单位最多可以移动 1 步；\n- 两个鬼不会移动，但在第 $t$ 个时间单位结束前，所有与任一鬼曼哈顿距离不超过 $2t$ 的位置都会变得危险，任何人都不能进入或停留在这些位置。\n\n请判断男孩和女孩最早在第几个时间单位能够相遇；若无法相遇，输出 -1。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试组数。\n\n每组数据第一行输入两个整数 $n,m$，表示地图大小。\n\n接下来 $n$ 行，每行一个长度为 $m$ 的字符串。地图字符含义为：\n\n- M：男孩起点；\n- G：女孩起点；\n- Z：鬼的位置；\n- X：障碍；\n- 其他位置表示可通行。\n\n## 输出格式\n对于每组数据，输出一行一个整数，表示最早相遇时间；若无法相遇则输出 -1。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用双向 BFS 分层扩展，建议后续人工复核。`,
  },
  {
    order: 3,
    source: 'p1120.cpp',
    pid: 'P1120',
    manualTitle: '小木棍',
    manualContent: `## 题目描述\n给定若干根小木棍，它们原本由若干根等长长木棍锯开得到。现要求把这些小木棍全部重新拼回若干根长度相同的长木棍。\n\n请输出这些原始长木棍可能的最小长度。\n\n## 输入格式\n第一行输入一个整数 $n$，表示小木棍数量。\n\n接下来一行或多行输入这 $n$ 根小木棍的长度。代码中会忽略长度大于 50 的木棍。\n\n## 输出格式\n输出一行一个整数，表示原始长木棍的最小可能长度。\n\n## 说明\n该题面根据经典题型和 AC 代码行为推断生成；若本地存在 Luogu P1120 文档，则优先使用文档内容。`,
  },
  {
    order: 4,
    source: 'poj1475.cpp',
    pid: 'POJ1475',
    manualTitle: '推箱子最优路径（推断）',
    manualContent: `## 题目描述\n给定一个迷宫，其中包含一个人 S、一个箱子 B 和目标位置 T。人可以在空地上自由行走，也可以在自己位于箱子后方时将箱子向上下左右某个方向推动一格，但不能穿过墙。\n\n需要找到一条把箱子推到目标位置的方案，并按如下优先级优化：\n\n- 先最小化推箱子的次数；\n- 在推箱子次数相同的前提下，最小化人的行走步数。\n\n## 输入格式\n输入包含多组数据。每组数据第一行输入两个整数 $N,M$，表示迷宫大小。\n\n当 $N=0$ 且 $M=0$ 时输入结束。\n\n接下来 $N$ 行，每行一个长度为 $M$ 的字符串。字符含义为：\n\n- S：人的起点；\n- B：箱子起点；\n- T：目标位置；\n- #：墙；\n- 其他位置表示可通行。\n\n## 输出格式\n对于每组数据：\n\n- 先输出一行 Maze #k；\n- 若有解，下一行输出一条方案串，其中大写字母 N/S/E/W 表示推箱子的方向，小写字母 n/s/e/w 表示人的普通移动方向；\n- 若无解，输出 Impossible.；\n- 每组数据后输出一个空行。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用外层 BFS 枚举推箱子、内层 BFS 判断人是否能到达推动位置，建议后续人工复核。`,
  },
  {
    order: 5,
    source: 'poj2449 Astar.cpp',
    pid: 'POJ2449',
    manualTitle: '第 K 短路（推断）',
    manualContent: `## 题目描述\n给定一个带正权有向图，求从起点 $s$ 到终点 $t$ 的第 $k$ 短路径长度。路径允许重复经过点和边。\n\n## 输入格式\n第一行输入两个整数 $n,m$，表示点数和边数。\n\n接下来 $m$ 行，每行输入三个整数 $u,v,w$，表示一条从 $u$ 到 $v$ 的有向边，边权为 $w$。\n\n最后一行输入三个整数 $s,t,k$，表示起点、终点和所求的第 $k$ 短路。\n\n## 输出格式\n输出一行一个整数，表示第 $k$ 短路长度；若不存在则输出 -1。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码先在反图上跑 Dijkstra 作为估价函数，再用 A* 搜索第 $k$ 短路，建议后续人工复核。`,
  },
  {
    order: 6,
    source: 'poj2676.cpp',
    pid: 'POJ2676',
    manualTitle: '数独求解（推断）',
    manualContent: `## 题目描述\n给定若干个 $9 \\times 9$ 的数独棋盘，请为每个棋盘填入数字，使每一行、每一列以及每个 $3 \\times 3$ 宫中的数字 1 到 9 都恰好出现一次。\n\n## 输入格式\n第一行输入一个整数 $T$，表示测试组数。\n\n接下来每组数据输入 9 行，每行一个长度为 9 的数字串，0 表示空格。\n\n## 输出格式\n对于每组数据，输出 9 行求解后的棋盘，每行一个长度为 9 的数字串。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 DFS 回溯求解数独，建议后续人工复核。`,
  },
]

const alternateImplementations = {
  HDU1043: ['hdu1043 BFS+Table.cpp', 'hdu1043 IDAstar.cpp', 'hdu1043 IDAstar_2.cpp'],
}

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: items.filter(item => !item.manualOnly).map(item => item.pid) },
}).select('pid title content').lean()

const docMap = new Map(docs.map(doc => [String(doc.pid).toUpperCase(), doc]))

function normalizeTitle(rawTitle, pid) {
  const title = String(rawTitle || '').trim()
  if (!title) return pid
  return title
    .replace(/^【[^】]+】\s*/, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .trim() || pid
}

function sanitizeSegment(value) {
  return String(value)
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildProblemMarkdown(item, doc) {
  if (doc && item.pid === 'P1120') {
    const title = normalizeTitle(doc.title, item.pid)
    return `# ${item.pid} ${title}\n\n${String(doc.content || '').trim()}\n`
  }
  return `# ${item.pid} ${item.manualTitle}\n\n${item.manualContent}\n`
}

fs.mkdirSync(outputChapterDir, { recursive: true })

const generated = []
for (const item of items) {
  const doc = docMap.get(String(item.pid).toUpperCase())
  const title = doc && item.pid === 'P1120' ? normalizeTitle(doc.title, item.pid) : item.manualTitle
  const folderName = `${String(item.order).padStart(2, '0')}-${item.pid}-${sanitizeSegment(title)}`
  const folderPath = path.join(outputChapterDir, folderName)
  const sourcePath = path.join(sourceChapterDir, item.source)

  fs.mkdirSync(folderPath, { recursive: true })
  fs.copyFileSync(sourcePath, path.join(folderPath, 'source.cpp'))
  fs.copyFileSync(sourcePath, path.join(folderPath, 'std.cpp'))
  fs.writeFileSync(path.join(folderPath, 'problem.md'), buildProblemMarkdown(item, doc), 'utf8')

  generated.push(`- ${folderName}`)
}

const alternateLines = Object.entries(alternateImplementations)
  .map(([pid, files]) => `- ${pid}: ${files.join('、')}`)
  .join('\n')

const readme = `# 7 搜索算法提高\n\n本目录按原始教材顺序整理提高篇第七章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n- 无\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- P1120 若本地 Document 集合存在 Luogu 文档，则优先使用文档题面；其余题面根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)