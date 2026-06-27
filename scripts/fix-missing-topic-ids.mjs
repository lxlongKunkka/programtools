import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

/**
 * 数据修复脚本：为所有缺失 _id 的 topic 子文档生成并持久化真实的 ObjectId
 * 
 * 问题：GESP 1-10 等新课程体系导入时，topics 数组里的子文档没有 _id
 * 方案：遍历所有 level，检查每个 topic，如果没有 _id 就生成一个并保存
 */

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()

try {
  console.log('开始修复缺失的 topic _id...\n')

  const levels = await CourseLevel.find({ topics: { $exists: true, $ne: [] } })
  console.log(`找到 ${levels.length} 个包含 topics 的 level\n`)

  let totalFixed = 0
  let totalChecked = 0

  for (const level of levels) {
    let levelModified = false
    const fixes = []

    for (let i = 0; i < level.topics.length; i++) {
      const topic = level.topics[i]
      totalChecked++

      // 检查 topic 是否有 _id
      if (!topic._id) {
        // 生成新的 ObjectId
        topic._id = new mongoose.Types.ObjectId()
        levelModified = true
        totalFixed++
        fixes.push({
          index: i,
          title: topic.title,
          newId: String(topic._id)
        })
      }
    }

    // 如果这个 level 有修改，保存它
    if (levelModified) {
      level.markModified('topics')
      await level.save()
      
      console.log(`✓ Level ${level.level} (${level.group || 'default'}): ${level.title}`)
      fixes.forEach(fix => {
        console.log(`  - Topic #${fix.index}: "${fix.title}" → ${fix.newId}`)
      })
      console.log()
    }
  }

  console.log('修复完成！')
  console.log(`总计检查: ${totalChecked} 个 topics`)
  console.log(`总计修复: ${totalFixed} 个 topics`)

} catch (error) {
  console.error('修复失败:', error)
  process.exit(1)
} finally {
  await conn.close()
}
