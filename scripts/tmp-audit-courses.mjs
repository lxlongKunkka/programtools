import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  // 查询所有 GESP 课程
  const levels = await CourseLevel.find({ group: { $regex: 'GESP|信奥全体系', $options: 'i' } })
    .select('_id level title group topics')
    .sort({ group: 1, level: 1 })
    .lean()
  
  console.log(`总共找到 ${levels.length} 个课程级别\n`)
  
  // 按 group 分组
  const groups = {}
  levels.forEach(l => {
    if (!groups[l.group]) groups[l.group] = []
    groups[l.group].push(l)
  })
  
  Object.keys(groups).forEach(groupName => {
    console.log(`\n━━━ ${groupName} ━━━`)
    console.log(`共 ${groups[groupName].length} 个级别\n`)
    
    groups[groupName].forEach(level => {
      const topicCount = level.topics?.length || 0
      const chapterCount = level.topics?.reduce((sum, t) => sum + (t.chapters?.length || 0), 0) || 0
      console.log(`Level ${level.level}: ${level.title}`)
      console.log(`  _id: ${level._id}`)
      console.log(`  Topics: ${topicCount} 个, Chapters: ${chapterCount} 个`)
      
      if (topicCount > 0) {
        console.log(`  前3个topics:`)
        level.topics.slice(0, 3).forEach((t, i) => {
          console.log(`    [${i}] ${t._id} "${t.title}"`)
        })
      }
      console.log()
    })
  })
  
} finally {
  await conn.close().catch(() => {})
}
