import express from 'express'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'
import CourseLevel from '../models/CourseLevel.js'
import CourseGroup from '../models/CourseGroup.js'
import UserProgress from '../models/UserProgress.js'
import User from '../models/User.js'
import Document from '../models/Document.js'
import Submission from '../models/Submission.js'
import ContestStatus from '../models/ContestStatus.js'
import TeacherQuizFollow from '../models/TeacherQuizFollow.js'
import CourseActivity from '../models/CourseActivity.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Helper: Resolve problem definition strings (e.g. "1001", "system:1001") to Document ObjectIds
async function resolveProblemIds(problemIdStrings) {
    if (!problemIdStrings || !Array.isArray(problemIdStrings)) return []
    
    const resolvedIds = []
    for (const pidStr of problemIdStrings) {
        if (!pidStr) continue
        
        // If it looks like a MongoID, assume it is one (or check DB)
        if (mongoose.Types.ObjectId.isValid(pidStr)) {
            resolvedIds.push(pidStr.toString())
            continue
        }
        
        let query = {}
        if (pidStr.includes(':')) {
            const [domain, docId] = pidStr.split(':')
            if (!isNaN(docId)) {
                query = { domainId: domain, docId: Number(docId) }
            } else {
                query = { domainId: domain, pid: docId }
            }
        } else {
            if (!isNaN(pidStr)) {
                const docId = Number(pidStr)
                // Try system first
                const sysDoc = await Document.findOne({ domainId: 'system', docId: docId }).select('_id')
                if (sysDoc) {
                    resolvedIds.push(sysDoc._id.toString())
                    continue
                }
                query = { docId: docId }
            } else {
                // Try system first with pid
                const sysDoc = await Document.findOne({ domainId: 'system', pid: pidStr }).select('_id')
                if (sysDoc) {
                    resolvedIds.push(sysDoc._id.toString())
                    continue
                }
                query = { pid: pidStr }
            }
        }
        
        const doc = await Document.findOne(query).select('_id')
        if (doc) {
            resolvedIds.push(doc._id.toString())
        }
    }
    return resolvedIds
}

function normalizeSubjectLevels(progress) {
  let subjectLevels = progress?.subjectLevels

  if (subjectLevels instanceof Map) {
    subjectLevels = Object.fromEntries(subjectLevels)
  }

  if (!subjectLevels || typeof subjectLevels !== 'object') {
    subjectLevels = {}
  }

  if (!subjectLevels['C++']) {
    subjectLevels['C++'] = progress?.currentLevel || 1
  }

  return subjectLevels
}

function getActivitySessionDate(date = new Date()) {
  const offset = 8
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  const nd = new Date(utc + (3600000 * offset))
  return nd.toISOString().split('T')[0]
}

function getActivityWindowStart(days = 14) {
  const safeDays = Math.min(Math.max(Number(days) || 14, 1), 90)
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - (safeDays - 1))
  return date
}

async function findCourseChapterContext(chapterId) {
  let level = await CourseLevel.findOne({ 'chapters.id': chapterId }).lean()
  if (level) {
    const chapter = Array.isArray(level.chapters) ? level.chapters.find(item => item.id === chapterId) : null
    if (!chapter) return null
    return { level, chapter, topicTitle: '' }
  }

  level = await CourseLevel.findOne({ 'topics.chapters.id': chapterId }).lean()
  if (!level) return null

  for (const topic of level.topics || []) {
    const chapter = Array.isArray(topic.chapters) ? topic.chapters.find(item => item.id === chapterId) : null
    if (chapter) {
      return {
        level,
        chapter,
        topicTitle: topic.title || ''
      }
    }
  }

  return null
}

async function recordCourseActivity({ userId, chapterId, action, problemId = '', metadata = {} }) {
  if (!userId || !chapterId || !action) return

  const context = await findCourseChapterContext(chapterId)
  if (!context?.level || !context?.chapter) return

  const now = new Date()
  const sessionDate = getActivitySessionDate(now)

  await CourseActivity.findOneAndUpdate(
    { userId, chapterId, action, sessionDate },
    {
      $set: {
        chapterUid: context.chapter._id || null,
        chapterTitle: context.chapter.title || '',
        topicTitle: context.topicTitle || '',
        levelId: context.level._id || null,
        level: Number(context.level.level || 0),
        levelTitle: context.level.title || '',
        group: context.level.group || '',
        subject: context.level.subject || 'C++',
        problemId: String(problemId || ''),
        metadata,
        lastActiveAt: now
      },
      $setOnInsert: {
        userId,
        action,
        sessionDate,
        chapterId
      }
    },
    { upsert: true, setDefaultsOnInsert: true }
  )
}

function getLevelTopics(levelDoc) {
  const topics = Array.isArray(levelDoc?.topics)
    ? levelDoc.topics.filter(topic => Array.isArray(topic.chapters) && topic.chapters.length > 0)
    : []

  if (topics.length > 0) return topics

  const chapters = Array.isArray(levelDoc?.chapters) ? levelDoc.chapters : []
  if (!chapters.length) return []

  return [{
    _id: `legacy-${levelDoc._id}`,
    title: '章节',
    chapters
  }]
}

function isChapterCompleted(progress, chapter) {
  if (!progress || !chapter) return false

  if (chapter._id && Array.isArray(progress.completedChapterUids)) {
    const uidText = chapter._id.toString()
    if (progress.completedChapterUids.some(uid => uid && uid.toString() === uidText)) {
      return true
    }
  }

  return !!(chapter.id && Array.isArray(progress.completedChapters) && progress.completedChapters.includes(chapter.id))
}

function buildLevelSnapshot(levelDoc, progress) {
  const topics = getLevelTopics(levelDoc).map(topic => {
    const chapters = Array.isArray(topic.chapters) ? topic.chapters : []
    const completedCount = chapters.reduce((sum, chapter) => sum + (isChapterCompleted(progress, chapter) ? 1 : 0), 0)
    const totalCount = chapters.length

    return {
      topicId: String(topic._id || topic.title || ''),
      title: topic.title || '未命名专题',
      completedCount,
      totalCount,
      completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    }
  })

  const totalChapters = topics.reduce((sum, topic) => sum + topic.totalCount, 0)
  const completedChapters = topics.reduce((sum, topic) => sum + topic.completedCount, 0)

  return {
    levelId: String(levelDoc._id),
    level: Number(levelDoc.level || 0),
    group: levelDoc.group || '',
    subject: levelDoc.subject || 'C++',
    title: levelDoc.title || '',
    completedChapters,
    totalChapters,
    completionRate: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0,
    topics
  }
}

function getChapterSolvedProblems(progress, chapter) {
  if (!progress || !chapter?.id) return []

  const chapterData = progress.chapterProgress?.get
    ? progress.chapterProgress.get(chapter.id)
    : progress.chapterProgress?.[chapter.id]

  const solvedProblems = Array.isArray(chapterData?.solvedProblems)
    ? chapterData.solvedProblems.filter(Boolean).map(item => String(item))
    : []

  return [...new Set(solvedProblems)]
}

async function resolveSolvedProblemDetails(problemIds) {
  const uniqueIds = [...new Set((Array.isArray(problemIds) ? problemIds : []).filter(Boolean).map(item => String(item)))]
  if (!uniqueIds.length) return []

  const objectIdValues = uniqueIds.filter(value => mongoose.Types.ObjectId.isValid(value))
  const objectIdDocs = objectIdValues.length > 0
    ? await Document.find({ _id: { $in: objectIdValues } }).select('_id domainId docId pid title').lean()
    : []

  const objectIdMap = new Map(objectIdDocs.map(doc => [String(doc._id), doc]))
  const unresolvedValues = uniqueIds.filter(value => !objectIdMap.has(value))

  const numericValues = unresolvedValues.filter(value => /^\d+$/.test(value)).map(value => Number(value))
  const numericDocs = numericValues.length > 0
    ? await Document.find({ docId: { $in: numericValues } }).select('_id domainId docId pid title').lean()
    : []

  const numericMap = new Map()
  numericDocs.forEach(doc => {
    if (Number.isFinite(doc.docId)) numericMap.set(String(doc.docId), doc)
  })

  return uniqueIds.map(value => {
    const doc = objectIdMap.get(value) || numericMap.get(value)
    const domainId = doc?.domainId || 'system'
    const docId = Number.isFinite(doc?.docId) ? doc.docId : null
    const title = doc?.title || value
    return {
      id: value,
      domainId,
      docId,
      pid: doc?.pid || '',
      title,
      problemUrl: docId ? `https://acjudge.com/d/${domainId}/p/${docId}` : '',
      displayName: doc
        ? `${domainId} / ${docId} / ${title}`
        : value
    }
  })
}

async function buildScopedTopicSnapshot(topic, progress) {
  const chapterItems = Array.isArray(topic?.chapters)
    ? await Promise.all(topic.chapters.map(async chapter => {
      const solvedProblemIds = getChapterSolvedProblems(progress, chapter)
      const solvedProblems = await resolveSolvedProblemDetails(solvedProblemIds)
      return {
        chapterId: chapter.id || '',
        chapterUid: chapter._id ? String(chapter._id) : '',
        title: chapter.title || '未命名章节',
        completed: isChapterCompleted(progress, chapter),
        solvedProblemCount: solvedProblems.length,
        solvedProblems
      }
    }))
    : []

  const totalCount = chapterItems.length
  const completedCount = chapterItems.reduce((sum, chapter) => sum + (chapter.completed ? 1 : 0), 0)
  const solvedProblemCount = chapterItems.reduce((sum, chapter) => sum + chapter.solvedProblemCount, 0)

  return {
    topicId: String(topic?._id || topic?.title || ''),
    title: topic?.title || '未命名专题',
    completedCount,
    totalCount,
    solvedProblemCount,
    completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    chapters: chapterItems
  }
}

async function buildScopedLearnerDetailPayload({ learnerId, user, progress, levelDoc, topic = null, recentActivities = [] }) {
  const selectedTopics = topic ? [topic] : getLevelTopics(levelDoc)
  const topicSnapshots = (await Promise.all(selectedTopics.map(item => buildScopedTopicSnapshot(item, progress))))
    .filter(item => item.totalCount > 0)

  const totalChapters = topicSnapshots.reduce((sum, item) => sum + item.totalCount, 0)
  const completedChaptersCount = topicSnapshots.reduce((sum, item) => sum + item.completedCount, 0)
  const solvedProblemCount = topicSnapshots.reduce((sum, item) => sum + item.solvedProblemCount, 0)
  const completionRate = totalChapters > 0 ? Number(((completedChaptersCount / totalChapters) * 100).toFixed(1)) : 0

  return {
    learner: {
      learnerId,
      learnerName: user?.uname || `用户 ${learnerId}`,
      learnerEmail: user?.mail || '',
      scopeType: topic ? 'topic' : 'level',
      scopeTitle: topic?.title || levelDoc?.title || '',
      levelId: String(levelDoc?._id || ''),
      level: Number(levelDoc?.level || 0),
      levelTitle: levelDoc?.title || '',
      topicId: topic?._id ? String(topic._id) : '',
      group: levelDoc?.group || '',
      subject: levelDoc?.subject || 'C++',
      completedChaptersCount,
      totalChapters,
      solvedProblemCount,
      completionRate,
      lastActivityAt: recentActivities[0]?.lastActiveAt || null
    },
    topics: topicSnapshots,
    recentActivities: recentActivities.map(item => ({
      action: item.action,
      sessionDate: item.sessionDate,
      chapterId: item.chapterId,
      chapterTitle: item.chapterTitle || '',
      topicTitle: item.topicTitle || '',
      level: item.level || 0,
      levelTitle: item.levelTitle || '',
      subject: item.subject || 'C++',
      group: item.group || '',
      problemId: item.problemId || '',
      lastActiveAt: item.lastActiveAt || item.updatedAt || item.createdAt || null
    }))
  }
}

function buildCourseRiskFlags(summary) {
  const flags = []

  if (!summary.lastActivityAt && (summary.completedChaptersCount || 0) === 0) {
    flags.push('未开始课程')
    return flags
  }

  if (summary.lastActivityAt) {
    const daysSinceLastActive = Math.floor((Date.now() - new Date(summary.lastActivityAt).getTime()) / 86400000)
    if (daysSinceLastActive >= 7) flags.push('连续未学习')
  }

  if ((summary.activeDays || 0) <= 1) flags.push('活跃度偏低')
  if ((summary.completionRate || 0) < 10) flags.push('进度偏慢')
  if ((summary.startedLevelCount || 0) > 0 && (summary.completedLevelCount || 0) === 0) flags.push('尚未完成整级')

  return flags
}

function buildCourseProgressSummary(progress, levels) {
  const levelSnapshots = levels
    .map(level => buildLevelSnapshot(level, progress))
    .filter(level => level.totalChapters > 0)

  const totalChapters = levelSnapshots.reduce((sum, level) => sum + level.totalChapters, 0)
  const completedChaptersCount = levelSnapshots.reduce((sum, level) => sum + level.completedChapters, 0)
  const startedLevelCount = levelSnapshots.filter(level => level.completedChapters > 0).length
  const completedLevelCount = levelSnapshots.filter(level => level.totalChapters > 0 && level.completedChapters === level.totalChapters).length
  const totalTopicCount = levelSnapshots.reduce((sum, level) => sum + level.topics.length, 0)
  const startedTopicCount = levelSnapshots.reduce((sum, level) => sum + level.topics.filter(topic => topic.completedCount > 0).length, 0)
  const completionRate = totalChapters > 0 ? Number(((completedChaptersCount / totalChapters) * 100).toFixed(1)) : 0
  const subjectLevels = normalizeSubjectLevels(progress)
  const currentCppLevel = Number(subjectLevels['C++'] || progress?.currentLevel || 1)
  const currentCppLevelDoc = levels.find(level => {
    const subject = level.subject || 'C++'
    return subject === 'C++' && Number(level.level) === currentCppLevel
  })

  return {
    subjectLevels,
    currentCppLevel,
    currentCppLevelTitle: currentCppLevelDoc?.title || '',
    completedChaptersCount,
    totalChapters,
    completionRate,
    startedLevelCount,
    completedLevelCount,
    startedTopicCount,
    totalTopicCount,
    levels: levelSnapshots
  }
}

async function buildTeacherCourseFollowPayload(teacherId) {
  const follows = await TeacherQuizFollow.find({ teacherId }).sort({ createdAt: -1 }).lean()
  const learnerIds = follows.map(item => Number(item.learnerId)).filter(Number.isFinite)

  if (!learnerIds.length) {
    return {
      summary: {
        followedCount: 0,
        startedLearnerCount: 0,
        averageCompletionRate: 0,
        averageCompletedChapters: 0,
        averageCurrentCppLevel: 0,
        activeLearnerCount: 0
      },
      items: []
    }
  }

  const windowStart = getActivityWindowStart(14)
  const [users, progresses, levels, activityStats] = await Promise.all([
    User.find({ _id: { $in: learnerIds } }).select('_id uname mail').lean(),
    UserProgress.find({ userId: { $in: learnerIds } }).lean(),
    CourseLevel.find()
      .select('level group subject title topics._id topics.title topics.chapters._id topics.chapters.id chapters._id chapters.id')
      .sort({ subject: 1, level: 1 })
      .lean(),
    CourseActivity.aggregate([
      {
        $match: {
          userId: { $in: learnerIds },
          lastActiveAt: { $gte: windowStart }
        }
      },
      {
        $group: {
          _id: '$userId',
          activeDays: { $addToSet: '$sessionDate' },
          recentCompletedCount: {
            $sum: {
              $cond: [{ $eq: ['$action', 'complete_chapter'] }, 1, 0]
            }
          },
          lastActivityAt: { $max: '$lastActiveAt' }
        }
      }
    ])
  ])

  const userMap = new Map(users.map(user => [Number(user._id), user]))
  const progressMap = new Map(progresses.map(progress => [Number(progress.userId), progress]))
  const activityMap = new Map(activityStats.map(item => [Number(item._id), item]))

  const items = follows.map(follow => {
    const learnerId = Number(follow.learnerId)
    const user = userMap.get(learnerId)
    const progress = progressMap.get(learnerId)
    const activity = activityMap.get(learnerId)
    const courseSummary = buildCourseProgressSummary(progress, levels)

    const item = {
      learnerId,
      learnerName: user?.uname || `用户 ${learnerId}`,
      learnerEmail: user?.mail || '',
      followedAt: follow.createdAt || null,
      note: follow.note || '',
      currentCppLevel: courseSummary.currentCppLevel,
      currentCppLevelTitle: courseSummary.currentCppLevelTitle,
      subjectLevels: courseSummary.subjectLevels,
      completedChaptersCount: courseSummary.completedChaptersCount,
      totalChapters: courseSummary.totalChapters,
      completionRate: courseSummary.completionRate,
      startedLevelCount: courseSummary.startedLevelCount,
      completedLevelCount: courseSummary.completedLevelCount,
      startedTopicCount: courseSummary.startedTopicCount,
      totalTopicCount: courseSummary.totalTopicCount,
      activeDays: Array.isArray(activity?.activeDays) ? activity.activeDays.length : 0,
      recentCompletedCount: Number(activity?.recentCompletedCount || 0),
      lastActivityAt: activity?.lastActivityAt || null
    }

    return {
      ...item,
      riskFlags: buildCourseRiskFlags(item)
    }
  })

  const followedCount = items.length
  const startedLearnerCount = items.filter(item => item.completedChaptersCount > 0).length
  const averageCompletionRate = followedCount > 0
    ? Number((items.reduce((sum, item) => sum + item.completionRate, 0) / followedCount).toFixed(1))
    : 0
  const averageCompletedChapters = followedCount > 0
    ? Number((items.reduce((sum, item) => sum + item.completedChaptersCount, 0) / followedCount).toFixed(1))
    : 0
  const averageCurrentCppLevel = followedCount > 0
    ? Number((items.reduce((sum, item) => sum + (item.currentCppLevel || 0), 0) / followedCount).toFixed(1))
    : 0
  const activeLearnerCount = items.filter(item => item.activeDays > 0).length

  return {
    summary: {
      followedCount,
      startedLearnerCount,
      averageCompletionRate,
      averageCompletedChapters,
      averageCurrentCppLevel,
      activeLearnerCount
    },
    items
  }
}

async function buildTeacherCourseLearnerDetailPayload(teacherId, learnerId) {
  const follow = await TeacherQuizFollow.findOne({ teacherId, learnerId }).lean()
  if (!follow) throw new Error('未关注该学员')

  const windowStart = getActivityWindowStart(30)
  const [user, progress, levels, recentActivities] = await Promise.all([
    User.findOne({ _id: learnerId }).select('_id uname mail').lean(),
    UserProgress.findOne({ userId: learnerId }).lean(),
    CourseLevel.find()
      .select('level group subject title topics._id topics.title topics.chapters._id topics.chapters.id chapters._id chapters.id')
      .sort({ subject: 1, level: 1 })
      .lean(),
    CourseActivity.find({ userId: learnerId, lastActiveAt: { $gte: windowStart } })
      .sort({ lastActiveAt: -1 })
      .limit(20)
      .lean()
  ])

  if (!user) throw new Error('学员不存在')

  const courseSummary = buildCourseProgressSummary(progress, levels)

  return {
    learner: {
      learnerId,
      learnerName: user.uname,
      learnerEmail: user.mail || '',
      followedAt: follow.createdAt || null,
      note: follow.note || '',
      currentCppLevel: courseSummary.currentCppLevel,
      currentCppLevelTitle: courseSummary.currentCppLevelTitle,
      subjectLevels: courseSummary.subjectLevels,
      completedChaptersCount: courseSummary.completedChaptersCount,
      totalChapters: courseSummary.totalChapters,
      completionRate: courseSummary.completionRate,
      startedLevelCount: courseSummary.startedLevelCount,
      completedLevelCount: courseSummary.completedLevelCount,
      startedTopicCount: courseSummary.startedTopicCount,
      totalTopicCount: courseSummary.totalTopicCount,
      lastActivityAt: recentActivities[0]?.lastActiveAt || null
    },
    levels: courseSummary.levels,
    recentActivities: recentActivities.map(item => ({
      action: item.action,
      sessionDate: item.sessionDate,
      chapterId: item.chapterId,
      chapterTitle: item.chapterTitle || '',
      topicTitle: item.topicTitle || '',
      level: item.level || 0,
      levelTitle: item.levelTitle || '',
      subject: item.subject || 'C++',
      group: item.group || '',
      problemId: item.problemId || '',
      lastActiveAt: item.lastActiveAt || item.updatedAt || item.createdAt || null
    }))
  }
}

// --- Group Routes ---

// Get all groups
router.get('/groups', async (req, res) => {
  try {
    const groups = await CourseGroup.find().sort({ order: 1 }).lean()
    // Manually populate editors from hydroConn (cross-connection populate is not supported)
    const allEditorIds = [...new Set(groups.flatMap(g => g.editors || []))]
    const editorMap = {}
    if (allEditorIds.length > 0) {
      const users = await User.find({ _id: { $in: allEditorIds } }, 'uname _id').lean()
      users.forEach(u => { editorMap[u._id] = u })
    }
    const result = groups.map(g => ({
      ...g,
      editors: (g.editors || []).map(uid => editorMap[uid] || { _id: uid })
    }))
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Create group
router.post('/groups', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, title, editors, language } = req.body
    const count = await CourseGroup.countDocuments()
    const group = new CourseGroup({
      name,
      title: title || name,
      language: language || 'C++',
      order: count + 1,
      editors: editors || []
    })
    await group.save()
    res.json(group)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update group (Rename & Editors)
router.put('/groups/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, title, editors, language } = req.body
    const group = await CourseGroup.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const oldName = group.name
    if (name && name !== oldName) {
      // Update all levels that use this group name
      await CourseLevel.updateMany({ group: oldName }, { $set: { group: name } })
      group.name = name
    }
    if (title) group.title = title
    if (editors) group.editors = editors
    if (language) group.language = language
    
    await group.save()
    res.json(group)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete group
router.delete('/groups/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const group = await CourseGroup.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    // Check if levels exist
    const levelCount = await CourseLevel.countDocuments({ group: group.name })
    if (levelCount > 0) {
      return res.status(400).json({ error: `Cannot delete group. It contains ${levelCount} levels.` })
    }

    await CourseGroup.findByIdAndDelete(req.params.id)
    res.json({ message: 'Group deleted' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Move group
router.post('/groups/:id/move', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { direction } = req.body
    const group = await CourseGroup.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const currentOrder = group.order
    const swapGroup = await CourseGroup.findOne({
      order: direction === 'up' ? { $lt: currentOrder } : { $gt: currentOrder }
    }).sort({ order: direction === 'up' ? -1 : 1 })

    if (swapGroup) {
      const swapOrder = swapGroup.order
      swapGroup.order = currentOrder
      group.order = swapOrder
      await swapGroup.save()
      await group.save()
    }
    res.json({ message: 'Moved successfully' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})


// --- Public / User Routes ---


// Get single chapter details (Protected)
router.get('/chapter/:chapterId', authenticateToken, async (req, res) => {
  try {
    const { chapterId } = req.params
    const { levelId } = req.query
    const userId = req.user.id

    // 1. Check if user has unlocked this chapter
    const progress = await UserProgress.findOne({ userId })
    
    // Allow admin/teacher to bypass check
    const isAdmin = req.user.role === 'admin' || req.user.role === 'teacher' || req.user.priv === -1
    
    if (!progress && !isAdmin) {
        return res.status(403).json({ error: 'Access denied' })
    }

    // 2. Find the chapter
    const query = { 
        $or: [
            { 'chapters.id': chapterId },
            { 'topics.chapters.id': chapterId }
        ]
    }
    
    // If levelId is provided (and valid), scope the search to that level
    if (levelId && mongoose.Types.ObjectId.isValid(levelId)) {
        query._id = levelId
    }

    let level = await CourseLevel.findOne(query)

    // If not found, and it looks like a MongoID, try finding by _id
    if (!level && mongoose.Types.ObjectId.isValid(chapterId)) {
        const idQuery = { 
            $or: [
                { 'chapters._id': chapterId },
                { 'topics.chapters._id': chapterId }
            ]
        }
        if (levelId && mongoose.Types.ObjectId.isValid(levelId)) {
            idQuery._id = levelId
        }
        level = await CourseLevel.findOne(idQuery)
    }

    let chapter = null
    let isFirstChapter = false
    
    if (level) {
      // Check legacy chapters
      let idx = level.chapters.findIndex(c => c.id === chapterId || (c._id && c._id.toString() === chapterId))
      if (idx !== -1) {
        chapter = level.chapters[idx]
        if (idx === 0) isFirstChapter = true
      } else if (level.topics) {
        // Check topics
        for (const topic of level.topics) {
          idx = topic.chapters.findIndex(c => c.id === chapterId || (c._id && c._id.toString() === chapterId))
          if (idx !== -1) {
            chapter = topic.chapters[idx]
            if (idx === 0) isFirstChapter = true
            break
          }
        }
      }
    }

    if (!level || !chapter) {
      return res.status(404).json({ error: 'Chapter not found' })
    }

    // 3. Check permissions
    if (!isAdmin) {
        const isUnlockedId = progress.unlockedChapters.includes(chapterId)
        let isUnlocked = isUnlockedId
        if (!isUnlocked && chapter._id && progress.unlockedChapterUids) {
            isUnlocked = progress.unlockedChapterUids.some(id => id.toString() === chapter._id.toString())
        }
        
        // Always allow access to the first chapter of any topic
        if (!isUnlocked && isFirstChapter) {
            isUnlocked = true
        }

        // Fallback: Check if previous chapter is completed (Self-Healing)
        if (!isUnlocked) {
            let prevChapter = null
            if (level.chapters && level.chapters.length > 0) {
                 // Legacy
                 const idx = level.chapters.findIndex(c => c.id === chapter.id || (c._id && chapter._id && c._id.toString() === chapter._id.toString()))
                 if (idx > 0) prevChapter = level.chapters[idx - 1]
            } else if (level.topics) {
                 // Topics
                 for (let t = 0; t < level.topics.length; t++) {
                     const topic = level.topics[t]
                     const cIdx = topic.chapters.findIndex(c => c.id === chapter.id || (c._id && chapter._id && c._id.toString() === chapter._id.toString()))
                     if (cIdx !== -1) {
                         if (cIdx > 0) {
                             prevChapter = topic.chapters[cIdx - 1]
                         } else if (t > 0) {
                             // Last chapter of previous topic
                             // Find previous topic with chapters
                             let prevT = t - 1
                             while (prevT >= 0) {
                                 const prevTopic = level.topics[prevT]
                                 if (prevTopic.chapters && prevTopic.chapters.length > 0) {
                                     prevChapter = prevTopic.chapters[prevTopic.chapters.length - 1]
                                     break
                                 }
                                 prevT--
                             }
                         }
                         break
                     }
                 }
            }
            
            if (prevChapter) {
                let isPrevCompleted = progress.completedChapters.includes(prevChapter.id) || 
                                        (prevChapter._id && progress.completedChapterUids && progress.completedChapterUids.some(id => id.toString() === prevChapter._id.toString()))
                
                // Deep check: If not marked completed, check if all problems are solved
                if (!isPrevCompleted && prevChapter.problemIds && prevChapter.problemIds.length > 0) {
                    const prevChapterData = progress.chapterProgress.get(prevChapter.id)
                    if (prevChapterData && prevChapterData.solvedProblems) {
                        // Resolve problem IDs to MongoIDs for comparison
                        const requiredIds = await resolveProblemIds(prevChapter.problemIds)
                        const solvedIds = prevChapterData.solvedProblems.map(id => id.toString())
                        
                        const allSolved = requiredIds.length > 0 && requiredIds.every(id => solvedIds.includes(id))
                        
                        if (allSolved) {
                            isPrevCompleted = true
                            // Auto-repair: Mark previous chapter as completed
                            if (!progress.completedChapters.includes(prevChapter.id)) {
                                progress.completedChapters.push(prevChapter.id)
                            }
                            if (prevChapter._id) {
                                if (!progress.completedChapterUids) progress.completedChapterUids = []
                                const uidStr = prevChapter._id.toString()
                                if (!progress.completedChapterUids.some(id => id.toString() === uidStr)) {
                                    progress.completedChapterUids.push(prevChapter._id)
                                }
                            }
                        }
                    }
                } else if (!isPrevCompleted && (!prevChapter.problemIds || prevChapter.problemIds.length === 0)) {
                    // If previous chapter has no problems (reading only), we can't easily verify completion without the flag.
                    // But usually reading chapters are marked completed explicitly.
                    // We could be lenient here if needed, but let's stick to explicit completion for reading chapters.
                }

                if (isPrevCompleted) {
                    isUnlocked = true
                    // Auto-repair: Save this unlock to DB
                    if (!progress.unlockedChapters.includes(chapter.id)) {
                        progress.unlockedChapters.push(chapter.id)
                    }
                    if (chapter._id) {
                        if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
                        const uidStr = chapter._id.toString()
                        if (!progress.unlockedChapterUids.some(id => id.toString() === uidStr)) {
                            progress.unlockedChapterUids.push(chapter._id)
                        }
                    }
                    await progress.save()
                }
            }
        }
        
        if (!isUnlocked) {
            return res.status(403).json({ error: 'Chapter is locked' })
        }
    }

    // 4. Manually populate problemIds (since they are now strings)
    // We need to fetch the actual problem details for the frontend
    let populatedChapter = chapter.toObject()
    
    if (chapter.problemIds && chapter.problemIds.length > 0) {
        const populatedProblems = []
        for (const pidStr of chapter.problemIds) {
            // pidStr can be "1001" or "system:1001" or a MongoID string
            let query = {}
            if (mongoose.Types.ObjectId.isValid(pidStr)) {
                query = { _id: pidStr }
            } else if (pidStr.includes(':')) {
                const [domain, docId] = pidStr.split(':')
                if (!isNaN(docId)) {
                    query = { domainId: domain, docId: Number(docId) }
                } else {
                    query = { domainId: domain, pid: docId }
                }
            } else {
                // Default to system domain or just search by docId
                if (!isNaN(pidStr)) {
                    const docId = Number(pidStr)
                    // Try system first
                    const sysDoc = await Document.findOne({ domainId: 'system', docId: docId }).select('title docId domainId')
                    if (sysDoc) {
                        populatedProblems.push(sysDoc)
                        continue
                    }
                    query = { docId: docId }
                } else {
                    // Try system first with pid
                    const sysDoc = await Document.findOne({ domainId: 'system', pid: pidStr }).select('title docId domainId')
                    if (sysDoc) {
                        populatedProblems.push(sysDoc)
                        continue
                    }
                    query = { pid: pidStr }
                }
            }
            
            const doc = await Document.findOne(query).select('title docId domainId')
            if (doc) {
                populatedProblems.push(doc)
            } else {
                populatedProblems.push({ _id: pidStr, title: `Unknown Problem (${pidStr})`, docId: pidStr, domainId: 'unknown' })
            }
        }
        populatedChapter.problemIds = populatedProblems
    }

    if (chapter.optionalProblemIds && chapter.optionalProblemIds.length > 0) {
        const populatedProblems = []
        for (const pidStr of chapter.optionalProblemIds) {
            // pidStr can be "1001" or "system:1001" or a MongoID string
            let query = {}
            if (mongoose.Types.ObjectId.isValid(pidStr)) {
                query = { _id: pidStr }
            } else if (pidStr.includes(':')) {
                const [domain, docId] = pidStr.split(':')
                if (!isNaN(docId)) {
                    query = { domainId: domain, docId: Number(docId) }
                } else {
                    query = { domainId: domain, pid: docId }
                }
            } else {
                // Default to system domain or just search by docId
                if (!isNaN(pidStr)) {
                    const docId = Number(pidStr)
                    // Try system first
                    const sysDoc = await Document.findOne({ domainId: 'system', docId: docId }).select('title docId domainId')
                    if (sysDoc) {
                        populatedProblems.push(sysDoc)
                        continue
                    }
                    query = { docId: docId }
                } else {
                    // Try system first with pid
                    const sysDoc = await Document.findOne({ domainId: 'system', pid: pidStr }).select('title docId domainId')
                    if (sysDoc) {
                        populatedProblems.push(sysDoc)
                        continue
                    }
                    query = { pid: pidStr }
                }
            }
            
            const doc = await Document.findOne(query).select('title docId domainId')
            if (doc) {
                populatedProblems.push(doc)
            } else {
                populatedProblems.push({ _id: pidStr, title: `Unknown Problem (${pidStr})`, docId: pidStr, domainId: 'unknown' })
            }
        }
        populatedChapter.optionalProblemIds = populatedProblems
    }

    await recordCourseActivity({
      userId,
      chapterId: chapter.id,
      action: 'view_chapter'
    })

    res.json(populatedChapter)

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})


// Get all course levels (structure)
router.get('/levels', async (req, res) => {
  try {
    const { subject } = req.query
    const query = {}
    if (subject) {
      if (subject === 'C++') {
        // Handle legacy data where subject might be missing
        query.$or = [{ subject: 'C++' }, { subject: { $exists: false } }]
      } else {
        query.subject = subject
      }
    }
    const levels = await CourseLevel.find(query)
      .select('-topics.chapters.content -chapters.content')
      .sort({ level: 1 })
      // .populate('topics.chapters.problemIds', 'title docId domainId') // No longer needed as we store strings
      // .populate('chapters.problemIds', 'title docId domainId') // Legacy support
    res.json(levels)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Get learners for a specific level
router.get('/level/:levelId/learners', async (req, res) => {
  try {
    const { levelId } = req.params
    const levelDoc = await CourseLevel.findById(levelId)
    if (!levelDoc) return res.status(404).json({ error: 'Level not found' })

    const subject = levelDoc.subject || 'C++'
    const levelNum = levelDoc.level

    // Collect all chapter IDs for this level to find anyone who has touched it
    const levelChapterIds = []
    const levelChapterUids = []
    
    const collectIds = (chapters) => {
        if (!chapters) return
        chapters.forEach(c => {
            if (c.id) levelChapterIds.push(c.id)
            if (c._id) levelChapterUids.push(c._id)
        })
    }

    if (levelDoc.topics) {
        levelDoc.topics.forEach(t => collectIds(t.chapters))
    }
    if (levelDoc.chapters) {
        collectIds(levelDoc.chapters)
    }

    // Construct query for users at this level
    // Criteria: 
    // 1. Current level matches (Standard path)
    // 2. OR Has completed ANY chapter in this level (Non-standard path / Skippers)
    let query = {
        $or: [
            { [`subjectLevels.${subject}`]: levelNum },
            { completedChapters: { $in: levelChapterIds } },
            { completedChapterUids: { $in: levelChapterUids } }
        ]
    }
    
    // Legacy fallbacks for C++
    if (subject === 'C++') {
        query.$or.push(
            { subjectLevels: { $exists: false }, currentLevel: levelNum },
            { [`subjectLevels.${subject}`]: { $exists: false }, currentLevel: levelNum }
        )
    }

    const progresses = await UserProgress.find(query).select('userId completedChapters completedChapterUids subjectLevels currentLevel chapterProgress')
    
    if (progresses.length === 0) return res.json([])

    // Filter out users who have already passed this level (Graduates)
    const activeProgresses = progresses.filter(p => {
        let userLevel = 1
        if (p.subjectLevels && p.subjectLevels.get) {
             userLevel = p.subjectLevels.get(subject) || 1
        } else if (p.subjectLevels && p.subjectLevels[subject]) {
             userLevel = p.subjectLevels[subject]
        } else if (subject === 'C++' && p.currentLevel) {
             userLevel = p.currentLevel
        }
        // Include if user level is <= current level (Skippers or Standard)
        // Exclude if user level > current level (Graduates)
        return userLevel <= levelNum
    })

    if (activeProgresses.length === 0) return res.json([])

    const userIds = activeProgresses.map(p => p.userId)
    const users = await User.find({ _id: { $in: userIds } }).select('uname')

    const result = users.map(u => {
        const p = activeProgresses.find(prog => prog.userId.toString() === u._id.toString())
        let completedCount = 0
      let solvedProblemCount = 0
        if (p) {
            const checkChapter = (c) => {
                if (c._id && p.completedChapterUids && p.completedChapterUids.some(uid => uid.toString() === c._id.toString())) return true
                if (c.id && p.completedChapters && p.completedChapters.includes(c.id)) return true
                return false
            }

        const addSolvedProblems = (c) => {
          const chapterData = p.chapterProgress?.get ? p.chapterProgress.get(c.id) : p.chapterProgress?.[c.id]
          if (chapterData && Array.isArray(chapterData.solvedProblems)) {
            solvedProblemCount += chapterData.solvedProblems.length
          }
        }
            
            if (levelDoc.topics) {
                levelDoc.topics.forEach(t => {
            if (t.chapters) t.chapters.forEach(c => {
              if (checkChapter(c)) completedCount++
              addSolvedProblems(c)
            })
                })
            }
            if (levelDoc.chapters) {
          levelDoc.chapters.forEach(c => {
            if (checkChapter(c)) completedCount++
            addSolvedProblems(c)
          })
            }
        }
        return {
            _id: u._id,
            uname: u.uname,
        completedCount,
        solvedProblemCount
        }
    })
    
    // Sort by solved problems first, then completed chapters
    result.sort((a, b) => (
      (b.solvedProblemCount || 0) - (a.solvedProblemCount || 0)
      || (b.completedCount || 0) - (a.completedCount || 0)
      || String(a.uname || '').localeCompare(String(b.uname || ''), 'zh-CN')
    ))

    res.json(result)

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Get learners for a specific topic
router.get('/topic/:topicId/learners', async (req, res) => {
  try {
    const { topicId } = req.params
    
    // 1. Find the topic and its chapters
    const level = await CourseLevel.findOne({ 'topics._id': topicId })
    
    if (!level) {
      return res.status(404).json({ error: 'Topic not found' })
    }
    
    const topic = level.topics.id(topicId)
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }
    
    const chapterIds = topic.chapters.map(c => c.id)
    
    if (chapterIds.length === 0) {
      return res.json([])
    }
    
    // 2. Find users who have unlocked any of these chapters
    // We fetch completedChapters/Uids to calculate progress for sorting
    const progresses = await UserProgress.find({
      unlockedChapters: { $in: chapterIds }
    }).select('userId completedChapters completedChapterUids chapterProgress')
    
    if (progresses.length === 0) {
      return res.json([])
    }

    // Calculate completed count for each user for THIS topic
    const userProgressMap = {} // userId -> { completedCount, solvedProblemCount }
    
    progresses.forEach(p => {
       let userCompletedCount = 0
       let solvedProblemCount = 0
       topic.chapters.forEach(chapter => {
           let isCompleted = false
           // Check UID
           if (chapter._id && p.completedChapterUids && p.completedChapterUids.some(uid => uid.toString() === chapter._id.toString())) {
               isCompleted = true
           } 
           // Check ID (Legacy)
           else if (p.completedChapters && p.completedChapters.includes(chapter.id)) {
               isCompleted = true
           }
           if (isCompleted) userCompletedCount++

             const chapterData = p.chapterProgress?.get ? p.chapterProgress.get(chapter.id) : p.chapterProgress?.[chapter.id]
             if (chapterData && Array.isArray(chapterData.solvedProblems)) {
               solvedProblemCount += chapterData.solvedProblems.length
             }
       })
           userProgressMap[p.userId] = {
           completedCount: userCompletedCount,
           solvedProblemCount
           }
    })
    
    const userIds = [...new Set(progresses.map(p => p.userId))] // Unique user IDs
    
    if (userIds.length === 0) {
      return res.json([])
    }
    
    // 3. Get user details
    const users = await User.find({
      _id: { $in: userIds }
    }).select('uname') // Only select uname, no avatar
    
    // 4. Attach progress and sort
    let usersWithProgress = users.map(u => {
      const userProgress = userProgressMap[u._id] || { completedCount: 0, solvedProblemCount: 0 }
        return {
            _id: u._id,
            uname: u.uname,
        completedCount: userProgress.completedCount,
        solvedProblemCount: userProgress.solvedProblemCount
        }
    })

    // Keep learners who have either completed chapters or already solved problems in this topic
    usersWithProgress = usersWithProgress.filter(u => u.completedCount > 0 || u.solvedProblemCount > 0)
    
    // Sort by solved problems first, then completed chapters
    usersWithProgress.sort((a, b) => (
      (b.solvedProblemCount || 0) - (a.solvedProblemCount || 0)
      || (b.completedCount || 0) - (a.completedCount || 0)
      || String(a.uname || '').localeCompare(String(b.uname || ''), 'zh-CN')
    ))

    res.json(usersWithProgress)
    
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

router.get('/level/:levelId/learners/:learnerId/detail', authenticateToken, async (req, res) => {
  try {
    const { levelId, learnerId } = req.params
    const learnerIdNum = Number(learnerId)
    if (!Number.isFinite(learnerIdNum)) {
      return res.status(400).json({ error: '学员 ID 不合法' })
    }

    const levelDoc = await CourseLevel.findById(levelId)
      .select('level group subject title topics._id topics.title topics.chapters._id topics.chapters.id topics.chapters.title chapters._id chapters.id chapters.title')
      .lean()
    if (!levelDoc) {
      return res.status(404).json({ error: 'Level not found' })
    }

    const chapterIds = getLevelTopics(levelDoc)
      .flatMap(topic => Array.isArray(topic.chapters) ? topic.chapters.map(chapter => chapter.id).filter(Boolean) : [])

    const windowStart = getActivityWindowStart(30)
    const [user, progress, recentActivities] = await Promise.all([
      User.findOne({ _id: learnerIdNum }).select('_id uname mail').lean(),
      UserProgress.findOne({ userId: learnerIdNum }).lean(),
      CourseActivity.find({
        userId: learnerIdNum,
        chapterId: { $in: chapterIds },
        lastActiveAt: { $gte: windowStart }
      })
        .sort({ lastActiveAt: -1 })
        .limit(20)
        .lean()
    ])

    if (!user) {
      return res.status(404).json({ error: '学员不存在' })
    }

    res.json(await buildScopedLearnerDetailPayload({
      learnerId: learnerIdNum,
      user,
      progress,
      levelDoc,
      recentActivities
    }))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || '加载学员课程详情失败' })
  }
})

router.get('/topic/:topicId/learners/:learnerId/detail', authenticateToken, async (req, res) => {
  try {
    const { topicId, learnerId } = req.params
    const learnerIdNum = Number(learnerId)
    if (!Number.isFinite(learnerIdNum)) {
      return res.status(400).json({ error: '学员 ID 不合法' })
    }

    const levelDoc = await CourseLevel.findOne({ 'topics._id': topicId })
      .select('level group subject title topics._id topics.title topics.chapters._id topics.chapters.id topics.chapters.title')
      .lean()
    if (!levelDoc) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    const topic = Array.isArray(levelDoc.topics)
      ? levelDoc.topics.find(item => String(item._id) === String(topicId))
      : null
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' })
    }

    const chapterIds = Array.isArray(topic.chapters)
      ? topic.chapters.map(chapter => chapter.id).filter(Boolean)
      : []

    const windowStart = getActivityWindowStart(30)
    const [user, progress, recentActivities] = await Promise.all([
      User.findOne({ _id: learnerIdNum }).select('_id uname mail').lean(),
      UserProgress.findOne({ userId: learnerIdNum }).lean(),
      CourseActivity.find({
        userId: learnerIdNum,
        chapterId: { $in: chapterIds },
        lastActiveAt: { $gte: windowStart }
      })
        .sort({ lastActiveAt: -1 })
        .limit(20)
        .lean()
    ])

    if (!user) {
      return res.status(404).json({ error: '学员不存在' })
    }

    res.json(await buildScopedLearnerDetailPayload({
      learnerId: learnerIdNum,
      user,
      progress,
      levelDoc,
      topic,
      recentActivities
    }))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || '加载学员课程详情失败' })
  }
})

router.get('/teacher/follows', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const payload = await buildTeacherCourseFollowPayload(Number(req.user.id))
    res.json(payload)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || '加载教师课程看板失败' })
  }
})

router.get('/teacher/follows/:learnerId/detail', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const learnerId = Number(req.params.learnerId)
    if (!Number.isFinite(learnerId)) {
      return res.status(400).json({ error: '学员 ID 不合法' })
    }

    const payload = await buildTeacherCourseLearnerDetailPayload(Number(req.user.id), learnerId)
    res.json(payload)
  } catch (e) {
    console.error(e)
    const status = e.message === '未关注该学员' || e.message === '学员不存在' ? 404 : 500
    res.status(status).json({ error: e.message || '加载学员课程详情失败' })
  }
})

// Get specific user progress (Public/Protected)
router.get('/progress/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    console.log(`[API] Fetching progress for user: ${userId}`)
    
    const progress = await UserProgress.findOne({ userId })
    
    if (!progress) {
      console.log(`[API] Progress not found for user: ${userId}`)
      return res.status(404).json({ error: 'Progress not found' })
    }

    // Ensure subjectLevels is an object for JSON response
    let subjectLevels = progress.subjectLevels
    if (subjectLevels instanceof Map) {
      subjectLevels = Object.fromEntries(subjectLevels)
    }
    // Fallback for legacy data
    if (!subjectLevels || Object.keys(subjectLevels).length === 0) {
       subjectLevels = { 'C++': progress.currentLevel || 1 }
    }

    // Convert chapterProgress Map to Object
    let chapterProgressObj = {}
    if (progress.chapterProgress) {
      if (progress.chapterProgress instanceof Map) {
        chapterProgressObj = Object.fromEntries(progress.chapterProgress)
      } else {
        chapterProgressObj = progress.chapterProgress
      }
    }

    const responseData = {
      userId: progress.userId,
      subjectLevels: subjectLevels,
      // Fix: Use completedChapters length only to avoid double counting (since we double-write ID and UID)
      completedChaptersCount: progress.completedChapters ? progress.completedChapters.length : 0,
      completedChapters: progress.completedChapters || [],
      completedChapterUids: progress.completedChapterUids || [],
      chapterProgress: chapterProgressObj
    }
    console.log(`[API] Returning progress:`, responseData)

    res.json(responseData)
  } catch (e) {
    console.error(`[API] Error fetching progress:`, e)
    res.status(500).json({ error: e.message })
  }
})

// Get user progress
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    let progress = await UserProgress.findOne({ userId })
    
    if (!progress) {
      // Initialize progress for new user
      progress = new UserProgress({ userId })
      // Initialize default subject levels
      progress.subjectLevels.set('C++', 1)
      await progress.save()
    } else {
      // Migration: Ensure subjectLevels has C++ if missing
      if (!progress.subjectLevels) {
        progress.subjectLevels = new Map()
      }
      if (!progress.subjectLevels.has('C++')) {
        progress.subjectLevels.set('C++', progress.currentLevel || 1)
        await progress.save()
      }
    }

    // Self-healing: Ensure the first chapter of the current level is unlocked for each subject
    if (progress.subjectLevels) {
      let progressChanged = false
      for (const [subject, levelNum] of progress.subjectLevels) {
        // Find the course level
        // Note: We use a loose query for C++ to handle legacy docs without subject field
        const query = { level: levelNum }
        if (subject === 'C++') {
          query.$or = [{ subject: 'C++' }, { subject: { $exists: false } }]
        } else {
          query.subject = subject
        }

        const levelDoc = await CourseLevel.findOne(query)
        if (levelDoc) {
          let chaptersToUnlock = []
          
          // Check topics first (New Structure)
          if (levelDoc.topics && levelDoc.topics.length > 0) {
             // Unlock the first chapter of EVERY topic
             for (const topic of levelDoc.topics) {
                 if (topic.chapters && topic.chapters.length > 0) {
                     chaptersToUnlock.push(topic.chapters[0])
                 }
             }
          } 
          
          // Fallback to legacy chapters if no topic chapters found
          if (chaptersToUnlock.length === 0 && levelDoc.chapters && levelDoc.chapters.length > 0) {
            chaptersToUnlock.push(levelDoc.chapters[0])
          }
          
          for (const ch of chaptersToUnlock) {
            // Check ID (Legacy)
            if (!progress.unlockedChapters.includes(ch.id)) {
              progress.unlockedChapters.push(ch.id)
              progressChanged = true
            }
            // Check UID (New)
            if (ch._id) {
              if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
              const uidStr = ch._id.toString()
              const hasUid = progress.unlockedChapterUids.some(u => u.toString() === uidStr)
              if (!hasUid) {
                progress.unlockedChapterUids.push(ch._id)
                progressChanged = true
              }
            }
          }
        }
      }
      if (progressChanged) {
        await progress.save()
      }
    }
    
    res.json(progress)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Helper to unlock next chapter
async function unlockNext(progress, currentChapterId) {
  // 1. Find Level and Location
  let level = await CourseLevel.findOne({ 'chapters.id': currentChapterId })
  let isTopic = false
  let tIdx = -1
  let cIdx = -1
  let currentChapterObj = null

  if (level) {
    cIdx = level.chapters.findIndex(c => c.id === currentChapterId)
    currentChapterObj = level.chapters[cIdx]
  } else {
    level = await CourseLevel.findOne({ 'topics.chapters.id': currentChapterId })
    if (level) {
      isTopic = true
      for (let t = 0; t < level.topics.length; t++) {
        const idx = level.topics[t].chapters.findIndex(c => c.id === currentChapterId)
        if (idx !== -1) {
          tIdx = t
          cIdx = idx
          currentChapterObj = level.topics[t].chapters[idx]
          break
        }
      }
    }
  }

  if (!level || !currentChapterObj) return

  // 2. Mark Current as Completed (UID)
  if (currentChapterObj._id) {
    if (!progress.completedChapterUids) progress.completedChapterUids = []
    const uidStr = currentChapterObj._id.toString()
    if (!progress.completedChapterUids.some(id => id.toString() === uidStr)) {
      progress.completedChapterUids.push(currentChapterObj._id)
    }
  }

  // 3. Find Next Chapter(s) to Unlock
  let loopTIdx = tIdx
  let loopCIdx = cIdx
  let loopIsTopic = isTopic
  
  const advance = () => {
    if (loopIsTopic) {
      // Try next chapter in current topic
      if (loopCIdx < level.topics[loopTIdx].chapters.length - 1) {
        loopCIdx++
        return level.topics[loopTIdx].chapters[loopCIdx]
      }
      
      // End of topic: Move to next topic's first chapter
      if (loopTIdx < level.topics.length - 1) {
          let nextT = loopTIdx + 1
          while (nextT < level.topics.length) {
              if (level.topics[nextT].chapters && level.topics[nextT].chapters.length > 0) {
                  // Update indices for the loop (though we return immediately, good for consistency)
                  loopTIdx = nextT
                  loopCIdx = 0
                  return level.topics[nextT].chapters[0]
              }
              nextT++
          }
      }
      
      return null 
    } else {
      // Legacy
      if (loopCIdx < level.chapters.length - 1) {
        loopCIdx++
        return level.chapters[loopCIdx]
      }
      return null // End of level
    }
  }

  while (true) {
    const nextChapter = advance()
    
    if (nextChapter) {
      // Unlock it
      if (!progress.unlockedChapters.includes(nextChapter.id)) {
        progress.unlockedChapters.push(nextChapter.id)
      }
      if (nextChapter._id) {
        if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
        const uidStr = nextChapter._id.toString()
        if (!progress.unlockedChapterUids.some(id => id.toString() === uidStr)) {
          progress.unlockedChapterUids.push(nextChapter._id)
        }
      }

      if (nextChapter.optional) {
        continue
      } else {
        break
      }
    } else {
      // End of Level -> Unlock Next Level
      const currentSubject = level.subject || 'C++'
      const nextLevelQuery = { level: level.level + 1 }
      if (currentSubject === 'C++') {
           nextLevelQuery.$or = [{ subject: 'C++' }, { subject: { $exists: false } }]
      } else {
           nextLevelQuery.subject = currentSubject
      }
      
      const nextLevel = await CourseLevel.findOne(nextLevelQuery)
      if (nextLevel) {
         // Update subject-specific level
         if (!progress.subjectLevels) progress.subjectLevels = new Map()
         
         const currentSubjectLevel = progress.subjectLevels.get(currentSubject) || 1
         if (currentSubjectLevel < nextLevel.level) {
           progress.subjectLevels.set(currentSubject, nextLevel.level)
           if (currentSubject === 'C++') {
             progress.currentLevel = nextLevel.level
           }
         }
         
         // Unlock first chapter(s) of next level
         let firstChapters = []
         const collect = () => {
           if (nextLevel.topics && nextLevel.topics.length > 0) {
             // Unlock first chapter of EVERY topic in the next level
             for (const topic of nextLevel.topics) {
               if (topic.chapters && topic.chapters.length > 0) {
                 firstChapters.push(topic.chapters[0])
               }
             }
           } else if (nextLevel.chapters) {
             for (const ch of nextLevel.chapters) {
               firstChapters.push(ch)
               if (!ch.optional) return
             }
           }
         }
         collect()

         for (const ch of firstChapters) {
           if (!progress.unlockedChapters.includes(ch.id)) {
             progress.unlockedChapters.push(ch.id)
           }
           if (ch._id) {
              if (!progress.unlockedChapterUids) progress.unlockedChapterUids = []
              const uidStr = ch._id.toString()
              if (!progress.unlockedChapterUids.some(id => id.toString() === uidStr)) {
                progress.unlockedChapterUids.push(ch._id)
              }
           }
         }
      }
      break
    }
  }
}

// Submit a problem solution (Simulated for now, or called by the judge system)
// In a real system, this would be triggered by the judge callback
router.post('/submit-problem', authenticateToken, async (req, res) => {
  try {
    const { chapterId, problemId, passed } = req.body
    const userId = req.user.id
    
    if (!passed) {
      return res.json({ message: 'Keep trying!' })
    }

    let progress = await UserProgress.findOne({ userId })
    if (!progress) {
      progress = new UserProgress({ userId })
    }

    // Update solved problems for this chapter
    if (!progress.chapterProgress.has(chapterId)) {
      progress.chapterProgress.set(chapterId, { solvedProblems: [] })
    }
    
    const chapterData = progress.chapterProgress.get(chapterId)
    if (!chapterData.solvedProblems.includes(problemId)) {
      chapterData.solvedProblems.push(problemId)
    }
    
    // Check if chapter is completed
    let level = await CourseLevel.findOne({ 'chapters.id': chapterId })
    let chapter = null
    
    if (level) {
      chapter = level.chapters.find(c => c.id === chapterId)
    } else {
      level = await CourseLevel.findOne({ 'topics.chapters.id': chapterId })
      if (level) {
        for (const topic of level.topics) {
          chapter = topic.chapters.find(c => c.id === chapterId)
          if (chapter) break
        }
      }
    }

    if (level && chapter) {
        // Resolve problem IDs to MongoIDs for comparison
        const requiredIds = await resolveProblemIds(chapter.problemIds)
        const solvedIds = chapterData.solvedProblems.map(id => id.toString())
        
        const allSolved = requiredIds.length > 0 && requiredIds.every(id => solvedIds.includes(id))
        
        const isCompletedLegacy = progress.completedChapters.includes(chapterId)
        let isCompletedUid = false
        if (chapter._id && progress.completedChapterUids) {
           isCompletedUid = progress.completedChapterUids.some(id => id.toString() === chapter._id.toString())
        }
        
        if (allSolved && (!isCompletedLegacy || (chapter._id && !isCompletedUid))) {
          if (!isCompletedLegacy) progress.completedChapters.push(chapterId)
          await unlockNext(progress, chapterId)
        }
    }
    
    await progress.save()
    await recordCourseActivity({
      userId,
      chapterId,
      action: 'pass_problem',
      problemId,
      metadata: { source: 'submit-problem' }
    })
    res.json({ success: true, progress })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Complete a reading/watching chapter (No problems)
router.post('/complete-chapter', authenticateToken, async (req, res) => {
  try {
    const { chapterId } = req.body
    const userId = req.user.id

    let progress = await UserProgress.findOne({ userId })
    if (!progress) {
      progress = new UserProgress({ userId })
    }

    // Verify chapter exists and has no problems (optional strictness)
    let level = await CourseLevel.findOne({ 'chapters.id': chapterId })
    let chapter = null
    
    if (level) {
      chapter = level.chapters.find(c => c.id === chapterId)
    } else {
      level = await CourseLevel.findOne({ 'topics.chapters.id': chapterId })
      if (level) {
        for (const topic of level.topics) {
          chapter = topic.chapters.find(c => c.id === chapterId)
          if (chapter) break
        }
      }
    }

    if (!level || !chapter) {
      return res.status(404).json({ error: 'Chapter not found' })
    }
    
    // Allow completion if it's not already completed
    const isCompletedLegacy = progress.completedChapters.includes(chapterId)
    let isCompletedUid = false
    if (chapter._id && progress.completedChapterUids) {
       isCompletedUid = progress.completedChapterUids.some(id => id.toString() === chapter._id.toString())
    }

    if (!isCompletedLegacy || (chapter._id && !isCompletedUid)) {
      if (!isCompletedLegacy) progress.completedChapters.push(chapterId)
      await unlockNext(progress, chapterId)
    }

    await progress.save()
    await recordCourseActivity({
      userId,
      chapterId,
      action: 'complete_chapter',
      metadata: { source: 'complete-chapter' }
    })
    res.json({ success: true, progress })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Check if a problem is passed in the real system
router.post('/check-problem', authenticateToken, async (req, res) => {
  try {
    const { chapterId, problemId } = req.body
    const userId = req.user.id

    // 1. Get Document info
    const doc = await Document.findById(problemId)
    if (!doc) return res.status(404).json({ error: 'Problem not found' })

    // 2. Check Submission
    // Assuming status 1 is Accepted (Hydro standard). 
    // We check for uid, pid (docId), and status.
    const query = { uid: userId, pid: doc.docId, status: 1 }
    if (doc.domainId) query.domainId = doc.domainId
    
    console.log('[CheckProblem] User:', userId)
    console.log('[CheckProblem] Doc:', { docId: doc.docId, domainId: doc.domainId })
    console.log('[CheckProblem] Query:', query)

    const submission = await Submission.findOne(query)
    console.log('[CheckProblem] Result:', submission ? 'Found' : 'Not Found')
    
    if (submission) {
       // Reuse logic by calling internal function or just duplicating update logic
       // Duplicating for now to avoid refactoring risk in this step
       let progress = await UserProgress.findOne({ userId })
       if (!progress) progress = new UserProgress({ userId })

       if (!progress.chapterProgress.has(chapterId)) {
         progress.chapterProgress.set(chapterId, { solvedProblems: [] })
       }
       
       const chapterData = progress.chapterProgress.get(chapterId)
       if (!chapterData.solvedProblems.includes(problemId)) {
         chapterData.solvedProblems.push(problemId)
       }
       
       // Check completion
       let level = await CourseLevel.findOne({ 'chapters.id': chapterId })
       let chapter = null
       
       if (level) {
         chapter = level.chapters.find(c => c.id === chapterId)
       } else {
         level = await CourseLevel.findOne({ 'topics.chapters.id': chapterId })
         if (level) {
           for (const topic of level.topics) {
             chapter = topic.chapters.find(c => c.id === chapterId)
             if (chapter) break
           }
         }
       }

       if (level && chapter) {
           // Resolve problem IDs to MongoIDs for comparison
           const requiredIds = await resolveProblemIds(chapter.problemIds)
           const solvedIds = chapterData.solvedProblems.map(id => id.toString())
           
           const allSolved = requiredIds.length > 0 && requiredIds.every(id => solvedIds.includes(id))
           
           const isCompletedLegacy = progress.completedChapters.includes(chapterId)
           let isCompletedUid = false
           if (chapter._id && progress.completedChapterUids) {
              isCompletedUid = progress.completedChapterUids.some(id => id.toString() === chapter._id.toString())
           }
           
           if (allSolved && (!isCompletedLegacy || (chapter._id && !isCompletedUid))) {
             if (!isCompletedLegacy) progress.completedChapters.push(chapterId)
             await unlockNext(progress, chapterId)
           }
       }
       
       await progress.save()
       await recordCourseActivity({
         userId,
         chapterId,
         action: 'pass_problem',
         problemId,
         metadata: { source: 'check-problem' }
       })
       return res.json({ passed: true, progress })
    } else {
       return res.json({ passed: false, message: '未找到 AC 提交记录' })
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

// Get user's best submission for a problem
router.get('/submission/best', authenticateToken, async (req, res) => {
  try {
    const { domainId, docId } = req.query
    const userId = req.user.id
    
    if (!docId) return res.status(400).json({ error: 'Missing docId' })

    const query = { 
        uid: userId, 
        pid: isNaN(docId) ? docId : Number(docId), 
        status: 1 // Accepted
    }
    if (domainId) query.domainId = domainId

    // Find the latest AC submission
    const submission = await Submission.findOne(query).sort({ submitAt: -1 })
    
    if (submission) {
        return res.json({ code: submission.code })
    } else {
        return res.json({ code: null })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Admin Routes ---

// Get contest/homework info and user score
// GET /api/course/contest-info?id=domain:contestId&type=homework|exam
router.get('/contest-info', authenticateToken, async (req, res) => {
  try {
    const { id, type } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })

    const colonIdx = id.indexOf(':')
    if (colonIdx === -1) return res.status(400).json({ error: 'Invalid id format, expected domain:contestId' })

    const domain = id.slice(0, colonIdx)
    const contestId = id.slice(colonIdx + 1)
    // docType: 60 = Homework, 30 = Contest/Exam
    const docType = type === 'exam' ? 30 : 60

    // Find contest document — try ObjectId first (24-char hex), then numeric docId
    let contestDoc = null
    if (mongoose.Types.ObjectId.isValid(contestId) && contestId.length === 24) {
      contestDoc = await Document.findOne({ _id: new mongoose.Types.ObjectId(contestId), domainId: domain })
    }
    if (!contestDoc) {
      const numId = Number(contestId)
      if (!isNaN(numId)) {
        contestDoc = await Document.findOne({ domainId: domain, docId: numId, docType })
      }
    }

    if (!contestDoc) {
      return res.json({ title: id, score: null, attend: false })
    }

    // Get user's contest status (score)
    const userId = req.user.id
    const docIdForStatus = contestDoc.docId
    const resolvedDocType = contestDoc.docType != null ? contestDoc.docType : docType

    const userStatus = await ContestStatus.findOne({
      domainId: domain,
      docType: resolvedDocType,
      docId: docIdForStatus,
      uid: userId
    })

    const score = userStatus?.score ?? (userStatus?.totalScore ?? null)
    const attend = !!(userStatus?.attend || userStatus?.startTime)

    res.json({
      title: contestDoc.title || id,
      score,
      attend,
    })
  } catch (e) {
    console.error('[contest-info]', e)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/course/contest-problem-counts?ids=domain:id1,domain:id2,...
// Returns { 'domain:id': N } map of problem counts (pids.length) for each contest/homework
router.get('/contest-problem-counts', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.query
    if (!ids) return res.json({})
    const idList = ids.split(',').map(s => s.trim()).filter(Boolean)
    const result = {}
    await Promise.all(idList.map(async (idStr) => {
      const colonIdx = idStr.indexOf(':')
      if (colonIdx === -1) return
      const domain = idStr.slice(0, colonIdx)
      const contestId = idStr.slice(colonIdx + 1)
      try {
        let doc = null
        if (mongoose.Types.ObjectId.isValid(contestId) && contestId.length === 24) {
          doc = await Document.findOne({ _id: new mongoose.Types.ObjectId(contestId), domainId: domain }, 'pids')
        }
        if (!doc) {
          const numId = Number(contestId)
          if (!isNaN(numId)) {
            doc = await Document.findOne({ domainId: domain, docId: numId }, 'pids')
          }
        }
        if (doc) result[idStr] = (doc.pids || []).length
      } catch { /* ignore individual errors */ }
    }))
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/course/problem-info?id=domain:pid
router.get('/problem-info', authenticateToken, async (req, res) => {
  try {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })

    let domain = 'system'
    let pid = id
    if (id.includes(':')) {
      const colonIdx = id.indexOf(':')
      domain = id.slice(0, colonIdx)
      pid = id.slice(colonIdx + 1)
    }

    let doc = null
    if (!isNaN(pid)) {
      doc = await Document.findOne({ domainId: domain, docId: Number(pid) }).select('title')
    }
    if (!doc) {
      doc = await Document.findOne({ domainId: domain, pid }).select('title')
    }

    res.json({ title: doc?.title || null })
  } catch (e) {
    console.error('[problem-info]', e)
    res.status(500).json({ error: e.message })
  }
})

// Helper to check group edit permission
async function checkGroupPermission(user, groupName) {
  if (user.role === 'admin' || user.priv === -1) return true
  if (!groupName) return true 
  
  const group = await CourseGroup.findOne({ name: groupName })
  if (!group) return true // Group doesn't exist in DB, allow edit (legacy behavior)
  
  // Check if user is in editors list
  // user.id is from JWT payload, which is user._id (Number)
  // group.editors is array of Numbers
  if (group.editors && group.editors.includes(Number(user.id))) return true
  
  return false
}

// Helper to check level edit permission
function checkLevelPermission(user, level) {
  if (user.role === 'admin' || user.priv === -1) return true
  if (!level) return false
  if (level.editors && level.editors.includes(Number(user.id))) return true
  return false
}

// Create a Level
router.post('/levels', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { level, title, description, subject, group, label, editors } = req.body
    
    if (!(await checkGroupPermission(req.user, group))) {
        return res.status(403).json({ error: 'Access denied: You are not an editor of this group.' })
    }

    const newLevel = new CourseLevel({ 
        level, 
        title, 
        description, 
        subject: subject || 'C++', 
        group, 
        label,
        editors: editors || [],
        chapters: [] 
    })
    await newLevel.save()
    res.json(newLevel)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Level
router.put('/levels/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { level, title, description, subject, group, label, editors } = req.body
    
    // Check permission for the NEW group (if changing)
    if (group && !(await checkGroupPermission(req.user, group))) {
        return res.status(403).json({ error: 'Access denied: You cannot move/edit to this group.' })
    }

    // Check permission for the OLD group or Level specific permission
    const existingLevel = await CourseLevel.findById(req.params.id)
    if (existingLevel) {
        const hasGroupPerm = existingLevel.group ? await checkGroupPermission(req.user, existingLevel.group) : true
        const hasLevelPerm = checkLevelPermission(req.user, existingLevel)
        
        if (!hasGroupPerm && !hasLevelPerm) {
            return res.status(403).json({ error: 'Access denied: You cannot edit this level.' })
        }
    }

    const updatedLevel = await CourseLevel.findByIdAndUpdate(
      req.params.id, 
      { level, title, description, subject, group, label, editors },
      { new: true }
    )
    res.json(updatedLevel)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Level
router.delete('/levels/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (level) {
        const hasGroupPerm = level.group ? await checkGroupPermission(req.user, level.group) : true
        const hasLevelPerm = checkLevelPermission(req.user, level)
        
        if (!hasGroupPerm && !hasLevelPerm) {
            return res.status(403).json({ error: 'Access denied: You cannot delete this level.' })
        }

        // Delete physical files for all topics in this level
        if (level.topics) {
            for (const topic of level.topics) {
                if (topic.chapters) {
                    for (const chapter of topic.chapters) {
                        if (chapter.resourceUrl) {
                            try {
                                const relativePath = chapter.resourceUrl.startsWith('/') ? chapter.resourceUrl.slice(1) : chapter.resourceUrl
                                const filePath = path.join(__dirname, '..', relativePath)
                                if (fs.existsSync(filePath)) {
                                    fs.unlinkSync(filePath)
                                    console.log(`[File Delete] Deleted file: ${filePath}`)
                                }
                            } catch (err) {
                                console.error(`[File Delete] Failed to delete file for chapter ${chapter.title}:`, err)
                            }
                        }
                    }
                }
            }
        }
    }
    await CourseLevel.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Move a Level
router.post('/levels/:id/move', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { direction } = req.body // 'up' or 'down'
    const currentLevel = await CourseLevel.findById(req.params.id)
    if (!currentLevel) return res.status(404).json({ error: 'Level not found' })

    const hasGroupPerm = currentLevel.group ? await checkGroupPermission(req.user, currentLevel.group) : true
    const hasLevelPerm = checkLevelPermission(req.user, currentLevel)
    
    if (!hasGroupPerm && !hasLevelPerm) {
        return res.status(403).json({ error: 'Access denied: You cannot move this level.' })
    }

    // Find all levels in the same group/subject to determine order
    // We use the same filter logic as the frontend uses to group them
    const query = {}
    if (currentLevel.group) {
        query.group = currentLevel.group
    } else {
        query.subject = currentLevel.subject
        // If no group, we might need to handle the legacy "minLevel/maxLevel" logic?
        // For simplicity, let's assume if no group, we sort by level within subject.
        // But to be safe, let's just find ALL levels for this subject and sort them.
    }

    let levels = await CourseLevel.find(query).sort({ level: 1 })
    
    // If using legacy config (e.g. C++ Basic vs Advanced), we might need to filter further?
    // But "Move" usually implies moving within the visible list.
    // If the user has defined 'group', it's easy.
    // If not, we might be moving across "Basic" and "Advanced" boundaries if we are not careful.
    // However, the user is asking for "free movement", so maybe boundaries shouldn't exist physically in DB?
    
    const currentIndex = levels.findIndex(l => l._id.toString() === currentLevel._id.toString())
    if (currentIndex === -1) return res.status(404).json({ error: 'Level not in list' })

    let swapIndex = -1
    if (direction === 'up' && currentIndex > 0) {
        swapIndex = currentIndex - 1
    } else if (direction === 'down' && currentIndex < levels.length - 1) {
        swapIndex = currentIndex + 1
    }

    if (swapIndex !== -1) {
        const otherLevel = levels[swapIndex]
        
        // Swap their 'level' values
        // We use a temp value to avoid unique index collision if any
        const tempLevel = -9999
        const val1 = currentLevel.level
        const val2 = otherLevel.level

        // Update current to temp
        await CourseLevel.findByIdAndUpdate(currentLevel._id, { level: tempLevel })
        // Update other to val1
        await CourseLevel.findByIdAndUpdate(otherLevel._id, { level: val1 })
        // Update current (from temp) to val2
        await CourseLevel.findByIdAndUpdate(currentLevel._id, { level: val2 })
    }

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Topic Management ---

// Add a Topic
router.post('/levels/:id/topics', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, description, insertIndex } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot add topics to this group.' })
    }
    
    const newTopic = { title, description, chapters: [] }

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= level.topics.length) {
      level.topics.splice(insertIndex, 0, newTopic)
    } else {
      level.topics.push(newTopic)
    }

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Topic
router.put('/levels/:id/topics/:topicId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, description } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot edit topics in this group.' })
    }

    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })
    
    topic.title = title
    topic.description = description
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Topic
router.delete('/levels/:id/topics/:topicId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot delete topics in this group.' })
    }

    // Delete physical files
    const topic = level.topics.id(req.params.topicId)
    if (topic && topic.chapters) {
      for (const chapter of topic.chapters) {
        if (chapter.resourceUrl) {
          try {
            // resourceUrl example: /public/courseware/path/to/file.html
            const relativePath = chapter.resourceUrl.startsWith('/') ? chapter.resourceUrl.slice(1) : chapter.resourceUrl
            const filePath = path.join(__dirname, '..', relativePath)
            
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath)
              console.log(`[File Delete] Deleted file: ${filePath}`)
            }
          } catch (err) {
            console.error(`[File Delete] Failed to delete file for chapter ${chapter.title}:`, err)
          }
        }
      }
    }

    level.topics.pull(req.params.topicId)
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Move a Topic
router.post('/levels/:id/topics/:topicId/move', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { direction } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot move topics in this group.' })
    }

    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })
    
    const index = level.topics.indexOf(topic)
    if (index === -1) return res.status(404).json({ error: 'Topic not found in array' })
    
    if (direction === 'up') {
      if (index > 0) {
        level.topics.splice(index, 1)
        level.topics.splice(index - 1, 0, topic)
      }
    } else if (direction === 'down') {
      if (index < level.topics.length - 1) {
        level.topics.splice(index, 1)
        level.topics.splice(index + 1, 0, topic)
      }
    }
    
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Helper to resolve problem IDs (ObjectId or domain:docId or docId)
// DEPRECATED: We now store IDs directly as strings
// async function resolveProblemIds(ids) { ... }

// --- Chapter Management (Topic Based) ---

// Add a Chapter to a Topic
router.post('/levels/:id/topics/:topicId/chapters', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id, title, content, contentType, resourceUrl, videoUrl, problemIds, optionalProblemIds, homeworkIds, examIds, optional, insertIndex } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot add chapters to this group.' })
    }

    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    // Store problemIds directly as strings
    const storedProblemIds = (problemIds || []).map(String)
    const storedOptionalProblemIds = (optionalProblemIds || []).map(String)
    
    const newChapter = { 
      id, 
      title, 
      content, 
      contentType: contentType || 'markdown',
      resourceUrl: resourceUrl || '',
      videoUrl: videoUrl || '',
      problemIds: storedProblemIds,
      optionalProblemIds: storedOptionalProblemIds,
      homeworkIds: (homeworkIds || []).map(String),
      examIds: (examIds || []).map(String),
      optional: !!optional 
    }

    let targetIndex = -1;
    if (insertIndex !== undefined && insertIndex !== null) {
        const parsed = Number(insertIndex);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= topic.chapters.length) {
            targetIndex = parsed;
        }
    }

    if (targetIndex !== -1) {
      topic.chapters.splice(targetIndex, 0, newChapter)
    } else {
      topic.chapters.push(newChapter)
    }

    // Auto-renumber chapters
    const topicIndex = level.topics.findIndex(t => t._id.equals(topic._id))
    if (topicIndex !== -1) {
        const prefix = `${level.level}-${topicIndex + 1}`
        level.topics[topicIndex].chapters.forEach((ch, idx) => {
            ch.id = `${prefix}-${idx + 1}`
        })
        level.markModified('topics');
    }

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Chapter in a Topic
router.put('/levels/:id/topics/:topicId/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, content, contentType, resourceUrl, videoUrl, problemIds, optionalProblemIds, homeworkIds, examIds, optional } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot edit chapters in this group.' })
    }

    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    const chapter = topic.chapters.id(req.params.chapterId) // Use .id() for subdocument search by _id
    
    let targetChapter = topic.chapters.id(req.params.chapterId)
    if (!targetChapter) {
       targetChapter = topic.chapters.find(c => c.id === req.params.chapterId)
    }
    
    if (!targetChapter) return res.status(404).json({ error: 'Chapter not found' })
    
    // Store problemIds directly as strings
    const storedProblemIds = (problemIds || []).map(String)
    const storedOptionalProblemIds = (optionalProblemIds || []).map(String)
    const storedHomeworkIds = (homeworkIds || []).map(String)
    const storedExamIds = (examIds || []).map(String)

    targetChapter.title = title
    targetChapter.content = content
    targetChapter.contentType = contentType || 'markdown'
    targetChapter.resourceUrl = resourceUrl || ''
    targetChapter.videoUrl = videoUrl || ''
    targetChapter.problemIds = storedProblemIds
    targetChapter.optionalProblemIds = storedOptionalProblemIds
    targetChapter.homeworkIds = storedHomeworkIds
    targetChapter.examIds = storedExamIds
    targetChapter.optional = !!optional
    
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete ALL Chapters from a Topic
router.delete('/levels/:id/topics/:topicId/chapters', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  console.log(`[DELETE ALL CHAPTERS] Request received for Level: ${req.params.id}, Topic: ${req.params.topicId}`);
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (!level) {
        console.log('[DELETE ALL CHAPTERS] Level not found');
        return res.status(404).json({ error: 'Level not found' })
    }
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot delete chapters in this group.' })
    }

    const topic = level.topics.id(req.params.topicId)
    if (!topic) {
        console.log('[DELETE ALL CHAPTERS] Topic not found');
        return res.status(404).json({ error: 'Topic not found' })
    }
    
    console.log(`[DELETE ALL CHAPTERS] Clearing ${topic.chapters.length} chapters`);
    
    // Physical File Deletion
    for (const chapter of topic.chapters) {
        if (chapter.resourceUrl) {
            try {
                const relativePath = chapter.resourceUrl.startsWith('/') ? chapter.resourceUrl.slice(1) : chapter.resourceUrl
                const filePath = path.join(__dirname, '..', relativePath)
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                    console.log(`[File Delete] Deleted file: ${filePath}`)
                }
            } catch (err) {
                console.error(`[File Delete] Failed to delete file for chapter ${chapter.title}:`, err)
            }
        }
    }

    topic.chapters = [] // Clear all chapters

    await level.save()
    console.log('[DELETE ALL CHAPTERS] Success');
    res.json(level)
  } catch (e) {
    console.error('[DELETE ALL CHAPTERS] Error:', e);
    res.status(500).json({ error: e.message })
  }
})

// Delete a Chapter from a Topic
router.delete('/levels/:id/topics/:topicId/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot delete chapters in this group.' })
    }

    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })
    
    // Try to remove by _id or id string
    let targetChapter = topic.chapters.id(req.params.chapterId)
    
    // If not found by _id, try to find by string ID
    if (!targetChapter) {
        targetChapter = topic.chapters.find(c => c.id === req.params.chapterId)
    }

    if (targetChapter) {
        // Physical File Deletion
        if (targetChapter.resourceUrl) {
            try {
                const relativePath = targetChapter.resourceUrl.startsWith('/') ? targetChapter.resourceUrl.slice(1) : targetChapter.resourceUrl
                const filePath = path.join(__dirname, '..', relativePath)
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                    console.log(`[File Delete] Deleted file: ${filePath}`)
                }
            } catch (err) {
                console.error(`[File Delete] Failed to delete file for chapter ${targetChapter.title}:`, err)
            }
        }

        // Remove from array
        if (topic.chapters.id(req.params.chapterId)) {
             topic.chapters.pull(req.params.chapterId)
        } else {
             topic.chapters = topic.chapters.filter(c => c.id !== req.params.chapterId)
        }
    } else {
        return res.status(404).json({ error: 'Chapter not found' })
    }

    // Auto-renumber chapters
    const topicIndex = level.topics.findIndex(t => t._id.equals(topic._id))
    if (topicIndex !== -1) {
        const prefix = `${level.level}-${topicIndex + 1}`
        level.topics[topicIndex].chapters.forEach((ch, idx) => {
            ch.id = `${prefix}-${idx + 1}`
        })
        level.markModified('topics');
    }

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Move a Chapter in a Topic
router.put('/levels/:id/topics/:topicId/chapters/:chapterId/move', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { direction } = req.body // 'up' or 'down'
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    if (level.group && !(await checkGroupPermission(req.user, level.group)) && !checkLevelPermission(req.user, level)) {
        return res.status(403).json({ error: 'Access denied: You cannot move chapters in this group.' })
    }

    const topic = level.topics.id(req.params.topicId)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    const chapterIndex = topic.chapters.findIndex(c => c.id === req.params.chapterId || (c._id && c._id.toString() === req.params.chapterId))
    if (chapterIndex === -1) return res.status(404).json({ error: 'Chapter not found' })

    if (direction === 'up') {
      if (chapterIndex > 0) {
        const temp = topic.chapters[chapterIndex]
        topic.chapters.splice(chapterIndex, 1)
        topic.chapters.splice(chapterIndex - 1, 0, temp)
      }
    } else if (direction === 'down') {
      if (chapterIndex < topic.chapters.length - 1) {
        const temp = topic.chapters[chapterIndex]
        topic.chapters.splice(chapterIndex, 1)
        topic.chapters.splice(chapterIndex + 1, 0, temp)
      }
    }

    // Auto-renumber chapters
    const topicIndex = level.topics.findIndex(t => t._id.equals(topic._id))
    if (topicIndex !== -1) {
        const prefix = `${level.level}-${topicIndex + 1}`
        topic.chapters.forEach((ch, idx) => {
            ch.id = `${prefix}-${idx + 1}`
        })
        level.markModified('topics');
    }

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Add a Chapter (Legacy)
router.post('/levels/:id/chapters', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { id, title, content, contentType, resourceUrl, problemIds, optionalProblemIds, optional, insertIndex } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })

    const storedProblemIds = (problemIds || []).map(String)
    const storedOptionalProblemIds = (optionalProblemIds || []).map(String)
    
    const newChapter = { 
      id, 
      title, 
      content, 
      contentType: contentType || 'markdown',
      resourceUrl: resourceUrl || '',
      problemIds: storedProblemIds,
      optionalProblemIds: storedOptionalProblemIds,
      optional: !!optional
    }

    if (typeof insertIndex === 'number' && insertIndex >= 0 && insertIndex <= level.chapters.length) {
      level.chapters.splice(insertIndex, 0, newChapter)
    } else {
      level.chapters.push(newChapter)
    }

    // Auto-renumber chapters to keep IDs consistent (e.g. 1-1, 1-2, 1-3)
    level.chapters.forEach((ch, index) => {
      ch.id = `${level.level}-${index + 1}`
    })

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update a Chapter
router.put('/levels/:id/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { title, content, contentType, resourceUrl, problemIds, optionalProblemIds, homeworkIds, examIds, optional } = req.body
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    const chapter = level.chapters.find(c => c.id === req.params.chapterId)
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' })
    
    const resolvedIds = (problemIds || []).map(String)
    const resolvedOptionalIds = (optionalProblemIds || []).map(String)
    const resolvedHomeworkIds = (homeworkIds || []).map(String)
    const resolvedExamIds = (examIds || []).map(String)

    chapter.title = title
    chapter.content = content
    chapter.contentType = contentType || 'markdown'
    chapter.resourceUrl = resourceUrl || ''
    chapter.problemIds = resolvedIds
    chapter.optionalProblemIds = resolvedOptionalIds
    chapter.homeworkIds = resolvedHomeworkIds
    chapter.examIds = resolvedExamIds
    chapter.optional = !!optional
    
    // No renumbering needed for update unless we support moving chapters (not yet)
    
    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Delete a Chapter
router.delete('/levels/:id/chapters/:chapterId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const level = await CourseLevel.findById(req.params.id)
    if (!level) return res.status(404).json({ error: 'Level not found' })
    
    level.chapters = level.chapters.filter(c => c.id !== req.params.chapterId)
    
    // Auto-renumber chapters after deletion
    level.chapters.forEach((ch, index) => {
      ch.id = `${level.level}-${index + 1}`
    })

    await level.save()
    res.json(level)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Upload generated courseware (HTML)
router.post('/upload-courseware', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { htmlContent, level, topicTitle, chapterTitle, filename, group } = req.body
    if (!htmlContent) return res.status(400).json({ error: 'Missing content' })

    let relativePath = ''
    let fullPath = ''

    // Helper to sanitize filenames
    const sanitize = (str) => str.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '')

    if (level && topicTitle && chapterTitle) {
        // New structure: /public/courseware/{group}/level{N}/{topic}/{chapter}.html
        const safeLevel = 'level' + sanitize(String(level))
        const safeTopic = sanitize(topicTitle)
        const safeChapter = sanitize(chapterTitle) + '.html'
        const safeGroup = group ? sanitize(group) : ''
        
        const baseDir = path.join(__dirname, '../public/courseware')
        let targetDir;
        
        if (safeGroup) {
            targetDir = path.join(baseDir, safeGroup, safeLevel, safeTopic)
            relativePath = `/public/courseware/${safeGroup}/${safeLevel}/${safeTopic}/${safeChapter}`
        } else {
            targetDir = path.join(baseDir, safeLevel, safeTopic)
            relativePath = `/public/courseware/${safeLevel}/${safeTopic}/${safeChapter}`
        }
        
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
        }
        
        fullPath = path.join(targetDir, safeChapter)
    } else {
        // Fallback to old behavior
        const safeFilename = (filename ? sanitize(filename) : 'generated') + '_' + Date.now() + '.html'
        const publicDir = path.join(__dirname, '../public/courseware/generated')
        
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true })
        }
    
        fullPath = path.join(publicDir, safeFilename)
        relativePath = `/public/courseware/generated/${safeFilename}`
    }

    fs.writeFileSync(fullPath, htmlContent, 'utf8')

    res.json({ url: relativePath })
  } catch (e) {
    console.error('Upload Courseware Error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Proxy endpoint for downloading external resources (CORS bypass)
router.get('/proxy', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' })
    }

    // Basic validation
    if (!url.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid URL' })
    }

    console.log(`[Proxy] Fetching: ${url}`)
    
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer'
    })

    // Forward headers
    const contentType = response.headers['content-type']
    if (contentType) res.setHeader('Content-Type', contentType)
    
    res.send(response.data)

  } catch (e) {
    console.error('Proxy Error:', e.message)
    if (e.response) {
        res.status(e.response.status).send(e.response.statusText)
    } else {
        res.status(500).json({ error: e.message })
    }
  }
})

export default router
