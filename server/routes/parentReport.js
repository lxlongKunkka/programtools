import express from 'express'
import crypto from 'crypto'
import ParentDailyShare from '../models/ParentDailyShare.js'
import TeacherQuizFollow from '../models/TeacherQuizFollow.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { buildLearnerQuizDigestPayload } from './quiz.js'
import { buildLearnerCourseDigestPayload } from './course.js'

const router = express.Router()

function getExpireAt(validDays = 7) {
  const safeDays = Math.min(Math.max(Number(validDays) || 7, 1), 30)
  const date = new Date()
  date.setDate(date.getDate() + safeDays)
  return date
}

function buildPublicUrl(req, token) {
  const origin = `${req.protocol}://${req.get('host')}`
  return `${origin}/report/${token}`
}

function formatDateLabel(value) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '暂无'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getPrimaryPracticeLevel(quiz) {
  return Array.isArray(quiz?.recentPracticeLevels) ? quiz.recentPracticeLevels[0] || null : null
}

function buildPracticeLevelSummary(quiz) {
  const level = getPrimaryPracticeLevel(quiz)
  if (!level) return ''

  const parts = [
    `最近做题主要集中在 L${level.level}`
  ]

  if (level.levelTitle) {
    parts.push(level.levelTitle)
  }

  parts.push(`共 ${level.attemptCount || 0} 题`)
  parts.push(`正确率 ${Number(level.accuracy || 0)}%`)

  if (Array.isArray(level.matchedTags) && level.matchedTags.length > 0) {
    parts.push(`主要知识点：${level.matchedTags.slice(0, 3).join('、')}`)
  }

  return parts.join('，')
}

function summarizeTodayPerformance(quiz, course) {
  const latestQuiz = Array.isArray(quiz?.recentProgress) ? quiz.recentProgress[0] : null
  const latestCourse = Array.isArray(course?.recentActivities) ? course.recentActivities[0] : null
  const practiceSummary = buildPracticeLevelSummary(quiz)

  if ((latestQuiz?.answeredCount || 0) > 0) {
    if (practiceSummary) {
      return `今天完成了 ${latestQuiz.answeredCount} 道 Quiz，答对 ${latestQuiz.correctCount} 道，当前连续打卡 ${quiz?.learner?.streak || 0} 天。${practiceSummary}。`
    }

    return `今天完成了 ${latestQuiz.answeredCount} 道 Quiz，答对 ${latestQuiz.correctCount} 道，当前连续打卡 ${quiz?.learner?.streak || 0} 天。`
  }

  if (latestCourse?.lastActiveAt) {
    if (practiceSummary) {
      return `今天主要在 Course 中学习，最近一次学习时间是 ${formatDateLabel(latestCourse.lastActiveAt)}。${practiceSummary}。`
    }

    return `今天主要在 Course 中学习，最近一次学习时间是 ${formatDateLabel(latestCourse.lastActiveAt)}。`
  }

  if (practiceSummary) {
    return `${practiceSummary}。`
  }

  return '今天暂时还没有新的学习记录，可以提醒孩子安排一个固定学习时段。'
}

function buildConcernItems(quiz, course) {
  const concerns = []
  const accuracy = Number(quiz?.learner?.accuracy || 0)
  const activeDays = Number(quiz?.learner?.activeDays || 0)
  const completionRate = Number(course?.learner?.completionRate || 0)
  const weakTags = Array.isArray(quiz?.weakTags) ? quiz.weakTags : []
  const lastActivityAt = course?.learner?.lastActivityAt || quiz?.learner?.lastAnsweredAt || null
  const primaryPracticeLevel = getPrimaryPracticeLevel(quiz)
  const currentCourseLevel = Number(course?.learner?.currentCppLevel || 0)

  if (primaryPracticeLevel?.level && currentCourseLevel && primaryPracticeLevel.level >= currentCourseLevel + 2) {
    concerns.push(`最近刷题主要集中在 L${primaryPracticeLevel.level}，但课程当前记录等级还是 L${currentCourseLevel}，存在明显错位，建议老师确认孩子是超前练习还是课程进度尚未同步。`)
  } else if (primaryPracticeLevel?.level && currentCourseLevel && primaryPracticeLevel.level > currentCourseLevel) {
    concerns.push(`最近刷题已经更多落在 L${primaryPracticeLevel.level}，高于当前课程记录的 L${currentCourseLevel}，可以留意是否需要上调课程定位。`)
  }

  if (accuracy > 0 && accuracy < 60) {
    concerns.push(`最近 Quiz 正确率只有 ${accuracy}%，建议优先回看错题。`)
  }
  if (activeDays <= 1) {
    concerns.push('最近 14 天学习活跃度偏低，需要帮助孩子恢复稳定节奏。')
  }
  if (completionRate > 0 && completionRate < 20) {
    concerns.push(`课程总完成率目前是 ${completionRate}%，整体进度还比较靠后。`)
  }
  if (weakTags.length > 0) {
    concerns.push(`最近错误较多的知识点是：${weakTags.slice(0, 3).map(item => item.tag).join('、')}。`)
  }
  if (!lastActivityAt) {
    concerns.push('最近没有检测到明确的学习轨迹，需要确认孩子是否开始使用系统。')
  }

  return concerns.slice(0, 4)
}

function buildAdviceItems(quiz, course, concerns) {
  const advice = []
  const recentAttempts = Array.isArray(quiz?.recentAttempts) ? quiz.recentAttempts : []
  const recentActivities = Array.isArray(course?.recentActivities) ? course.recentActivities : []
  const primaryPracticeLevel = getPrimaryPracticeLevel(quiz)
  const currentCourseLevel = Number(course?.learner?.currentCppLevel || 0)

  if (recentAttempts.length > 0) {
    advice.push('先陪孩子复盘最近两道错题，重点说清楚为什么错，而不是只看答案。')
  }
  if (primaryPracticeLevel?.level && primaryPracticeLevel.level > currentCourseLevel) {
    advice.push(`最近刷题已经触达到 L${primaryPracticeLevel.level}，建议优先围绕 ${primaryPracticeLevel.matchedTags?.slice(0, 2).join('、') || '当前常练知识点'} 做定向巩固，再决定是否正式上调课程等级。`)
  }
  if (recentActivities.length > 0) {
    advice.push('课程学习建议保持小步快跑，每次完成 1 节内容后再做题巩固。')
  }
  if ((course?.learner?.startedTopicCount || 0) >= 3) {
    advice.push('尽量减少同时并行的 Topic 数量，先把当前专题收尾，进度会更稳。')
  }
  if (concerns.some(item => item.includes('活跃度偏低'))) {
    advice.push('可以和孩子约定一个固定时间，比如晚饭后 20 分钟，先恢复规律性。')
  }
  if (!advice.length) {
    advice.push('整体节奏正常，建议继续保持每天固定学习和及时复盘的习惯。')
  }

  return advice.slice(0, 4)
}

function buildDailyNarrative(quiz, course) {
  const concerns = buildConcernItems(quiz, course)
  return {
    todayPerformance: summarizeTodayPerformance(quiz, course),
    recentFocus: concerns,
    teacherAdvice: buildAdviceItems(quiz, course, concerns)
  }
}

function serializeShare(req, share) {
  const expiresAt = share?.expiresAt || null
  const isExpired = !!(expiresAt && new Date(expiresAt).getTime() <= Date.now())

  return {
    token: share?.token || '',
    learnerId: Number(share?.learnerId || 0),
    publicUrl: share?.token ? buildPublicUrl(req, share.token) : '',
    isActive: !!share?.isActive && !isExpired,
    isExpired,
    createdAt: share?.createdAt || null,
    expiresAt,
    lastAccessAt: share?.lastAccessAt || null,
    accessCount: Number(share?.accessCount || 0)
  }
}

router.get('/shares', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const teacherId = Number(req.user.id)
    const shares = await ParentDailyShare.find({ teacherId }).sort({ updatedAt: -1 }).lean()
    res.json({
      items: shares.map((share) => serializeShare(req, share))
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || '加载家长日报链接失败' })
  }
})

router.post('/shares', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const teacherId = Number(req.user.id)
    const learnerId = Number(req.body?.learnerId)
    const validDays = Number(req.body?.validDays || 7)
    if (!Number.isFinite(learnerId)) {
      return res.status(400).json({ error: '学员 ID 不合法' })
    }

    const follow = await TeacherQuizFollow.findOne({ teacherId, learnerId }).lean()
    if (!follow) {
      return res.status(404).json({ error: '请先关注该学员，再生成家长日报链接' })
    }

    const token = crypto.randomBytes(18).toString('hex')
    const share = await ParentDailyShare.findOneAndUpdate(
      { teacherId, learnerId },
      {
        $set: {
          token,
          isActive: true,
          expiresAt: getExpireAt(validDays),
          lastAccessAt: null,
          accessCount: 0
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    )

    res.json(serializeShare(req, share))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || '生成家长日报链接失败' })
  }
})

router.delete('/shares/:learnerId', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const teacherId = Number(req.user.id)
    const learnerId = Number(req.params.learnerId)
    if (!Number.isFinite(learnerId)) {
      return res.status(400).json({ error: '学员 ID 不合法' })
    }

    const share = await ParentDailyShare.findOneAndUpdate(
      { teacherId, learnerId },
      { $set: { isActive: false } },
      { new: true }
    ).lean()

    if (!share) {
      return res.status(404).json({ error: '未找到可关闭的家长日报链接' })
    }

    res.json(serializeShare(req, share))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || '关闭家长日报链接失败' })
  }
})

router.get('/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim()
    if (!token) {
      return res.status(400).json({ error: '分享口令不能为空' })
    }

    const share = await ParentDailyShare.findOne({ token, isActive: true }).lean()
    if (!share) {
      return res.status(404).json({ error: '家长日报链接不存在或已失效' })
    }

    if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
      await ParentDailyShare.updateOne({ _id: share._id }, { $set: { isActive: false } })
      return res.status(410).json({ error: '家长日报链接已过期' })
    }

    const learnerId = Number(share.learnerId)
    const [quiz, course] = await Promise.all([
      buildLearnerQuizDigestPayload(learnerId, 14),
      buildLearnerCourseDigestPayload(learnerId)
    ])

    ParentDailyShare.updateOne(
      { _id: share._id },
      { $set: { lastAccessAt: new Date() }, $inc: { accessCount: 1 } }
    ).catch((error) => {
      console.error('Failed to update parent daily share stats', error)
    })

    res.json({
      share: serializeShare(req, share),
      learner: {
        learnerId,
        learnerName: quiz.learner?.learnerName || course.learner?.learnerName || `用户 ${learnerId}`
      },
      narrative: buildDailyNarrative(quiz, course),
      quiz,
      course
    })
  } catch (e) {
    console.error(e)
    const status = e.message === '学员不存在' ? 404 : 500
    res.status(status).json({ error: e.message || '加载家长日报失败' })
  }
})

export default router