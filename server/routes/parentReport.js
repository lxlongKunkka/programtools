import express from 'express'
import crypto from 'crypto'
import ParentDailyShare from '../models/ParentDailyShare.js'
import TeacherQuizFollow from '../models/TeacherQuizFollow.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { buildLearnerQuizDigestPayload } from './quiz.js'
import { buildLearnerCourseDigestPayload } from './course.js'

const router = express.Router()

function buildPublicUrl(req, token) {
  const origin = `${req.protocol}://${req.get('host')}`
  return `${origin}/parent-report/${token}`
}

router.post('/shares', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const teacherId = Number(req.user.id)
    const learnerId = Number(req.body?.learnerId)
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

    res.json({
      token: share.token,
      learnerId,
      publicUrl: buildPublicUrl(req, share.token),
      createdAt: share.createdAt || share.updatedAt || null
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message || '生成家长日报链接失败' })
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
      share: {
        token: share.token,
        createdAt: share.createdAt || null,
        lastAccessAt: share.lastAccessAt || null,
        accessCount: Number(share.accessCount || 0)
      },
      learner: {
        learnerId,
        learnerName: quiz.learner?.learnerName || course.learner?.learnerName || `用户 ${learnerId}`
      },
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