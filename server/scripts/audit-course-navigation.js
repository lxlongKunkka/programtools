import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { appConn, hydroConn } from '../db.js'
import CourseLevel from '../models/CourseLevel.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function readGespTagMap() {
  const filePath = path.join(__dirname, '../../src/utils/gespTagMap.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

async function main() {
  await Promise.all([appConn.asPromise(), hydroConn.asPromise()])

  const levels = await CourseLevel.find()
    .select('level title group subject topics.title topics.chapters._id topics.chapters.id topics.chapters.title')
    .lean()

  const chapterIdMap = new Map()

  for (const level of levels) {
    for (const topic of Array.isArray(level.topics) ? level.topics : []) {
      for (const chapter of Array.isArray(topic.chapters) ? topic.chapters : []) {
        const chapterId = String(chapter?.id || '')
        if (!chapterId) continue

        if (!chapterIdMap.has(chapterId)) {
          chapterIdMap.set(chapterId, [])
        }

        chapterIdMap.get(chapterId).push({
          level: level.level,
          levelTitle: level.title || '',
          group: level.group || '',
          subject: level.subject || '',
          topicTitle: topic.title || '',
          chapterTitle: chapter.title || '',
          chapterUid: chapter._id ? String(chapter._id) : ''
        })
      }
    }
  }

  const duplicateChapterIds = [...chapterIdMap.entries()]
    .filter(([, refs]) => refs.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0], 'en'))

  console.log(`TOTAL_CHAPTER_IDS ${chapterIdMap.size}`)
  console.log(`DUPLICATE_CHAPTER_IDS ${duplicateChapterIds.length}`)
  for (const [chapterId, refs] of duplicateChapterIds) {
    console.log(`DUPLICATE ${chapterId} ${JSON.stringify(refs)}`)
  }

  const tagMap = readGespTagMap()
  const missingMappings = []
  const ambiguousMappings = []

  for (const [tag, chapterId] of Object.entries(tagMap)) {
    const refs = chapterIdMap.get(String(chapterId)) || []
    if (!refs.length) {
      missingMappings.push({ tag, chapterId })
      continue
    }
    if (refs.length > 1) {
      ambiguousMappings.push({ tag, chapterId, refs })
    }
  }

  console.log(`GESP_TAG_MISSING ${missingMappings.length}`)
  for (const item of missingMappings) {
    console.log(`MISSING ${item.tag} -> ${item.chapterId}`)
  }

  console.log(`GESP_TAG_AMBIGUOUS ${ambiguousMappings.length}`)
  for (const item of ambiguousMappings) {
    console.log(`AMBIGUOUS ${item.tag} -> ${item.chapterId} ${JSON.stringify(item.refs)}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.allSettled([
      appConn.close(),
      hydroConn.close()
    ])
  })