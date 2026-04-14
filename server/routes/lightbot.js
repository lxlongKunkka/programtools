import express from 'express'
import LightbotLevelOverride from '../models/LightbotLevelOverride.js'
import { authenticateToken } from '../middleware/auth.js'
import { LIGHTBOT_LEVELS, VALID_LEVEL_IDS } from '../../src/data/lightbotLevels.js'

const router = express.Router()

function normalizeTip(tip) {
  return {
    title: String(tip?.title || '').trim().slice(0, 80),
    copy: String(tip?.copy || '').trim().slice(0, 240)
  }
}

function normalizeOperationList(list) {
  if (!Array.isArray(list)) return []
  return list.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 40)
}

function normalizeBoard(board) {
  if (!Array.isArray(board) || !board.length) {
    throw new Error('关卡地图不能为空')
  }

  return board.map((row) => {
    if (!Array.isArray(row)) {
      throw new Error('关卡地图格式不正确')
    }

    return row.map((cell) => {
      if (!cell) return null
      return {
        h: Math.max(1, Math.min(8, Number(cell.h) || 1)),
        target: Boolean(cell.target)
      }
    })
  })
}

function normalizeLightbotLevel(level) {
  if (!level || typeof level !== 'object') {
    throw new Error('缺少关卡数据')
  }

  const levelId = String(level.id || '').trim()
  if (!VALID_LEVEL_IDS.has(levelId)) {
    throw new Error('只能覆盖现有内置关卡')
  }

  const originalLevel = LIGHTBOT_LEVELS.find((item) => item.id === levelId)
  if (!originalLevel) {
    throw new Error('关卡不存在')
  }

  const board = normalizeBoard(level.board)
  const start = {
    x: Math.max(0, Number(level.start?.x) || 0),
    y: Math.max(0, Number(level.start?.y) || 0),
    dir: ['forward', 'right', 'backward', 'left'].includes(level.start?.dir) ? level.start.dir : originalLevel.start.dir
  }

  if (!board[start.y]?.[start.x]) {
    throw new Error('起点必须落在平台上')
  }

  const hasTarget = board.some((row) => row.some((cell) => cell?.target))
  if (!hasTarget) {
    throw new Error('至少需要一个目标格')
  }

  return {
    levelId,
    chapterId: String(level.chapterId || originalLevel.chapterId || '').trim() || originalLevel.chapterId,
    chapterTitle: String(level.chapterTitle || originalLevel.chapterTitle || '').trim() || originalLevel.chapterTitle,
    chapterOrder: Number.isFinite(level.chapterOrder) ? level.chapterOrder : originalLevel.chapterOrder,
    title: String(level.title || originalLevel.title).trim().slice(0, 80),
    skill: String(level.skill || originalLevel.skill).trim().slice(0, 40),
    description: String(level.description || originalLevel.description).trim().slice(0, 240),
    goal: String(level.goal || originalLevel.goal).trim().slice(0, 240),
    mainLimit: Math.max(1, Math.min(40, Number(level.mainLimit) || originalLevel.mainLimit || 8)),
    procLimits: {
      p1: Math.max(0, Math.min(20, Number(level.procLimits?.p1) || 0))
    },
    tips: (Array.isArray(level.tips) ? level.tips : originalLevel.tips || []).map(normalizeTip).filter((tip) => tip.title && tip.copy),
    board,
    start,
    demo: {
      main: normalizeOperationList(level.demo?.main),
      p1: normalizeOperationList(level.demo?.p1)
    }
  }
}

function toClientLevel(doc) {
  return {
    id: doc.levelId,
    chapterId: doc.chapterId,
    chapterTitle: doc.chapterTitle,
    chapterOrder: doc.chapterOrder,
    title: doc.title,
    skill: doc.skill,
    description: doc.description,
    goal: doc.goal,
    mainLimit: doc.mainLimit,
    procLimits: { ...(doc.procLimits || {}) },
    tips: (doc.tips || []).map((tip) => ({ title: tip.title, copy: tip.copy })),
    board: (doc.board || []).map((row) => row.map((cell) => (cell ? { h: cell.h, target: Boolean(cell.target) } : null))),
    start: { ...doc.start },
    demo: {
      main: [...(doc.demo?.main || [])],
      p1: [...(doc.demo?.p1 || [])]
    },
    updatedBy: doc.updatedBy,
    updatedByName: doc.updatedByName,
    updatedAt: doc.updatedAt
  }
}

router.get('/levels', authenticateToken, async (req, res) => {
  try {
    const overrides = await LightbotLevelOverride.find().sort({ updatedAt: -1 }).lean()
    res.json({ success: true, data: overrides.map(toClientLevel) })
  } catch (error) {
    console.error('Failed to fetch Lightbot level overrides:', error)
    res.status(500).json({ success: false, error: '读取 Lightbot 关卡失败' })
  }
})

router.put('/levels/:id', authenticateToken, async (req, res) => {
  try {
    const requestedId = String(req.params.id || '').trim()
    const level = normalizeLightbotLevel({ ...(req.body?.level || {}), id: requestedId })

    const updated = await LightbotLevelOverride.findOneAndUpdate(
      { levelId: requestedId },
      {
        ...level,
        updatedBy: req.user.id,
        updatedByName: req.user.username || 'unknown'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()

    res.json({ success: true, data: toClientLevel(updated) })
  } catch (error) {
    const message = error?.message || '保存 Lightbot 关卡失败'
    const status = message.includes('失败') ? 500 : 400
    if (status === 500) {
      console.error('Failed to save Lightbot level override:', error)
    }
    res.status(status).json({ success: false, error: message })
  }
})

router.delete('/levels/:id', authenticateToken, async (req, res) => {
  try {
    const requestedId = String(req.params.id || '').trim()
    if (!VALID_LEVEL_IDS.has(requestedId)) {
      return res.status(400).json({ success: false, error: '关卡不存在' })
    }

    await LightbotLevelOverride.deleteOne({ levelId: requestedId })
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete Lightbot level override:', error)
    res.status(500).json({ success: false, error: '删除 Lightbot 关卡失败' })
  }
})

export default router