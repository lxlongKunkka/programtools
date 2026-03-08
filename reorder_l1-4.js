/**
 * reorder_l1-4.js
 * 优化 Level1-4 课程体系：删除冗余专题/章节 + 重排顺序
 *
 * 用法：
 *   node reorder_l1-4.js --dry-run
 *   node reorder_l1-4.js
 */

import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const MONGODB_URI = process.env.APP_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools'
const DRY_RUN = process.argv.includes('--dry-run')

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

// ══════════════════════════════════════════════════════════════
// 变更配置
// ══════════════════════════════════════════════════════════════

const CHANGES = {

  // ── Level 1 ──────────────────────────────────────────────
  1: {
    // 删除整个专题
    deleteTopics: [
      '简单的逻辑',   // 4章：if判断/if-else/for循环 已被条件结构专题+循环结构专题覆盖
                      // "函数初探"章节属于L4，完全不应出现在L1
    ],
    // 删除专题内的某些章节 (keyword匹配)
    deleteChapters: [
      // 条件结构专题第1章 "if/else 单分支与双分支" 与已删除的简单的逻辑重叠
      // → 保留，因为删除简单的逻辑后，这章成了条件结构的入口，是必要的
    ],
    // 新专题顺序
    order: [
      '第一次交互',   // 01
      '整数的盒子',   // 02
      '数据的输入',   // 03
      '计算机算术',   // 04
      '更多数据类型', // 05
      '数学基础',     // 06 ← 上移(was 9)：浮点精度紧接double数据类型章节
      '条件结构专题', // 07 ← 直接从条件入手，不再有弱化版"简单的逻辑"
      '循环结构专题', // 08
    ]
  },

  // ── Level 2 ──────────────────────────────────────────────
  2: {
    deleteTopics: [],
    deleteChapters: [],
    // 顺序已合理，不调整
    order: null
  },

  // ── Level 3 ──────────────────────────────────────────────
  3: {
    deleteTopics: [
      '基础算法思想',   // 3章(枚举法/模拟法/练习)，被下方"枚举法专题"+"模拟专题"完全覆盖
      '原码反码补码',   // 3章内容与"进制与编码"第3章"原码、反码、补码"完全重叠
    ],
    deleteChapters: [],
    // 删除冗余后调整顺序，逻辑性更强
    order: [
      '数组应用',       // 01 ← 维持(承接L2数组初探)
      '字符串处理',     // 02 ← 维持(承接L2字符处理)
      '进制与编码',     // 03 ← 维持(含原码/反码/补码，不再单独开专题)
      '位运算',         // 04 ← 维持(紧接进制)
      '枚举法专题',     // 05 ← 上移(was 07，删除基础算法思想后填位)
      '模拟专题',       // 06 ← 上移(was 08)
    ]
  },

  // ── Level 4 ──────────────────────────────────────────────
  4: {
    deleteTopics: [],
    deleteChapters: [
      // 指针与引用专题 中 "值传递与引用传递（& 参数）" 与 函数编程专题 的同名章节重叠
      { topicKeyword: '指针与引用', chapterKeyword: '值传递与引用传递' },
    ],
    // 指针与引用是语言特性，应紧跟函数编程（同为C++语言机制）
    // 算法复杂度放最后，作为本级总结
    order: [
      '函数编程',     // 01
      '指针与引用',   // 02 ← 上移(was 06)，与函数编程同为C++语言机制
      '结构体',       // 03
      '二维数组',     // 04
      '递推算法',     // 05
      '排序算法',     // 06 ← 下移(was 03)
      '算法复杂度',   // 07 ← 维持末尾，作为本级总结
    ]
  },
}

// ══════════════════════════════════════════════════════════════
// 工具
// ══════════════════════════════════════════════════════════════
function findTopic(topics, kw) {
  return topics.find(t => t.title?.includes(kw))
}

function reorderTopics(topics, order) {
  const result = []
  for (const kw of order) {
    const t = findTopic(topics, kw)
    if (t) result.push(t)
    else console.log(`    ⚠️  未找到专题关键词: "${kw}"`)
  }
  const remaining = topics.filter(t => !order.some(k => t.title?.includes(k)))
  if (remaining.length) {
    console.log(`    ℹ️  未排序专题(保留末尾): ${remaining.map(t => t.title).join(', ')}`)
  }
  return [...result, ...remaining]
}

// ══════════════════════════════════════════════════════════════
// 主逻辑
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log('='.repeat(60))
  console.log('Level 1-4 课程结构优化')
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN' : '正式写入'}`)
  console.log('='.repeat(60))

  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI)
    console.log('数据库已连接\n')
  }

  for (const [lvStr, cfg] of Object.entries(CHANGES)) {
    const lv = parseInt(lvStr)
    console.log(`\n── Level ${lv} ───────────────────────────────`)

    let doc = null
    let topics = []

    if (!DRY_RUN) {
      doc = await CourseLevel.findOne({ level: lv })
      if (!doc) { console.log('  !! 记录不存在'); continue }
      topics = [...doc.topics]
    }

    // 1. 删除整个专题
    for (const kw of (cfg.deleteTopics || [])) {
      if (DRY_RUN) {
        console.log(`  🗑  DELETE 专题: "${kw}"`)
        continue
      }
      const idx = topics.findIndex(t => t.title?.includes(kw))
      if (idx !== -1) {
        console.log(`  🗑  删除专题: "${topics[idx].title}" (${topics[idx].chapters?.length || 0} 章节)`)
        topics.splice(idx, 1)
      } else {
        console.log(`  ⚠️  未找到专题: "${kw}"`)
      }
    }

    // 2. 删除专题内的章节
    for (const rule of (cfg.deleteChapters || [])) {
      if (DRY_RUN) {
        console.log(`  🗑  DELETE 章节: 专题"${rule.topicKeyword}" → 含"${rule.chapterKeyword}"`)
        continue
      }
      const topic = findTopic(topics, rule.topicKeyword)
      if (!topic) { console.log(`  ⚠️  未找到专题: "${rule.topicKeyword}"`); continue }
      const before = topic.chapters.length
      topic.chapters = topic.chapters.filter(c => !c.title?.includes(rule.chapterKeyword))
      const removed = before - topic.chapters.length
      if (removed > 0) {
        console.log(`  🗑  删除章节: "${rule.chapterKeyword}" from 专题"${topic.title}"`)
      } else {
        console.log(`  ⚠️  章节未找到: "${rule.chapterKeyword}" (专题: ${topic.title})`)
      }
    }

    // 3. 重排顺序
    if (cfg.order) {
      if (DRY_RUN) {
        console.log(`  📋 新顺序:`)
        cfg.order.forEach((n, i) => console.log(`    ${String(i+1).padStart(2)}. ${n}`))
      } else {
        const reordered = reorderTopics(topics, cfg.order)
        console.log(`  📋 重排后:`)
        reordered.forEach((t, i) => console.log(`    ${String(i+1).padStart(2)}. ${t.title}`))
        doc.topics = reordered
      }
    } else {
      if (DRY_RUN) console.log(`  ✅ 顺序无需调整`)
    }

    // 4. 保存
    if (!DRY_RUN) {
      if (!cfg.order) doc.topics = topics  // 只有删操作时也需保存
      await doc.save()
      console.log(`  ✓ Level${lv} 已保存`)
    }
  }

  console.log(`\n${'='.repeat(60)}\n完成！`)
  if (!DRY_RUN) await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
