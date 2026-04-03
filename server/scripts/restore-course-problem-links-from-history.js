import { appConn, hydroConn } from '../db.js'
import CourseLevel from '../models/CourseLevel.js'
import UserProgress from '../models/UserProgress.js'
import CourseActivity from '../models/CourseActivity.js'

function parseArgs(argv) {
  const options = {
    group: 'GESP C++ 认证课程',
    levels: [],
    apply: false
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
      continue
    }
    if (arg === '--apply') {
      options.apply = true
    }
  }

  return options
}

async function main() {
  const { group, levels, apply } = parseArgs(process.argv.slice(2))
  await Promise.all([appConn.asPromise(), hydroConn.asPromise()])

  const query = { group }
  if (levels.length) {
    query.level = { $in: levels }
  }

  const levelDocs = await CourseLevel.find(query).select('level title topics')
  const chapterIds = []
  const chapterRefMap = new Map()

  for (const levelDoc of levelDocs) {
    for (const topic of levelDoc.topics || []) {
      for (const chapter of topic.chapters || []) {
        const chapterId = String(chapter?.id || '').trim()
        if (!chapterId) continue
        chapterIds.push(chapterId)
        chapterRefMap.set(chapterId, { levelDoc, topic, chapter })
      }
    }
  }

  const targetChapterSet = new Set(chapterIds)
  const progressDocs = await UserProgress.find({}).select('chapterProgress').lean()
  const inferredMap = new Map()

  const pushProblem = (chapterId, problemId) => {
    const safeChapterId = String(chapterId || '').trim()
    const safeProblemId = String(problemId || '').trim()
    if (!safeChapterId || !safeProblemId || !targetChapterSet.has(safeChapterId)) return
    if (!inferredMap.has(safeChapterId)) inferredMap.set(safeChapterId, new Set())
    inferredMap.get(safeChapterId).add(safeProblemId)
  }

  for (const progress of progressDocs) {
    const entries = progress?.chapterProgress instanceof Map
      ? [...progress.chapterProgress.entries()]
      : Object.entries(progress?.chapterProgress || {})
    for (const [chapterId, payload] of entries) {
      for (const problemId of Array.isArray(payload?.solvedProblems) ? payload.solvedProblems : []) {
        pushProblem(chapterId, problemId)
      }
    }
  }

  const activityDocs = await CourseActivity.find({
    chapterId: { $in: chapterIds },
    action: 'pass_problem',
    problemId: { $nin: ['', null] }
  }).select('chapterId problemId').lean()

  for (const activity of activityDocs) {
    pushProblem(activity.chapterId, activity.problemId)
  }

  let touchedChapters = 0
  let restoredProblemLinks = 0

  for (const chapterId of chapterIds.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }))) {
    const ref = chapterRefMap.get(chapterId)
    if (!ref) continue

    const chapter = ref.chapter
    const storedRequired = Array.isArray(chapter.problemIds) ? chapter.problemIds.filter(Boolean).map(String) : []
    const storedOptional = Array.isArray(chapter.optionalProblemIds) ? chapter.optionalProblemIds.filter(Boolean).map(String) : []
    const storedHomework = Array.isArray(chapter.homeworkIds) ? chapter.homeworkIds.filter(Boolean).map(String) : []
    const storedExam = Array.isArray(chapter.examIds) ? chapter.examIds.filter(Boolean).map(String) : []
    const hasStoredLinks = storedRequired.length || storedOptional.length || storedHomework.length || storedExam.length
    if (hasStoredLinks) continue

    const inferredIds = [...(inferredMap.get(chapterId) || new Set())]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
    if (!inferredIds.length) continue

    touchedChapters += 1
    restoredProblemLinks += inferredIds.length

    console.log(`RESTORE ${chapterId} | ${chapter.title} | inferred=${inferredIds.length} | ${JSON.stringify(inferredIds)}`)

    if (!apply) continue

    chapter.optionalProblemIds = inferredIds
    ref.levelDoc.markModified('topics')
  }

  if (apply) {
    const dirtyLevels = levelDocs.filter(levelDoc => levelDoc.isModified('topics'))
    for (const levelDoc of dirtyLevels) {
      await levelDoc.save()
    }
  }

  console.log(`TOUCHED_CHAPTERS ${touchedChapters}`)
  console.log(`RESTORED_PROBLEM_LINKS ${restoredProblemLinks}`)
  console.log(apply ? 'Apply mode complete.' : 'Dry run complete. Re-run with --apply to persist changes.')
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