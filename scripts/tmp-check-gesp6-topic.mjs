import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  const level = await CourseLevel.findOne({
    level: 6,
    group: '岐麦教育 C++ 信奥全体系课程（v8.1）'
  }).lean()
  const levelId = level ? String(level._id) : ''
  const topics = (level?.topics || []).map((topic, index) => ({
    idx: index,
    _id: topic?._id ? String(topic._id) : null,
    id: topic?.id || null,
    syntheticId: `${levelId}-topic-${index}`,
    title: topic?.title || '',
    chapterCount: Array.isArray(topic?.chapters) ? topic.chapters.length : 0,
  }))
  console.log(JSON.stringify({
    level: level ? { _id: String(level._id), title: level.title, topicCount: topics.length } : null,
    topics: topics.slice(0, 20),
  }, null, 2))
} finally {
  await conn.close().catch(() => {})
}
