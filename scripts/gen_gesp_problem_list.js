/**
 * gen_gesp_problem_list.js
 * 根据 atcoder_abc_tags.json 和 AtCoder→GESP 映射，
 * 输出每个 GESP 知识点下的全部题目列表（Markdown 格式）
 *
 * 使用：node scripts/gen_gesp_problem_list.js
 * 输出：scripts/gesp_problem_list.md
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.resolve(__dirname, 'atcoder_abc_tags.json')
const OUT_FILE  = path.resolve(__dirname, 'gesp_problem_list.md')

// ── AtCoder tag → { gesp, label } 映射 ─────────────────────────────
// label: GESP 知识点中文名；gesp: 所属等级（主要等级，供分组排序用）
const TAG_MAP = {
  // 顶级
  'Easy':                      null,
  'Ad-Hoc':                    null,
  'Greedy-Methods':            { label: '贪心',                gesp: 5 },
  'Construct':                 { label: '构造',                gesp: 9 },
  'Interactive':               null,
  'April-Fool':                null,
  'Marathon':                  null,
  'Other':                     null,

  // Searching
  'tags/Searching/Brute-Force':     { label: '暴力枚举',       gesp: 2 },
  'tags/Searching/Bit-Brute-Force': { label: '位运算',         gesp: 3 },
  'tags/Searching/Binary-Search':   { label: '二分',           gesp: 5 },
  'tags/Searching/Ternary-Search':  { label: '三分',           gesp: 5 },
  'tags/Searching/DFS':             { label: 'DFS',            gesp: 6 },
  'tags/Searching/BFS':             { label: 'BFS',            gesp: 6 },
  'tags/Searching/Heuristic':       { label: '搜索进阶',       gesp: 9 },
  'tags/Searching/Other':           null,

  // String
  'tags/String/String-Operation':   { label: '字符串',         gesp: 3 },
  'tags/String/Parsing':            { label: '字符串',         gesp: 3 },
  'tags/String/Trie':               { label: '字典树',         gesp: 9 },
  'tags/String/Rolling-Hash':       { label: '哈希',           gesp: 7 },
  'tags/String/Suffix-Array':       { label: '后缀数组',       gesp: 10 },
  'tags/String/Z-Algorithm':        { label: 'Z函数',          gesp: 9 },
  'tags/String/Manacher':           { label: '回文串',         gesp: 9 },
  'tags/String/Other':              null,

  // Mathematics
  'tags/Mathematics/Number':        { label: '数论基础',       gesp: 5 },
  'tags/Mathematics/Enumerate':     { label: '暴力枚举',       gesp: 2 },
  'tags/Mathematics/Combinatorics': { label: '组合数学',       gesp: 8 },
  'tags/Mathematics/XOR':           { label: '位运算',         gesp: 3 },
  'tags/Mathematics/Expected-Value':{ label: '概率论基础',     gesp: 9 },
  'tags/Mathematics/Matrix':        { label: '矩阵快速幂',     gesp: 7 },
  'tags/Mathematics/Probability':   { label: '概率论基础',     gesp: 9 },
  'tags/Mathematics/Other':         null,

  // Technique
  'tags/Technique/Sort':            { label: '排序',           gesp: 4 },
  'tags/Technique/Simulation':      { label: '模拟',           gesp: 2 },
  'tags/Technique/Cumulative-Sum':  { label: '前缀和',         gesp: 5 },
  'tags/Technique/imos':            { label: '差分',           gesp: 5 },
  'tags/Technique/Two-Pointers':    { label: '双指针',         gesp: 5 },
  'tags/Technique/Doubling':        { label: '倍增',           gesp: 8 },
  'tags/Technique/Recursion':       { label: '递归',           gesp: 4 },
  'tags/Technique/Compress':        { label: '离散化',         gesp: 8 },
  'tags/Technique/Split-And-List':  { label: '折半搜索',       gesp: 9 },
  'tags/Technique/Square-Division': { label: '分块',           gesp: 9 },
  'tags/Technique/Divide-And-Conquer': { label: '分治',        gesp: 5 },
  'tags/Technique/Randomized-Algorithm': { label: '随机化',    gesp: 9 },
  'tags/Technique/Other':           null,

  // Graph
  'tags/Graph/Shortest-Path':       { label: '单源最短路径',   gesp: 8 },
  'tags/Graph/Minimum-Spanning-Tree':{ label: '最小生成树',    gesp: 8 },
  'tags/Graph/LCA':                 { label: 'LCA',            gesp: 8 },
  'tags/Graph/Topological-Sort':    { label: '拓扑排序',       gesp: 8 },
  'tags/Graph/Strongly-Connected-Components': { label: '强连通分量', gesp: 9 },
  'tags/Graph/dfs-tree':            { label: '图论基础',       gesp: 7 },
  'tags/Graph/Euler-Tour':          { label: '倍增',           gesp: 8 },
  'tags/Graph/HL-Decomposition':    { label: '树链剖分',       gesp: 9 },
  'tags/Graph/Centroid-Decomposition': { label: '点分治',      gesp: 10 },
  'tags/Graph/Euler-Path-and-Hamilton-Path': { label: '欧拉路', gesp: 9 },
  'tags/Graph/Bi-Connected-Components': { label: '双连通分量', gesp: 9 },
  'tags/Graph/Two-Edge-Connected-Components': { label: '双连通分量', gesp: 9 },
  'tags/Graph/Kirchhoff':           null,
  'tags/Graph/Check-Tree':          { label: '树形结构',       gesp: 6 },
  'tags/Graph/Other':               null,

  // Dynamic Programming
  'tags/Dynamic-Programming/Simple-DP':    { label: 'DP',           gesp: 6 },
  'tags/Dynamic-Programming/Restore-DP':   { label: 'DP',           gesp: 6 },
  'tags/Dynamic-Programming/Inline-DP':    { label: 'DP',           gesp: 6 },
  'tags/Dynamic-Programming/String-DP':    { label: '线性DP',        gesp: 6 },
  'tags/Dynamic-Programming/Section-DP':   { label: '区间DP',        gesp: 6 },
  'tags/Dynamic-Programming/Tree-DP':      { label: '树上DP',        gesp: 7 },
  'tags/Dynamic-Programming/Bit-DP':       { label: '状压DP',        gesp: 9 },
  'tags/Dynamic-Programming/Digit-DP':     { label: '数位DP',        gesp: 9 },
  'tags/Dynamic-Programming/Every-Direction-DP': { label: '换根DP',  gesp: 9 },
  'tags/Dynamic-Programming/Probability-DP': { label: '概率DP',      gesp: 9 },
  'tags/Dynamic-Programming/Expected-Value-DP': { label: '期望DP',   gesp: 9 },
  'tags/Dynamic-Programming/Insert-DP':    { label: 'DP',            gesp: 6 },
  'tags/Dynamic-Programming/Matrix-Power': { label: '矩阵快速幂',    gesp: 7 },
  'tags/Dynamic-Programming/CHT':          { label: '斜率优化DP',    gesp: 9 },
  'tags/Dynamic-Programming/Kitamasa':     { label: '矩阵快速幂',    gesp: 10 },
  'tags/Dynamic-Programming/Other':        null,

  // Data Structure
  'tags/Data-Structure/Union-Find-Tree':   { label: '并查集',        gesp: 8 },
  'tags/Data-Structure/Segment-Tree':      { label: '线段树',        gesp: 9 },
  'tags/Data-Structure/Lazy-Segment-Tree': { label: '线段树',        gesp: 9 },
  'tags/Data-Structure/BIT':               { label: '树状数组',      gesp: 9 },
  'tags/Data-Structure/priority_queue':    { label: '优先队列',      gesp: 8 },
  'tags/Data-Structure/Sparse-Table':      { label: 'ST表',          gesp: 8 },
  'tags/Data-Structure/Balanced-Tree':     { label: '平衡树',        gesp: 9 },
  'tags/Data-Structure/stack':             { label: '栈',            gesp: 6 },
  'tags/Data-Structure/queue':             { label: '队列',          gesp: 6 },
  'tags/Data-Structure/deque':             { label: '队列',          gesp: 6 },
  'tags/Data-Structure/set':               { label: 'STL',           gesp: 5 },
  'tags/Data-Structure/map':               { label: 'STL',           gesp: 5 },
  'tags/Data-Structure/multiset':          { label: 'STL',           gesp: 5 },
  'tags/Data-Structure/WaveletMatrix':     null,
  'tags/Data-Structure/Persistent-Data-Structures': { label: '可持久化数据结构', gesp: 10 },
  'tags/Data-Structure/Other':             null,

  // Game
  'tags/Game/Nim':                  { label: '博弈论',         gesp: 9 },
  'tags/Game/Grundy':               { label: '博弈论',         gesp: 9 },
  'tags/Game/Mini-Max':             { label: '博弈论',         gesp: 9 },
  'tags/Game/Backtrack':            { label: 'DFS',            gesp: 6 },
  'tags/Game/unique':               { label: '博弈论',         gesp: 9 },
  'tags/Game/Other':                { label: '博弈论',         gesp: 9 },

  // Flow
  'tags/Flow-Algorithms/Max-Flow':         { label: '网络流',        gesp: 9 },
  'tags/Flow-Algorithms/Min-Cut':          { label: '网络流',        gesp: 9 },
  'tags/Flow-Algorithms/Bipartite-Matching': { label: '二分图',      gesp: 9 },
  'tags/Flow-Algorithms/Min-Cost-Flow':    { label: '费用流',        gesp: 10 },

  // Geometry
  'tags/Geometry/Convex-Hull':             { label: '计算几何',      gesp: 9 },
  'tags/Geometry/Declination-Sorting':     { label: '计算几何',      gesp: 9 },
  'tags/Geometry/Three-D':                 { label: '计算几何',      gesp: 10 },
  'tags/Geometry/Voronoi-Diagram':         { label: '计算几何',      gesp: 10 },
}

// 难度标签
function diffLabel(d) {
  if (d == null) return '?'
  if (d < 400)   return '灰'
  if (d < 800)   return '茶'
  if (d < 1200)  return '绿'
  if (d < 1600)  return '水'
  if (d < 2000)  return '青'
  if (d < 2400)  return '蓝'
  if (d < 2800)  return '黄'
  return '橙+'
}

// AtCoder 题目链接
function probLink(id, title) {
  // id 格式：abc123_a
  const parts = id.split('_')
  const contest = parts[0]
  const prob = parts.slice(1).join('_')
  return `[${title}](https://atcoder.jp/contests/${contest}/tasks/${id})`
}

// ── 主逻辑 ──────────────────────────────────────────────────────────
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))

const GESP_LEVELS_SET = new Set(['gesp1','gesp2','gesp3','gesp4','gesp5','gesp6','gesp7','gesp8','gesp9','gesp10'])

// 同时生成带 gesp_labels 的 JSON（供 apply_atcoder_gesp_tags.js 使用）
const WITH_GESP_FILE = path.resolve(__dirname, 'atcoder_abc_tags_with_gesp.json')
const withGespData = {}
for (const prob of Object.values(data)) {
  const labels = [...new Set(prob.tags.map(t => TAG_MAP[t]).filter(Boolean).map(m => m.label))]
  const levels = [...new Set(prob.tags.map(t => TAG_MAP[t]).filter(Boolean).map(m => m.gesp))].sort((a,b)=>a-b)
  withGespData[prob.id] = { ...prob, gesp_labels: labels, gesp_levels: levels }
}
fs.writeFileSync(WITH_GESP_FILE, JSON.stringify(withGespData, null, 2))
console.log(`已更新 ${WITH_GESP_FILE}`)

// label → { gesp, problems: [{id, title, difficulty, atcoderTags}] }
const labelMap = {}

for (const prob of Object.values(data)) {
  const { id, title, tags, difficulty } = prob
  const seenLabels = new Set()

  for (const tag of tags) {
    const mapping = TAG_MAP[tag]
    if (!mapping) continue
    const key = `${mapping.gesp}__${mapping.label}`
    if (seenLabels.has(key)) continue
    seenLabels.add(key)

    if (!labelMap[key]) {
      labelMap[key] = { gesp: mapping.gesp, label: mapping.label, problems: [] }
    }
    labelMap[key].problems.push({ id, title, difficulty, tags })
  }
}

// 按 gesp 等级 → label 排序
const GESP_ORDER = [1,2,3,4,5,5,6,7,8,9,10]
const sorted = Object.values(labelMap).sort((a, b) => {
  if (a.gesp !== b.gesp) return a.gesp - b.gesp
  return a.label.localeCompare(b.label, 'zh')
})

// 每组题目按难度升序
for (const g of sorted) {
  g.problems.sort((a, b) => {
    const da = a.difficulty ?? 99999
    const db = b.difficulty ?? 99999
    return da - db
  })
}

// ── 生成 Markdown ───────────────────────────────────────────────────
const GESP_NAMES = {
  1: 'gesp1 — C++ 入门',
  2: 'gesp2 — 基础语法与循环',
  3: 'gesp3 — 数组·字符串·位运算',
  4: 'gesp4 — 函数·排序·递推',
  5: 'gesp5 — 数论·搜索·基础算法',
  6: 'gesp6 — 搜索·基础DP·基础数据结构',
  7: 'gesp7 — 高级算法·图论进阶',
  8: 'gesp8 — 图论·数据结构',
  9: 'gesp9 — CSP-S 水平',
  10: 'gesp10 — NOI 水平',
}

let md = `# GESP 知识点题目列表

> 来源：[atcoder-tags.herokuapp.com](https://atcoder-tags.herokuapp.com)（社区投票标签）  
> 难度色系：灰(<400) · 茶(400-800) · 绿(800-1200) · 水(1200-1600) · 青(1600-2000) · 蓝(2000-2400) · 黄(2400-2800) · 橙+(≥2800)  
> 生成时间：${new Date().toLocaleDateString('zh-CN')}

## 目录\n\n`

// 目录
let curGesp = -1
for (const g of sorted) {
  if (g.gesp !== curGesp) {
    curGesp = g.gesp
    md += `\n### ${GESP_NAMES[g.gesp]}\n`
  }
  const anchor = g.label.replace(/[（()）\s\/]/g, '-').replace(/-+/g, '-').toLowerCase()
  md += `- [${g.label}（${g.problems.length}题）](#${anchor})\n`
}

md += '\n---\n\n'

// 正文
curGesp = -1
for (const g of sorted) {
  if (g.gesp !== curGesp) {
    curGesp = g.gesp
    md += `\n## ${GESP_NAMES[g.gesp]}\n\n`
  }

  md += `### ${g.label}\n\n`
  md += `> 共 **${g.problems.length}** 题\n\n`
  md += `| 题目 | 难度值 | 色系 | AtCoder Tags |\n`
  md += `|---|---|---|---|\n`

  for (const p of g.problems) {
    const link  = probLink(p.id, p.title)
    const diff  = p.difficulty != null ? p.difficulty : '—'
    const color = diffLabel(p.difficulty)
    const tagStr = p.tags.map(t => {
      // 简化显示：去掉 tags/X/ 前缀
      return t.replace(/^tags\/[^/]+\//, '').replace(/^tags\//, '')
    }).join(', ')
    md += `| ${link} | ${diff} | ${color} | ${tagStr} |\n`
  }

  md += '\n'
}

fs.writeFileSync(OUT_FILE, md)
console.log(`写入完成：${OUT_FILE}`)
console.log(`共 ${sorted.length} 个知识点，${Object.keys(data).length} 道题`)
