/**
 * merge_l2_topics.js
 * Level2 专题合并优化：10个→8个
 *
 * 合并方案：
 *   逻辑运算(3) + 多重选择(5)  → 条件结构进阶(8)
 *   数位拆解专题(3) + 循环进阶(6) → 循环进阶(9)  [数位拆解并入循环]
 *
 * 用法：
 *   node merge_l2_topics.js --dry-run
 *   node merge_l2_topics.js
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

// 合并规则（sources 按顺序，章节依次拼接）
const MERGES = [
  {
    sources: ['逻辑运算', '多重选择'],
    target: '条件结构进阶',
    description: '掌握逻辑与/或/非运算符，理解多分支 if-else if 与 switch 语句，以及条件嵌套的写法，让程序拥有更丰富的判断逻辑。',
  },
  {
    // 数位拆解是循环的典型应用，插入到循环基础内容之后
    sources: ['循环进阶', '数位拆解专题'],
    target: '循环进阶',
    description: '深入掌握 while/do-while 循环，学习循环累加与统计，再用数位拆解、水仙花数等经典例题强化循环的实战应用。',
  },
]

// 最终专题顺序
const FINAL_ORDER = [
  '条件结构进阶',
  '循环进阶',
  '嵌套结构',
  '数组初探',
  'ASCII 编码与字符处理',
  '数学函数',
  '暴力枚举',
  '模拟',
]

async function main() {
  console.log('='.repeat(60))
  console.log('Level 2 专题合并')
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN' : '正式写入'}`)
  console.log('='.repeat(60))

  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI)
    console.log('数据库已连接\n')
  }

  const doc = DRY_RUN ? null : await CourseLevel.findOne({ level: 2 })
  let topics = DRY_RUN ? [] : [...doc.topics]

  for (const merge of MERGES) {
    console.log(`\n合并 → "${merge.target}"`)
    if (DRY_RUN) {
      for (const kw of merge.sources) console.log(`  ← "${kw}"`)
      continue
    }

    const allChapters = []
    const indices = []
    for (const kw of merge.sources) {
      const idx = topics.findIndex(t => t.title?.includes(kw))
      if (idx === -1) { console.log(`  ⚠️  未找到专题: "${kw}"`); continue }
      console.log(`  ← "${topics[idx].title}" (${topics[idx].chapters.length} 章)`)
      allChapters.push(...topics[idx].chapters)
      indices.push(idx)
    }
    // 从后往前删，避免index偏移
    const insertPos = Math.min(...indices)
    for (const i of indices.sort((a, b) => b - a)) topics.splice(i, 1)
    topics.splice(insertPos, 0, {
      title: merge.target,
      description: merge.description,
      chapters: allChapters,
    })
    console.log(`  ✓ → "${merge.target}" (${allChapters.length} 章)`)
  }

  if (!DRY_RUN) {
    const result = []
    for (const kw of FINAL_ORDER) {
      const t = topics.find(tp => tp.title?.includes(kw))
      if (t) result.push(t)
      else console.log(`⚠️  未找到 "${kw}"`)
    }
    const remaining = topics.filter(t => !FINAL_ORDER.some(k => t.title?.includes(k)))
    if (remaining.length) console.log(`ℹ️  未排序专题(末尾): ${remaining.map(t=>t.title).join(', ')}`)

    doc.topics = [...result, ...remaining]
    console.log('\n最终结构:')
    doc.topics.forEach((t, i) =>
      console.log(`  ${String(i+1).padStart(2)}. ${t.title}  (${t.chapters.length} 章)`)
    )
    await doc.save()
    console.log('\n✓ Level2 已保存')
    await mongoose.disconnect()
  } else {
    console.log('\n最终结构 (预览):')
    FINAL_ORDER.forEach((n, i) => console.log(`  ${String(i+1).padStart(2)}. ${n}`))
  }

  console.log('\n' + '='.repeat(60) + '\n完成！')
}

main().catch(e => { console.error(e); process.exit(1) })
