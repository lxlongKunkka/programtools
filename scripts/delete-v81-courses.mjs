import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  const groupName = '岐麦教育 C++ 信奥全体系课程（v8.1）'
  
  // 查询所有 v8.1 的 levels
  const levels = await CourseLevel.find({ group: groupName })
  console.log(`找到 ${levels.length} 个 v8.1 课程级别待删除:\n`)
  levels.forEach(l => {
    console.log(`  Level ${l.level}: ${l.title} (_id=${l._id})`)
  })
  
  // 删除
  const result = await CourseLevel.deleteMany({ group: groupName })
  console.log(`\n✓ 已删除 ${result.deletedCount} 个课程级别`)
} finally {
  await conn.close().catch(() => {})
}
