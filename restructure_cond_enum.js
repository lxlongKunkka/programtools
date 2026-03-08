/**
 * restructure_cond_enum.js
 *
 * 操作一：L2/条件结构进阶 全部迁移到 L1/条件结构专题
 *   - 删除 L1 的 1-7-2（if-else if 与 switch，L2 有更详细的两章替代）
 *   - 将 L2 的 8 章条件内容插入 L1，形成 10 章完整条件专题
 *   - L2 删除 条件结构进阶 专题
 *
 * 操作二：L3/枚举法 拆分 → L2"枚举"(基础3章) + L3"枚举进阶"(进阶3章)
 *         L3/模拟    拆分 → L2"模拟"(基础3章)  + L3"模拟进阶"(进阶3章)
 *
 * L1 条件专题最终顺序（10章）：
 *   1-7-1  if/else 单双分支
 *   2-2-1  if-else if 多分支
 *   2-2-2  switch-case 语句
 *   2-1-1  逻辑与 (&&)
 *   2-1-2  逻辑或 (||) 与 非 (!)
 *   2-1-3  闰年判断综合练习
 *   2-2-3  条件嵌套语句
 *   1-7-3  条件结构综合例题
 *   2-2-4  条件结构强化练习1
 *   2-2-5  条件结构强化练习2
 *
 * L2 最终（5专题）：循环进阶 · ASCII · 数学函数 · 枚举 · 模拟
 * L3 最终（6专题）：数组基础与应用 · 字符串处理 · 进制与编码 · 位运算 · 枚举进阶 · 模拟进阶
 */

import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const MONGODB_URI = process.env.APP_MONGODB_URI || process.env.MONGODB_URI

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

function byId(chapters, id) {
  return chapters.find(c => c.id === id)
}
function withoutId(chapters, id) {
  return chapters.filter(c => c.id !== id)
}
function topicByKw(topics, kw) {
  return topics.find(t => t.title?.includes(kw))
}
function topicIdxByKw(topics, kw) {
  return topics.findIndex(t => t.title?.includes(kw))
}

async function main() {
  console.log('='.repeat(60))
  console.log('条件结构迁移 + 枚举/模拟拆分重组')
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN（不写库）' : '正式写入'}`)
  console.log('='.repeat(60))

  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI)
    console.log('数据库已连接')
  }

  const doc1 = DRY_RUN ? null : await CourseLevel.findOne({ level: 1 })
  const doc2 = DRY_RUN ? null : await CourseLevel.findOne({ level: 2 })
  const doc3 = DRY_RUN ? null : await CourseLevel.findOne({ level: 3 })

  // ──────────────────────────────────────────
  // 操作一：条件结构迁移 L2 → L1
  // ──────────────────────────────────────────
  console.log('\n【操作一】条件结构: L2 → L1')

  if (!DRY_RUN) {
    const t1Cond = topicByKw(doc1.topics, '条件')
    const t2CondIdx = topicIdxByKw(doc2.topics, '条件')
    const t2Cond = doc2.topics[t2CondIdx]

    if (!t1Cond || !t2Cond) {
      console.log('⚠️ 未找到条件专题，跳过')
    } else {
      console.log(`  L1/条件: ${t1Cond.chapters.length} 章  L2/条件进阶: ${t2Cond.chapters.length} 章`)

      // 从 L2 条件 中按标题找各章
      const ch = (kw) => t2Cond.chapters.find(c => c.title?.includes(kw) || c.id?.includes(kw))

      // L1 删掉 1-7-2
      const l1Base = withoutId(t1Cond.chapters, '1-7-2')
      const l1Head = l1Base.find(c => c.id === '1-7-1')  // 单双分支
      const l1Tail1 = l1Base.find(c => c.id === '1-7-3') // 综合例题
      // 其余L1章节(应该只剩1-7-1和1-7-3)

      // L2 章节（按设计顺序）
      const c221 = ch('if-else if 多分支')
      const c222 = ch('switch-case')
      const c211 = ch('逻辑与')
      const c212 = ch('逻辑或')
      const c213 = ch('闰年')
      const c223 = ch('嵌套')
      const c224 = ch('强化练习1') || ch('强化练习 1') || t2Cond.chapters.find(c => c.id === '2-2-4')
      const c225 = ch('强化练习2') || ch('强化练习 2') || t2Cond.chapters.find(c => c.id === '2-2-5')

      const missing = [c221,c222,c211,c212,c213,c223,c224,c225]
        .map((c,i) => c ? null : ['2-2-1','2-2-2','2-1-1','2-1-2','2-1-3','2-2-3','2-2-4','2-2-5'][i])
        .filter(Boolean)
      if (missing.length) console.log(`  ⚠️ 未找到章节 ID: ${missing.join(', ')}`)

      // 组装10章
      const newChapters = [
        l1Head, c221, c222, c211, c212, c213, c223, l1Tail1, c224, c225
      ].filter(Boolean)

      console.log(`  ✓ L1/条件 重组为 ${newChapters.length} 章`)
      newChapters.forEach((c,i) => console.log(`    ${i+1}. [${c.id}] ${c.title}`))

      t1Cond.chapters = newChapters
      // L2 删除条件专题
      doc2.topics.splice(t2CondIdx, 1)
      console.log(`  ✓ L2/条件结构进阶 已删除`)
    }
  } else {
    // dry-run 输出
    console.log('  L1/条件结构专题 将重组为 10 章（删除1-7-2，合并L2的8章）')
    console.log('  L2/条件结构进阶 将删除')
    const order = [
      '1-7-1  if/else 单双分支',
      '2-2-1  if-else if 多分支 (来自L2)',
      '2-2-2  switch-case 语句 (来自L2)',
      '2-1-1  逻辑与 && (来自L2)',
      '2-1-2  逻辑或 || 非 ! (来自L2)',
      '2-1-3  闰年判断综合练习 (来自L2)',
      '2-2-3  条件嵌套语句 (来自L2)',
      '1-7-3  条件结构综合例题',
      '2-2-4  条件结构强化练习1 (来自L2)',
      '2-2-5  条件结构强化练习2 (来自L2)',
    ]
    order.forEach((s,i) => console.log(`    ${i+1}. ${s}`))
  }

  // ──────────────────────────────────────────
  // 操作二：L3/枚举法 拆分
  // ──────────────────────────────────────────
  console.log('\n【操作二】枚举法拆分: 前3章→L2"枚举" / 后3章→L3"枚举进阶"')

  if (!DRY_RUN) {
    const t3EnumIdx = topicIdxByKw(doc3.topics, '枚举')
    const t3Enum = doc3.topics[t3EnumIdx]
    if (!t3Enum) {
      console.log('  ⚠️ L3 未找到枚举专题')
    } else {
      console.log(`  L3/枚举法: ${t3Enum.chapters.length} 章`)
      const basicChaps = t3Enum.chapters.slice(0, 3)
      const advChaps = t3Enum.chapters.slice(3)
      console.log(`  → L2/枚举 (${basicChaps.length}章): ${basicChaps.map(c=>c.title).join(' | ')}`)
      console.log(`  → L3/枚举进阶 (${advChaps.length}章): ${advChaps.map(c=>c.title).join(' | ')}`)

      // 修改L3
      t3Enum.title = '枚举进阶'
      t3Enum.description = '以数组为容器深化多维枚举，并探索子集枚举（位运算辅助）与剪枝优化，提升穷举搜索的效率与代码规范性。'
      t3Enum.chapters = advChaps

      // 新增L2专题
      doc2.topics.push({
        title: '枚举',
        description: '通过单层、双重、三重循环枚举，掌握穷举搜索的基本思路，培养逐步缩小解空间的意识，为后续枚举进阶打好基础。',
        chapters: basicChaps
      })
      console.log('  ✓ 完成')
    }
  } else {
    console.log('  L3/枚举法 前3章 → L2 新增"枚举"专题')
    console.log('  L3/枚举法 后3章 → L3 重命名"枚举进阶"')
  }

  // ──────────────────────────────────────────
  // 操作三：L3/模拟 拆分
  // ──────────────────────────────────────────
  console.log('\n【操作三】模拟拆分: 前3章→L2"模拟" / 后3章→L3"模拟进阶"')

  if (!DRY_RUN) {
    const t3SimIdx = topicIdxByKw(doc3.topics, '模拟')
    const t3Sim = doc3.topics[t3SimIdx]
    if (!t3Sim) {
      console.log('  ⚠️ L3 未找到模拟专题')
    } else {
      console.log(`  L3/模拟: ${t3Sim.chapters.length} 章`)
      const basicChaps = t3Sim.chapters.slice(0, 3)
      const advChaps = t3Sim.chapters.slice(3)
      console.log(`  → L2/模拟 (${basicChaps.length}章): ${basicChaps.map(c=>c.title).join(' | ')}`)
      console.log(`  → L3/模拟进阶 (${advChaps.length}章): ${advChaps.map(c=>c.title).join(' | ')}`)

      t3Sim.title = '模拟进阶'
      t3Sim.description = '在掌握基础模拟思路后，深入数组模拟栈与队列、矩阵方格模拟、字符串模拟，强化将抽象过程转化为精确代码的综合实现能力。'
      t3Sim.chapters = advChaps

      doc2.topics.push({
        title: '模拟',
        description: '以"按题目描述直接模拟"为核心，通过模拟思想拆解、计数模拟、过程模拟三类例题，建立规范的模拟解题框架。',
        chapters: basicChaps
      })
      console.log('  ✓ 完成')
    }
  } else {
    console.log('  L3/模拟 前3章 → L2 新增"模拟"专题')
    console.log('  L3/模拟 后3章 → L3 重命名"模拟进阶"')
  }

  // ──────────────────────────────────────────
  // 汇总输出
  // ──────────────────────────────────────────
  if (!DRY_RUN) {
    await doc1.save()
    await doc2.save()
    await doc3.save()
    console.log('\n✓ Level1/2/3 已保存至数据库')
  }

  console.log('\n── 最终结构预览 ──')
  if (DRY_RUN) {
    console.log('\nLevel 1:')
    console.log('  1. 输入输出与变量基础 (7章)')
    console.log('  2. 运算与数学基础 (7章)')
    console.log('  3. 更多数据类型 (6章)')
    console.log('  4. 条件结构专题 (10章) ← 扩充')
    console.log('  5. 循环结构专题 (3章)')
    console.log('\nLevel 2:')
    console.log('  1. 循环进阶 (13章)')
    console.log('  2. ASCII 编码与字符处理 (3章)')
    console.log('  3. 数学函数 (3章)')
    console.log('  4. 枚举 (3章) ← 新增')
    console.log('  5. 模拟 (3章) ← 新增')
    console.log('\nLevel 3:')
    console.log('  1. 数组基础与应用 (6章)')
    console.log('  2. 字符串处理 (5章)')
    console.log('  3. 进制与编码 (3章)')
    console.log('  4. 位运算 (2章)')
    console.log('  5. 枚举进阶 (3章) ← 改名')
    console.log('  6. 模拟进阶 (3章) ← 改名')
  } else {
    for (const [label, doc] of [['Level 1', doc1], ['Level 2', doc2], ['Level 3', doc3]]) {
      console.log(`\n${label}:`)
      doc.topics.forEach((t,i) => console.log(`  ${i+1}. ${t.title} (${t.chapters.length}章)`))
    }
  }

  if (!DRY_RUN) await mongoose.disconnect()
  console.log('\n' + '='.repeat(60) + '\n完成！')
}

main().catch(e => { console.error(e); process.exit(1) })
