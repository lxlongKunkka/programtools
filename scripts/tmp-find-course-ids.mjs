import mongoose from 'mongoose'
import { APP_MONGODB_URI } from '../server/config.js'
import CourseLevel from '../server/models/CourseLevel.js'

const levelPrefix = '6a39e3e'
const topicPrefix = '6a3f2d7'

const conn = await mongoose.createConnection(APP_MONGODB_URI).asPromise()
try {
  const levels = await CourseLevel.find({}, { _id: 1, title: 1, level: 1, group: 1, topics: 1 }).lean()

  const matchedLevels = []
  const matchedTopics = []
  const matchedChapters = []

  for (const level of levels) {
    const levelId = String(level._id)
    if (levelId.startsWith(levelPrefix)) {
      matchedLevels.push({
        _id: levelId,
        title: level.title,
        level: level.level,
        group: level.group,
        topicCount: Array.isArray(level.topics) ? level.topics.length : 0,
      })
    }

    for (let i = 0; i < (level.topics || []).length; i += 1) {
      const topic = level.topics[i]
      const topicId = topic?._id ? String(topic._id) : ''
      if (topicId.startsWith(topicPrefix)) {
        matchedTopics.push({
          levelId,
          levelTitle: level.title,
          levelNum: level.level,
          group: level.group,
          topicIndex: i,
          topicId,
          topicTitle: topic.title,
          chapterCount: Array.isArray(topic.chapters) ? topic.chapters.length : 0,
        })
      }
      for (let j = 0; j < (topic.chapters || []).length; j += 1) {
        const chapter = topic.chapters[j]
        const chapterUid = chapter?._id ? String(chapter._id) : ''
        if (chapterUid.startsWith(topicPrefix)) {
          matchedChapters.push({
            levelId,
            levelTitle: level.title,
            levelNum: level.level,
            group: level.group,
            topicIndex: i,
            topicTitle: topic.title,
            chapterIndex: j,
            chapterUid,
            chapterId: chapter.id,
            chapterTitle: chapter.title,
          })
        }
      }
    }
  }

  console.log(JSON.stringify({ matchedLevels, matchedTopics, matchedChapters }, null, 2))
} finally {
  await conn.close().catch(() => {})
}
