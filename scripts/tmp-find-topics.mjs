import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const targetIds = [
  '6a3f3231b03e98beea2ceb45',
  '6a3f324ab03e98beea2cf8bc',
  '6a3f324ab03e98beea2cf8bf',
  '6a3f3266b03e98beea2d00d0',
  '6a3f3266b03e98beea2d00ce'
]

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  console.log('搜索这些 topic IDs:\n')
  
  for (const tid of targetIds) {
    const level = await CourseLevel.findOne({ 'topics._id': tid }, 'level title group topics.$')
    if (level) {
      const topic = level.topics[0]
      console.log(`✓ ${tid}`)
      console.log(`  → Level ${level.level} "${level.title}"`)
      console.log(`  → Topic: "${topic.title}"`)
      console.log(`  → Group: ${level.group}\n`)
    } else {
      console.log(`✗ ${tid} - NOT FOUND IN DATABASE\n`)
    }
  }
  
  // 同时列出真实的 GESP6 topics
  console.log('\n--- GESP6 真实的 topics ---')
  const gesp6 = await CourseLevel.findOne({ level: 6, group: '岐麦教育 C++ 信奥全体系课程（v8.1）' })
  console.log(`Level ID: ${gesp6._id}`)
  gesp6.topics.forEach((t, i) => {
    console.log(`  [${i}] ${t._id} "${t.title}"`)
  })
} finally {
  await conn.close().catch(() => {})
}
