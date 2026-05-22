import express from 'express'
import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { MAIL_CONFIG, JWT_SECRET } from '../config.js'
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.js'
import CodebotUserLevel from '../models/CodebotUserLevel.js'
import CodebotLevel from '../models/CodebotLevel.js'
import CodebotResult from '../models/CodebotResult.js'
import { solveCodebotLevel } from '../utils/codebotSolver.js'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EVENTS_DIR = path.join(__dirname, '../logs')
const EVENTS_FILE = path.join(EVENTS_DIR, 'codebot-events.ndjson')
const SUBMISSIONS_FILE = path.join(EVENTS_DIR, 'codebot-submissions.ndjson')

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function appendNdjson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8')
}

/** 从 level content JSON 字符串中提取 title */
function extractTitle(content) {
  try {
    const obj = JSON.parse(content)
    return String(obj?.name || obj?.title || '').trim() || '未命名关卡'
  } catch {
    return '未命名关卡'
  }
}

function getRequesterIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0]
    .trim()
}

function sanitizeLevelId(levelId) {
  return String(levelId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '')
}

function isAdminUser(req) {
  return req.user?.role === 'admin' || req.user?.priv === -1
}

function parseLevelContent(content) {
  const parsed = JSON.parse(String(content || '{}'))
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid level content')
  }
  return parsed
}

function compareResultRows(a, b) {
  if (a.totalCommands !== b.totalCommands) return a.totalCommands - b.totalCommands
  if (a.executionSteps !== b.executionSteps) return a.executionSteps - b.executionSteps
  return new Date(a.completedAt || 0).getTime() - new Date(b.completedAt || 0).getTime()
}

function starsForCommands(totalCommands, bestTotalCommands) {
  if (!Number.isFinite(bestTotalCommands)) return 1
  if (totalCommands <= bestTotalCommands) return 3
  if (totalCommands <= bestTotalCommands + 2) return 2
  return 1
}

function serializeLevelEntry(entry, currentUserId) {
  return {
    rank: entry.rank,
    userId: entry.userId,
    username: entry.username,
    totalCommands: entry.totalCommands,
    executionSteps: entry.executionSteps,
    completedAt: entry.completedAt ? new Date(entry.completedAt).toISOString() : null,
    stars: entry.stars,
    isCurrentUser: currentUserId != null && entry.userId === currentUserId,
  }
}

async function buildLevelLeaderboard(levelId, currentUserId = null) {
  const results = await CodebotResult.find({ levelId })
    .sort({ totalCommands: 1, executionSteps: 1, completedAt: 1 })
    .lean()

  if (results.length === 0) {
    return {
      bestTotalCommands: null,
      entries: [],
      topEntries: [],
      myEntry: null,
    }
  }

  const bestTotalCommands = results[0].totalCommands
  const entries = results.map((result, index) => ({
    ...result,
    rank: index + 1,
    stars: starsForCommands(result.totalCommands, bestTotalCommands),
  }))

  const myEntry = currentUserId == null
    ? null
    : entries.find((entry) => entry.userId === currentUserId) ?? null

  return {
    bestTotalCommands,
    entries,
    topEntries: entries.slice(0, 10),
    myEntry,
  }
}

function compareOverallRows(a, b) {
  if (a.totalStars !== b.totalStars) return b.totalStars - a.totalStars
  if (a.levelsCompleted !== b.levelsCompleted) return b.levelsCompleted - a.levelsCompleted
  if (a.totalCommandsSum !== b.totalCommandsSum) return a.totalCommandsSum - b.totalCommandsSum
  if (a.executionStepsSum !== b.executionStepsSum) return a.executionStepsSum - b.executionStepsSum
  return String(a.username).localeCompare(String(b.username), 'zh-CN')
}

async function buildOverallStarLeaderboard(currentUserId = null) {
  const officialLevels = await CodebotLevel.find({}, { _id: 0, id: 1 }).lean()
  const officialLevelIds = officialLevels.map((level) => level.id).filter(Boolean)

  if (officialLevelIds.length === 0) {
    return { entries: [], topEntries: [], myEntry: null }
  }

  const results = await CodebotResult.find({ levelId: { $in: officialLevelIds } }).lean()
  if (results.length === 0) {
    return { entries: [], topEntries: [], myEntry: null }
  }

  const bestByLevel = new Map()
  for (const result of results) {
    const existing = bestByLevel.get(result.levelId)
    if (existing == null || result.totalCommands < existing) {
      bestByLevel.set(result.levelId, result.totalCommands)
    }
  }

  const rowsByUserId = new Map()
  for (const result of results) {
    const stars = starsForCommands(result.totalCommands, bestByLevel.get(result.levelId))
    const current = rowsByUserId.get(result.userId) ?? {
      userId: result.userId,
      username: result.username,
      totalStars: 0,
      levelsCompleted: 0,
      threeStarLevels: 0,
      twoStarLevels: 0,
      oneStarLevels: 0,
      totalCommandsSum: 0,
      executionStepsSum: 0,
    }
    current.username = result.username
    current.totalStars += stars
    current.levelsCompleted += 1
    current.totalCommandsSum += result.totalCommands
    current.executionStepsSum += result.executionSteps
    if (stars === 3) current.threeStarLevels += 1
    else if (stars === 2) current.twoStarLevels += 1
    else current.oneStarLevels += 1
    rowsByUserId.set(result.userId, current)
  }

  const entries = Array.from(rowsByUserId.values())
    .sort(compareOverallRows)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
      isCurrentUser: currentUserId != null && entry.userId === currentUserId,
    }))

  const myEntry = currentUserId == null
    ? null
    : entries.find((entry) => entry.userId === currentUserId) ?? null

  return {
    entries,
    topEntries: entries.slice(0, 20),
    myEntry,
  }
}

function maybeCreateMailer() {
  if (!MAIL_CONFIG.host || !MAIL_CONFIG.user || !MAIL_CONFIG.pass || !MAIL_CONFIG.to) {
    return null
  }

  return nodemailer.createTransport({
    host: MAIL_CONFIG.host,
    port: MAIL_CONFIG.port,
    secure: MAIL_CONFIG.secure,
    auth: { user: MAIL_CONFIG.user, pass: MAIL_CONFIG.pass },
  })
}

// ── 官方关卡列表 ────────────────────────────────────────────────────────────
router.get('/codebot/levels', async (_req, res) => {
  try {
    const levels = await CodebotLevel.find({}, { _id: 0, __v: 0 })
      .sort({ sortOrder: 1 })
      .lean()
    res.json({ ok: true, levels })
  } catch (err) {
    console.error('[codebot] GET /codebot/levels error:', err)
    res.status(500).json({ ok: false, error: 'Failed to load levels' })
  }
})

router.post('/track', (req, res) => {
  try {
    // 尝试从 Authorization header 中提取 username（登录用户）
    let username = null
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        username = decoded.username || null
      } catch {
        // token 无效/过期，忽略
      }
    }
    appendNdjson(EVENTS_FILE, {
      t: Date.now(),
      ip: getRequesterIp(req),
      ...(req.body || {}),
      ...(username ? { username } : {}),
    })
  } catch (error) {
    console.error('[codebot-app] track failed:', error)
  }
  res.json({ ok: true })
})

router.get('/stats', (_req, res) => {
  try {
    const lines = fs.existsSync(EVENTS_FILE)
      ? fs.readFileSync(EVENTS_FILE, 'utf8').split('\n').filter(Boolean)
      : []
    const events = lines.map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean)

    const daily = {}
    const dailyIps = {}
    const levelCompletions = {}

    for (const event of events) {
      const day = new Date(event.t || Date.now()).toISOString().slice(0, 10)
      daily[day] ||= {}
      daily[day][event.event || 'unknown'] = (daily[day][event.event || 'unknown'] || 0) + 1
      dailyIps[day] ||= new Set()
      if (event.ip) dailyIps[day].add(event.ip)
      if (event.event === 'level_complete' && event.levelId) {
        levelCompletions[event.levelId] = (levelCompletions[event.levelId] || 0) + 1
      }
    }

    const uniqueIps = Object.fromEntries(
      Object.entries(dailyIps).map(([day, set]) => [day, set.size])
    )

    res.json({
      ok: true,
      total_events: events.length,
      daily,
      daily_unique_ips: uniqueIps,
      level_completions: levelCompletions,
    })
  } catch (error) {
    console.error('[codebot-app] stats failed:', error)
    res.status(500).json({ error: '读取统计失败' })
  }
})

router.post('/submit-level', async (req, res) => {
  const title = String(req.body?.title || '').trim()
  const author = String(req.body?.author || '').trim() || '匿名'
  const url = String(req.body?.url || '').trim()

  if (!title || !url) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  const payload = {
    t: Date.now(),
    ip: getRequesterIp(req),
    title,
    author,
    url,
  }

  try {
    appendNdjson(SUBMISSIONS_FILE, payload)
  } catch (error) {
    console.error('[codebot-app] submit append failed:', error)
  }

  const mailer = maybeCreateMailer()
  if (mailer) {
    try {
      const recipients = MAIL_CONFIG.to.split(',').map((item) => item.trim()).filter(Boolean)
      await mailer.sendMail({
        from: MAIL_CONFIG.from,
        to: recipients.join(', '),
        subject: `Codebot 关卡投稿：${title}`,
        text: [
          '收到一条新的 Codebot 关卡投稿。',
          '',
          `关卡名称：${title}`,
          `作者昵称：${author}`,
          `预览链接：${url}`,
        ].join('\n'),
      })
    } catch (error) {
      console.error('[codebot-app] submit mail failed:', error)
    }
  }

  res.json({ ok: true })
})

router.post('/save-level', authenticateToken, async (req, res) => {
  try {
    const levelId = sanitizeLevelId(req.body?.levelId)
    const content = String(req.body?.content || '')
    const solutionSteps = Number(req.body?.solutionSteps ?? 0)
    if (!levelId || !content) {
      return res.status(400).json({ error: 'Missing levelId or content' })
    }

    if (solutionSteps < 10) {
      return res.status(400).json({ error: `关卡解法至少需要 10 步，当前仅 ${solutionSteps} 步` })
    }

    const title = extractTitle(content)
    const userId = req.user.id
    const username = req.user.username

    await CodebotUserLevel.findOneAndUpdate(
      { userId, levelId },
      { userId, username, levelId, title, content, solutionSteps, isPublished: true, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.json({ ok: true })
  } catch (error) {
    console.error('[codebot-app] save-level failed:', error)
    res.status(500).json({ error: '保存关卡失败' })
  }
})

router.put('/codebot/admin/level/:levelId', authenticateToken, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: '需要管理员权限' })
    }

    const levelId = sanitizeLevelId(req.params.levelId)
    const content = String(req.body?.content || '')
    const solutionSteps = Number(req.body?.solutionSteps ?? 0)
    if (!levelId || !content) {
      return res.status(400).json({ error: '缺少 levelId 或 content' })
    }

    const cfg = parseLevelContent(content)
    cfg.id = levelId

    const officialLevel = await CodebotLevel.findOne({ id: levelId })
    if (officialLevel) {
      officialLevel.title = String(cfg.title || officialLevel.title || '').trim() || officialLevel.title
      officialLevel.teachingGoal = String(cfg.teachingGoal || '')
      officialLevel.availableBlocks = Array.isArray(cfg.availableBlocks) ? cfg.availableBlocks : officialLevel.availableBlocks
      officialLevel.grid = Array.isArray(cfg.grid) ? cfg.grid : officialLevel.grid
      officialLevel.robot = cfg.robot && typeof cfg.robot === 'object' ? cfg.robot : officialLevel.robot
      officialLevel.winCondition = cfg.winCondition && typeof cfg.winCondition === 'object' ? cfg.winCondition : officialLevel.winCondition
      officialLevel.chapter = cfg.chapter && typeof cfg.chapter === 'object' ? cfg.chapter : officialLevel.chapter
      officialLevel.constraints = {
        ...(officialLevel.constraints || {}),
        ...(cfg.constraints && typeof cfg.constraints === 'object' ? cfg.constraints : {}),
      }
      if (Array.isArray(cfg.hints)) {
        officialLevel.hints = cfg.hints
      }
      await officialLevel.save()
      return res.json({ ok: true, from: 'official' })
    }

    const userLevel = await CodebotUserLevel.findOne({ levelId })
    if (userLevel) {
      userLevel.title = String(cfg.title || extractTitle(content)).trim() || userLevel.title
      userLevel.content = JSON.stringify(cfg, null, 2)
      userLevel.solutionSteps = Math.max(userLevel.solutionSteps ?? 0, solutionSteps)
      await userLevel.save()
      return res.json({ ok: true, from: 'user' })
    }

    return res.status(404).json({ error: '关卡不存在' })
  } catch (error) {
    console.error('[codebot-app] admin save-level failed:', error)
    return res.status(500).json({ error: '保存关卡失败' })
  }
})

router.post('/codebot/admin/solve-level', authenticateToken, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: '需要管理员权限' })
    }

    const content = String(req.body?.content || '')
    if (!content) {
      return res.status(400).json({ error: '缺少关卡内容' })
    }

    const cfg = parseLevelContent(content)
    const result = solveCodebotLevel(cfg)
    res.json({ ok: true, result })
  } catch (error) {
    console.error('[codebot-app] admin solve-level failed:', error)
    res.status(500).json({ error: '智能测试失败' })
  }
})

router.post('/delete-level', authenticateToken, async (req, res) => {
  try {
    const levelId = sanitizeLevelId(req.body?.levelId)
    if (!levelId) {
      return res.status(400).json({ error: 'Missing levelId' })
    }

    const result = await CodebotUserLevel.deleteOne({ userId: req.user.id, levelId })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Level not found' })
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('[codebot-app] delete-level failed:', error)
    res.status(500).json({ error: '删除关卡失败' })
  }
})

// ── 我的关卡 CRUD ──────────────────────────────────────────────

// 获取用户已发布关卡（含完整 content，供游戏启动时加载）
router.get('/codebot/my-published-levels', authenticateToken, async (req, res) => {
  try {
    const records = await CodebotUserLevel.find(
      { userId: req.user.id, isPublished: true },
      { content: 1, levelId: 1 }
    ).sort({ updatedAt: -1 }).lean()

    const levels = records.map(r => {
      try { return JSON.parse(r.content) } catch { return null }
    }).filter(Boolean)

    res.json({ ok: true, levels })
  } catch (error) {
    console.error('[codebot-app] my-published-levels failed:', error)
    res.status(500).json({ error: '获取关卡失败' })
  }
})

// 获取所有用户已发布关卡（社区关卡，无需登录，可选排除指定用户）
// 查询参数：excludeUserId=<number>
router.get('/codebot/community-levels', async (req, res) => {
  try {
    const excludeUserId = req.query.excludeUserId ? Number(req.query.excludeUserId) : null
    const query = { isPublished: true, solutionSteps: { $gte: 10 } }
    if (excludeUserId && !isNaN(excludeUserId)) {
      query.userId = { $ne: excludeUserId }
    }
    const records = await CodebotUserLevel.find(query, { content: 1, levelId: 1, username: 1 })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()

    const levels = records.map(r => {
      try {
        const cfg = JSON.parse(r.content)
        // 附带作者名，便于前端在关卡卡片上展示
        return { ...cfg, _author: r.username }
      } catch { return null }
    }).filter(Boolean)

    res.json({ ok: true, levels })
  } catch (error) {
    console.error('[codebot-app] community-levels failed:', error)
    res.status(500).json({ error: '获取社区关卡失败' })
  }
})

// 获取用户所有关卡
router.get('/codebot/my-levels', authenticateToken, async (req, res) => {
  try {
    const levels = await CodebotUserLevel.find(
      { userId: req.user.id },
      { content: 0 } // 列表不返回 content，减少传输量
    ).sort({ updatedAt: -1 }).lean()

    res.json({ ok: true, levels })
  } catch (error) {
    console.error('[codebot-app] my-levels list failed:', error)
    res.status(500).json({ error: '获取关卡列表失败' })
  }
})

// 获取单个关卡（含 content，用于加载编辑器）
router.get('/codebot/my-levels/:id', authenticateToken, async (req, res) => {
  try {
    const level = await CodebotUserLevel.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean()

    if (!level) return res.status(404).json({ error: '关卡不存在' })
    res.json({ ok: true, level })
  } catch (error) {
    console.error('[codebot-app] my-levels get failed:', error)
    res.status(500).json({ error: '获取关卡失败' })
  }
})

// 切换发布状态
router.patch('/codebot/my-levels/:id/publish', authenticateToken, async (req, res) => {
  try {
    const level = await CodebotUserLevel.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!level) return res.status(404).json({ error: '关卡不存在' })

    // 只有在取消发布，或者关卡已通关验证（solutionSteps >= 1）时才允许发布
    if (!level.isPublished && (level.solutionSteps ?? 0) < 1) {
      return res.status(400).json({ error: '关卡必须先通关验证才能发布' })
    }

    level.isPublished = !level.isPublished
    await level.save()

    res.json({ ok: true, isPublished: level.isPublished })
  } catch (error) {
    console.error('[codebot-app] my-levels publish failed:', error)
    res.status(500).json({ error: '操作失败' })
  }
})

// 删除关卡（通过 _id）
router.delete('/codebot/my-levels/:id', authenticateToken, async (req, res) => {
  try {
    const result = await CodebotUserLevel.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '关卡不存在' })
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('[codebot-app] my-levels delete failed:', error)
    res.status(500).json({ error: '删除关卡失败' })
  }
})

// 管理员删除任意关卡（官方关卡或用户关卡）
router.delete('/codebot/admin/level/:levelId', authenticateToken, async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: '需要管理员权限' })
    }

    const levelId = req.params.levelId
    if (!levelId) {
      return res.status(400).json({ error: '缺少 levelId' })
    }

    // 先尝试从官方关卡集合中删除
    const officialResult = await CodebotLevel.deleteOne({ id: levelId })
    if (officialResult.deletedCount > 0) {
      return res.json({ ok: true, from: 'official' })
    }

    // 再尝试从用户关卡集合中删除
    const userResult = await CodebotUserLevel.deleteOne({ levelId })
    if (userResult.deletedCount > 0) {
      return res.json({ ok: true, from: 'user' })
    }

    res.status(404).json({ error: '关卡不存在' })
  } catch (error) {
    console.error('[codebot-app] admin delete-level failed:', error)
    res.status(500).json({ error: '删除关卡失败' })
  }
})

// POST /codebot/levels/:levelId/complete — 登录用户提交/更新最优成绩
router.post('/codebot/levels/:levelId/complete', authenticateToken, async (req, res) => {
  const { levelId } = req.params
  const { totalCommands, executionSteps, solution } = req.body

  if (typeof totalCommands !== 'number' || typeof executionSteps !== 'number'
      || !Number.isInteger(totalCommands) || !Number.isInteger(executionSteps)
      || totalCommands < 0 || executionSteps < 0) {
    return res.status(400).json({ ok: false, error: '参数无效' })
  }

  try {
    const userId = req.user.id
    const username = req.user.username || req.user.name || String(userId)

    // 提交前：查本关当前全服最佳（排除自己）
    const globalBestEntry = await CodebotResult.findOne({ levelId, userId: { $ne: userId } })
      .sort({ totalCommands: 1 }).select('totalCommands').lean()
    const previousBest = globalBestEntry?.totalCommands ?? null

    const existing = await CodebotResult.findOne({ userId, levelId })
    let saved = false
    if (existing) {
      const isBetter =
        totalCommands < existing.totalCommands ||
        (totalCommands === existing.totalCommands && executionSteps < existing.executionSteps)
      if (isBetter) {
        existing.totalCommands = totalCommands
        existing.executionSteps = executionSteps
        existing.completedAt = new Date()
        if (solution !== undefined) existing.solution = solution
        await existing.save()
        saved = true
      } else if (!existing.solution && solution !== undefined && totalCommands <= existing.totalCommands) {
        // 历史记录缺少解法快照：补存（不改分数/排名）
        existing.solution = solution
        await existing.save()
      }
    } else {
      await CodebotResult.create({ userId, username, levelId, totalCommands, executionSteps, solution })
      saved = true
    }

    // 计算"被你拉低星级"的人数
    let isNewBest = false
    let demotedCount = 0
    if (saved && previousBest !== null && totalCommands < previousBest) {
      isNewBest = true
      // 旧 3 星范围：totalCommands <= previousBest；新 3 星：<= 我的新成绩
      // 被降级者：totalCommands in (我的成绩, previousBest]
      demotedCount = await CodebotResult.countDocuments({
        levelId,
        userId: { $ne: userId },
        totalCommands: { $gt: totalCommands, $lte: previousBest },
      })
    } else if (saved && previousBest === null) {
      isNewBest = true  // 本关第一个提交的人
    }

    res.json({ ok: true, isNewBest, demotedCount })
  } catch (error) {
    console.error('[codebot-app] submit-complete failed:', error)
    res.status(500).json({ ok: false, error: '提交失败' })
  }
})

// GET /codebot/levels/:levelId/leaderboard — 公开排行榜（前10名 + 当前用户名次）
router.get('/codebot/levels/:levelId/leaderboard', optionalAuthenticateToken, async (req, res) => {
  const { levelId } = req.params
  try {
    const currentUserId = req.user?.id ?? null
    const leaderboard = await buildLevelLeaderboard(levelId, currentUserId)
    res.json({
      ok: true,
      bestTotalCommands: leaderboard.bestTotalCommands,
      data: leaderboard.topEntries.map((entry) => serializeLevelEntry(entry, currentUserId)),
      myEntry: leaderboard.myEntry ? serializeLevelEntry(leaderboard.myEntry, currentUserId) : null,
    })
  } catch (error) {
    console.error('[codebot-app] leaderboard failed:', error)
    res.status(500).json({ ok: false, error: '获取排行榜失败' })
  }
})

// GET /codebot/leaderboard/overall — 按总星数统计的总排行
router.get('/codebot/leaderboard/overall', optionalAuthenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user?.id ?? null
    const leaderboard = await buildOverallStarLeaderboard(currentUserId)
    res.json({
      ok: true,
      data: leaderboard.topEntries,
      myEntry: leaderboard.myEntry,
    })
  } catch (error) {
    console.error('[codebot-app] overall leaderboard failed:', error)
    res.status(500).json({ ok: false, error: '获取总排行失败' })
  }
})

// GET /codebot/levels/:levelId/my-solution — 获取当前用户在该关的最优解（需登录）
router.get('/codebot/levels/:levelId/my-solution', authenticateToken, async (req, res) => {
  const { levelId } = req.params
  try {
    const userId = req.user.id
    const record = await CodebotResult.findOne({ userId, levelId })
      .select('solution totalCommands executionSteps')
      .lean()
    if (!record) return res.json({ ok: true, solution: null })
    res.json({ ok: true, solution: record.solution ?? null, totalCommands: record.totalCommands, executionSteps: record.executionSteps })
  } catch (error) {
    console.error('[codebot-app] my-solution failed:', error)
    res.status(500).json({ ok: false, error: '获取失败' })
  }
})

// GET /codebot/admin/stats — 管理员统计（需管理员权限）
router.get('/codebot/admin/stats', authenticateToken, async (req, res) => {
  const isAdminUser = req.user.role === 'admin' || req.user.priv === -1
  if (!isAdminUser) return res.status(403).json({ error: '需要管理员权限' })

  try {
    // 读取事件日志
    const lines = fs.existsSync(EVENTS_FILE)
      ? fs.readFileSync(EVENTS_FILE, 'utf8').split('\n').filter(Boolean)
      : []
    const events = lines.map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)

    const daily = {}
    const dailyIps = {}
    const levelCompletions = {}

    for (const ev of events) {
      const day = new Date(ev.t || Date.now()).toISOString().slice(0, 10)
      daily[day] ||= { game_start: 0, level_complete: 0 }
      daily[day][ev.event] = (daily[day][ev.event] || 0) + 1
      dailyIps[day] ||= new Set()
      if (ev.ip) dailyIps[day].add(ev.ip)
      if (ev.event === 'level_complete' && ev.levelId) {
        levelCompletions[ev.levelId] = (levelCompletions[ev.levelId] || 0) + 1
      }
    }

    // 最近 30 条通关记录（来自 MongoDB，含用户名）
    const recentResults = await CodebotResult.find({})
      .sort({ completedAt: -1 })
      .limit(30)
      .lean()

    // 最近 50 条通关事件（来自 NDJSON，含匿名用户）
    const recentEvents = events
      .filter(ev => ev.event === 'level_complete')
      .sort((a, b) => (b.t || 0) - (a.t || 0))
      .slice(0, 50)
      .map(ev => ({
        t: ev.t || null,
        ip: ev.ip ? ev.ip.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.*.*') : null,
        levelId: ev.levelId || null,
        username: ev.username || null,
      }))

    res.json({
      ok: true,
      total_events: events.length,
      daily: Object.entries(daily).sort().map(([day, counts]) => ({
        day,
        game_start: counts.game_start || 0,
        level_complete: counts.level_complete || 0,
        unique_ips: dailyIps[day]?.size || 0,
      })),
      level_completions: levelCompletions,
      recent_results: recentResults.map(r => ({
        username: r.username,
        levelId: r.levelId,
        totalCommands: r.totalCommands,
        executionSteps: r.executionSteps,
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      })),
      recent_events: recentEvents,
    })
  } catch (error) {
    console.error('[codebot-app] admin/stats failed:', error)
    res.status(500).json({ ok: false, error: '获取统计失败' })
  }
})

export default router