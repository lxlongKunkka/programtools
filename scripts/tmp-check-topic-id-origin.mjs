import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const target = '6a3f2601b2611193fe4b747e'
const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  const byTopicChapter = await CourseLevel.findOne({ 'topics.chapters._id': target }).select('_id title topics.$').lean()
  const byLegacyChapter = await CourseLevel.findOne({ 'chapters._id': target }).select('_id title chapters.$').lean()
  const byChapterId = await CourseLevel.findOne({ 'topics.chapters.id': target }).select('_id title topics.$').lean()
  const byLegacyChapterId = await CourseLevel.findOne({ 'chapters.id': target }).select('_id title chapters.$').lean()
  console.log(JSON.stringify({ byTopicChapter, byLegacyChapter, byChapterId, byLegacyChapterId }, null, 2))
} finally {
  await conn.close().catch(() => {})
}
