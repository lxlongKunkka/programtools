import { appConn, hydroConn } from '../db.js'
import CourseLevel from '../models/CourseLevel.js'
import UserProgress from '../models/UserProgress.js'
import CourseActivity from '../models/CourseActivity.js'

function parseArgs(argv) {
  const options = {
    group: 'GESP C++ 认证课程',
    levels: []
  }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--group') {
      options.group = String(argv[index + 1] || options.group)
      index += 1
      continue
    }
    if (arg === '--levels') {
      options.levels = String(argv[index + 1] || '')
        .split(',')
        .map(item => Number(item.trim()))
        .filter(Number.isFinite)
      index += 1
    }
  }

  return options
}

function countByValue(values) {
  const counter = new Map()
  for (const value of Array.isArray(values) ? values : []) {
    const key = String(value || '').trim()
    if (!key) continue
    counter.set(key, (counter.get(key) || 0) + 1)
  }
  return [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

async function main() {
  const { group, levels } = parseArgs(process.argv.slice(2))
  await Promise.all([appConn.asPromise(), hydroConn.asPromise()])

  const query = { group }
  if (levels.length) {
    query.level = { $in: levels }
  }

  const levelDocs = await CourseLevel.find(query)
    .select('level title group subject topics.title topics.chapters.id topics.chapters.title topics.chapters.problemIds topics.chapters.optionalProblemIds topics.chapters.homeworkIds topics.chapters.examIds')
    .sort({ level: 1 })
    .lean()

  const chapterIds = []
  const chapterMeta = new Map()
  for (const level of levelDocs) {
    for (const topic of level.topics || []) {
      for (const chapter of topic.chapters || []) {
        const chapterId = String(chapter?.id || '').trim()
        if (!chapterId) continue
        chapterIds.push(chapterId)
        chapterMeta.set(chapterId, {
          level: level.level,
          levelTitle: level.title,
          topicTitle: topic.title || '',
          chapterTitle: chapter.title || '',
          storedProblemIds: Array.isArray(chapter.problemIds) ? chapter.problemIds.filter(Boolean).map(String) : [],
          storedOptionalProblemIds: Array.isArray(chapter.optionalProblemIds) ? chapter.optionalProblemIds.filter(Boolean).map(String) : [],
          storedHomeworkIds: Array.isArray(chapter.homeworkIds) ? chapter.homeworkIds.filter(Boolean).map(String) : [],
          storedExamIds: Array.isArray(chapter.examIds) ? chapter.examIds.filter(Boolean).map(String) : []
        })
      }
    }
  }

  const targetChapterSet = new Set(chapterIds)
  const progressDocs = await UserProgress.find({}).select('chapterProgress').lean()
  const progressMap = new Map()

  for (const progress of progressDocs) {
    const entries = progress?.chapterProgress instanceof Map
      ? [...progress.chapterProgress.entries()]
      : Object.entries(progress?.chapterProgress || {})

    for (const [chapterId, payload] of entries) {
      const key = String(chapterId || '').trim()
      if (!targetChapterSet.has(key)) continue
      if (!progressMap.has(key)) progressMap.set(key, [])
      for (const problemId of Array.isArray(payload?.solvedProblems) ? payload.solvedProblems : []) {
        if (problemId) progressMap.get(key).push(String(problemId))
      }
    }
  }

  const activityDocs = await CourseActivity.find({
    chapterId: { $in: chapterIds },
    action: 'pass_problem',
    problemId: { $nin: ['', null] }
  }).select('chapterId problemId').lean()

  const activityMap = new Map()
  for (const activity of activityDocs) {
    const chapterId = String(activity?.chapterId || '').trim()
    if (!chapterId) continue
    if (!activityMap.has(chapterId)) activityMap.set(chapterId, [])
    activityMap.get(chapterId).push(String(activity.problemId))
  }

  let emptyStoredChapterCount = 0
  let inferableChapterCount = 0

  for (const chapterId of chapterIds.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))) {
    const meta = chapterMeta.get(chapterId)
    const storedTotal = meta.storedProblemIds.length + meta.storedOptionalProblemIds.length + meta.storedHomeworkIds.length + meta.storedExamIds.length
    const progressCounts = countByValue(progressMap.get(chapterId) || [])
    const activityCounts = countByValue(activityMap.get(chapterId) || [])

    if (storedTotal === 0) emptyStoredChapterCount += 1
    if (storedTotal === 0 && (progressCounts.length || activityCounts.length)) inferableChapterCount += 1

    console.log(`CHAPTER ${chapterId} | L${meta.level} ${meta.levelTitle} | ${meta.topicTitle} | ${meta.chapterTitle}`)
    console.log(`  STORED required=${meta.storedProblemIds.length} optional=${meta.storedOptionalProblemIds.length} homework=${meta.storedHomeworkIds.length} exam=${meta.storedExamIds.length}`)
    if (meta.storedProblemIds.length) {
      console.log(`  STORED_REQUIRED_IDS ${JSON.stringify(meta.storedProblemIds)}`)
    }
    if (meta.storedOptionalProblemIds.length) {
      console.log(`  STORED_OPTIONAL_IDS ${JSON.stringify(meta.storedOptionalProblemIds)}`)
    }
    if (meta.storedHomeworkIds.length) {
      console.log(`  STORED_HOMEWORK_IDS ${JSON.stringify(meta.storedHomeworkIds)}`)
    }
    if (meta.storedExamIds.length) {
      console.log(`  STORED_EXAM_IDS ${JSON.stringify(meta.storedExamIds)}`)
    }
    console.log(`  PROGRESS_SOLVED_UNIQUE ${progressCounts.length} ${JSON.stringify(progressCounts.slice(0, 12))}`)
    console.log(`  ACTIVITY_PASS_UNIQUE ${activityCounts.length} ${JSON.stringify(activityCounts.slice(0, 12))}`)
  }

  console.log(`SUMMARY_CHAPTERS ${chapterIds.length}`)
  console.log(`SUMMARY_EMPTY_STORED ${emptyStoredChapterCount}`)
  console.log(`SUMMARY_INFERABLE_FROM_HISTORY ${inferableChapterCount}`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.allSettled([
      appConn.close(),
      hydroConn.close()
    ])
  })