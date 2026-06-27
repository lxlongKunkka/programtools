import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  const jsonPath = path.join(__dirname, 'gesp_v81_import.json')
  const courses = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  
  console.log(`准备导入 ${courses.length} 个课程级别...\n`)
  
  for (const courseData of courses) {
    const existing = await CourseLevel.findOne({ 
      level: courseData.level, 
      group: courseData.group 
    })
    
    if (existing) {
      console.log(`⚠ Level ${courseData.level} 已存在，跳过`)
      continue
    }
    
    const newLevel = new CourseLevel(courseData)
    await newLevel.save()
    
    console.log(`✓ Level ${courseData.level}: ${courseData.title}`)
    console.log(`  → ${courseData.topics.length} topics, _id=${newLevel._id}`)
    console.log(`  → 前 3 个 topics:`)
    courseData.topics.slice(0, 3).forEach((t, i) => {
      const topicId = newLevel.topics[i]._id
      console.log(`     [${i}] ${topicId} "${t.title}"`)
    })
    console.log()
  }
  
  console.log(`\n✅ 导入完成！`)
} catch (err) {
  console.error('❌ 导入失败:', err)
  process.exit(1)
} finally {
  await conn.close().catch(() => {})
}
