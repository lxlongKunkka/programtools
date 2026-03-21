import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import QuizQuestion from '../models/QuizQuestion.js'
import QuizAttempt from '../models/QuizAttempt.js'
import QuizDailyProgress from '../models/QuizDailyProgress.js'
import User from '../models/User.js'

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
  return filter
}

function hashString(value) {
  let hash = 0
  const text = String(value || '')
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
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

async function pickDailyQuestion(filterInput, today) {
  const filter = buildQuestionFilter(filterInput)
  const questions = await QuizQuestion.find(filter)
    .sort({ sourceDocId: 1, paperQuestionNo: 1 })
    .lean()

  if (questions.length === 0) return null

  const seed = `${today}|${filter.subject || ''}|${filter.levelTag || ''}|${filter.type || ''}`
  const index = hashString(seed) % questions.length
  return questions[index]
}

async function getTodayProgress(userId, today) {
  return QuizDailyProgress.findOne({ userId, date: today }).lean()
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

router.get('/daily/current', authenticateToken, async (req, res) => {
  try {
    const today = getTodayDate()
    const progress = await getTodayProgress(req.user.id, today)
    const question = await pickDailyQuestion(req.query, today)

    if (!question) {
      return res.status(404).json({ error: '题库中暂无可用客观题，请先导入题目' })
    }

    const alreadyAnswered = !!progress?.questionUids?.includes(question.questionUid)

    res.json({
      date: today,
      completed: !!progress?.completed,
      alreadyAnswered,
      progress: {
        answeredCount: progress?.answeredCount || 0,
        correctCount: progress?.correctCount || 0,
        streak: progress?.streak || 0,
        questionUids: progress?.questionUids || []
      },
      question: alreadyAnswered ? null : sanitizeQuestion(question)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/daily/submit', authenticateToken, async (req, res) => {
  try {
    const { questionUid, selectedAnswer, costMs = null, subject, levelTag, type } = req.body || {}

    if (!questionUid || typeof selectedAnswer !== 'string' || !selectedAnswer.trim()) {
      return res.status(400).json({ error: 'questionUid 和 selectedAnswer 为必填项' })
    }

    const today = getTodayDate()
    const assignedQuestion = await pickDailyQuestion({ subject, levelTag, type }, today)
    if (!assignedQuestion) {
      return res.status(404).json({ error: '题库中暂无可用客观题，请先导入题目' })
    }

    if (assignedQuestion.questionUid !== questionUid) {
      return res.status(400).json({ error: '提交的题目不是今日分配题目，请刷新后重试' })
    }

    const normalizedSelectedAnswer = normalizeSubmittedAnswer(selectedAnswer, assignedQuestion.type)
    const normalizedCorrectAnswer = normalizeSubmittedAnswer(assignedQuestion.answer, assignedQuestion.type)
    const existingProgress = await QuizDailyProgress.findOne({ userId: req.user.id, date: today })
    const existingAttempt = await QuizAttempt.findOne({
      userId: req.user.id,
      questionUid,
      sessionDate: today,
      mode: 'daily'
    }).sort({ answeredAt: -1 })

    if (existingProgress?.questionUids?.includes(questionUid) && existingAttempt) {
      return res.json({
        alreadyAnswered: true,
        correct: existingAttempt.isCorrect,
        correctAnswer: normalizedCorrectAnswer,
        explanation: assignedQuestion.explanation || '',
        completed: !!existingProgress.completed,
        progress: {
          answeredCount: existingProgress.answeredCount || 0,
          correctCount: existingProgress.correctCount || 0,
          streak: existingProgress.streak || 0,
          questionUids: existingProgress.questionUids || []
        }
      })
    }

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

    const previousDate = getPreviousDate(today)
    const previousProgress = await QuizDailyProgress.findOne({ userId: req.user.id, date: previousDate }).lean()
    const streakBase = previousProgress?.completed ? (previousProgress.streak || 0) : 0

    const updatedProgress = await QuizDailyProgress.findOneAndUpdate(
      { userId: req.user.id, date: today },
      {
        $set: {
          subject: assignedQuestion.subject || 'C++',
          source: assignedQuestion.source || 'gesp',
          completed: true,
          lastAnsweredAt: now,
          streak: Math.max(existingProgress?.streak || 0, streakBase + 1)
        },
        $setOnInsert: {
          firstAnsweredAt: now,
          answeredCount: 1,
          correctCount: isCorrect ? 1 : 0,
          questionUids: [questionUid]
        },
        $addToSet: { questionUids: questionUid },
        $inc: {
          answeredCount: existingProgress?.questionUids?.includes(questionUid) ? 0 : 1,
          correctCount: (!existingProgress?.questionUids?.includes(questionUid) && isCorrect) ? 1 : 0
        }
      },
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
        questionUids: updatedProgress.questionUids || []
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
      questionUids: progress?.questionUids || []
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
      questionUids: item.questionUids || []
    })))
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