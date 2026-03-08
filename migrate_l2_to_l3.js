/**
 * migrate_l2_to_l3.js
 * 将 Level2 的 数组初探/暴力枚举/模拟 迁移到 Level3，与对应专题合并
 *
 * 变更：
 *  L2: 删除 数组初探、暴力枚举、模拟
 *  L3: 数组初探(L2前置) + 数组应用(L3)  → 数组基础与应用
 *      暴力枚举(L2前置) + 枚举法专题(L3) → 枚举法
 *      模拟(L2前置)     + 模拟专题(L3)   → 模拟
 *
 * L3 最终顺序：数组基础与应用 → 字符串处理 → 进制与编码 → 位运算 → 枚举法 → 模拟
 */

import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const MONGODB_URI = process.env.APP_MONGODB_URI || process.env.MONGODB_URI
const DRY_RUN = process.argv.includes('--dry-run')

const chapterSchema = new mongoose.Schema({
  id: String, title: String, content: String, contentType: String,
  resourceUrl: String, problemIds: [String], optionalProblemIds: [String], optional: Boolean
}, { _id: false })
const topicSchema = new mongoose.Schema({ title: String, description: String, chapters: [chapterSchema] }, { _id: false })
const courseLevelSchema = new mongoose.Schema({
  level: Number, group: String, label: String, subject: String,
  title: String, description: String, topics: [topicSchema], chapters: [chapterSchema]
})
const CourseLevel = mongoose.model('CourseLevel', courseLevelSchema)

// 迁移并合并的规则：L2来源 → L3目标
const MIGRATE_MERGES = [
  {
    l2Source: '数组初探',
    l3Target: '数组应用',
    newTitle: '数组基础与应用',
    description: '从一维数组的定义与访问出发，掌握遍历、求和、查找最大最小值、计数（桶思想）等核心操作，为字符串和高级算法打好数据容器基础。',
    // L2章节插入到L3章节之前（前置铺垫）
    order: 'prepend',
  },
  {
    l2Source: '暴力枚举',
    l3Target: '枚举法专题',
    newTitle: '枚举法',
    description: '从单层、双重、三重枚举入手，到结合数组的多维枚举，再到子集枚举与位运算辅助、剪枝优化，系统掌握穷举搜索的核心思路。',
    order: 'prepend',
  },
  {
    l2Source: '模拟',
    l3Target: '模拟专题',
    newTitle: '模拟',
    description: '学习按题目流程直接模拟的解题思路，从计数模拟、过程模拟到数组模拟栈队列、矩阵方格模拟、字符串模拟，培养严谨的实现能力。',
    order: 'prepend',
  },
]

// L3 最终专题顺序
const L3_FINAL_ORDER = [
  '数组基础与应用',
  '字符串处理',
  '进制与编码',
  '位运算',
  '枚举法',
  '模拟',
]

function getTopic(topics, kw) {
  return topics.find(t => t.title?.includes(kw))
}
function getTopicIdx(topics, kw) {
  return topics.findIndex(t => t.title?.includes(kw))
}

async function main() {
  console.log('='.repeat(60))
  console.log('Level2 → Level3 专题迁移')
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN' : '正式写入'}`)
  console.log('='.repeat(60))

  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI)
    console.log('数据库已连接\n')
  }

  const doc2 = DRY_RUN ? null : await CourseLevel.findOne({ level: 2 })
  const doc3 = DRY_RUN ? null : await CourseLevel.findOne({ level: 3 })
  const topics2 = DRY_RUN ? [] : [...doc2.topics]
  const topics3 = DRY_RUN ? [] : [...doc3.topics]

  for (const rule of MIGRATE_MERGES) {
    console.log(`\n迁移: L2/"${rule.l2Source}" → L3/"${rule.l3Target}" → "${rule.newTitle}"`)

    if (DRY_RUN) {
      console.log(`  L2 删除: ${rule.l2Source}`)
      console.log(`  L3 合并: ${rule.l2Source}(前置) + ${rule.l3Target} → ${rule.newTitle}`)
      continue
    }

    // 从 L2 摘出章节
    const l2Idx = getTopicIdx(topics2, rule.l2Source)
    if (l2Idx === -1) { console.log(`  ⚠️ L2 未找到: "${rule.l2Source}"`); continue }
    const l2Chapters = topics2[l2Idx].chapters
    console.log(`  L2 "${topics2[l2Idx].title}": ${l2Chapters.length} 章`)
    topics2.splice(l2Idx, 1)

    // 找 L3 目标专题
    const l3Topic = getTopic(topics3, rule.l3Target)
    if (!l3Topic) { console.log(`  ⚠️ L3 未找到: "${rule.l3Target}"`); continue }
    console.log(`  L3 "${l3Topic.title}": ${l3Topic.chapters.length} 章`)

    // 合并章节（L2前置 + L3原有）
    const merged = rule.order === 'prepend'
      ? [...l2Chapters, ...l3Topic.chapters]
      : [...l3Topic.chapters, ...l2Chapters]

    l3Topic.title = rule.newTitle
    l3Topic.description = rule.description
    l3Topic.chapters = merged
    console.log(`  ✓ → "${rule.newTitle}" (${merged.length} 章)`)
  }

  // 重排 L3
  if (!DRY_RUN) {
    const result = []
    for (const kw of L3_FINAL_ORDER) {
      const t = getTopic(topics3, kw)
      if (t) result.push(t)
      else console.log(`⚠️ L3 未找到关键词: "${kw}"`)
    }
    const remaining = topics3.filter(t => !L3_FINAL_ORDER.some(k => t.title?.includes(k)))
    if (remaining.length) console.log(`ℹ️ 未排序专题(末尾): ${remaining.map(t=>t.title).join(', ')}`)
    doc3.topics = [...result, ...remaining]
  }

  // 输出结果
  console.log('\n── Level 2 最终结构:')
  if (DRY_RUN) {
    console.log('  条件结构进阶, 循环进阶, ASCII编码与字符处理, 数学函数')
  } else {
    doc2.topics = topics2
    topics2.forEach((t, i) => console.log(`  ${i+1}. ${t.title} (${t.chapters.length}章)`))
  }

  console.log('\n── Level 3 最终结构:')
  if (DRY_RUN) {
    L3_FINAL_ORDER.forEach((n, i) => console.log(`  ${i+1}. ${n}`))
  } else {
    doc3.topics.forEach((t, i) => console.log(`  ${i+1}. ${t.title} (${t.chapters.length}章)`))
  }

  if (!DRY_RUN) {
    await doc2.save()
    await doc3.save()
    console.log('\n✓ Level2 & Level3 已保存')
    await mongoose.disconnect()
  }

  console.log('\n' + '='.repeat(60) + '\n完成！')
}

main().catch(e => { console.error(e); process.exit(1) })
