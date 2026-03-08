/**
 * merge_l1_topics.js
 * 将 Level1 的 8 个专题合并为 5 个，减少侧边栏碎片感
 *
 * 合并方案：
 *   第一次交互(3) + 整数的盒子(2) + 数据的输入(2)  → 输入输出与变量基础(7)
 *   计算机算术(4) + 数学基础(3)                    → 运算与数学基础(7)
 *   更多数据类型(6) / 条件结构专题(3) / 循环结构专题(3) 保持不变
 *
 * 用法：
 *   node merge_l1_topics.js --dry-run
 *   node merge_l1_topics.js
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

// ── 合并规则 ──────────────────────────────────────────────────
// sources: 原专题名关键词（按顺序合并章节）
// target:  新专题名
// description: 新专题描述
const MERGES = [
  {
    sources: ['第一次交互', '整数的盒子', '数据的输入'],
    target: '输入输出与变量基础',
    description: '从第一个 C++ 程序，到变量的定义与赋值，再到用 cin/cout 与程序交互——搭建编程的第一块基石。',
  },
  {
    sources: ['计算机算术', '数学基础'],
    target: '运算与数学基础',
    description: '整数与小数的四则运算、取余妙用、整除与取模规律，以及常见的数学操作，是一切算法的运算基础。',
  },
]

// 合并后的最终顺序（keyword 匹配）
const FINAL_ORDER = [
  '输入输出与变量基础',
  '运算与数学基础',
  '更多数据类型',
  '条件结构专题',
  '循环结构专题',
]

async function main() {
  console.log('='.repeat(60))
  console.log('Level 1 专题合并')
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN' : '正式写入'}`)
  console.log('='.repeat(60))

  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI)
    console.log('数据库已连接\n')
  }

  const doc = DRY_RUN ? null : await CourseLevel.findOne({ level: 1 })
  const topics = DRY_RUN ? [] : [...doc.topics]

  for (const merge of MERGES) {
    console.log(`\n合并 → "${merge.target}"`)

    if (DRY_RUN) {
      for (const kw of merge.sources) {
        console.log(`  ← "${kw}"`)
      }
      continue
    }

    // 收集所有来源专题的章节（按 sources 顺序）
    const allChapters = []
    const toRemove = []
    for (const kw of merge.sources) {
      const idx = topics.findIndex(t => t.title?.includes(kw))
      if (idx === -1) { console.log(`  ⚠️  未找到专题: "${kw}"`); continue }
      console.log(`  ← "${topics[idx].title}" (${topics[idx].chapters.length} 章)`)
      allChapters.push(...topics[idx].chapters)
      toRemove.push(idx)
    }

    // 移除来源专题（从后往前删，避免 index 偏移）
    for (const idx of toRemove.sort((a, b) => b - a)) {
      topics.splice(idx, 1)
    }

    // 插入合并后的新专题（放到来源专题中最靠前那个的位置）
    const insertPos = Math.min(...toRemove)
    topics.splice(insertPos, 0, {
      title: merge.target,
      description: merge.description,
      chapters: allChapters,
    })
    console.log(`  ✓ 已合并为 "${merge.target}" (${allChapters.length} 章)`)
  }

  // 最终重排
  if (!DRY_RUN) {
    const result = []
    for (const kw of FINAL_ORDER) {
      const t = topics.find(tp => tp.title?.includes(kw))
      if (t) result.push(t)
      else console.log(`⚠️ 未找到 "${kw}"`)
    }
    const remaining = topics.filter(t => !FINAL_ORDER.some(k => t.title?.includes(k)))
    if (remaining.length) console.log(`ℹ️ 未排序专题(末尾): ${remaining.map(t => t.title)}`)
    doc.topics = [...result, ...remaining]

    console.log('\n最终结构:')
    doc.topics.forEach((t, i) =>
      console.log(`  ${String(i+1).padStart(2)}. ${t.title}  (${t.chapters.length} 章)`)
    )

    await doc.save()
    console.log('\n✓ Level1 已保存')
    await mongoose.disconnect()
  } else {
    console.log('\n最终结构 (预览):')
    FINAL_ORDER.forEach((name, i) => console.log(`  ${String(i+1).padStart(2)}. ${name}`))
  }

  console.log('\n' + '='.repeat(60) + '\n完成！')
}

main().catch(e => { console.error(e); process.exit(1) })
