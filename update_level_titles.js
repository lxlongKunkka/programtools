/**
 * update_level_titles.js
 * 根据 GESP_TAGS.mmd 的子图名称，更新 MongoDB 中各级别的 title 字段
 *
 * 用法：
 *   node update_level_titles.js           # 正式写入
 *   node update_level_titles.js --dry-run # 预览，不写库
 */

import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, 'server', '.env') })

const MONGODB_URI = process.env.APP_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/programtools'
const DRY_RUN = process.argv.includes('--dry-run')

// 新标题映射 —— 来自 GESP_TAGS.mmd 各 subgraph 名称
const NEW_TITLES = {
  1:  'GESP 一级 (基础语法)',
  2:  'GESP 二级 (进阶语法)',
  3:  'GESP 三级 (数组·字符串)',
  4:  'GESP 四级 (函数·排序)',
  5:  'GESP 五级 (基础算法)',
  6:  'GESP 六级 (树·搜索·DP入门)',
  7:  'GESP 七级 (图·哈希·进阶DP)',
  8:  'GESP 八级 (图论算法·数学)',
  9:  'GESP 九级 (CSP-S 级)',
  10: 'GESP 十级 (NOI 级)',
}

const courseLevelSchema = new mongoose.Schema({
  level: Number,
  group: String,
  label: String,
  subject: String,
  title: String,
  description: String,
}, { strict: false })

const CourseLevel = mongoose.model('CourseLevel', courseLevelSchema)

async function main() {
  console.log('=' .repeat(50))
  console.log('更新课程级别标题')
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN (不写库)' : '正式写入'}`)
  console.log('=' .repeat(50))

  if (!DRY_RUN) {
    await mongoose.connect(MONGODB_URI)
    console.log('数据库已连接\n')
  }

  for (const [levelNum, newTitle] of Object.entries(NEW_TITLES)) {
    const n = parseInt(levelNum)
    if (DRY_RUN) {
      console.log(`  Level${n}: → "${newTitle}"`)
      continue
    }

    const rec = await CourseLevel.findOne({ level: n })
    if (!rec) {
      console.log(`  Level${n}: !! 数据库中找不到，跳过`)
      continue
    }

    const oldTitle = rec.title
    await CourseLevel.updateOne({ level: n }, { $set: { title: newTitle } })
    console.log(`  Level${n}: "${oldTitle}" → "${newTitle}" ✓`)
  }

  console.log('\n完成!')
  if (!DRY_RUN) await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
