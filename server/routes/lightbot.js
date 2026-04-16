import crypto from 'crypto'
import express from 'express'
import LightbotLevelOverride from '../models/LightbotLevelOverride.js'
import LightbotResult from '../models/LightbotResult.js'
import { authenticateToken } from '../middleware/auth.js'
import { LIGHTBOT_LEVELS, VALID_LEVEL_IDS } from '../../src/data/lightbotLevels.js'

const router = express.Router()
const CUSTOM_CHAPTER_ID = 'custom-shared'
const CUSTOM_CHAPTER_TITLE = '自定义关卡'
const CUSTOM_CHAPTER_ORDER = 999
const VALID_OPERATION_IDS = new Set(['walk', 'light', 'left', 'right', 'jump', 'p1'])

function isAdminUser(user) {
  return Boolean(user && (user.role === 'admin' || user.priv === -1))
}

function isCustomLevelOwner(doc, user) {
  if (!doc?.isCustom || !user) return false
  if (doc.createdBy == null || user.id == null) return false
  return Number(doc.createdBy) === Number(user.id)
}

function canManageCustomLevel(doc, user) {
  return isAdminUser(user) || isCustomLevelOwner(doc, user)
}

function normalizeTip(tip) {
  return {
    title: String(tip?.title || '').trim().slice(0, 80),
    copy: String(tip?.copy || '').trim().slice(0, 240)
  }
}

function normalizeOperationItem(item) {
  if (typeof item === 'string') {
    const normalized = item.trim()
    return VALID_OPERATION_IDS.has(normalized) ? normalized : null
  }

  if (!item || typeof item !== 'object' || item.type !== 'repeat') {
    return null
  }

  const body = typeof item.body === 'string' ? item.body.trim() : ''
  if (!VALID_OPERATION_IDS.has(body)) {
    return null
  }

  return {
    type: 'repeat',
    count: Math.max(2, Math.min(9, Math.floor(Number(item.count) || 2))),
    body
  }
}

function cloneOperationItem(item) {
  if (!item) return null
  return typeof item === 'string' ? item : { type: item.type, count: item.count, body: item.body }
}

function normalizeOperationList(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizeOperationItem).filter(Boolean).slice(0, 40)
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

function normalizeLightbotLevel(level, options = {}) {
  if (!level || typeof level !== 'object') {
    throw new Error('缺少关卡数据')
  }

  const levelId = String(level.id || '').trim()
  const existingDoc = options.existingDoc || null
  const allowCustom = Boolean(options.allowCustom)
  const isBuiltIn = VALID_LEVEL_IDS.has(levelId)
  const isExistingCustom = Boolean(existingDoc?.isCustom)

  if (!isBuiltIn && !allowCustom && !isExistingCustom) {
    throw new Error('只能覆盖现有内置关卡')
  }

  if (!levelId) {
    throw new Error('缺少关卡编号')
  }

  const originalLevel = LIGHTBOT_LEVELS.find((item) => item.id === levelId)
  if (!originalLevel && !isExistingCustom && !allowCustom) {
    throw new Error('关卡不存在')
  }

  const baseChapterId = isBuiltIn ? originalLevel.chapterId : (existingDoc?.chapterId || CUSTOM_CHAPTER_ID)
  const baseChapterTitle = isBuiltIn ? originalLevel.chapterTitle : (existingDoc?.chapterTitle || CUSTOM_CHAPTER_TITLE)
  const baseChapterOrder = isBuiltIn ? originalLevel.chapterOrder : (existingDoc?.chapterOrder ?? CUSTOM_CHAPTER_ORDER)
  const baseTitle = isBuiltIn ? originalLevel.title : (existingDoc?.title || 'My Level')
  const baseSkill = isBuiltIn ? originalLevel.skill : (existingDoc?.skill || 'Custom')
  const baseDescription = isBuiltIn ? originalLevel.description : (existingDoc?.description || '学员自制关卡。')
  const baseGoal = isBuiltIn ? originalLevel.goal : (existingDoc?.goal || '点亮所有目标格。')
  const baseMainLimit = isBuiltIn ? originalLevel.mainLimit : (existingDoc?.mainLimit || 8)
  const baseTips = isBuiltIn ? (originalLevel.tips || []) : (existingDoc?.tips || [])
  const baseDir = isBuiltIn ? originalLevel.start.dir : (existingDoc?.start?.dir || 'forward')
  const board = normalizeBoard(level.board)
  const start = {
    x: Math.max(0, Number(level.start?.x) || 0),
    y: Math.max(0, Number(level.start?.y) || 0),
    dir: ['forward', 'right', 'backward', 'left'].includes(level.start?.dir) ? level.start.dir : baseDir
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
    isCustom: !isBuiltIn,
    chapterId: String(level.chapterId || baseChapterId || '').trim() || baseChapterId,
    chapterTitle: String(level.chapterTitle || baseChapterTitle || '').trim() || baseChapterTitle,
    chapterOrder: Number.isFinite(level.chapterOrder) ? level.chapterOrder : baseChapterOrder,
    title: String(level.title || baseTitle).trim().slice(0, 80),
    skill: String(level.skill || baseSkill).trim().slice(0, 40),
    description: String(level.description || baseDescription).trim().slice(0, 240),
    goal: String(level.goal || baseGoal).trim().slice(0, 240),
    mainLimit: Math.max(1, Math.min(40, Number(level.mainLimit) || baseMainLimit || 8)),
    procLimits: {
      p1: Math.max(0, Math.min(20, Number(level.procLimits?.p1) || 0))
    },
    tips: (Array.isArray(level.tips) ? level.tips : baseTips).map(normalizeTip).filter((tip) => tip.title && tip.copy),
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
    isCustom: Boolean(doc.isCustom),
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
      main: (doc.demo?.main || []).map(cloneOperationItem).filter(Boolean),
      p1: (doc.demo?.p1 || []).map(cloneOperationItem).filter(Boolean)
    },
    isDeleted: Boolean(doc.isDeleted),
    createdBy: doc.createdBy,
    createdByName: doc.createdByName,
    updatedBy: doc.updatedBy,
    updatedByName: doc.updatedByName,
    deletedAt: doc.deletedAt,
    deletedBy: doc.deletedBy,
    deletedByName: doc.deletedByName,
    updatedAt: doc.updatedAt
  }
}

async function findPlayableLevel(levelId) {
  const override = await LightbotLevelOverride.findOne({ levelId, isDeleted: false }).lean()
  if (override) {
    return toClientLevel(override)
  }

  const builtInLevel = LIGHTBOT_LEVELS.find((item) => item.id === levelId)
  return builtInLevel ? { ...builtInLevel, isCustom: false } : null
}

function normalizePositiveMetric(value) {
  const numeric = Math.floor(Number(value))
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, numeric)
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
    const existingDoc = await LightbotLevelOverride.findOne({ levelId: requestedId }).lean()
    const originalLevel = LIGHTBOT_LEVELS.find((item) => item.id === requestedId)

    if (existingDoc?.isCustom) {
      if (!canManageCustomLevel(existingDoc, req.user)) {
        return res.status(403).json({ success: false, error: '只有创建者本人或管理员可以修改这个自定义关卡' })
      }
    } else if (originalLevel) {
      if (!isAdminUser(req.user)) {
        return res.status(403).json({ success: false, error: '只有管理员可以修改默认关卡' })
      }
    } else {
      return res.status(400).json({ success: false, error: '关卡不存在' })
    }

    const level = normalizeLightbotLevel(
      { ...(req.body?.level || {}), id: requestedId },
      { existingDoc, allowCustom: Boolean(existingDoc?.isCustom) }
    )

    const updated = await LightbotLevelOverride.findOneAndUpdate(
      { levelId: requestedId },
      {
        ...level,
        createdBy: existingDoc?.createdBy ?? req.user.id,
        createdByName: existingDoc?.createdByName ?? (req.user.username || 'unknown'),
        updatedBy: req.user.id,
        updatedByName: req.user.username || 'unknown',
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deletedByName: null
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

router.post('/levels', authenticateToken, async (req, res) => {
  try {
    const levelId = `custom-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
    const level = normalizeLightbotLevel(
      {
        ...(req.body?.level || {}),
        id: levelId,
        chapterId: CUSTOM_CHAPTER_ID,
        chapterTitle: CUSTOM_CHAPTER_TITLE,
        chapterOrder: CUSTOM_CHAPTER_ORDER
      },
      { allowCustom: true }
    )

    const created = await LightbotLevelOverride.create({
      ...level,
      createdBy: req.user.id,
      createdByName: req.user.username || 'unknown',
      updatedBy: req.user.id,
      updatedByName: req.user.username || 'unknown',
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deletedByName: null
    })

    res.status(201).json({ success: true, data: toClientLevel(created.toObject()) })
  } catch (error) {
    const message = error?.message || '新增 Lightbot 关卡失败'
    const status = message.includes('失败') ? 500 : 400
    if (status === 500) {
      console.error('Failed to create Lightbot level:', error)
    }
    res.status(status).json({ success: false, error: message })
  }
})

router.delete('/levels/:id', authenticateToken, async (req, res) => {
  try {
    const requestedId = String(req.params.id || '').trim()
    const originalLevel = LIGHTBOT_LEVELS.find((level) => level.id === requestedId)
    const existingDoc = await LightbotLevelOverride.findOne({ levelId: requestedId }).lean()
    if (!originalLevel && !existingDoc?.isCustom) {
      return res.status(400).json({ success: false, error: '关卡不存在' })
    }

    if (existingDoc?.isCustom) {
      if (!canManageCustomLevel(existingDoc, req.user)) {
        return res.status(403).json({ success: false, error: '只有创建者本人或管理员可以删除这个自定义关卡' })
      }
    } else if (!isAdminUser(req.user)) {
      return res.status(403).json({ success: false, error: '只有管理员可以删除默认关卡' })
    }

    const sourceLevel = existingDoc?.isCustom
      ? {
          levelId: existingDoc.levelId,
          isCustom: true,
          chapterId: existingDoc.chapterId,
          chapterTitle: existingDoc.chapterTitle,
          chapterOrder: existingDoc.chapterOrder,
          title: existingDoc.title,
          skill: existingDoc.skill,
          description: existingDoc.description,
          goal: existingDoc.goal,
          mainLimit: existingDoc.mainLimit,
          procLimits: existingDoc.procLimits || {},
          tips: existingDoc.tips || [],
          board: existingDoc.board,
          start: existingDoc.start,
          demo: existingDoc.demo || { main: [], p1: [] },
          createdBy: existingDoc.createdBy,
          createdByName: existingDoc.createdByName
        }
      : originalLevel

    const deletedLevel = await LightbotLevelOverride.findOneAndUpdate(
      { levelId: requestedId },
      {
        levelId: requestedId,
        isCustom: Boolean(existingDoc?.isCustom),
        chapterId: sourceLevel.chapterId,
        chapterTitle: sourceLevel.chapterTitle,
        chapterOrder: sourceLevel.chapterOrder,
        title: sourceLevel.title,
        skill: sourceLevel.skill,
        description: sourceLevel.description,
        goal: sourceLevel.goal,
        mainLimit: sourceLevel.mainLimit,
        procLimits: { ...(sourceLevel.procLimits || {}) },
        tips: (sourceLevel.tips || []).map(normalizeTip),
        board: sourceLevel.board,
        start: sourceLevel.start,
        demo: {
          main: normalizeOperationList(sourceLevel.demo?.main),
          p1: normalizeOperationList(sourceLevel.demo?.p1)
        },
        createdBy: existingDoc?.createdBy ?? null,
        createdByName: existingDoc?.createdByName ?? null,
        updatedBy: req.user.id,
        updatedByName: req.user.username || 'unknown',
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        deletedByName: req.user.username || 'unknown'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()

    res.json({ success: true, data: toClientLevel(deletedLevel) })
  } catch (error) {
    console.error('Failed to delete Lightbot level override:', error)
    res.status(500).json({ success: false, error: '删除 Lightbot 关卡失败' })
  }
})

router.post('/levels/:id/complete', authenticateToken, async (req, res) => {
  try {
    const requestedId = String(req.params.id || '').trim()
    const playableLevel = await findPlayableLevel(requestedId)
    if (!playableLevel) {
      return res.status(404).json({ success: false, error: '关卡不存在' })
    }

    const totalCommands = normalizePositiveMetric(req.body?.totalCommands)
    const mainLength = normalizePositiveMetric(req.body?.mainLength)
    const p1Length = normalizePositiveMetric(req.body?.p1Length)
    const executionSteps = normalizePositiveMetric(req.body?.executionSteps)

    if (!totalCommands || mainLength == null || p1Length == null || !executionSteps) {
      return res.status(400).json({ success: false, error: '缺少有效的通关成绩数据' })
    }

    if (mainLength + p1Length !== totalCommands) {
      return res.status(400).json({ success: false, error: '程序长度统计不一致' })
    }

    if (mainLength > Number(playableLevel.mainLimit || 0)) {
      return res.status(400).json({ success: false, error: 'MAIN 指令数超过当前关卡限制' })
    }

    const p1Limit = Number(playableLevel.procLimits?.p1 || 0)
    if (p1Length > p1Limit) {
      return res.status(400).json({ success: false, error: 'P1 指令数超过当前关卡限制' })
    }

    const created = await LightbotResult.create({
      levelId: requestedId,
      isCustomLevel: Boolean(playableLevel.isCustom),
      levelTitle: String(playableLevel.title || requestedId).slice(0, 80),
      userId: Number(req.user.id),
      username: String(req.user.username || req.user.name || 'unknown').slice(0, 80),
      totalCommands,
      mainLength,
      p1Length,
      executionSteps,
      completedAt: new Date()
    })

    const personalBest = await LightbotResult.findOne({ levelId: requestedId, userId: Number(req.user.id) })
      .sort({ totalCommands: 1, executionSteps: 1, completedAt: 1 })
      .lean()

    res.json({
      success: true,
      data: {
        isPersonalBest: String(personalBest?._id) === String(created._id),
        personalBest: personalBest
          ? {
              totalCommands: personalBest.totalCommands,
              mainLength: personalBest.mainLength,
              p1Length: personalBest.p1Length,
              executionSteps: personalBest.executionSteps,
              completedAt: personalBest.completedAt
            }
          : null
      }
    })
  } catch (error) {
    console.error('Failed to submit Lightbot result:', error)
    res.status(500).json({ success: false, error: '提交 Lightbot 成绩失败' })
  }
})

router.get('/levels/:id/leaderboard', async (req, res) => {
  try {
    const requestedId = String(req.params.id || '').trim()
    const leaderboard = await LightbotResult.aggregate([
      { $match: { levelId: requestedId } },
      { $sort: { totalCommands: 1, executionSteps: 1, completedAt: 1 } },
      {
        $group: {
          _id: '$userId',
          userId: { $first: '$userId' },
          username: { $first: '$username' },
          totalCommands: { $first: '$totalCommands' },
          mainLength: { $first: '$mainLength' },
          p1Length: { $first: '$p1Length' },
          executionSteps: { $first: '$executionSteps' },
          completedAt: { $first: '$completedAt' }
        }
      },
      { $sort: { totalCommands: 1, executionSteps: 1, completedAt: 1 } },
      { $limit: 10 }
    ])

    res.json({ success: true, data: leaderboard })
  } catch (error) {
    console.error('Failed to fetch Lightbot leaderboard:', error)
    res.status(500).json({ success: false, error: '读取 Lightbot 排行榜失败' })
  }
})

router.get('/activity', async (req, res) => {
  try {
    const requestedLimit = normalizePositiveMetric(req.query.limit)
    const limit = Math.min(Math.max(requestedLimit || 12, 1), 30)
    const activity = await LightbotResult.find()
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean()

    res.json({
      success: true,
      data: activity.map((item) => ({
        levelId: item.levelId,
        levelTitle: item.levelTitle,
        isCustomLevel: Boolean(item.isCustomLevel),
        userId: item.userId,
        username: item.username,
        totalCommands: item.totalCommands,
        mainLength: item.mainLength,
        p1Length: item.p1Length,
        executionSteps: item.executionSteps,
        completedAt: item.completedAt
      }))
    })
  } catch (error) {
    console.error('Failed to fetch Lightbot activity:', error)
    res.status(500).json({ success: false, error: '读取 Lightbot 最近动态失败' })
  }
})

export default router