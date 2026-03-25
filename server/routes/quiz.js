import express from 'express'
import { authenticateToken, optionalAuthenticateToken, requireRole } from '../middleware/auth.js'
import QuizQuestion from '../models/QuizQuestion.js'
import QuizAttempt from '../models/QuizAttempt.js'
import QuizDailyProgress from '../models/QuizDailyProgress.js'
import QuizFavoriteItem from '../models/QuizFavoriteItem.js'
import QuizWrongbookItem from '../models/QuizWrongbookItem.js'
import QuizQuestionIssue, { ISSUE_TYPES } from '../models/QuizQuestionIssue.js'
import TeacherQuizFollow from '../models/TeacherQuizFollow.js'
import User from '../models/User.js'
import CourseLevel from '../models/CourseLevel.js'
import { buildDailyProgressUpdate } from '../utils/quizDailyProgress.js'
import { buildQuizCollectionFilter } from '../utils/quizCollectionFilter.js'
import { KNOWLEDGE_TAG_GROUPS, KNOWLEDGE_TAGS, KNOWLEDGE_TAG_SET, extractQuizKnowledgeTagsFromText, normalizeQuizKnowledgeTags } from '../utils/quizKnowledgeTags.js'
import { buildRecommendationReason, pickQuestionByMemoryCurve } from '../utils/quizRecommendation.js'

const router = express.Router()
const GUEST_DAILY_LIMIT = 5
const KNOWLEDGE_TAG_LEVEL_MAP = new Map()

for (const [levelTag, tags] of Object.entries(KNOWLEDGE_TAG_GROUPS)) {
  for (const tag of tags) {
    if (!KNOWLEDGE_TAG_LEVEL_MAP.has(tag)) {
      KNOWLEDGE_TAG_LEVEL_MAP.set(tag, new Set())
    }
    KNOWLEDGE_TAG_LEVEL_MAP.get(tag).add(levelTag)
  }
}

function getTodayDate() {
  const now = new Date()
  const offset = 8
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const nd = new Date(utc + (3600000 * offset))
  return nd.toISOString().split('T')[0]
}

function getPreviousDate(dateStr) {
  const date = new Date(`${dateStr}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().split('T')[0]
}

function buildQuestionFilter(input = {}) {
  const filter = { enabled: true }
  if (typeof input.subject === 'string' && input.subject.trim()) {
    filter.subject = input.subject.trim()
  }
  if (typeof input.levelTag === 'string' && input.levelTag.trim()) {
    filter.levelTag = input.levelTag.trim()
  }
  if (typeof input.type === 'string' && ['single', 'judge'].includes(input.type.trim())) {
    filter.type = input.type.trim()
  }
  const selectedTag = normalizeQuizKnowledgeTags([
    input.tag,
    input.knowledgeTag
  ])[0]
  if (selectedTag) {
    filter.tags = selectedTag
  }
  return filter
}

function sanitizeQuestion(question) {
  if (!question) return null
  return {
    questionUid: question.questionUid,
    paperUid: question.paperUid,
    paperQuestionNo: question.paperQuestionNo,
    type: question.type,
    stem: question.stem,
    options: question.options || [],
    images: question.images || [],
    tags: question.tags || [],
    levelTag: question.levelTag || '',
    subject: question.subject || 'C++',
    sourceTitle: question.sourceTitle || '',
    sourceDocId: question.sourceDocId,
    source: question.source || 'gesp'
  }
}

function buildStemPreview(value, maxLength = 180) {
  const text = String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#>*_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function normalizeIssueType(value) {
  const issueType = String(value || '').trim()
  return ISSUE_TYPES.includes(issueType) ? issueType : 'other'
}

function sanitizeIssueState(issue) {
  if (!issue) {
    return {
      reported: false,
      status: '',
      issueType: '',
      reportedAt: null,
      updatedAt: null
    }
  }

  return {
    reported: true,
    status: issue.status || 'pending',
    issueType: issue.issueType || 'other',
    reportedAt: issue.reportedAt || issue.createdAt || null,
    updatedAt: issue.updatedAt || null
  }
}

function normalizeSubmittedAnswer(answer, type) {
  const text = String(answer || '').trim()
  if (type === 'judge') return text.toLowerCase()
  return text.toUpperCase()
}

function parseQuestionUidList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  }

  if (typeof value === 'string') {
    return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))]
  }

  return []
}

function buildGuestProgressState(input = {}) {
  const questionUids = parseQuestionUidList(input.questionUids)
  const skippedQuestionUids = parseQuestionUidList(input.skippedQuestionUids)
  const answeredCountValue = Number(input.answeredCount)
  const correctCountValue = Number(input.correctCount)
  const answeredCount = Number.isFinite(answeredCountValue)
    ? Math.max(questionUids.length, Math.min(Math.max(Math.floor(answeredCountValue), 0), GUEST_DAILY_LIMIT))
    : questionUids.length
  const correctCount = Number.isFinite(correctCountValue)
    ? Math.min(Math.max(Math.floor(correctCountValue), 0), answeredCount)
    : 0

  return {
    answeredCount,
    correctCount,
    streak: 0,
    completed: answeredCount >= GUEST_DAILY_LIMIT,
    questionUids,
    skippedQuestionUids
  }
}

function formatLevelLabel(levelTag) {
  const text = String(levelTag || '').trim()
  if (!text) return '全部级别'
  const match = text.match(/^gesp(\d+)$/i)
  if (!match) return text
  return `GESP ${Number(match[1])} 级`
}

function parseLevelNumber(levelTag) {
  const text = String(levelTag || '').trim()
  const match = text.match(/^gesp(\d+)$/i)
  return match ? Number(match[1]) : null
}

function buildCourseLevelTitleMap(levelDocs = []) {
  const map = new Map()
  for (const levelDoc of Array.isArray(levelDocs) ? levelDocs : []) {
    const subject = String(levelDoc?.subject || 'C++')
    const level = Number(levelDoc?.level || 0)
    if (!level) continue
    map.set(`${subject}::${level}`, String(levelDoc?.title || ''))
  }
  return map
}

function getLevelTopics(levelDoc) {
  const topics = Array.isArray(levelDoc?.topics)
    ? levelDoc.topics.filter((topic) => Array.isArray(topic?.chapters) && topic.chapters.length > 0)
    : []

  if (topics.length > 0) return topics

  const chapters = Array.isArray(levelDoc?.chapters) ? levelDoc.chapters : []
  if (!chapters.length) return []

  return [{
    _id: `legacy-${levelDoc?._id || ''}`,
    title: '章节',
    chapters
  }]
}

function buildCourseProblemLevelMap(levelDocs = []) {
  const map = new Map()

  const registerRef = (rawRef, context) => {
    const text = String(rawRef || '').trim()
    if (!text) return

    let key = ''
    if (text.includes(':')) {
      const [domainId, docIdText] = text.split(':')
      if (!/^\d+$/.test(docIdText || '')) return
      key = `${domainId || 'system'}::${Number(docIdText)}`
    } else {
      if (!/^\d+$/.test(text)) return
      key = `*::${Number(text)}`
    }

    if (!map.has(key)) {
      map.set(key, context)
    }
  }

  for (const levelDoc of Array.isArray(levelDocs) ? levelDocs : []) {
    const level = Number(levelDoc?.level || 0)
    if (!level) continue

    const context = {
      levelTag: `gesp${level}`,
      level,
      levelTitle: String(levelDoc?.title || ''),
      subject: String(levelDoc?.subject || 'C++')
    }

    for (const topic of getLevelTopics(levelDoc)) {
      for (const chapter of Array.isArray(topic?.chapters) ? topic.chapters : []) {
        for (const rawRef of Array.isArray(chapter?.problemIds) ? chapter.problemIds : []) {
          registerRef(rawRef, context)
        }
        for (const rawRef of Array.isArray(chapter?.optionalProblemIds) ? chapter.optionalProblemIds : []) {
          registerRef(rawRef, context)
        }
      }
    }
  }

  return map
}

function buildRecentPracticeLevels(attempts = [], questionMap = new Map(), courseLevelTitleMap = new Map(), courseProblemLevelMap = new Map()) {
  const items = Array.isArray(attempts) ? attempts : []
  const aggregates = new Map()

  const resolveQuestionKnowledgeTags = (question, attempt) => {
    const explicitTags = normalizeQuizKnowledgeTags([
      ...(Array.isArray(question?.tags) ? question.tags : []),
      ...(Array.isArray(attempt?.tags) ? attempt.tags : [])
    ])
    if (explicitTags.length) return explicitTags

    return extractQuizKnowledgeTagsFromText(
      question?.stemText,
      question?.stem,
      question?.explanationText,
      question?.explanation,
      question?.sourceTitle,
      attempt?.stemPreview
    )
  }

  const pickPrimaryLevelTag = (question, tags = []) => {
    const sourceDomainId = String(question?.sourceDomainId || question?.source || 'gesp')
    const sourceDocId = Number(question?.sourceDocId)
    const mappedCourseLevelTag = Number.isFinite(sourceDocId)
      ? (courseProblemLevelMap.get(`${sourceDomainId}::${sourceDocId}`)?.levelTag || courseProblemLevelMap.get(`*::${sourceDocId}`)?.levelTag || '')
      : ''
    if (parseLevelNumber(mappedCourseLevelTag)) {
      return mappedCourseLevelTag
    }

    const directLevelTag = String(question?.levelTag || '').trim()
    const matchedCounts = new Map()
    for (const tag of tags) {
      for (const levelTag of KNOWLEDGE_TAG_LEVEL_MAP.get(tag) || []) {
        matchedCounts.set(levelTag, Number(matchedCounts.get(levelTag) || 0) + 1)
      }
    }

    const rankedLevels = [...matchedCounts.entries()]
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return (parseLevelNumber(a[0]) || 0) - (parseLevelNumber(b[0]) || 0)
      })

    if (!parseLevelNumber(directLevelTag)) {
      return rankedLevels[0]?.[0] || ''
    }

    if (!rankedLevels.length) {
      return directLevelTag
    }

    const [topLevelTag, topCount] = rankedLevels[0]
    const directCount = Number(matchedCounts.get(directLevelTag) || 0)

    // If knowledge tags clearly point to another level, trust tags over source paper level.
    if (topLevelTag && topLevelTag !== directLevelTag) {
      if (directCount === 0 && topCount > 0) return topLevelTag
      if (topCount >= 2 && topCount > directCount) return topLevelTag
    }

    return directLevelTag
  }

  for (const attempt of items) {
    const question = questionMap.get(attempt?.questionUid)
    const normalizedTags = resolveQuestionKnowledgeTags(question, attempt)
    const levelTag = pickPrimaryLevelTag(question, normalizedTags)
    const level = parseLevelNumber(levelTag)
    if (!levelTag || !level) continue

    const subject = String(question?.subject || 'C++')
    const key = `${subject}::${levelTag}`
    const answeredAt = new Date(attempt?.answeredAt || 0).getTime()
    const matchedTags = normalizedTags.filter((tag) => KNOWLEDGE_TAG_LEVEL_MAP.get(tag)?.has(levelTag))

    if (!aggregates.has(key)) {
      aggregates.set(key, {
        levelTag,
        level,
        label: formatLevelLabel(levelTag),
        levelTitle: courseLevelTitleMap.get(`${subject}::${level}`) || '',
        subject,
        attemptCount: 0,
        correctCount: 0,
        lastAnsweredAt: 0,
        matchedTagCounts: new Map()
      })
    }

    const summary = aggregates.get(key)
    summary.attemptCount += 1
    if (attempt?.isCorrect) summary.correctCount += 1
    if (Number.isFinite(answeredAt) && answeredAt > summary.lastAnsweredAt) {
      summary.lastAnsweredAt = answeredAt
    }

    for (const tag of matchedTags.length ? matchedTags : normalizedTags.slice(0, 2)) {
      summary.matchedTagCounts.set(tag, Number(summary.matchedTagCounts.get(tag) || 0) + 1)
    }
  }

  return [...aggregates.values()]
    .sort((a, b) => {
      if (b.attemptCount !== a.attemptCount) return b.attemptCount - a.attemptCount
      if (b.lastAnsweredAt !== a.lastAnsweredAt) return b.lastAnsweredAt - a.lastAnsweredAt
      return a.level - b.level
    })
    .slice(0, 3)
    .map((item) => ({
      levelTag: item.levelTag,
      level: item.level,
      label: item.label,
      levelTitle: item.levelTitle,
      subject: item.subject,
      attemptCount: item.attemptCount,
      correctCount: item.correctCount,
      accuracy: item.attemptCount > 0 ? Number(((item.correctCount / item.attemptCount) * 100).toFixed(1)) : 0,
      lastAnsweredAt: item.lastAnsweredAt ? new Date(item.lastAnsweredAt).toISOString() : null,
      matchedTags: [...item.matchedTagCounts.entries()]
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1]
          return a[0].localeCompare(b[0], 'zh-CN')
        })
        .slice(0, 4)
        .map(([tag]) => tag)
    }))
}

function getWindowStart(days = 7) {
  const safeDays = Math.min(Math.max(Number(days) || 7, 1), 90)
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - (safeDays - 1))
  return date
}

function buildLearnerRiskFlags(summary = {}) {
  const flags = []
  if (!summary.lastAnsweredAt) {
    flags.push('从未参与')
    return flags
  }

  const daysSinceLastActive = Math.floor((Date.now() - new Date(summary.lastAnsweredAt).getTime()) / 86400000)
  if (daysSinceLastActive >= 3) flags.push('连续未参与')
  if ((summary.answeredCount || 0) < 3) flags.push('参与偏低')
  if ((summary.answeredCount || 0) > 0 && (summary.accuracy || 0) < 60) flags.push('正确率偏低')
  if ((summary.wrongbookActiveCount || 0) >= 5) flags.push('错题堆积')
  return flags
}

async function buildTeacherQuizFollowPayload(teacherId, days = 7) {
  const follows = await TeacherQuizFollow.find({ teacherId }).sort({ createdAt: -1 }).lean()
  const learnerIds = follows.map((item) => Number(item.learnerId)).filter(Number.isFinite)
  if (!learnerIds.length) {
    return {
      summary: {
        followedCount: 0,
        activeLearnerCount: 0,
        activeTodayCount: 0,
        averageAccuracy: 0,
        averageAnsweredCount: 0
      },
      items: []
    }
  }

  const windowStart = getWindowStart(days)
  const today = getTodayDate()

  const [users, attemptStats, latestProgressEntries, todayProgressEntries, wrongbookStats, favoriteStats] = await Promise.all([
    User.find({ _id: { $in: learnerIds } }).select('_id uname mail').lean(),
    QuizAttempt.aggregate([
      {
        $match: {
          userId: { $in: learnerIds },
          answeredAt: { $gte: windowStart }
        }
      },
      {
        $group: {
          _id: '$userId',
          answeredCount: { $sum: 1 },
          correctCount: {
            $sum: {
              $cond: [{ $eq: ['$isCorrect', true] }, 1, 0]
            }
          },
          activeDates: { $addToSet: '$sessionDate' },
          lastAnsweredAt: { $max: '$answeredAt' }
        }
      }
    ]),
    QuizDailyProgress.aggregate([
      { $match: { userId: { $in: learnerIds } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$userId',
          streak: { $first: '$streak' },
          lastProgressDate: { $first: '$date' },
          lastProgressAnsweredCount: { $first: '$answeredCount' },
          lastProgressCorrectCount: { $first: '$correctCount' },
          lastProgressCompleted: { $first: '$completed' }
        }
      }
    ]),
    QuizDailyProgress.find({ userId: { $in: learnerIds }, date: today })
      .select('userId answeredCount correctCount completed lastAnsweredAt')
      .lean(),
    QuizWrongbookItem.aggregate([
      { $match: { userId: { $in: learnerIds }, active: true } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]),
    QuizFavoriteItem.aggregate([
      { $match: { userId: { $in: learnerIds }, active: true } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ])
  ])

  const userMap = new Map(users.map((item) => [Number(item._id), item]))
  const attemptMap = new Map(attemptStats.map((item) => [Number(item._id), item]))
  const latestProgressMap = new Map(latestProgressEntries.map((item) => [Number(item._id), item]))
  const todayProgressMap = new Map(todayProgressEntries.map((item) => [Number(item.userId), item]))
  const wrongbookMap = new Map(wrongbookStats.map((item) => [Number(item._id), Number(item.count || 0)]))
  const favoriteMap = new Map(favoriteStats.map((item) => [Number(item._id), Number(item.count || 0)]))

  const items = follows.map((follow) => {
    const learnerId = Number(follow.learnerId)
    const user = userMap.get(learnerId)
    const attempts = attemptMap.get(learnerId)
    const latestProgress = latestProgressMap.get(learnerId)
    const todayProgress = todayProgressMap.get(learnerId)
    const answeredCount = Number(attempts?.answeredCount || 0)
    const correctCount = Number(attempts?.correctCount || 0)
    const accuracy = answeredCount > 0 ? Number(((correctCount / answeredCount) * 100).toFixed(1)) : 0
    const activeDays = Array.isArray(attempts?.activeDates)
      ? attempts.activeDates.filter((item) => item).length
      : 0

    const summary = {
      learnerId,
      learnerName: user?.uname || `用户 ${learnerId}`,
      learnerEmail: user?.mail || '',
      note: follow.note || '',
      followedAt: follow.createdAt || null,
      answeredCount,
      correctCount,
      accuracy,
      activeDays,
      lastAnsweredAt: attempts?.lastAnsweredAt || todayProgress?.lastAnsweredAt || null,
      todayAnsweredCount: Number(todayProgress?.answeredCount || 0),
      todayCorrectCount: Number(todayProgress?.correctCount || 0),
      todayCompleted: !!todayProgress?.completed,
      streak: Number(latestProgress?.streak || 0),
      wrongbookActiveCount: wrongbookMap.get(learnerId) || 0,
      favoriteActiveCount: favoriteMap.get(learnerId) || 0
    }

    return {
      ...summary,
      riskFlags: buildLearnerRiskFlags(summary)
    }
  })

  const followedCount = items.length
  const activeLearnerCount = items.filter((item) => item.answeredCount > 0).length
  const activeTodayCount = items.filter((item) => item.todayAnsweredCount > 0).length
  const averageAccuracy = followedCount > 0
    ? Number((items.reduce((sum, item) => sum + item.accuracy, 0) / followedCount).toFixed(1))
    : 0
  const averageAnsweredCount = followedCount > 0
    ? Number((items.reduce((sum, item) => sum + item.answeredCount, 0) / followedCount).toFixed(1))
    : 0

  return {
    summary: {
      followedCount,
      activeLearnerCount,
      activeTodayCount,
      averageAccuracy,
      averageAnsweredCount
    },
    items
  }
}

export async function buildLearnerQuizDigestPayload(learnerId, days = 14) {
  const user = await User.findOne({ _id: learnerId }).select('_id uname mail').lean()
  if (!user) {
    throw new Error('学员不存在')
  }

  const windowDays = Math.min(Math.max(Number(days) || 14, 1), 30)
  const windowStart = getWindowStart(windowDays)
  const [attempts, wrongbookCount, favoriteCount, weakTags, recentProgress, attemptStats, practicedTags, recentWrongTags, courseLevels] = await Promise.all([
    QuizAttempt.find({ userId: learnerId }).sort({ answeredAt: -1 }).limit(30).lean(),
    QuizWrongbookItem.countDocuments({ userId: learnerId, active: true }),
    QuizFavoriteItem.countDocuments({ userId: learnerId, active: true }),
    QuizAttempt.aggregate([
      {
        $match: {
          userId: learnerId,
          isCorrect: false,
          answeredAt: { $gte: windowStart }
        }
      },
      { $unwind: '$tags' },
      { $match: { tags: { $exists: true, $ne: '' } } },
      { $group: { _id: '$tags', wrongCount: { $sum: 1 } } },
      { $sort: { wrongCount: -1, _id: 1 } },
      { $limit: 8 }
    ]),
    QuizDailyProgress.find({ userId: learnerId })
      .sort({ date: -1 })
      .limit(windowDays)
      .lean(),
    QuizAttempt.aggregate([
      {
        $match: {
          userId: learnerId,
          answeredAt: { $gte: windowStart }
        }
      },
      {
        $group: {
          _id: '$userId',
          answeredCount: { $sum: 1 },
          correctCount: {
            $sum: {
              $cond: [{ $eq: ['$isCorrect', true] }, 1, 0]
            }
          },
          activeDates: { $addToSet: '$sessionDate' },
          lastAnsweredAt: { $max: '$answeredAt' }
        }
      }
    ]),
    QuizAttempt.aggregate([
      {
        $match: {
          userId: learnerId,
          answeredAt: { $gte: windowStart }
        }
      },
      { $unwind: '$tags' },
      { $match: { tags: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$tags',
          attemptCount: { $sum: 1 },
          correctCount: {
            $sum: {
              $cond: [{ $eq: ['$isCorrect', true] }, 1, 0]
            }
          }
        }
      },
      { $sort: { attemptCount: -1, correctCount: -1, _id: 1 } },
      { $limit: 10 }
    ]),
    QuizWrongbookItem.aggregate([
      {
        $match: {
          userId: learnerId,
          createdAt: { $gte: windowStart }
        }
      },
      { $unwind: '$tags' },
      { $match: { tags: { $exists: true, $ne: '' } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 3 }
    ]),
    CourseLevel.find({ subject: 'C++' }).select('level title subject topics.chapters.problemIds topics.chapters.optionalProblemIds chapters.problemIds chapters.optionalProblemIds').lean()
  ])

  const latestProgress = recentProgress[0] || null
  const stats = attemptStats[0] || null
  const answeredCount = Number(stats?.answeredCount || 0)
  const correctCount = Number(stats?.correctCount || 0)
  const accuracy = answeredCount > 0 ? Number(((correctCount / answeredCount) * 100).toFixed(1)) : 0
  const activeDays = Array.isArray(stats?.activeDates) ? stats.activeDates.filter(Boolean).length : 0

  const questionUids = [...new Set(attempts.map((item) => item.questionUid).filter(Boolean))]
  const questions = await QuizQuestion.find(
    { questionUid: { $in: questionUids } },
    'questionUid stem stemText explanation explanationText source sourceDomainId sourceDocId sourceTitle paperQuestionNo levelTag tags answer type subject'
  ).lean()
  const questionMap = new Map(questions.map((item) => [item.questionUid, item]))
  const courseLevelTitleMap = buildCourseLevelTitleMap(courseLevels)
  const courseProblemLevelMap = buildCourseProblemLevelMap(courseLevels)
  const recentAttemptsInWindow = attempts.filter((item) => {
    const answeredAt = new Date(item?.answeredAt || 0)
    return !Number.isNaN(answeredAt.getTime()) && answeredAt >= windowStart
  })
  const recentPracticeLevels = buildRecentPracticeLevels(recentAttemptsInWindow, questionMap, courseLevelTitleMap, courseProblemLevelMap)

  return {
    learner: {
      learnerId,
      learnerName: user.uname,
      learnerEmail: user.mail || '',
      answeredCount,
      correctCount,
      accuracy,
      activeDays,
      streak: Number(latestProgress?.streak || 0),
      lastAnsweredAt: stats?.lastAnsweredAt || latestProgress?.lastAnsweredAt || null,
      wrongbookActiveCount: wrongbookCount,
      favoriteActiveCount: favoriteCount
    },
    recentProgress: recentProgress.map((item) => ({
      date: item.date,
      answeredCount: item.answeredCount || 0,
      correctCount: item.correctCount || 0,
      streak: item.streak || 0,
      completed: !!item.completed,
      lastAnsweredAt: item.lastAnsweredAt || null
    })),
    recentAttempts: attempts.map((item) => {
      const question = questionMap.get(item.questionUid)
      return {
        questionUid: item.questionUid,
        answeredAt: item.answeredAt,
        selectedAnswer: item.selectedAnswer,
        isCorrect: !!item.isCorrect,
        mode: item.mode || 'practice',
        sourceTitle: question?.sourceTitle || '',
        paperQuestionNo: question?.paperQuestionNo || null,
        levelTag: question?.levelTag || '',
        tags: question?.tags || [],
        stemPreview: buildStemPreview(question?.stem || ''),
        correctAnswer: question ? normalizeSubmittedAnswer(question.answer, question.type) : ''
      }
    }),
    practicedTags: practicedTags.map((item) => {
      const attemptCount = Number(item.attemptCount || 0)
      const correctCount = Number(item.correctCount || 0)
      return {
        tag: item._id,
        attemptCount,
        correctCount,
        wrongCount: Math.max(attemptCount - correctCount, 0),
        accuracy: attemptCount > 0 ? Number(((correctCount / attemptCount) * 100).toFixed(1)) : 0
      }
    }),
    recentPracticeLevels,
    recentWrongTags: recentWrongTags.map((item) => ({
      tag: item._id,
      count: Number(item.count || 0)
    })),
    weakTags: weakTags.map((item) => ({
      tag: item._id,
      wrongCount: item.wrongCount
    }))
  }
}

async function buildTeacherLearnerDetailPayload(teacherId, learnerId, days = 14) {
  const follow = await TeacherQuizFollow.findOne({ teacherId, learnerId }).lean()
  if (!follow) {
    throw new Error('未关注该学员')
  }

  const digest = await buildLearnerQuizDigestPayload(learnerId, days)

  return {
    learner: {
      ...digest.learner,
      followedAt: follow.createdAt || null,
      note: follow.note || ''
    },
    recentProgress: digest.recentProgress,
    recentAttempts: digest.recentAttempts,
    weakTags: digest.weakTags
  }
}

function questionLooksMalformed(question) {
  const rawStem = String(question?.stem || '')
  if (!rawStem) return true
  const stem = rawStem.normalize('NFKC')

  const mentionsCode = /(?:下列|下方|下面).{0,8}(?:C\+\+)?代码|代码执行后|代码运行后|有关下列C\+\+代码/.test(stem)
  const hasCodeSignals = /```|`[^`]+`|cout\s*<<?|cin\s*>>?|if\s*\(|for\s*\(|while\s*\(|main\s*\(|int\s+[a-zA-Z_]|\{|\}|;/.test(stem)

  return mentionsCode && !hasCodeSignals
}

async function buildAttemptSummaryMap(userId, questionUids = []) {
  if (!userId || !questionUids.length) return new Map()

  const summaries = await QuizAttempt.aggregate([
    {
      $match: {
        userId,
        questionUid: { $in: questionUids }
      }
    },
    { $sort: { answeredAt: -1 } },
    {
      $group: {
        _id: '$questionUid',
        lastAttemptAt: { $first: '$answeredAt' },
        lastIsCorrect: { $first: '$isCorrect' },
        totalAttempts: { $sum: 1 },
        totalCorrect: {
          $sum: {
            $cond: [{ $eq: ['$isCorrect', true] }, 1, 0]
          }
        },
        totalWrong: {
          $sum: {
            $cond: [{ $eq: ['$isCorrect', false] }, 1, 0]
          }
        },
        lastCorrectAt: {
          $max: {
            $cond: [{ $eq: ['$isCorrect', true] }, '$answeredAt', null]
          }
        },
        lastWrongAt: {
          $max: {
            $cond: [{ $eq: ['$isCorrect', false] }, '$answeredAt', null]
          }
        }
      }
    }
  ])

  return new Map(summaries.map((item) => [item._id, item]))
}

async function buildTagSummaryMap(userId, tags = []) {
  const normalizedTags = [...new Set((Array.isArray(tags) ? tags : []).filter((tag) => KNOWLEDGE_TAG_SET.has(tag)))]
  if (!userId || normalizedTags.length === 0) return new Map()

  const summaries = await QuizAttempt.aggregate([
    {
      $match: {
        userId,
        tags: { $in: normalizedTags }
      }
    },
    { $sort: { answeredAt: -1 } },
    { $unwind: '$tags' },
    {
      $match: {
        tags: { $in: normalizedTags }
      }
    },
    {
      $group: {
        _id: '$tags',
        lastAttemptAt: { $first: '$answeredAt' },
        lastIsCorrect: { $first: '$isCorrect' },
        totalAttempts: { $sum: 1 },
        totalCorrect: {
          $sum: {
            $cond: [{ $eq: ['$isCorrect', true] }, 1, 0]
          }
        },
        totalWrong: {
          $sum: {
            $cond: [{ $eq: ['$isCorrect', false] }, 1, 0]
          }
        },
        lastCorrectAt: {
          $max: {
            $cond: [{ $eq: ['$isCorrect', true] }, '$answeredAt', null]
          }
        },
        lastWrongAt: {
          $max: {
            $cond: [{ $eq: ['$isCorrect', false] }, '$answeredAt', null]
          }
        }
      }
    }
  ])

  return new Map(summaries.map((item) => [item._id, item]))
}

async function getDailyQuestionSelection(userId, filterInput, today, answeredQuestionUids = []) {
  const filter = buildQuestionFilter(filterInput)
  const questions = (await QuizQuestion.find(filter)
    .sort({ sourceDocId: 1, paperQuestionNo: 1 })
    .lean())
    .filter((question) => !questionLooksMalformed(question))

  if (questions.length === 0) {
    return {
      question: null,
      recommendationReason: null
    }
  }

  const attemptSummaryMap = await buildAttemptSummaryMap(userId, questions.map((question) => question.questionUid))
  const candidateTags = [...new Set(questions.flatMap((question) => Array.isArray(question.tags) ? question.tags : []))]
  const tagSummaryMap = await buildTagSummaryMap(userId, candidateTags)

  const question = pickQuestionByMemoryCurve(questions, {
    today,
    subject: filter.subject || '',
    levelTag: filter.levelTag || '',
    tag: filter.tags || '',
    type: filter.type || '',
    answeredQuestionUids,
    attemptSummaryMap,
    tagSummaryMap
  })

  return {
    question,
    recommendationReason: question
      ? buildRecommendationReason(question, {
        today,
        attemptSummary: attemptSummaryMap.get(question.questionUid) || null,
        tagSummaryMap
      })
      : null
  }
}

async function pickDailyQuestion(userId, filterInput, today, answeredQuestionUids = []) {
  const selection = await getDailyQuestionSelection(userId, filterInput, today, answeredQuestionUids)
  return selection.question
}

async function getTodayProgress(userId, today) {
  return QuizDailyProgress.findOne({ userId, date: today }).lean()
}

function buildWrongbookFilter(userId, input = {}) {
  return buildQuizCollectionFilter(userId, input)
}

function buildFavoriteFilter(userId, input = {}) {
  return buildQuizCollectionFilter(userId, input)
}

async function markWrongbookState(question, {
  userId,
  selectedAnswer,
  isCorrect,
  answeredAt,
  incrementWrongCount = true
} = {}) {
  if (!question?.questionUid) return

  if (isCorrect) {
    await QuizWrongbookItem.updateOne(
      { userId, questionUid: question.questionUid },
      {
        $set: {
          active: false,
          resolvedAt: answeredAt,
          removedAt: null,
          paperUid: question.paperUid || '',
          source: question.source || 'gesp',
          sourceTitle: question.sourceTitle || '',
          subject: question.subject || 'C++',
          levelTag: question.levelTag || '',
          tags: question.tags || [],
          type: question.type || 'single'
        }
      },
      { upsert: false }
    )
    return
  }

  const update = {
    $set: {
      active: true,
      paperUid: question.paperUid || '',
      source: question.source || 'gesp',
      sourceTitle: question.sourceTitle || '',
      subject: question.subject || 'C++',
      levelTag: question.levelTag || '',
      tags: question.tags || [],
      type: question.type || 'single',
      lastWrongAnswer: selectedAnswer,
      lastWrongAt: answeredAt,
      resolvedAt: null,
      removedAt: null
    }
  }

  if (incrementWrongCount) {
    update.$inc = { wrongCount: 1 }
  }

  await QuizWrongbookItem.updateOne(
    { userId, questionUid: question.questionUid },
    update,
    { upsert: true }
  )
}

async function seedWrongbookItems(userId) {
  const activeCount = await QuizWrongbookItem.countDocuments({ userId, active: true })
  if (activeCount > 0) return

  const latestWrongAttempts = await QuizAttempt.aggregate([
    { $match: { userId } },
    { $sort: { answeredAt: -1 } },
    { $group: { _id: '$questionUid', latestAttempt: { $first: '$$ROOT' } } },
    { $match: { 'latestAttempt.isCorrect': false } },
    { $limit: 100 }
  ])

  if (!latestWrongAttempts.length) return

  const questionUids = latestWrongAttempts.map((item) => item._id)
  const questions = await QuizQuestion.find({ questionUid: { $in: questionUids } }).lean()
  const questionMap = new Map(questions.map((item) => [item.questionUid, item]))

  const ops = latestWrongAttempts
    .map((item) => {
      const question = questionMap.get(item._id)
      if (!question) return null
      return {
        updateOne: {
          filter: { userId, questionUid: item._id },
          update: {
            $setOnInsert: {
              userId,
              questionUid: item._id,
              paperUid: question.paperUid || '',
              source: question.source || 'gesp',
              sourceTitle: question.sourceTitle || '',
              subject: question.subject || 'C++',
              levelTag: question.levelTag || '',
              tags: question.tags || [],
              type: question.type || 'single',
              active: true,
              wrongCount: 1,
              lastWrongAnswer: item.latestAttempt.selectedAnswer || '',
              lastWrongAt: item.latestAttempt.answeredAt,
              resolvedAt: null,
              removedAt: null
            }
          },
          upsert: true
        }
      }
    })
    .filter(Boolean)

  if (ops.length > 0) {
    await QuizWrongbookItem.bulkWrite(ops, { ordered: false })
  }
}

async function getQuestionFavoriteMap(userId, questionUids = []) {
  if (!questionUids.length) return new Map()
  const items = await QuizFavoriteItem.find({
    userId,
    active: true,
    questionUid: { $in: questionUids }
  }).lean()
  return new Map(items.map((item) => [item.questionUid, true]))
}

async function sanitizeQuestionWithUserState(userId, question, extra = {}) {
  const payload = sanitizeQuestion(question)
  if (!payload?.questionUid) return payload
  if (!userId) {
    return {
      ...payload,
      isFavorite: false,
      recommendationReason: extra.recommendationReason || null
    }
  }
  const favorite = await QuizFavoriteItem.exists({
    userId,
    questionUid: payload.questionUid,
    active: true
  })
  return {
    ...payload,
    isFavorite: !!favorite,
    recommendationReason: extra.recommendationReason || null
  }
}

async function toggleFavoriteQuestion(userId, questionUid, active) {
  const question = await QuizQuestion.findOne({ questionUid, enabled: true }).lean()
  if (!question) {
    throw new Error('题目不存在')
  }

  if (active) {
    await QuizFavoriteItem.findOneAndUpdate(
      { userId, questionUid },
      {
        $set: {
          active: true,
          paperUid: question.paperUid || '',
          source: question.source || 'gesp',
          sourceTitle: question.sourceTitle || '',
          subject: question.subject || 'C++',
          levelTag: question.levelTag || '',
          tags: question.tags || [],
          type: question.type || 'single',
          lastCollectedAt: new Date(),
          removedAt: null
        },
        $setOnInsert: {
          userId,
          questionUid
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  } else {
    await QuizFavoriteItem.findOneAndUpdate(
      { userId, questionUid },
      {
        $set: {
          active: false,
          removedAt: new Date()
        },
        $setOnInsert: {
          userId,
          questionUid,
          source: question.source || 'gesp'
        }
      },
      { upsert: true, setDefaultsOnInsert: true }
    )
  }

  return question
}

async function enrichLeaderboard(entries) {
  if (!entries.length) return []
  const userIds = [...new Set(entries.map((item) => item.userId))]
  const users = await User.find({ _id: { $in: userIds } }, 'uname avatar').lean()
  const userMap = new Map(users.map((user) => [user._id, user]))

  return entries.map((entry) => {
    const user = userMap.get(entry.userId)
    return {
      userId: entry.userId,
      uname: user?.uname || `User ${entry.userId}`,
      avatar: user?.avatar || null,
      answeredCount: entry.answeredCount || 0,
      correctCount: entry.correctCount || 0,
      streak: entry.streak || 0,
      completed: !!entry.completed,
      date: entry.date || '',
      accuracy: typeof entry.accuracy === 'number' ? entry.accuracy : null,
      activeDays: typeof entry.activeDays === 'number' ? entry.activeDays : null,
      firstAnsweredAt: entry.firstAnsweredAt || null,
      lastAnsweredAt: entry.lastAnsweredAt || null
    }
  })
}

router.get('/daily/options', optionalAuthenticateToken, async (req, res) => {
  try {
    const baseMatch = { enabled: true }
    const levels = await QuizQuestion.aggregate([
      { $match: { ...baseMatch, levelTag: { $exists: true, $ne: '' } } },
      { $group: { _id: '$levelTag', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    const knowledgeCounts = await QuizQuestion.aggregate([
      { $match: { ...baseMatch, tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $match: { tags: { $in: KNOWLEDGE_TAGS } } },
      { $group: { _id: '$tags', count: { $sum: 1 } } }
    ])
    const knowledgeCountMap = new Map(knowledgeCounts.map((item) => [item._id, item.count]))

    res.json({
      levels: levels.map((item) => ({
        value: item._id,
        label: formatLevelLabel(item._id),
        count: item.count
      })),
      knowledgeTags: KNOWLEDGE_TAGS
        .filter((tag) => knowledgeCountMap.has(tag))
        .map((tag) => ({
          value: tag,
          label: tag,
          count: knowledgeCountMap.get(tag)
        }))
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/daily/current', optionalAuthenticateToken, async (req, res) => {
  try {
    const today = getTodayDate()
    if (!req.user?.id) {
      const guestProgress = buildGuestProgressState(req.query)
      if (guestProgress.completed) {
        return res.json({
          date: today,
          guest: true,
          completed: true,
          alreadyAnswered: false,
          progress: guestProgress,
          question: null
        })
      }

      const excludedQuestionUids = [
        ...guestProgress.questionUids,
        ...guestProgress.skippedQuestionUids
      ]
      const selection = await getDailyQuestionSelection(null, req.query, today, excludedQuestionUids)
      const question = selection.question

      if (!question && excludedQuestionUids.length === 0) {
        return res.status(404).json({ error: '题库中暂无可用客观题，请先导入题目' })
      }

      return res.json({
        date: today,
        guest: true,
        completed: guestProgress.completed,
        alreadyAnswered: false,
        progress: guestProgress,
        question: await sanitizeQuestionWithUserState(null, question, {
          recommendationReason: selection.recommendationReason
        })
      })
    }

    const progress = await getTodayProgress(req.user.id, today)
    const skippedQuestionUids = progress?.skippedQuestionUids || []
    const excludedQuestionUids = [
      ...(progress?.questionUids || []),
      ...skippedQuestionUids
    ]
    const selection = await getDailyQuestionSelection(req.user.id, req.query, today, excludedQuestionUids)
    const question = selection.question

    if (!question && excludedQuestionUids.length === 0) {
      return res.status(404).json({ error: '题库中暂无可用客观题，请先导入题目' })
    }

    res.json({
      date: today,
      completed: !!progress?.completed,
      alreadyAnswered: false,
      progress: {
        answeredCount: progress?.answeredCount || 0,
        correctCount: progress?.correctCount || 0,
        streak: progress?.streak || 0,
        questionUids: progress?.questionUids || [],
        skippedQuestionUids
      },
      question: await sanitizeQuestionWithUserState(req.user.id, question, {
        recommendationReason: selection.recommendationReason
      })
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/daily/skip', optionalAuthenticateToken, async (req, res) => {
  try {
    const { questionUid, subject, levelTag, tag, type } = req.body || {}
    if (!questionUid) {
      return res.status(400).json({ error: 'questionUid 为必填项' })
    }

    const today = getTodayDate()
    if (!req.user?.id) {
      const guestProgress = buildGuestProgressState(req.body)
      if (guestProgress.completed) {
        return res.status(403).json({ error: '游客今日 5 题体验已完成，请登录后继续' })
      }

      const excludedQuestionUids = [
        ...guestProgress.questionUids,
        ...guestProgress.skippedQuestionUids
      ]
      const assignedQuestion = await pickDailyQuestion(null, { subject, levelTag, tag, type }, today, excludedQuestionUids)

      if (!assignedQuestion) {
        return res.status(400).json({ error: '当前筛选下已经没有可跳过的题目了' })
      }

      if (assignedQuestion.questionUid !== questionUid) {
        return res.status(400).json({ error: '当前题目已变化，请刷新后重试' })
      }

      const skippedQuestionUids = [...new Set([...guestProgress.skippedQuestionUids, questionUid])]
      const nextSelection = await getDailyQuestionSelection(
        null,
        { subject, levelTag, tag, type },
        today,
        [...guestProgress.questionUids, ...skippedQuestionUids]
      )

      return res.json({
        success: true,
        guest: true,
        skippedQuestionUids,
        question: await sanitizeQuestionWithUserState(null, nextSelection.question, {
          recommendationReason: nextSelection.recommendationReason
        })
      })
    }

    const existingProgress = await QuizDailyProgress.findOne({ userId: req.user.id, date: today }).lean()
    const excludedQuestionUids = [
      ...(existingProgress?.questionUids || []),
      ...(existingProgress?.skippedQuestionUids || [])
    ]
    const assignedQuestion = await pickDailyQuestion(req.user.id, { subject, levelTag, tag, type }, today, excludedQuestionUids)

    if (!assignedQuestion) {
      return res.status(400).json({ error: '当前筛选下已经没有可跳过的题目了' })
    }

    if (assignedQuestion.questionUid !== questionUid) {
      return res.status(400).json({ error: '当前题目已变化，请刷新后重试' })
    }

    const updatedProgress = await QuizDailyProgress.findOneAndUpdate(
      { userId: req.user.id, date: today },
      {
        $setOnInsert: {
          userId: req.user.id,
          date: today,
          subject: assignedQuestion.subject || 'C++',
          source: assignedQuestion.source || 'gesp'
        },
        $addToSet: {
          skippedQuestionUids: questionUid
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean()

    const nextSelection = await getDailyQuestionSelection(
      req.user.id,
      { subject, levelTag, tag, type },
      today,
      [
        ...(updatedProgress?.questionUids || []),
        ...(updatedProgress?.skippedQuestionUids || [])
      ]
    )

    res.json({
      success: true,
      skippedQuestionUids: updatedProgress?.skippedQuestionUids || [],
      question: await sanitizeQuestionWithUserState(req.user.id, nextSelection.question, {
        recommendationReason: nextSelection.recommendationReason
      })
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/daily/submit', optionalAuthenticateToken, async (req, res) => {
  try {
    const { questionUid, selectedAnswer, costMs = null, subject, levelTag, tag, type } = req.body || {}

    if (!questionUid || typeof selectedAnswer !== 'string' || !selectedAnswer.trim()) {
      return res.status(400).json({ error: 'questionUid 和 selectedAnswer 为必填项' })
    }

    const today = getTodayDate()
    if (!req.user?.id) {
      const guestProgress = buildGuestProgressState(req.body)
      if (guestProgress.completed && !guestProgress.questionUids.includes(questionUid)) {
        return res.status(403).json({ error: '游客今日 5 题体验已完成，请登录后继续' })
      }

      const question = await QuizQuestion.findOne({ questionUid, enabled: true }).lean()

      if (!question) {
        return res.status(404).json({ error: '题目不存在' })
      }

      const normalizedSelectedAnswer = normalizeSubmittedAnswer(selectedAnswer, question.type)
      const normalizedCorrectAnswer = normalizeSubmittedAnswer(question.answer, question.type)
      const isCorrect = normalizedSelectedAnswer === normalizedCorrectAnswer
      const alreadyAnswered = guestProgress.questionUids.includes(questionUid)
      const questionUids = alreadyAnswered
        ? guestProgress.questionUids
        : [...guestProgress.questionUids, questionUid]
      const answeredCount = Math.min(questionUids.length, GUEST_DAILY_LIMIT)
      const correctCount = alreadyAnswered
        ? guestProgress.correctCount
        : guestProgress.correctCount + (isCorrect ? 1 : 0)

      return res.json({
        guest: true,
        alreadyAnswered,
        correct: isCorrect,
        correctAnswer: normalizedCorrectAnswer,
        explanation: question.explanation || '',
        completed: answeredCount >= GUEST_DAILY_LIMIT,
        progress: {
          answeredCount,
          correctCount,
          streak: 0,
          questionUids,
          skippedQuestionUids: guestProgress.skippedQuestionUids || []
        }
      })
    }

    const existingProgress = await QuizDailyProgress.findOne({ userId: req.user.id, date: today })
    const answeredQuestion = await QuizQuestion.findOne({ questionUid }).lean()
    const existingAttempt = await QuizAttempt.findOne({
      userId: req.user.id,
      questionUid,
      sessionDate: today,
      mode: 'daily'
    }).sort({ answeredAt: -1 })

    if (existingProgress?.questionUids?.includes(questionUid) && existingAttempt) {
      const answeredType = answeredQuestion?.type || 'single'
      return res.json({
        alreadyAnswered: true,
        correct: existingAttempt.isCorrect,
        correctAnswer: normalizeSubmittedAnswer(answeredQuestion?.answer, answeredType),
        explanation: answeredQuestion?.explanation || '',
        completed: !!existingProgress.completed,
        progress: {
          answeredCount: existingProgress.answeredCount || 0,
          correctCount: existingProgress.correctCount || 0,
          streak: existingProgress.streak || 0,
          questionUids: existingProgress.questionUids || [],
          skippedQuestionUids: existingProgress.skippedQuestionUids || []
        }
      })
    }

    const excludedQuestionUids = [
      ...(existingProgress?.questionUids || []),
      ...(existingProgress?.skippedQuestionUids || [])
    ]

    const assignedQuestion = await pickDailyQuestion(req.user.id, { subject, levelTag, tag, type }, today, excludedQuestionUids)
    if (!assignedQuestion && excludedQuestionUids.length === 0) {
      return res.status(404).json({ error: '题库中暂无可用客观题，请先导入题目' })
    }

    if (!assignedQuestion) {
      return res.status(400).json({ error: '今天可做的题目已经全部完成，请明天再来' })
    }

    if (assignedQuestion.questionUid !== questionUid) {
      return res.status(400).json({ error: '提交的题目不是当前分配题目，请刷新后重试' })
    }

    const normalizedSelectedAnswer = normalizeSubmittedAnswer(selectedAnswer, assignedQuestion.type)
    const normalizedCorrectAnswer = normalizeSubmittedAnswer(assignedQuestion.answer, assignedQuestion.type)

    const isCorrect = normalizedSelectedAnswer === normalizedCorrectAnswer
    const now = new Date()
    const attemptUid = `daily-${req.user.id}-${today}-${questionUid}`

    await QuizAttempt.findOneAndUpdate(
      { attemptUid },
      {
        $set: {
          userId: req.user.id,
          questionUid,
          paperUid: assignedQuestion.paperUid,
          selectedAnswer: normalizedSelectedAnswer,
          isCorrect,
          answeredAt: now,
          costMs,
          mode: 'daily',
          sessionDate: today,
          subject: assignedQuestion.subject || 'C++',
          levelTag: assignedQuestion.levelTag || '',
          tags: assignedQuestion.tags || [],
          source: assignedQuestion.source || 'gesp'
        },
        $setOnInsert: { createdAt: now }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    await markWrongbookState(assignedQuestion, {
      userId: req.user.id,
      selectedAnswer: normalizedSelectedAnswer,
      isCorrect,
      answeredAt: now
    })

    const previousDate = getPreviousDate(today)
    const previousProgress = await QuizDailyProgress.findOne({ userId: req.user.id, date: previousDate }).lean()
    const streakBase = previousProgress?.completed ? (previousProgress.streak || 0) : 0
    const progressUpdate = buildDailyProgressUpdate({
      existingProgress,
      assignedQuestion,
      now,
      questionUid,
      isCorrect,
      streakBase
    })

    const updatedProgress = await QuizDailyProgress.findOneAndUpdate(
      { userId: req.user.id, date: today },
      progressUpdate,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean()

    const totalAttempts = Number(assignedQuestion.stats?.totalAttempts || 0) + 1
    const totalCorrect = Number(assignedQuestion.stats?.totalCorrect || 0) + (isCorrect ? 1 : 0)
    const totalWrong = Number(assignedQuestion.stats?.totalWrong || 0) + (isCorrect ? 0 : 1)
    const accuracy = totalAttempts > 0 ? Number((totalCorrect / totalAttempts).toFixed(4)) : 0

    await QuizQuestion.updateOne(
      { questionUid },
      {
        $set: {
          'stats.totalAttempts': totalAttempts,
          'stats.totalCorrect': totalCorrect,
          'stats.totalWrong': totalWrong,
          'stats.accuracy': accuracy
        }
      }
    )

    res.json({
      alreadyAnswered: false,
      correct: isCorrect,
      correctAnswer: normalizedCorrectAnswer,
      explanation: assignedQuestion.explanation || '',
      completed: !!updatedProgress.completed,
      progress: {
        answeredCount: updatedProgress.answeredCount || 0,
        correctCount: updatedProgress.correctCount || 0,
        streak: updatedProgress.streak || 0,
        questionUids: updatedProgress.questionUids || [],
        skippedQuestionUids: updatedProgress.skippedQuestionUids || []
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/daily/progress', authenticateToken, async (req, res) => {
  try {
    const today = getTodayDate()
    const progress = await getTodayProgress(req.user.id, today)
    res.json({
      date: today,
      answeredCount: progress?.answeredCount || 0,
      correctCount: progress?.correctCount || 0,
      streak: progress?.streak || 0,
      completed: !!progress?.completed,
      firstAnsweredAt: progress?.firstAnsweredAt || null,
      lastAnsweredAt: progress?.lastAnsweredAt || null,
      questionUids: progress?.questionUids || [],
      skippedQuestionUids: progress?.skippedQuestionUids || []
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/daily/history', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 7, 1), 30)
    const history = await QuizDailyProgress.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(limit)
      .lean()

    res.json(history.map((item) => ({
      date: item.date,
      answeredCount: item.answeredCount || 0,
      correctCount: item.correctCount || 0,
      streak: item.streak || 0,
      completed: !!item.completed,
      questionUids: item.questionUids || [],
      skippedQuestionUids: item.skippedQuestionUids || []
    })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/daily/wrongbook', authenticateToken, async (req, res) => {
  try {
    await seedWrongbookItems(req.user.id)
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
    const wrongbookFilter = buildWrongbookFilter(req.user.id, req.query)
    const items = await QuizWrongbookItem.find(wrongbookFilter)
      .sort({ lastWrongAt: -1 })
      .limit(limit)
      .lean()

    const questionUids = items.map((item) => item.questionUid)
    const questions = await QuizQuestion.find({ questionUid: { $in: questionUids } }).lean()
    const questionMap = new Map(questions.map((item) => [item.questionUid, item]))

    res.json({
      items: items.map((item) => {
        const question = questionMap.get(item.questionUid)
        if (!question) return null

        return {
          questionUid: question.questionUid,
          sourceTitle: question.sourceTitle || '',
          levelTag: question.levelTag || '',
          tags: question.tags || [],
          type: question.type,
          stem: question.stem,
          options: question.options || [],
          correctAnswer: normalizeSubmittedAnswer(question.answer, question.type),
          selectedAnswer: item.lastWrongAnswer,
          answeredAt: item.lastWrongAt,
          wrongCount: item.wrongCount || 0,
          paperQuestionNo: question.paperQuestionNo
        }
      }).filter(Boolean)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/daily/favorites', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)
    const favoriteFilter = buildFavoriteFilter(req.user.id, req.query)
    const items = await QuizFavoriteItem.find(favoriteFilter)
      .sort({ lastCollectedAt: -1 })
      .limit(limit)
      .lean()

    const questionUids = items.map((item) => item.questionUid)
    const questions = await QuizQuestion.find({ questionUid: { $in: questionUids } }).lean()
    const questionMap = new Map(questions.map((item) => [item.questionUid, item]))

    res.json({
      items: items.map((item) => {
        const question = questionMap.get(item.questionUid)
        if (!question) return null

        return {
          questionUid: question.questionUid,
          sourceTitle: question.sourceTitle || '',
          levelTag: question.levelTag || '',
          tags: question.tags || [],
          type: question.type,
          stem: question.stem,
          options: question.options || [],
          collectedAt: item.lastCollectedAt,
          paperQuestionNo: question.paperQuestionNo
        }
      }).filter(Boolean)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/favorites/toggle', authenticateToken, async (req, res) => {
  try {
    const { questionUid, active } = req.body || {}
    if (!questionUid || typeof active !== 'boolean') {
      return res.status(400).json({ error: 'questionUid 和 active 为必填项' })
    }

    const question = await toggleFavoriteQuestion(req.user.id, questionUid, active)

    res.json({
      success: true,
      active,
      question: sanitizeQuestion(question)
    })
  } catch (e) {
    const status = e.message === '题目不存在' ? 404 : 500
    res.status(status).json({ error: e.message })
  }
})

router.get('/issues/:questionUid/state', authenticateToken, async (req, res) => {
  try {
    const questionUid = String(req.params.questionUid || '').trim()
    if (!questionUid) {
      return res.status(400).json({ error: 'questionUid 为必填项' })
    }

    const issue = await QuizQuestionIssue.findOne({
      userId: req.user.id,
      questionUid
    }).lean()

    res.json({ issue: sanitizeIssueState(issue) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/issues', authenticateToken, async (req, res) => {
  try {
    const questionUid = String(req.body?.questionUid || '').trim()
    const detail = String(req.body?.detail || '').trim()
    const issueType = normalizeIssueType(req.body?.issueType)

    if (!questionUid) {
      return res.status(400).json({ error: 'questionUid 为必填项' })
    }

    if (detail.length > 300) {
      return res.status(400).json({ error: '补充说明不能超过 300 个字符' })
    }

    const question = await QuizQuestion.findOne({ questionUid }).lean()
    if (!question) {
      return res.status(404).json({ error: '题目不存在' })
    }

    const now = new Date()
    const issue = await QuizQuestionIssue.findOneAndUpdate(
      { userId: req.user.id, questionUid },
      {
        $set: {
          reporterName: req.user.username || '',
          questionUid,
          paperUid: question.paperUid || '',
          source: question.source || 'gesp',
          sourceTitle: question.sourceTitle || '',
          sourceDocId: question.sourceDocId ?? null,
          paperQuestionNo: question.paperQuestionNo ?? null,
          subject: question.subject || 'C++',
          levelTag: question.levelTag || '',
          tags: question.tags || [],
          type: question.type || 'single',
          stemPreview: buildStemPreview(question.stemText || question.stem),
          issueType,
          detail,
          status: 'pending',
          adminNote: '',
          reportedAt: now,
          handledAt: null,
          handledBy: null,
          handledByName: ''
        },
        $setOnInsert: {
          userId: req.user.id
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean()

    res.json({
      success: true,
      issue: sanitizeIssueState(issue)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/favorite/submit', authenticateToken, async (req, res) => {
  try {
    const { questionUid, selectedAnswer, costMs = null } = req.body || {}
    if (!questionUid || typeof selectedAnswer !== 'string' || !selectedAnswer.trim()) {
      return res.status(400).json({ error: 'questionUid 和 selectedAnswer 为必填项' })
    }

    const question = await QuizQuestion.findOne({ questionUid, enabled: true }).lean()
    if (!question) {
      return res.status(404).json({ error: '题目不存在' })
    }

    const normalizedSelectedAnswer = normalizeSubmittedAnswer(selectedAnswer, question.type)
    const normalizedCorrectAnswer = normalizeSubmittedAnswer(question.answer, question.type)
    const isCorrect = normalizedSelectedAnswer === normalizedCorrectAnswer
    const now = new Date()

    await QuizAttempt.create({
      attemptUid: `favorite-${req.user.id}-${questionUid}-${now.getTime()}`,
      userId: req.user.id,
      questionUid,
      paperUid: question.paperUid,
      selectedAnswer: normalizedSelectedAnswer,
      isCorrect,
      answeredAt: now,
      costMs,
      mode: 'practice',
      sessionDate: getTodayDate(),
      subject: question.subject || 'C++',
      levelTag: question.levelTag || '',
      tags: question.tags || [],
      source: question.source || 'gesp'
    })

    await markWrongbookState(question, {
      userId: req.user.id,
      selectedAnswer: normalizedSelectedAnswer,
      isCorrect,
      answeredAt: now
    })

    res.json({
      correct: isCorrect,
      correctAnswer: normalizedCorrectAnswer,
      explanation: question.explanation || ''
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/wrongbook/submit', authenticateToken, async (req, res) => {
  try {
    const { questionUid, selectedAnswer, costMs = null } = req.body || {}
    if (!questionUid || typeof selectedAnswer !== 'string' || !selectedAnswer.trim()) {
      return res.status(400).json({ error: 'questionUid 和 selectedAnswer 为必填项' })
    }

    const question = await QuizQuestion.findOne({ questionUid, enabled: true }).lean()
    if (!question) {
      return res.status(404).json({ error: '题目不存在' })
    }

    const normalizedSelectedAnswer = normalizeSubmittedAnswer(selectedAnswer, question.type)
    const normalizedCorrectAnswer = normalizeSubmittedAnswer(question.answer, question.type)
    const isCorrect = normalizedSelectedAnswer === normalizedCorrectAnswer
    const now = new Date()

    await QuizAttempt.create({
      attemptUid: `wrongbook-${req.user.id}-${questionUid}-${now.getTime()}`,
      userId: req.user.id,
      questionUid,
      paperUid: question.paperUid,
      selectedAnswer: normalizedSelectedAnswer,
      isCorrect,
      answeredAt: now,
      costMs,
      mode: 'wrongbook',
      sessionDate: getTodayDate(),
      subject: question.subject || 'C++',
      levelTag: question.levelTag || '',
      tags: question.tags || [],
      source: question.source || 'gesp'
    })

    await markWrongbookState(question, {
      userId: req.user.id,
      selectedAnswer: normalizedSelectedAnswer,
      isCorrect,
      answeredAt: now
    })

    res.json({
      correct: isCorrect,
      correctAnswer: normalizedCorrectAnswer,
      explanation: question.explanation || '',
      removed: !!isCorrect
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/wrongbook/remove', authenticateToken, async (req, res) => {
  try {
    const { questionUid } = req.body || {}
    if (!questionUid) {
      return res.status(400).json({ error: 'questionUid 为必填项' })
    }

    await QuizWrongbookItem.findOneAndUpdate(
      { userId: req.user.id, questionUid },
      {
        $set: {
          active: false,
          removedAt: new Date()
        },
        $setOnInsert: {
          userId: req.user.id,
          questionUid,
          source: 'gesp'
        }
      },
      { upsert: true }
    )

    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/daily/leaderboard', authenticateToken, async (req, res) => {
  try {
    const scope = String(req.query.scope || 'today').trim().toLowerCase()

    if (scope === 'overall') {
      const entries = await QuizAttempt.aggregate([
        {
          $group: {
            _id: '$userId',
            answeredCount: { $sum: 1 },
            correctCount: {
              $sum: {
                $cond: [{ $eq: ['$isCorrect', true] }, 1, 0]
              }
            },
            activeDates: { $addToSet: '$sessionDate' },
            firstAnsweredAt: { $min: '$answeredAt' },
            lastAnsweredAt: { $max: '$answeredAt' }
          }
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            answeredCount: 1,
            correctCount: 1,
            activeDays: {
              $size: {
                $filter: {
                  input: '$activeDates',
                  as: 'date',
                  cond: { $and: [{ $ne: ['$$date', null] }, { $ne: ['$$date', ''] }] }
                }
              }
            },
            accuracy: {
              $cond: [
                { $gt: ['$answeredCount', 0] },
                { $round: [{ $multiply: [{ $divide: ['$correctCount', '$answeredCount'] }, 100] }, 1] },
                0
              ]
            },
            firstAnsweredAt: 1,
            lastAnsweredAt: 1
          }
        },
        { $sort: { answeredCount: -1, correctCount: -1, accuracy: -1, firstAnsweredAt: 1, userId: 1 } },
        { $limit: 20 }
      ])

      const leaderboard = await enrichLeaderboard(entries)
      return res.json({ scope: 'overall', leaderboard })
    }

    const date = typeof req.query.date === 'string' && req.query.date.trim()
      ? req.query.date.trim()
      : getTodayDate()

    const entries = await QuizDailyProgress.find({ date, completed: true })
      .sort({ correctCount: -1, answeredCount: -1, lastAnsweredAt: 1 })
      .limit(20)
      .lean()

    const leaderboard = await enrichLeaderboard(entries)
    res.json({ scope: 'today', date, leaderboard })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/teacher/follows', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90)
    const payload = await buildTeacherQuizFollowPayload(Number(req.user.id), days)
    res.json({ days, ...payload })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/teacher/follows', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const learnerId = Number(req.body?.learnerId)
    const note = String(req.body?.note || '').trim()
    if (!Number.isFinite(learnerId) || learnerId <= 0) {
      return res.status(400).json({ error: 'learnerId 不合法' })
    }
    if (learnerId === Number(req.user.id)) {
      return res.status(400).json({ error: '不能关注自己' })
    }

    const learner = await User.findOne({ _id: learnerId }).select('_id uname role priv').lean()
    if (!learner) {
      return res.status(404).json({ error: '学员不存在' })
    }
    if (learner.role === 'teacher' || learner.role === 'admin' || learner.priv === -1) {
      return res.status(400).json({ error: '只能关注普通学员' })
    }

    const follow = await TeacherQuizFollow.findOneAndUpdate(
      { teacherId: Number(req.user.id), learnerId },
      { $setOnInsert: { note } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean()

    res.json({
      success: true,
      item: {
        learnerId,
        learnerName: learner.uname,
        followedAt: follow.createdAt || null,
        note: follow.note || ''
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/teacher/follows/:learnerId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const learnerId = Number(req.params.learnerId)
    if (!Number.isFinite(learnerId) || learnerId <= 0) {
      return res.status(400).json({ error: 'learnerId 不合法' })
    }

    await TeacherQuizFollow.deleteOne({ teacherId: Number(req.user.id), learnerId })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/teacher/follows/:learnerId/detail', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const learnerId = Number(req.params.learnerId)
    const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 30)
    if (!Number.isFinite(learnerId) || learnerId <= 0) {
      return res.status(400).json({ error: 'learnerId 不合法' })
    }

    const payload = await buildTeacherLearnerDetailPayload(Number(req.user.id), learnerId, days)
    res.json({ days, ...payload })
  } catch (e) {
    const status = e.message === '未关注该学员' || e.message === '学员不存在' ? 404 : 500
    res.status(status).json({ error: e.message })
  }
})

export default router