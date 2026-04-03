import fs from 'fs'
import path from 'path'
import { appConn, hydroConn } from '../db.js'
import CourseLevel from '../models/CourseLevel.js'

function parseArgs(argv) {
  const options = {
    input: '',
    group: 'GESP C++ 认证课程',
    levels: [],
    apply: false
  }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--input') {
      options.input = String(argv[index + 1] || '')
      index += 1
      continue
    }
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

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '')
    .replace(/[（）()【】\[\]《》“”"'`‘’·.,，。:：;；!！?？\-_/\\]/g, '')
}

function buildLevelBackupIndex(levelDoc) {
  const byId = new Map()
  const byTitle = new Map()
  const byTopicTitle = new Map()

  for (const topic of levelDoc?.topics || []) {
    const topicKey = normalizeText(topic?.title)
    for (const chapter of topic?.chapters || []) {
      const ref = {
        level: levelDoc.level,
        topicTitle: topic?.title || '',
        chapterId: String(chapter?.id || ''),
        chapterTitle: chapter?.title || '',
        content: chapter?.content || '',
        contentType: chapter?.contentType || 'markdown',
        resourceUrl: chapter?.resourceUrl || '',
        videoUrl: chapter?.videoUrl || '',
        problemIds: Array.isArray(chapter?.problemIds) ? chapter.problemIds.filter(Boolean).map(String) : [],
        optionalProblemIds: Array.isArray(chapter?.optionalProblemIds) ? chapter.optionalProblemIds.filter(Boolean).map(String) : [],
        homeworkIds: Array.isArray(chapter?.homeworkIds) ? chapter.homeworkIds.filter(Boolean).map(String) : [],
        examIds: Array.isArray(chapter?.examIds) ? chapter.examIds.filter(Boolean).map(String) : []
      }

      const idKey = String(ref.chapterId || '')
      const titleKey = normalizeText(ref.chapterTitle)
      const topicTitleKey = `${topicKey}::${titleKey}`

      if (idKey) {
        if (!byId.has(idKey)) byId.set(idKey, [])
        byId.get(idKey).push(ref)
      }
      if (titleKey) {
        if (!byTitle.has(titleKey)) byTitle.set(titleKey, [])
        byTitle.get(titleKey).push(ref)
      }
      if (titleKey || topicKey) {
        if (!byTopicTitle.has(topicTitleKey)) byTopicTitle.set(topicTitleKey, [])
        byTopicTitle.get(topicTitleKey).push(ref)
      }
    }
  }

  return { byId, byTitle, byTopicTitle }
}

function arraysEqual(left, right) {
  return JSON.stringify(Array.isArray(left) ? left : []) === JSON.stringify(Array.isArray(right) ? right : [])
}

function findBackupChapterMatch(currentTopic, currentChapter, backupIndex) {
  const topicKey = normalizeText(currentTopic?.title)
  const titleKey = normalizeText(currentChapter?.title)
  const idKey = String(currentChapter?.id || '')

  const topicTitleCandidates = backupIndex.byTopicTitle.get(`${topicKey}::${titleKey}`) || []
  if (topicTitleCandidates.length === 1) {
    return { source: 'topic+title', ref: topicTitleCandidates[0] }
  }

  const titleCandidates = backupIndex.byTitle.get(titleKey) || []
  if (titleCandidates.length === 1) {
    return { source: 'title', ref: titleCandidates[0] }
  }

  const idCandidates = backupIndex.byId.get(idKey) || []
  if (idCandidates.length === 1) {
    return { source: 'id', ref: idCandidates[0] }
  }

  return null
}

async function main() {
  const { input, group, levels, apply } = parseArgs(process.argv.slice(2))
  if (!input) {
    throw new Error('Missing --input <backup-json-path>')
  }

  const inputPath = path.resolve(input)
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }

  const backupLevels = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const backupLevelMap = new Map(
    backupLevels
      .filter(level => String(level?.group || '') === group)
      .map(level => [Number(level.level), level])
  )

  await Promise.all([appConn.asPromise(), hydroConn.asPromise()])

  const query = { group }
  if (levels.length) {
    query.level = { $in: levels }
  }

  const currentLevels = await CourseLevel.find(query).sort({ level: 1 })

  let matchedChapters = 0
  let changedChapters = 0
  let unmatchedChapters = 0
  const unmatchedDetails = []

  for (const currentLevel of currentLevels) {
    const backupLevel = backupLevelMap.get(Number(currentLevel.level))
    if (!backupLevel) {
      console.log(`LEVEL ${currentLevel.level} missing in backup export`)
      continue
    }

    const backupIndex = buildLevelBackupIndex(backupLevel)
    let levelChanged = false

    for (const topic of currentLevel.topics || []) {
      for (const chapter of topic.chapters || []) {
        const match = findBackupChapterMatch(topic, chapter, backupIndex)
        if (!match?.ref) {
          unmatchedChapters += 1
          unmatchedDetails.push({
            level: currentLevel.level,
            topicTitle: topic?.title || '',
            chapterId: chapter?.id || '',
            chapterTitle: chapter?.title || ''
          })
          continue
        }

        matchedChapters += 1
        const backup = match.ref

        const nextProblemIds = backup.problemIds
        const nextOptionalProblemIds = backup.optionalProblemIds
        const nextHomeworkIds = backup.homeworkIds
        const nextExamIds = backup.examIds
        const nextContent = backup.content || ''
        const nextContentType = backup.contentType || 'markdown'
        const nextResourceUrl = backup.resourceUrl || ''
        const nextVideoUrl = backup.videoUrl || ''

        const changed = String(chapter.content || '') !== nextContent
          || String(chapter.contentType || 'markdown') !== nextContentType
          || String(chapter.resourceUrl || '') !== nextResourceUrl
          || String(chapter.videoUrl || '') !== nextVideoUrl
          || !arraysEqual(chapter.problemIds, nextProblemIds)
          || !arraysEqual(chapter.optionalProblemIds, nextOptionalProblemIds)
          || !arraysEqual(chapter.homeworkIds, nextHomeworkIds)
          || !arraysEqual(chapter.examIds, nextExamIds)

        if (!changed) continue

        changedChapters += 1
        console.log(`RESTORE L${currentLevel.level} ${chapter.id} | ${chapter.title} | via=${match.source}`)

        if (!apply) continue

        chapter.content = nextContent
        chapter.contentType = nextContentType
        chapter.resourceUrl = nextResourceUrl
        chapter.videoUrl = nextVideoUrl
        chapter.problemIds = nextProblemIds
        chapter.optionalProblemIds = nextOptionalProblemIds
        chapter.homeworkIds = nextHomeworkIds
        chapter.examIds = nextExamIds
        levelChanged = true
      }
    }

    if (apply && levelChanged) {
      currentLevel.markModified('topics')
      await currentLevel.save()
    }
  }

  console.log(`MATCHED_CHAPTERS ${matchedChapters}`)
  console.log(`CHANGED_CHAPTERS ${changedChapters}`)
  console.log(`UNMATCHED_CHAPTERS ${unmatchedChapters}`)
  for (const item of unmatchedDetails.slice(0, 20)) {
    console.log(`UNMATCHED L${item.level} ${item.chapterId} | ${item.topicTitle} | ${item.chapterTitle}`)
  }
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