/**
 * reorder_curriculum.js
 * 优化 GESP C++ 课程体系：删除冗余专题 + 重排顺序
 *
 * 用法：
 *   node reorder_curriculum.js --dry-run   # 预览
 *   node reorder_curriculum.js             # 正式写入
 */

import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const MONGODB_URI = process.env.APP_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools'
const DRY_RUN = process.argv.includes('--dry-run')

// ── Schema ────────────────────────────────────────────
const chapterSchema = new mongoose.Schema({
  id: String, title: String, content: String, contentType: String,
  resourceUrl: String, problemIds: [String], optionalProblemIds: [String], optional: Boolean
}, { _id: false })

const topicSchema = new mongoose.Schema({
  title: String, description: String, chapters: [chapterSchema]
}, { _id: false })

const courseLevelSchema = new mongoose.Schema({
  level: Number, group: String, label: String, subject: String,
  title: String, description: String, topics: [topicSchema], chapters: [chapterSchema]
})
const CourseLevel = mongoose.model('CourseLevel', courseLevelSchema)

// ══════════════════════════════════════════════════════
// 配置：每个 Level 的变更
// ══════════════════════════════════════════════════════

const CHANGES = {

  // ── Level 5 ─────────────────────────────────────────
  // 问题：三分/分治/双指针等和前置知识距离太远
  5: {
    delete: [],       // 无需删除
    order: [
      '算法效率',     // 01 ← 维持
      '数论基础',     // 02 ← 维持
      '高精度运算',   // 03 ← 维持
      '前缀和差分',   // 04 ← 上移(was 05)
      '二分法',       // 05 ← 上移(was 06)
      '三分法',       // 06 ← 紧接二分(was 11)
      '双指针',       // 07 ← 上移(was 10)
      '贪心算法',     // 08 ← 上移(was 04)
      '递归算法',     // 09 ← 上移(was 07)
      '分治算法',     // 10 ← 紧接递归(was 12)
      'STL 容器',     // 11 ← 下移(was 08)
      '链表',         // 12 ← 下移(was 09)
    ]
  },

  // ── Level 6 ─────────────────────────────────────────
  // 问题：栈/队列在 DFS/BFS 之后；含有冗余综述型专题
  6: {
    delete: [
      '数据结构进阶',  // 栈/队列/优先队列概述，被 05_栈、06_队列 完全覆盖
      '搜索算法',      // 仅含 DFS/BFS 基础框架，被 08_DFS、09_BFS 完全覆盖
    ],
    order: [
      '栈',            // 01 ← 前置工具(DFS 底层是栈)
      '队列',          // 02 ← 前置工具(BFS 底层是队列)
      '树结构',        // 03 ← 树的基本概念(DFS/BFS在树上应用)
      '哈夫曼树',      // 04 ← 树的应用
      'DFS 深度优先搜索',  // 05 ← 有了栈再讲 DFS
      'BFS 广度优先搜索',  // 06 ← 有了队列再讲 BFS
      '动态规划入门',  // 07 ← DP 概念引入(记忆化搜索 + 简单一维DP)
      '线性 DP',       // 08 ← DP 进阶应用
      '背包 DP',       // 09 ← DP 进阶应用
    ]
  },

  // ── Level 7 ─────────────────────────────────────────
  // 问题：树状数组(gesp9难度)提前出现；进阶图算法宜在搜索进阶后
  7: {
    delete: [
      '树状数组',      // GESP9 难度，5个章节，L9/线性数据结构 已有覆盖
    ],
    order: [
      '图的存储与遍历',  // 01 ← 图论基础必先
      'DFS 进阶',        // 02 ← 基于 L6 DFS，回溯剪枝
      'BFS 进阶',        // 03 ← 基于 L6 BFS，双向/A*
      '进阶图算法',      // 04 ← Flood Fill + 拓扑排序
      '快速幂',          // 05 ← 数学工具
      '表达式求值',      // 06 ← 栈的高级应用
      '哈希',            // 07 ← 哈希表和字符串哈希
      '进阶动态规划',    // 08 ← LIS/LCS，基于线性DP
      '区间 DP',         // 09 ← 区间动态规划
      '树上 DP',         // 10 ← 树形动态规划
      '二维 DP',         // 11 ← 二维动态规划
    ]
  },

  // ── Level 8 ─────────────────────────────────────────
  // 问题：堆/并查集在它们的应用(最短路/MST)之后；Floyd与最短路分离；
  //       算法优化技巧冗余；组合数学孤悬于图论章节中
  8: {
    delete: [
      '算法优化技巧',   // 倍增LCA被10覆盖，前缀差分被L5覆盖，完全冗余
    ],
    // Floyd 章节从 "最短路径" 专题中移除(在下方 chapterDeletes 处理)
    order: [
      '并查集',          // 01 ← Kruskal 的基础工具
      '优先队列与堆',    // 02 ← Dijkstra 的基础工具
      '最短路径',        // 03 ← Dijkstra/SPFA(Floyd章节已移除)
      'Floyd 全源最短路', // 04 ← 全源最短路
      '最小生成树',      // 05 ← Kruskal(需并查集) + Prim(需堆)
      '拓扑排序',        // 06 ← DAG 算法
      '线段树',          // 07 ← 核心数据结构
      '倍增与 LCA',      // 08 ← 树上倍增
      '树的直径与重心',  // 09 ← 树的性质
      '树上差分',        // 10 ← 树上路径统计
      '离散化与 ST 表',  // 11 ← 预处理技巧
      '组合数学',        // 12 ← 数学专题集中
      '数论进阶',        // 13 ← 数学专题集中
      '差分约束',        // 14 ← 图论+数学综合
    ]
  },

  // ── Level 9 ─────────────────────────────────────────
  // 问题：DP优化(单调队列优化DP)在线性数据结构(单调队列)之前
  9: {
    delete: [],
    order: [
      '字符串算法',               // 01 ← 维持
      '线性数据结构',             // 02 ← 上移！单调栈/队列/BIT 是后续DP优化的工具
      '搜索进阶与贪心',           // 03 ← 上移(was 02)
      '数论进阶',                 // 04 ← 维持相对位置(was 03)
      'DP 进阶 · 状压与数位',     // 05 ← 维持(was 04)
      'DP 进阶 · 概率期望与换根', // 06 ← 维持(was 05)
      'DP 优化',                  // 07 ← 现在在线性数据结构之后(was 06)
      '线段树',                   // 08 ← 维持
      '高级分治与根号算法',       // 09 ← 维持
      '图论进阶',                 // 10 ← 维持
      '网络流与二分图',           // 11 ← 维持
    ]
  },
}

// 专题内的章节删除（不删整个专题，只删其中某章）
const CHAPTER_DELETES = [
  // L8/最短路径 中 Floyd 章节 → 已由 L8/09_Floyd全源最短路 完整覆盖
  {
    level: 8,
    topicKeyword: '最短路径',
    chapterTitle: 'Floyd 算法',   // 匹配包含此字符串的章节标题
  },
]

// ══════════════════════════════════════════════════════
// 工具函数
// ══════════════════════════════════════════════════════

/** 在 topics 数组中按 keyword 模糊匹配 title */
function findTopic(topics, keyword) {
  return topics.find(t => t.title && t.title.includes(keyword))
}

/** 按新顺序重排 topics，未在 order 中的补到末尾 */
function reorderTopics(topics, order) {
  const result = []
  for (const keyword of order) {
    const t = findTopic(topics, keyword)
    if (t) result.push(t)
    else console.log(`    ⚠️  未找到专题关键词: "${keyword}"`)
  }
  // 未在 order 中的专题保留到末尾（不丢弃）
  const remaining = topics.filter(t => !order.some(k => t.title && t.title.includes(k)))
  if (remaining.length) {
    console.log(`    ℹ️  未排序的专题(保留在末尾): ${remaining.map(t => t.title).join(', ')}`)
  }
  return [...result, ...remaining]
}

// ══════════════════════════════════════════════════════
// 主逻辑
// ══════════════════════════════════════════════════════

async function main() {
  console.log('='.repeat(60))
  console.log('课程体系结构优化')
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN (不写库)' : '正式写入'}`)
  console.log('='.repeat(60))

  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI)
    console.log('数据库已连接\n')
  }

  let totalDeleted = 0, totalReordered = 0, totalChapterDeleted = 0

  for (const [levelStr, config] of Object.entries(CHANGES)) {
    const levelNum = parseInt(levelStr)
    console.log(`\n── Level ${levelNum} ──────────────────────────`)

    let doc = null
    if (!DRY_RUN) {
      doc = await CourseLevel.findOne({ level: levelNum })
      if (!doc) { console.log(`  !! 找不到 Level${levelNum}`); continue }
    }

    const topics = DRY_RUN
      ? [] // dry-run 只输出计划
      : [...doc.topics]

    // 1. 删除冗余专题
    for (const keyword of (config.delete || [])) {
      if (DRY_RUN) {
        console.log(`  🗑  DELETE 专题: "${keyword}"`)
        totalDeleted++
        continue
      }
      const idx = topics.findIndex(t => t.title && t.title.includes(keyword))
      if (idx !== -1) {
        console.log(`  🗑  删除专题: "${topics[idx].title}" (${topics[idx].chapters?.length || 0} 章节)`)
        topics.splice(idx, 1)
        totalDeleted++
      } else {
        console.log(`  ⚠️  未找到专题: "${keyword}"`)
      }
    }

    // 2. 重排顺序
    if (!DRY_RUN && config.order?.length) {
      const before = topics.map(t => t.title)
      const reordered = reorderTopics(topics, config.order)
      const after = reordered.map(t => t.title)
      const changed = before.join('|') !== after.join('|')
      console.log(`  📋 重排顺序${changed ? ' (有变更)' : ' (无变化)'}:`)
      after.forEach((name, i) => console.log(`    ${String(i+1).padStart(2)}. ${name}`))
      doc.topics = reordered
      totalReordered++
    } else if (DRY_RUN && config.order?.length) {
      console.log(`  📋 新顺序:`)
      config.order.forEach((name, i) => console.log(`    ${String(i+1).padStart(2)}. ${name}`))
    }

    // 3. 保存
    if (!DRY_RUN) {
      await doc.save()
      console.log(`  ✓ Level${levelNum} 已保存`)
    }
  }

  // 专题内的章节删除
  console.log(`\n── 专题内章节删除 ────────────────────────`)
  for (const rule of CHAPTER_DELETES) {
    if (DRY_RUN) {
      console.log(`  🗑  Level${rule.level} / "${rule.topicKeyword}" -> 删除含 "${rule.chapterTitle}" 的章节`)
      totalChapterDeleted++
      continue
    }
    const doc = await CourseLevel.findOne({ level: rule.level })
    if (!doc) continue
    const topic = doc.topics.find(t => t.title?.includes(rule.topicKeyword))
    if (!topic) { console.log(`  ⚠️  未找到专题 "${rule.topicKeyword}"`); continue }
    const before = topic.chapters.length
    topic.chapters = topic.chapters.filter(c => !c.title?.includes(rule.chapterTitle))
    const removed = before - topic.chapters.length
    if (removed > 0) {
      console.log(`  🗑  Level${rule.level} / ${topic.title}: 删除 "${rule.chapterTitle}" (${removed} 章节)`)
      totalChapterDeleted += removed
      await doc.save()
    } else {
      console.log(`  ⚠️  未找到章节 "${rule.chapterTitle}" (专题: ${topic.title})`)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`完成！`)
  console.log(`  删除专题: ${totalDeleted}`)
  console.log(`  删除章节: ${totalChapterDeleted}`)
  console.log(`  重排 Level: ${totalReordered}`)

  if (!DRY_RUN) await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
