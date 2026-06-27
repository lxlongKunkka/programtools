import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const levelId = '6a39e3ec72fb5578b2d6d51c'
const topicId = '6a3f2601b2611193fe4b747e'

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  const level = await CourseLevel.findById(levelId).lean()
  const topicBySubdoc = level?.topics?.find((t) => String(t._id) === topicId) || null
  const topicById = level?.topics?.find((t) => String(t.id) === topicId) || null
  const topicIds = (level?.topics || []).slice(0, 20).map((t) => ({
    _id: String(t._id),
    id: t.id,
    title: t.title,
  }))
  const anyLevelByTopicSubdoc = await CourseLevel.findOne({ 'topics._id': topicId })
    .select('_id title level group topics.$')
    .lean()
  const anyLevelByTopicId = await CourseLevel.findOne({ 'topics.id': topicId })
    .select('_id title level group topics.$')
    .lean()

  console.log(JSON.stringify({
    levelFound: !!level,
    levelMeta: level
      ? {
          _id: String(level._id),
          title: level.title,
          level: level.level,
          group: level.group,
          topicCount: level.topics?.length || 0,
        }
      : null,
    topicBySubdoc,
    topicById,
    anyLevelByTopicSubdoc,
    anyLevelByTopicId,
    sampleTopics: topicIds,
  }, null, 2))
} finally {
  await conn.close().catch(() => {})
}
