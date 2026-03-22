import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import QuizQuestion from '../models/QuizQuestion.js'
import QuizAttempt from '../models/QuizAttempt.js'
import QuizDailyProgress from '../models/QuizDailyProgress.js'
import QuizFavoriteItem from '../models/QuizFavoriteItem.js'
import QuizWrongbookItem from '../models/QuizWrongbookItem.js'
import User from '../models/User.js'
import { buildDailyProgressUpdate } from '../utils/quizDailyProgress.js'
import { buildQuizCollectionFilter } from '../utils/quizCollectionFilter.js'
import { KNOWLEDGE_TAGS, normalizeQuizKnowledgeTags } from '../utils/quizKnowledgeTags.js'
import { pickQuestionByMemoryCurve } from '../utils/quizRecommendation.js'

const router = express.Router()

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

function normalizeSubmittedAnswer(answer, type) {
  const text = String(answer || '').trim()
  if (type === 'judge') return text.toLowerCase()
  return text.toUpperCase()
}

function formatLevelLabel(levelTag) {
  const text = String(levelTag || '').trim()
  if (!text) return '全部级别'
  const match = text.match(/^gesp(\d+)$/i)
  if (!match) return text
  return `GESP ${Number(match[1])} 级`
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

async function pickDailyQuestion(userId, filterInput, today, answeredQuestionUids = []) {
  const filter = buildQuestionFilter(filterInput)
  const questions = (await QuizQuestion.find(filter)
    .sort({ sourceDocId: 1, paperQuestionNo: 1 })
    .lean())
    .filter((question) => !questionLooksMalformed(question))

  if (questions.length === 0) return null

  const attemptSummaryMap = await buildAttemptSummaryMap(userId, questions.map((question) => question.questionUid))

  return pickQuestionByMemoryCurve(questions, {
    today,
    subject: filter.subject || '',
    levelTag: filter.levelTag || '',
    tag: filter.tags || '',
    type: filter.type || '',
    answeredQuestionUids,
    attemptSummaryMap
  })
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

async function sanitizeQuestionWithUserState(userId, question) {
  const payload = sanitizeQuestion(question)
  if (!payload?.questionUid) return payload
  const favorite = await QuizFavoriteItem.exists({
    userId,
    questionUid: payload.questionUid,
    active: true
  })
  return {
    ...payload,
    isFavorite: !!favorite
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
      date: entry.date
    }
  })
}

router.get('/daily/options', authenticateToken, async (req, res) => {
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

router.get('/daily/current', authenticateToken, async (req, res) => {
  try {
    const today = getTodayDate()
    const progress = await getTodayProgress(req.user.id, today)
    const skippedQuestionUids = progress?.skippedQuestionUids || []
    const excludedQuestionUids = [
      ...(progress?.questionUids || []),
      ...skippedQuestionUids
    ]
    const question = await pickDailyQuestion(req.user.id, req.query, today, excludedQuestionUids)

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
      question: await sanitizeQuestionWithUserState(req.user.id, question)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/daily/skip', authenticateToken, async (req, res) => {
  try {
    const { questionUid, subject, levelTag, tag, type } = req.body || {}
    if (!questionUid) {
      return res.status(400).json({ error: 'questionUid 为必填项' })
    }

    const today = getTodayDate()
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

    const nextQuestion = await pickDailyQuestion(
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
      question: await sanitizeQuestionWithUserState(req.user.id, nextQuestion)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/daily/submit', authenticateToken, async (req, res) => {
  try {
    const { questionUid, selectedAnswer, costMs = null, subject, levelTag, tag, type } = req.body || {}

    if (!questionUid || typeof selectedAnswer !== 'string' || !selectedAnswer.trim()) {
      return res.status(400).json({ error: 'questionUid 和 selectedAnswer 为必填项' })
    }

    const today = getTodayDate()
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
    const date = typeof req.query.date === 'string' && req.query.date.trim()
      ? req.query.date.trim()
      : getTodayDate()

    const entries = await QuizDailyProgress.find({ date, completed: true })
      .sort({ correctCount: -1, answeredCount: -1, lastAnsweredAt: 1 })
      .limit(20)
      .lean()

    const leaderboard = await enrichLeaderboard(entries)
    res.json({ date, leaderboard })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router