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

const GESP_CPP_GROUP_NAME = 'GESP C++ 认证课程'
const TAG_ALIASES = {
  链表: ['list 与 deque', 'list deque', 'deque', '链式结构', '单链表', '双向链表'],
  组合数学: ['排列组合', '组合数', '组合'],
  树形结构: ['树与二叉树', '二叉树', '树']
}

function normalizeCourseText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s()（）\[\]【】{}<>《》'"`~!@#$%^&*=+|\\/:;,.?，。；：、·_-]+/g, '')
}

function isGespCppLevel(level) {
  const group = String(level?.group || '')
  const title = String(level?.title || '')
  const subject = String(level?.subject || '')
  if (group === GESP_CPP_GROUP_NAME) return true
  if (!title.includes('GESP')) return false
  if (title.includes('Python') || group.includes('Python') || subject.includes('Python')) return false
  return true
}

function createChapterTarget(level, topic, chapter) {
  const chapterUid = chapter?._id ? String(chapter._id) : String(chapter?.id || '')
  const levelId = level?._id ? String(level._id) : ''
  if (!chapterUid || !levelId) return null
  return {
    chapterUid,
    chapterId: String(chapter?.id || ''),
    levelId,
    levelTitle: String(level?.title || ''),
    topicTitle: String(topic?.title || ''),
    chapterTitle: String(chapter?.title || '')
  }
}

function resolveTagTarget(tag, legacyChapterId, chapterTargetById, chapterEntries) {
  const legacyId = String(legacyChapterId || '').trim()
  if (legacyId && chapterTargetById.has(legacyId)) {
    return chapterTargetById.get(legacyId)
  }

  const preferredLevel = Number.parseInt(legacyId.split('-')[0], 10)
  const scopedEntries = Number.isFinite(preferredLevel)
    ? chapterEntries.filter(entry => entry.levelNum === preferredLevel)
    : chapterEntries

  const normalizedCandidates = [tag, ...(TAG_ALIASES[tag] || [])]
    .map(item => normalizeCourseText(item))
    .filter(Boolean)
  if (!normalizedCandidates.length) return null

  for (const normalizedTag of normalizedCandidates) {
    const exactTopic = scopedEntries.find(entry => entry.topicNorm === normalizedTag)
    if (exactTopic) return exactTopic.topicTarget

    const exactChapter = scopedEntries.find(entry => entry.chapterNorm === normalizedTag)
    if (exactChapter) return exactChapter.chapterTarget

    const partialTopic = scopedEntries.find(entry => entry.topicNorm && (entry.topicNorm.includes(normalizedTag) || normalizedTag.includes(entry.topicNorm)))
    if (partialTopic) return partialTopic.topicTarget

    const partialChapter = scopedEntries.find(entry => entry.chapterNorm && (entry.chapterNorm.includes(normalizedTag) || normalizedTag.includes(entry.chapterNorm)))
    if (partialChapter) return partialChapter.chapterTarget
  }

  return null
}

function buildResolvedTagTargets(levels, tagMap) {
  const chapterTargetById = new Map()
  const chapterEntries = []

  for (const level of Array.isArray(levels) ? levels : []) {
    if (!isGespCppLevel(level)) continue

    for (const topic of Array.isArray(level.topics) ? level.topics : []) {
      const chapters = Array.isArray(topic.chapters) ? topic.chapters : []
      if (!chapters.length) continue

      const topicTarget = createChapterTarget(level, topic, chapters[0])
      const topicNorm = normalizeCourseText(topic.title)

      for (const chapter of chapters) {
        const chapterId = String(chapter?.id || '')
        const chapterTarget = createChapterTarget(level, topic, chapter)
        if (chapterId && chapterTarget) {
          chapterTargetById.set(chapterId, chapterTarget)
        }
        chapterEntries.push({
          levelNum: Number(level.level || 0),
          topicNorm,
          chapterNorm: normalizeCourseText(chapter?.title || ''),
          topicTarget,
          chapterTarget
        })
      }
    }
  }

  const resolvedTargets = {}
  const missingTargets = []

  for (const [tag, legacyChapterId] of Object.entries(tagMap || {})) {
    const resolved = resolveTagTarget(tag, legacyChapterId, chapterTargetById, chapterEntries)
    if (resolved) {
      resolvedTargets[tag] = resolved
    } else {
      missingTargets.push({ tag, legacyChapterId })
    }
  }

  return { resolvedTargets, missingTargets }
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

  const { resolvedTargets, missingTargets } = buildResolvedTagTargets(levels, tagMap)
  console.log(`GESP_CPP_RUNTIME_RESOLVED ${Object.keys(resolvedTargets).length}`)
  console.log(`GESP_CPP_RUNTIME_MISSING ${missingTargets.length}`)
  for (const item of missingTargets) {
    console.log(`RUNTIME_MISSING ${item.tag} -> ${item.legacyChapterId}`)
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