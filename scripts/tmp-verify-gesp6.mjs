import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  const level = await CourseLevel.findOne({ level: 6, group: '岐麦教育 C++ 信奥全体系课程（v8.1）' })
  console.log('Level ID:', level._id)
  console.log('Topic count:', level.topics.length)
  console.log('\nFirst 3 topics:')
  level.topics.slice(0, 3).forEach((t, i) => {
    console.log(`  [${i}] _id=${t._id} title="${t.title}"`)
  })
} finally {
  await conn.close().catch(() => {})
}
