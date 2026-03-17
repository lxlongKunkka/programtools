import fs from 'fs'
import path from 'path'
import Document from '../server/models/Document.js'

const sourceChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）源码/6 图论算法进阶')
const outputChapterDir = path.resolve('other/算法训练营：进阶篇（全彩版）题目/6 图论算法进阶')

const items = [
  {
    order: 1,
    source: '6.1 EK算法/hdu1532 EK.cpp',
    pid: 'HDU1532',
    manualTitle: '最大流（EK 实现）（推断）',
    manualContent: `## 题目描述\n给定一个有向网络，求从 1 号点到 $n$ 号点的最大流。\n\n## 输入格式\n输入边数和点数，随后输入若干条有向边及其容量。\n\n## 输出格式\n输出一行一个整数，表示最大流。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用 Edmonds-Karp 算法，建议后续人工复核。`,
  },
  {
    order: 2,
    source: '6.2 Dinic算法/poj1459 Dinic.cpp',
    pid: 'POJ1459',
    manualTitle: '电力网络最大流（推断）',
    manualContent: `## 题目描述\n给定一个包含发电站、变电站和用户的网络，求整张网络的最大供电量。\n\n## 输入格式\n输入点数、边数、电源数、汇点数以及带容量的连接关系。\n\n## 输出格式\n输出一行一个整数，表示最大流。\n\n## 说明\n该题面根据 Dinic 专题源码和经典原题推断生成，建议后续人工复核。`,
  },
  {
    order: 3,
    source: '6.3 ISAP算法/poj3281 ISAP.cpp',
    pid: 'POJ3281',
    manualTitle: '食物与饮料匹配（推断）',
    manualContent: `## 题目描述\n有若干头奶牛，每头牛可接受若干种食物和若干种饮料。每种食物和每种饮料都只能分配给一头牛。求最多能满足多少头牛。\n\n## 输入格式\n输入奶牛数、食物数、饮料数以及每头牛可接受的食物和饮料集合。\n\n## 输出格式\n输出一行一个整数，表示最多可满足的奶牛数量。\n\n## 说明\n该题面根据网络流专题源码和经典原题推断生成，默认代码使用 ISAP，建议后续人工复核。`,
  },
  {
    order: 4,
    source: '6.4 二分图匹配/hdu3605 maxmatch.cpp',
    pid: 'HDU3605',
    manualTitle: '带容量的二分图匹配（推断）',
    manualContent: `## 题目描述\n左侧有若干个对象，右侧有若干个类别。每个对象可以分配给若干个可选类别，每个类别有容量上限。判断是否能让所有对象都完成分配。\n\n## 输入格式\n输入左侧点数、右侧点数、可行匹配矩阵以及每个右侧点的容量。\n\n## 输出格式\n若存在可行的完全匹配，输出 YES，否则输出 NO。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码使用带容量的匈牙利式增广匹配，建议后续人工复核。`,
  },
  {
    order: 5,
    source: '6.4 二分图匹配/poj1274 maxmatch.cpp',
    pid: 'POJ1274',
    manualTitle: '二分图最大匹配（推断）',
    manualContent: `## 题目描述\n给定一个二分图，求最大匹配数。\n\n## 输入格式\n输入左右部点数以及左侧每个点可连接到的右侧点集合。\n\n## 输出格式\n输出一行一个整数，表示最大匹配数。\n\n## 说明\n该题面根据经典原题和源码文件名推断生成，建议后续人工复核。`,
  },
  {
    order: 6,
    source: '6.5 最大流最小割/hdu3491 Dinic.cpp',
    pid: 'HDU3491',
    manualTitle: '点容量最小割（推断）',
    manualContent: `## 题目描述\n给定一个无向图，每个结点有一个容量值。现要求在指定源点和汇点之间进行分割，使割的总代价最小。\n\n## 输入格式\n第一行输入测试组数。对于每组数据，输入结点数、边数、源点、汇点、各结点容量以及图的边信息。\n\n## 输出格式\n输出一行一个整数，表示最小割值。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码通过点拆分把点容量最小割转化为最大流，建议后续人工复核。`,
  },
  {
    order: 7,
    source: '6.5 最大流最小割/p2762 Dinic.cpp',
    pid: 'P2762',
    manualTitle: '太空飞行计划问题',
    manualContent: `## 题目描述\n给定若干实验项目和仪器，选择一批项目使总收益减去所需仪器成本最大，同时输出被选中的项目和仪器。\n\n## 输入格式\n输入项目数、仪器数、每个项目收益、项目所需仪器以及每个仪器成本。\n\n## 输出格式\n输出被选中的项目集合、仪器集合以及最大净收益。\n\n## 说明\n若本地存在 Luogu P2762 文档，则优先使用文档题面；否则以上题面根据 AC 代码行为推断生成。`,
  },
  {
    order: 8,
    source: '6.5 最大流最小割/poj3251 Dinic.cpp',
    pid: 'POJ3251',
    manualTitle: '最大流最小割建模题（推断）',
    manualContent: `## 题目描述\n给定一个需要通过最大流或最小割建模求解的网络优化问题，要求根据图中容量约束求出最优值。\n\n## 输入格式\n输入图规模、点边信息及相关容量参数。\n\n## 输出格式\n输出一行一个整数，表示答案。\n\n## 说明\n该题面根据教材章节定位和源码文件名推断生成，建议后续人工复核。`,
  },
  {
    order: 9,
    source: '6.6 最小费用最大流/p2770.cpp',
    pid: 'P2770',
    manualTitle: '航空路线问题',
    manualContent: `## 题目描述\n给定若干城市和若干条单向航线，要求找出两条从起点到终点的点不重复路径，使经过的城市总数最大，并输出其中一组方案。\n\n## 输入格式\n输入城市数、航线数、城市名称以及航线关系。\n\n## 输出格式\n若无解输出 No Solution!；否则输出最大经过城市数以及对应路径。\n\n## 说明\n若本地存在 Luogu P2770 文档，则优先使用文档题面；否则以上题面根据 AC 代码行为推断生成。`,
  },
  {
    order: 10,
    source: '6.6 最小费用最大流/poj2135.cpp',
    pid: 'POJ2135',
    manualTitle: '双路最小费用运输（推断）',
    manualContent: `## 题目描述\n给定一个无向带权图，要求从 1 号点到 $n$ 号点安排两条路径，使总费用最小。\n\n## 输入格式\n输入点数、边数以及各条边的费用。\n\n## 输出格式\n输出一行一个整数，表示最小总费用。\n\n## 说明\n该题面根据最小费用最大流专题和经典原题推断生成，建议后续人工复核。`,
  },
]

const alternateImplementations = {
  HDU1532: ['6.1 EK算法/hdu1532 Dinic.cpp', '6.1 EK算法/hdu1532 ISAP.cpp'],
  POJ1459: ['6.2 Dinic算法/poj1459_1 Dinic.cpp'],
}

const docs = await Document.find({
  domainId: 'luogu',
  pid: { $in: ['P2762', 'P2770'] },
}).select('pid title content').lean()
const docMap = new Map(docs.map(doc => [String(doc.pid).toUpperCase(), doc]))

function normalizeTitle(rawTitle, pid) {
  const title = String(rawTitle || '').trim()
  if (!title) return pid
  return title.replace(/^【[^】]+】\s*/, '').replace(/^\[[^\]]+\]\s*/, '').trim() || pid
}

function sanitizeSegment(value) {
  return String(value).replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim()
}

function buildProblemMarkdown(item) {
  const doc = docMap.get(String(item.pid).toUpperCase())
  if (doc) return `# ${item.pid} ${normalizeTitle(doc.title, item.pid)}\n\n${String(doc.content || '').trim()}\n`
  return `# ${item.pid} ${item.manualTitle}\n\n${item.manualContent}\n`
}

function resolveTitle(item) {
  const doc = docMap.get(String(item.pid).toUpperCase())
  return doc ? normalizeTitle(doc.title, item.pid) : item.manualTitle
}

fs.mkdirSync(outputChapterDir, { recursive: true })
const generated = []
for (const item of items) {
  const title = resolveTitle(item)
  const folderName = `${String(item.order).padStart(2, '0')}-${item.pid}-${sanitizeSegment(title)}`
  const folderPath = path.join(outputChapterDir, folderName)
  const sourcePath = path.join(sourceChapterDir, item.source)
  fs.mkdirSync(folderPath, { recursive: true })
  fs.copyFileSync(sourcePath, path.join(folderPath, 'source.cpp'))
  fs.copyFileSync(sourcePath, path.join(folderPath, 'std.cpp'))
  fs.writeFileSync(path.join(folderPath, 'problem.md'), buildProblemMarkdown(item), 'utf8')
  generated.push(`- ${folderName}`)
}

const alternateLines = Object.entries(alternateImplementations).map(([pid, files]) => `- ${pid}: ${files.join('、')}`).join('\n')
const readme = `# 6 图论算法进阶\n\n本目录按原始教材顺序整理进阶篇第六章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n- 无\n\n## 同题其他实现\n\n${alternateLines || '- 无'}\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- P2762、P2770 若本地存在 Luogu 文档，则优先使用文档题面；其余题面根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')
console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)
