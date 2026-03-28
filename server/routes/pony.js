import crypto from 'crypto'
import express from 'express'
import PonyPuzzleLevel from '../models/PonyPuzzleLevel.js'
import PonyPuzzleSession from '../models/PonyPuzzleSession.js'
import {
  GAME_ECONOMY_CONFIG,
  ensureGameProfile,
  getRecoveredGameProfile,
  grantCoins,
  recoverProfileEnergy,
  spendCoins,
  spendEnergy,
  summarizeGameProfile
} from '../services/gameEconomy.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()
const LEVEL_TARGET = 12
let levelInitPromise = null

function shuffle(items) {
  const array = [...items]
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = array[index]
    array[index] = array[swapIndex]
    array[swapIndex] = temp
  }
  return array
}

function getCellKey(row, col) {
  return `${row},${col}`
}

function normalizeCellList(cells = []) {
  return (Array.isArray(cells) ? cells : [])
    .map((cell) => ({ row: Number(cell?.row), col: Number(cell?.col) }))
    .filter((cell) => Number.isInteger(cell.row) && Number.isInteger(cell.col))
}

function buildRegionMap(regionBoard = []) {
  const regionMap = new Map()
  for (let row = 0; row < regionBoard.length; row += 1) {
    for (let col = 0; col < (regionBoard[row] || []).length; col += 1) {
      const regionId = String(regionBoard[row][col] || '')
      if (!regionId) continue
      if (!regionMap.has(regionId)) regionMap.set(regionId, [])
      regionMap.get(regionId).push({ row, col })
    }
  }
  return regionMap
}

function countSolutions(regionBoard, maxSolutions = 2) {
  const size = Array.isArray(regionBoard) ? regionBoard.length : 0
  const regionMap = buildRegionMap(regionBoard)
  const regions = [...regionMap.entries()]
    .map(([regionId, cells]) => ({ regionId, cells }))
    .sort((left, right) => left.cells.length - right.cells.length)

  const usedRows = new Set()
  const usedCols = new Set()
  const placed = []
  let solutions = 0

  function isSafe(row, col) {
    if (usedRows.has(row) || usedCols.has(col)) return false
    return placed.every((cell) => Math.abs(cell.row - row) > 1 || Math.abs(cell.col - col) > 1)
  }

  function backtrack(index) {
    if (solutions >= maxSolutions) return
    if (index >= regions.length) {
      solutions += 1
      return
    }

    const region = regions[index]
    const candidates = region.cells.filter((cell) => isSafe(cell.row, cell.col))
    if (!candidates.length) return

    for (const cell of candidates) {
      usedRows.add(cell.row)
      usedCols.add(cell.col)
      placed.push(cell)
      backtrack(index + 1)
      placed.pop()
      usedRows.delete(cell.row)
      usedCols.delete(cell.col)
      if (solutions >= maxSolutions) return
    }
  }

  backtrack(0)
  return solutions
}

function generateSolution(size) {
  const usedCols = new Set()
  const solution = []

  function backtrack(row) {
    if (row >= size) return true
    const columns = shuffle(Array.from({ length: size }, (_, index) => index))
    for (const col of columns) {
      if (usedCols.has(col)) continue
      const previous = solution[solution.length - 1]
      if (previous && Math.abs(previous.col - col) <= 1) continue
      usedCols.add(col)
      solution.push({ row, col })
      if (backtrack(row + 1)) return true
      solution.pop()
      usedCols.delete(col)
    }
    return false
  }

  return backtrack(0) ? solution : []
}

function generateRegionBoard(size, solution) {
  const regionBoard = Array.from({ length: size }, () => Array(size).fill(''))
  const regionCells = solution.map((cell, index) => ({ ...cell, regionId: `R${index + 1}` }))
  for (const cell of regionCells) {
    regionBoard[cell.row][cell.col] = cell.regionId
  }

  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 }
  ]

  let remaining = (size * size) - regionCells.length
  while (remaining > 0) {
    let expanded = false
    for (const seed of shuffle(regionCells)) {
      const candidates = []
      for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
          if (regionBoard[row][col] !== seed.regionId) continue
          for (const direction of directions) {
            const nextRow = row + direction.row
            const nextCol = col + direction.col
            if (nextRow < 0 || nextRow >= size || nextCol < 0 || nextCol >= size) continue
            if (regionBoard[nextRow][nextCol]) continue
            candidates.push({ row: nextRow, col: nextCol })
          }
        }
      }

      if (!candidates.length) continue
      const nextCell = candidates[Math.floor(Math.random() * candidates.length)]
      regionBoard[nextCell.row][nextCell.col] = seed.regionId
      remaining -= 1
      expanded = true
      if (remaining <= 0) break
    }

    if (!expanded) break
  }

  return regionBoard
}

function createGeneratedLevel(levelId, size) {
  const difficultyLabel = size <= 5 ? '入门' : (size <= 6 ? '进阶' : '挑战')
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const solutionCells = generateSolution(size)
    if (!solutionCells.length) continue
    const regionBoard = generateRegionBoard(size, solutionCells)
    if (countSolutions(regionBoard) !== 1) continue
    return {
      levelId,
      name: `小马谜题 ${levelId}`,
      description: `${size}x${size} ${difficultyLabel}关，颜色区块各放 1 只小马。`,
      size,
      regionBoard,
      solutionCells,
      regionCount: size,
      rewardCoins: 20 + size * 4,
      difficultyLabel,
      isSystem: true
    }
  }
  throw new Error(`生成第 ${levelId} 关失败`)
}

async function initLevels() {
  const count = await PonyPuzzleLevel.countDocuments()
  if (count >= LEVEL_TARGET) return

  const existingIds = new Set((await PonyPuzzleLevel.find().select('levelId').lean()).map((item) => Number(item.levelId)))
  for (let levelId = 1; levelId <= LEVEL_TARGET; levelId += 1) {
    if (existingIds.has(levelId)) continue
    const size = levelId <= 4 ? 5 : (levelId <= 8 ? 6 : 7)
    const level = createGeneratedLevel(levelId, size)
    await PonyPuzzleLevel.create(level)
  }
}

async function ensureLevelsInitialized() {
  if (levelInitPromise) return levelInitPromise

  levelInitPromise = (async () => {
    await initLevels()
    return PonyPuzzleLevel.countDocuments()
  })()

  try {
    return await levelInitPromise
  } catch (error) {
    levelInitPromise = null
    throw error
  }
}

ensureLevelsInitialized().catch((error) => {
  console.error('Failed to initialize pony puzzle levels:', error)
})

function sanitizeLevel(level, profile = null) {
  const completedLevels = new Set(Array.isArray(profile?.completedLevels) ? profile.completedLevels : [])
  const bestRecords = profile?.bestRecords instanceof Map ? Object.fromEntries(profile.bestRecords) : (profile?.bestRecords || {})
  return {
    levelId: Number(level.levelId),
    name: level.name,
    description: level.description,
    size: Number(level.size),
    regionBoard: level.regionBoard,
    regionCount: Number(level.regionCount || level.size || 0),
    rewardCoins: Number(level.rewardCoins || 0),
    difficultyLabel: level.difficultyLabel || '普通',
    unlocked: Number(profile?.unlockedLevel || 1) >= Number(level.levelId),
    completed: completedLevels.has(Number(level.levelId)),
    bestRecord: bestRecords[String(level.levelId)] || null
  }
}

function sanitizeSession(session) {
  return {
    sessionId: session.sessionId,
    levelId: Number(session.levelId),
    status: session.status,
    remainingMistakes: Number(session.remainingMistakes || 0),
    strikeCount: Number(session.strikeCount || 0),
    hintCount: Number(session.hintCount || 0),
    startedAt: session.startedAt,
    completedAt: session.completedAt || null,
    timeElapsed: Number(session.timeElapsed || 0)
  }
}

function getSolutionSet(level) {
  return new Set(normalizeCellList(level?.solutionCells).map((cell) => getCellKey(cell.row, cell.col)))
}

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await getRecoveredGameProfile(Number(req.user.id))
    res.json({
      profile: summarizeGameProfile(profile),
      config: GAME_ECONOMY_CONFIG
    })
  } catch (error) {
    res.status(500).json({ error: error.message || '加载小游戏档案失败' })
  }
})

router.get('/levels', authenticateToken, async (req, res) => {
  try {
    await ensureLevelsInitialized()
    const userId = Number(req.user.id)
    const profile = await ensureGameProfile(userId)
    recoverProfileEnergy(profile)
    await profile.save()

    const levels = await PonyPuzzleLevel.find().sort({ levelId: 1 }).lean()
    res.json({
      items: levels.map((level) => sanitizeLevel(level, profile)),
      profile: summarizeGameProfile(profile),
      config: GAME_ECONOMY_CONFIG
    })
  } catch (error) {
    res.status(500).json({ error: error.message || '加载小游戏关卡失败' })
  }
})

router.post('/sessions/start', authenticateToken, async (req, res) => {
  try {
    await ensureLevelsInitialized()
    const userId = Number(req.user.id)
    const levelId = Number(req.body?.levelId)
    if (!Number.isInteger(levelId) || levelId <= 0) {
      return res.status(400).json({ error: 'levelId 不合法' })
    }

    const level = await PonyPuzzleLevel.findOne({ levelId }).lean()
    if (!level) return res.status(404).json({ error: '关卡不存在' })

    const profile = await getRecoveredGameProfile(userId)
    if (Number(profile.unlockedLevel || 1) < levelId) {
      return res.status(403).json({ error: '该关卡尚未解锁' })
    }

    await PonyPuzzleSession.updateMany({ userId, status: 'active' }, { $set: { status: 'abandoned' } })
    const updatedProfile = await spendEnergy(userId, GAME_ECONOMY_CONFIG.energyCostPerGame)
    const session = await PonyPuzzleSession.create({
      sessionId: crypto.randomUUID(),
      userId,
      levelId,
      remainingMistakes: 3,
      hintCount: 0,
      strikeCount: 0,
      status: 'active'
    })

    res.json({
      level: sanitizeLevel(level, updatedProfile),
      session: sanitizeSession(session),
      profile: summarizeGameProfile(updatedProfile),
      config: GAME_ECONOMY_CONFIG
    })
  } catch (error) {
    res.status(500).json({ error: error.message || '开始游戏失败' })
  }
})

router.post('/sessions/:sessionId/place', authenticateToken, async (req, res) => {
  try {
    const session = await PonyPuzzleSession.findOne({
      sessionId: String(req.params.sessionId || ''),
      userId: Number(req.user.id)
    })
    if (!session) return res.status(404).json({ error: '游戏会话不存在' })
    if (session.status !== 'active') {
      return res.status(400).json({ error: '当前会话不可继续落子' })
    }

    const row = Number(req.body?.row)
    const col = Number(req.body?.col)
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return res.status(400).json({ error: '落子坐标不合法' })
    }

    const level = await PonyPuzzleLevel.findOne({ levelId: session.levelId }).lean()
    if (!level) return res.status(404).json({ error: '关卡不存在' })

    const solutionSet = getSolutionSet(level)
    const key = getCellKey(row, col)
    const correct = solutionSet.has(key)
    if (!correct) {
      session.remainingMistakes = Math.max(0, Number(session.remainingMistakes || 0) - 1)
      session.strikeCount = Number(session.strikeCount || 0) + 1
      if (session.remainingMistakes <= 0) {
        session.status = 'failed'
      }
      await session.save()
    }

    res.json({
      correct,
      session: sanitizeSession(session),
      failed: session.status === 'failed'
    })
  } catch (error) {
    res.status(500).json({ error: error.message || '校验落子失败' })
  }
})

router.post('/sessions/:sessionId/hint', authenticateToken, async (req, res) => {
  try {
    const session = await PonyPuzzleSession.findOne({
      sessionId: String(req.params.sessionId || ''),
      userId: Number(req.user.id)
    })
    if (!session) return res.status(404).json({ error: '游戏会话不存在' })
    if (session.status !== 'active') {
      return res.status(400).json({ error: '当前会话不可使用提示' })
    }

    const level = await PonyPuzzleLevel.findOne({ levelId: session.levelId }).lean()
    if (!level) return res.status(404).json({ error: '关卡不存在' })

    const ponyCells = new Set(normalizeCellList(req.body?.ponyCells).map((cell) => getCellKey(cell.row, cell.col)))
    const nextCell = normalizeCellList(level.solutionCells).find((cell) => !ponyCells.has(getCellKey(cell.row, cell.col)))
    if (!nextCell) {
      return res.status(400).json({ error: '当前局面已经没有可提示的小马位置' })
    }

    const profile = await spendCoins(Number(req.user.id), GAME_ECONOMY_CONFIG.hintCost, 'buy_hint', {
      sessionId: session.sessionId,
      levelId: session.levelId
    })
    session.hintCount = Number(session.hintCount || 0) + 1
    await session.save()

    res.json({
      hint: {
        type: 'place',
        row: nextCell.row,
        col: nextCell.col,
        message: '这格可以放一只小马。'
      },
      session: sanitizeSession(session),
      profile: summarizeGameProfile(profile)
    })
  } catch (error) {
    res.status(500).json({ error: error.message || '购买提示失败' })
  }
})

router.post('/sessions/:sessionId/complete', authenticateToken, async (req, res) => {
  try {
    const session = await PonyPuzzleSession.findOne({
      sessionId: String(req.params.sessionId || ''),
      userId: Number(req.user.id)
    })
    if (!session) return res.status(404).json({ error: '游戏会话不存在' })
    if (session.status !== 'active') {
      return res.status(400).json({ error: '当前会话不可结算' })
    }

    const level = await PonyPuzzleLevel.findOne({ levelId: session.levelId }).lean()
    if (!level) return res.status(404).json({ error: '关卡不存在' })

    const ponyCells = new Set(normalizeCellList(req.body?.ponyCells).map((cell) => getCellKey(cell.row, cell.col)))
    const solutionSet = getSolutionSet(level)
    if (ponyCells.size !== solutionSet.size) {
      return res.status(400).json({ error: '小马数量还不正确，无法通关' })
    }
    for (const key of solutionSet) {
      if (!ponyCells.has(key)) {
        return res.status(400).json({ error: '当前摆放还不是正确解' })
      }
    }

    const timeElapsed = Math.max(Number(req.body?.timeElapsed || 0), 0)
    session.status = 'completed'
    session.completedAt = new Date()
    session.timeElapsed = timeElapsed
    await session.save()

    const profile = await getRecoveredGameProfile(Number(req.user.id))
    const completedLevels = new Set(Array.isArray(profile.completedLevels) ? profile.completedLevels : [])
    const firstClear = !completedLevels.has(Number(level.levelId))
    if (firstClear) completedLevels.add(Number(level.levelId))
    profile.completedLevels = [...completedLevels].sort((left, right) => left - right)
    profile.unlockedLevel = Math.max(Number(profile.unlockedLevel || 1), Number(level.levelId) + 1)

    const recordKey = String(level.levelId)
    const bestRecords = profile.bestRecords instanceof Map ? profile.bestRecords : new Map(Object.entries(profile.bestRecords || {}))
    const currentRecord = bestRecords.get(recordKey)
    if (!currentRecord || timeElapsed < Number(currentRecord.timeElapsed || Infinity)) {
      bestRecords.set(recordKey, {
        timeElapsed,
        hintsUsed: Number(session.hintCount || 0),
        completedAt: session.completedAt
      })
    }
    profile.bestRecords = bestRecords
    await profile.save()

    let rewardCoins = 0
    if (firstClear) {
      const rewardResult = await grantCoins(
        Number(req.user.id),
        Number(level.rewardCoins || 0),
        'pony_level_clear',
        `pony-level-clear:${req.user.id}:${level.levelId}`,
        { levelId: level.levelId, sessionId: session.sessionId }
      )
      rewardCoins = Number(rewardResult.amount || 0)
    }

    const refreshedProfile = await getRecoveredGameProfile(Number(req.user.id))
    res.json({
      firstClear,
      rewardCoins,
      profile: summarizeGameProfile(refreshedProfile),
      session: sanitizeSession(session)
    })
  } catch (error) {
    res.status(500).json({ error: error.message || '通关结算失败' })
  }
})

router.post('/store/buy-energy', authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.user.id)
    const profile = await spendCoins(userId, GAME_ECONOMY_CONFIG.energyPackCost, 'buy_energy', {
      energyAmount: GAME_ECONOMY_CONFIG.energyPackAmount
    })
    recoverProfileEnergy(profile)
    profile.energy = Math.min(
      Number(profile.energyMax || GAME_ECONOMY_CONFIG.energyMax),
      Number(profile.energy || 0) + GAME_ECONOMY_CONFIG.energyPackAmount
    )
    await profile.save()

    res.json({
      profile: summarizeGameProfile(profile),
      config: GAME_ECONOMY_CONFIG
    })
  } catch (error) {
    res.status(500).json({ error: error.message || '购买体力失败' })
  }
})

export default router