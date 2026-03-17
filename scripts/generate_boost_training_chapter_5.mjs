import fs from 'fs'
import path from 'path'

const sourceChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）源码/5 图论提高')
const outputChapterDir = path.resolve('other/算法训练营：提高篇（全彩版）题目/5 图论提高')

const items = [
  {
    order: 1,
    source: 'poj1236.cpp',
    pid: 'POJ1236',
    title: '强连通分量补边（推断）',
    content: `## 题目描述\n给定一个有向图，图中共有 $n$ 个点。现在需要回答两个问题：\n\n- 至少选择多少个起点发出信息，才能让所有点最终都收到信息；\n- 至少再添加多少条有向边，才能使整张图变成强连通图。\n\n## 输入格式\n第一行输入一个整数 $n$，表示点数。\n\n接下来 $n$ 行描述每个点的出边：第 $i$ 行输入若干个整数，表示从点 $i$ 出发可以到达的点，最后以 0 结束。\n\n## 输出格式\n输出两行：\n\n- 第一行输出第一个问题的答案；\n- 第二行输出第二个问题的答案。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码先求强连通分量，再统计缩点后入度为 0 和出度为 0 的分量数量，建议后续人工复核。`,
  },
  {
    order: 2,
    source: 'poj3352.cpp',
    pid: 'POJ3352',
    title: '边双连通补边（推断）',
    content: `## 题目描述\n给定一个无向连通图。你可以向图中添加若干条无向边，目标是让原图在任意删除一条边后仍保持连通。\n\n请输出最少需要添加多少条边。\n\n## 输入格式\n第一行输入两个整数 $n,m$，表示点数和边数。\n\n接下来 $m$ 行，每行输入两个整数 $u,v$，表示无向图中的一条边。\n\n## 输出格式\n输出一行一个整数，表示最少需要补加的边数。\n\n## 说明\n该题面根据 AC 代码行为推断生成，默认代码通过 Tarjan 缩边双连通分量后统计叶子分量数，并输出 $\\lceil leaf / 2 \\rceil$，建议后续人工复核。`,
  },
]

const skipped = [
  'tarjan_bridge.cpp',
  'tarjan_cut.cpp',
  'tarjan_scc.cpp',
  'tarjan_scc test.cpp',
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

const readme = `# 5 图论提高\n\n本目录按原始教材顺序整理提高篇第五章题目素材。\n\n## 已生成题目\n\n${generated.join('\n') || '- 无'}\n\n## 跳过的示例文件\n\n${skipped.map(name => `- ${name}`).join('\n')}\n\n## 同题其他实现\n\n- 无\n\n## 说明\n\n- 每道题目录内包含 problem.md、std.cpp、source.cpp。\n- 本章题面均根据源码行为推断生成，建议后续人工复核。\n`

fs.writeFileSync(path.join(outputChapterDir, 'README.md'), readme, 'utf8')

console.log(`Generated ${generated.length} entries in ${outputChapterDir}`)
process.exit(0)