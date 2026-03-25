import mongoose from 'mongoose'
import { appConn, hydroConn } from '../db.js'
import CourseLevel from '../models/CourseLevel.js'
import UserProgress from '../models/UserProgress.js'
import Document from '../models/Document.js'

function getLevelTopics(levelDoc) {
  const topics = Array.isArray(levelDoc?.topics)
    ? levelDoc.topics.filter(topic => Array.isArray(topic.chapters) && topic.chapters.length > 0)
    : []

  if (topics.length > 0) return topics

  const chapters = Array.isArray(levelDoc?.chapters) ? levelDoc.chapters : []
  if (!chapters.length) return []

  return [{
    _id: levelDoc?._id,
    title: levelDoc?.title || '课程章节',
    chapters
  }]
}

async function resolveProblemIds(problemIdStrings) {
  if (!Array.isArray(problemIdStrings) || !problemIdStrings.length) return []

  const resolvedIds = []
  for (const pidStr of problemIdStrings) {
    if (!pidStr) continue

    if (mongoose.Types.ObjectId.isValid(pidStr)) {
      resolvedIds.push(String(pidStr))
      continue
    }

    let query = {}
    if (String(pidStr).includes(':')) {
      const [domain, docId] = String(pidStr).split(':')
      if (!Number.isNaN(Number(docId))) {
        query = { domainId: domain, docId: Number(docId) }
      } else {
        query = { domainId: domain, pid: docId }
      }
    } else if (!Number.isNaN(Number(pidStr))) {
      const numericDocId = Number(pidStr)
      const systemDoc = await Document.findOne({ domainId: 'system', docId: numericDocId }).select('_id').lean()
      if (systemDoc?._id) {
        resolvedIds.push(String(systemDoc._id))
        continue
      }
      query = { docId: numericDocId }
    } else {
      const systemDoc = await Document.findOne({ domainId: 'system', pid: String(pidStr) }).select('_id').lean()
      if (systemDoc?._id) {
        resolvedIds.push(String(systemDoc._id))
        continue
      }
      query = { pid: String(pidStr) }
    }

    const doc = await Document.findOne(query).select('_id').lean()
    if (doc?._id) {
      resolvedIds.push(String(doc._id))
    }
  }

  return [...new Set(resolvedIds)]
}

function normalizeArray(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map(item => String(item)))]
}

async function main() {
  await Promise.all([appConn.asPromise(), hydroConn.asPromise()])

  const levels = await CourseLevel.find()
    .select('level subject title chapters topics')
    .lean()

  const chapterRecords = []
  for (const level of levels) {
    for (const topic of getLevelTopics(level)) {
      for (const chapter of topic.chapters || []) {
        chapterRecords.push({
          id: String(chapter?.id || ''),
          uid: chapter?._id ? String(chapter._id) : '',
          requiredProblemIds: await resolveProblemIds(chapter?.problemIds || [])
        })
      }
    }
  }

  const chapterMap = new Map(chapterRecords.filter(item => item.id).map(item => [item.id, item]))
  const validChapterIds = new Set(chapterRecords.map(item => item.id).filter(Boolean))
  const validChapterUids = new Set(chapterRecords.map(item => item.uid).filter(Boolean))

  let scanned = 0
  let updated = 0
  let cleanedSolvedEntries = 0

  const cursor = UserProgress.find().cursor()
  for await (const progress of cursor) {
    scanned += 1

    const chapterProgressEntries = progress.chapterProgress instanceof Map
      ? [...progress.chapterProgress.entries()]
      : Object.entries(progress.chapterProgress || {})

    const chapterProgressMap = new Map(chapterProgressEntries.map(([chapterId, chapterData]) => [String(chapterId), normalizeArray(chapterData?.solvedProblems)]))
    const existingCompletedIds = new Set(normalizeArray(progress.completedChapters))
    const existingCompletedUids = new Set(normalizeArray(progress.completedChapterUids))
    const existingUnlockedIds = normalizeArray(progress.unlockedChapters).filter(id => validChapterIds.has(id))
    const existingUnlockedUids = normalizeArray(progress.unlockedChapterUids).filter(id => validChapterUids.has(id))

    const nextCompletedIds = []
    const nextCompletedUids = []
    const nextChapterProgress = new Map()

    for (const chapter of chapterRecords) {
      const solvedProblems = chapterProgressMap.get(chapter.id) || []
      const requiredSet = new Set(chapter.requiredProblemIds)
      const validSolvedProblems = requiredSet.size > 0
        ? solvedProblems.filter(problemId => requiredSet.has(String(problemId)))
        : []

      cleanedSolvedEntries += Math.max(solvedProblems.length - validSolvedProblems.length, 0)

      if (validSolvedProblems.length > 0) {
        nextChapterProgress.set(chapter.id, { solvedProblems: validSolvedProblems })
      }

      const isReadingChapterCompleted = requiredSet.size === 0 && (
        existingCompletedIds.has(chapter.id)
        || (chapter.uid && existingCompletedUids.has(chapter.uid))
      )

      const isProblemChapterCompleted = requiredSet.size > 0 && chapter.requiredProblemIds.every(problemId => validSolvedProblems.includes(problemId))

      if (isReadingChapterCompleted || isProblemChapterCompleted) {
        nextCompletedIds.push(chapter.id)
        if (chapter.uid) nextCompletedUids.push(chapter.uid)
      }
    }

    const newCompletedIds = normalizeArray(nextCompletedIds)
    const newCompletedUids = normalizeArray(nextCompletedUids)
    const newUnlockedIds = normalizeArray(existingUnlockedIds)
    const newUnlockedUids = normalizeArray(existingUnlockedUids)
    const newChapterProgressObject = Object.fromEntries(nextChapterProgress)

    const hasChanged = JSON.stringify(normalizeArray(progress.completedChapters)) !== JSON.stringify(newCompletedIds)
      || JSON.stringify(normalizeArray(progress.completedChapterUids)) !== JSON.stringify(newCompletedUids)
      || JSON.stringify(normalizeArray(progress.unlockedChapters).filter(id => validChapterIds.has(id))) !== JSON.stringify(newUnlockedIds)
      || JSON.stringify(normalizeArray(progress.unlockedChapterUids).filter(id => validChapterUids.has(id))) !== JSON.stringify(newUnlockedUids)
      || JSON.stringify(Object.fromEntries(chapterProgressMap)) !== JSON.stringify(newChapterProgressObject)

    if (!hasChanged) continue

    progress.completedChapters = newCompletedIds
    progress.completedChapterUids = newCompletedUids
    progress.unlockedChapters = newUnlockedIds
    progress.unlockedChapterUids = newUnlockedUids
    progress.chapterProgress = newChapterProgressObject
    await progress.save()
    updated += 1
  }

  console.log(`Rebuilt course progress for ${updated}/${scanned} learners.`)
  console.log(`Removed ${cleanedSolvedEntries} stale solved-problem references from chapter progress.`)
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