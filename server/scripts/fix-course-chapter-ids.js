import { appConn, hydroConn } from '../db.js'
import CourseLevel from '../models/CourseLevel.js'
import UserProgress from '../models/UserProgress.js'
import CourseActivity from '../models/CourseActivity.js'

function parseArgs(argv) {
  const options = {
    level: null,
    apply: false
  }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--apply') {
      options.apply = true
      continue
    }
    if (arg === '--level') {
      const value = Number(argv[index + 1])
      if (!Number.isNaN(value)) {
        options.level = value
        index += 1
      }
    }
  }

  return options
}

function buildTopicChapterIdRemap(levelDoc) {
  const remap = new Map()

  for (let topicIndex = 0; topicIndex < (levelDoc?.topics || []).length; topicIndex++) {
    const topic = levelDoc.topics[topicIndex]
    const chapters = Array.isArray(topic?.chapters) ? topic.chapters : []
    for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) {
      const chapter = chapters[chapterIndex]
      const prevId = String(chapter?.id || '')
      const nextId = `${levelDoc.level}-${topicIndex + 1}-${chapterIndex + 1}`
      if (prevId && prevId !== nextId) {
        remap.set(prevId, nextId)
      }
      chapter.id = nextId
    }
  }

  return remap
}

function remapChapterIdList(values, remap) {
  const result = []
  const seen = new Set()

  for (const value of Array.isArray(values) ? values : []) {
    const nextValue = remap.get(String(value)) || String(value)
    if (!nextValue || seen.has(nextValue)) continue
    seen.add(nextValue)
    result.push(nextValue)
  }

  return result
}

function remapChapterProgress(progressMap, remap) {
  const entries = progressMap instanceof Map
    ? [...progressMap.entries()]
    : Object.entries(progressMap || {})
  const nextMap = new Map()

  for (const [chapterId, payload] of entries) {
    const nextChapterId = remap.get(String(chapterId)) || String(chapterId)
    const solvedProblems = Array.isArray(payload?.solvedProblems)
      ? [...new Set(payload.solvedProblems.filter(Boolean).map(item => String(item)))]
      : []

    if (!nextMap.has(nextChapterId)) {
      nextMap.set(nextChapterId, { solvedProblems: [] })
    }

    const current = nextMap.get(nextChapterId)
    current.solvedProblems = [...new Set([...(current.solvedProblems || []), ...solvedProblems])]
  }

  return nextMap
}

async function migrateReferences(remap, apply) {
  const remapEntries = [...remap.entries()].filter(([prevId, nextId]) => prevId && nextId && prevId !== nextId)
  if (!remapEntries.length) {
    return { progressUpdated: 0, activitiesUpdated: 0 }
  }

  let progressUpdated = 0
  const remapMap = new Map(remapEntries)
  const progresses = await UserProgress.find({}).select('unlockedChapters completedChapters chapterProgress')

  for (const progress of progresses) {
    const nextUnlocked = remapChapterIdList(progress.unlockedChapters || [], remapMap)
    const nextCompleted = remapChapterIdList(progress.completedChapters || [], remapMap)
    const nextChapterProgress = remapChapterProgress(progress.chapterProgress, remapMap)

    const prevProgressEntries = progress.chapterProgress instanceof Map
      ? [...progress.chapterProgress.entries()]
      : Object.entries(progress.chapterProgress || {})
    const nextProgressEntries = [...nextChapterProgress.entries()]

    const changed = JSON.stringify(progress.unlockedChapters || []) !== JSON.stringify(nextUnlocked)
      || JSON.stringify(progress.completedChapters || []) !== JSON.stringify(nextCompleted)
      || JSON.stringify(prevProgressEntries) !== JSON.stringify(nextProgressEntries)

    if (!changed) continue
    progressUpdated += 1

    if (apply) {
      progress.unlockedChapters = nextUnlocked
      progress.completedChapters = nextCompleted
      progress.chapterProgress = nextChapterProgress
      await progress.save()
    }
  }

  let activitiesUpdated = 0
  for (const [prevId, nextId] of remapEntries) {
    const count = await CourseActivity.countDocuments({ chapterId: prevId })
    activitiesUpdated += count
    if (apply && count > 0) {
      await CourseActivity.updateMany({ chapterId: prevId }, { $set: { chapterId: nextId } })
    }
  }

  return { progressUpdated, activitiesUpdated }
}

async function main() {
  const { level, apply } = parseArgs(process.argv.slice(2))
  await Promise.all([appConn.asPromise(), hydroConn.asPromise()])

  const query = {}
  if (level !== null) query.level = level

  const levels = await CourseLevel.find(query).select('level title group subject topics.title topics.chapters.id topics.chapters.title')
  let touchedLevels = 0
  let totalRemappedIds = 0
  let totalProgressUpdated = 0
  let totalActivitiesUpdated = 0

  for (const levelDoc of levels) {
    const remap = buildTopicChapterIdRemap(levelDoc)
    const remapEntries = [...remap.entries()].filter(([prevId, nextId]) => prevId !== nextId)
    if (!remapEntries.length) continue

    touchedLevels += 1
    totalRemappedIds += remapEntries.length

    console.log(`LEVEL ${levelDoc.level} | ${levelDoc.title} | ${levelDoc.group || ''} | ${levelDoc.subject || ''}`)
    for (const [prevId, nextId] of remapEntries) {
      console.log(`  ${prevId} -> ${nextId}`)
    }

    if (apply) {
      levelDoc.markModified('topics')
      await levelDoc.save()
    }

    const migrated = await migrateReferences(remap, apply)
    totalProgressUpdated += migrated.progressUpdated
    totalActivitiesUpdated += migrated.activitiesUpdated
  }

  console.log(`Touched levels: ${touchedLevels}`)
  console.log(`Remapped chapter ids: ${totalRemappedIds}`)
  console.log(`Affected learner progress docs: ${totalProgressUpdated}`)
  console.log(`Affected course activity docs: ${totalActivitiesUpdated}`)
  console.log(apply ? 'Apply mode complete.' : 'Dry run complete. Re-run with --apply to persist changes.')
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