import mongoose from 'mongoose'
import { MONGODB_URI } from '../config.js'
import UserProgress from '../models/UserProgress.js'
import CourseLevel from '../models/CourseLevel.js'

async function migrate() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected.')

  try {
    // 1. Build a map of "1-1" -> ObjectId
    console.log('Building Chapter ID Map...')
    const levels = await CourseLevel.find({})
    const idToUidMap = new Map() // "1-1" -> ObjectId

    for (const level of levels) {
      for (const chapter of level.chapters) {
        if (chapter.id && chapter._id) {
          idToUidMap.set(chapter.id, chapter._id)
        }
      }
    }
    console.log(`Found ${idToUidMap.size} chapters.`)

    // 2. Migrate Users
    console.log('Migrating UserProgress...')
    const progresses = await UserProgress.find({})
    let count = 0

    for (const p of progresses) {
      let changed = false

      // Migrate Completed
      if (!p.completedChapterUids || p.completedChapterUids.length === 0) {
        const uids = []
        for (const strId of p.completedChapters) {
          const uid = idToUidMap.get(strId)
          if (uid) uids.push(uid)
        }
        if (uids.length > 0) {
          p.completedChapterUids = uids
          changed = true
        }
      }

      // Migrate Unlocked
      if (!p.unlockedChapterUids || p.unlockedChapterUids.length === 0) {
        const uids = []
        for (const strId of p.unlockedChapters) {
          const uid = idToUidMap.get(strId)
          if (uid) uids.push(uid)
        }
        // Ensure initial chapters are unlocked if list is empty? 
        // Actually, if unlockedChapters has data, we use it.
        if (uids.length > 0) {
          p.unlockedChapterUids = uids
          changed = true
        }
      }

      if (changed) {
        await p.save()
        count++
      }
    }

    console.log(`Migrated ${count} users.`)

  } catch (e) {
    console.error('Migration failed:', e)
  } finally {
    await mongoose.disconnect()
    console.log('Done.')
  }
}

migrate()
