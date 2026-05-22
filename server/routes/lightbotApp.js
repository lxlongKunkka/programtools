import express from 'express'
import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { fileURLToPath } from 'url'
import { MAIL_CONFIG } from '../config.js'
import { authenticateToken } from '../middleware/auth.js'
import LightbotUserLevel from '../models/LightbotUserLevel.js'
import LightbotLevel from '../models/LightbotLevel.js'
import LightbotResult from '../models/LightbotResult.js'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EVENTS_DIR = path.join(__dirname, '../logs')
const EVENTS_FILE = path.join(EVENTS_DIR, 'lightbot-events.ndjson')
const SUBMISSIONS_FILE = path.join(EVENTS_DIR, 'lightbot-submissions.ndjson')

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
router.get('/lightbot/levels', async (_req, res) => {
  try {
    const levels = await LightbotLevel.find({}, { _id: 0, __v: 0 })
      .sort({ sortOrder: 1 })
      .lean()
    res.json({ ok: true, levels })
  } catch (err) {
    console.error('[lightbot] GET /lightbot/levels error:', err)
    res.status(500).json({ ok: false, error: 'Failed to load levels' })
  }
})

router.post('/track', (req, res) => {
  try {
    appendNdjson(EVENTS_FILE, {
      t: Date.now(),
      ip: getRequesterIp(req),
      ...(req.body || {}),
    })
  } catch (error) {
    console.error('[lightbot-app] track failed:', error)
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
    console.error('[lightbot-app] stats failed:', error)
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
    console.error('[lightbot-app] submit append failed:', error)
  }

  const mailer = maybeCreateMailer()
  if (mailer) {
    try {
      const recipients = MAIL_CONFIG.to.split(',').map((item) => item.trim()).filter(Boolean)
      await mailer.sendMail({
        from: MAIL_CONFIG.from,
        to: recipients.join(', '),
        subject: `Lightbot 关卡投稿：${title}`,
        text: [
          '收到一条新的 Lightbot 关卡投稿。',
          '',
          `关卡名称：${title}`,
          `作者昵称：${author}`,
          `预览链接：${url}`,
        ].join('\n'),
      })
    } catch (error) {
      console.error('[lightbot-app] submit mail failed:', error)
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

    await LightbotUserLevel.findOneAndUpdate(
      { userId, levelId },
      { userId, username, levelId, title, content, solutionSteps, isPublished: true, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.json({ ok: true })
  } catch (error) {
    console.error('[lightbot-app] save-level failed:', error)
    res.status(500).json({ error: '保存关卡失败' })
  }
})

router.post('/delete-level', authenticateToken, async (req, res) => {
  try {
    const levelId = sanitizeLevelId(req.body?.levelId)
    if (!levelId) {
      return res.status(400).json({ error: 'Missing levelId' })
    }

    const result = await LightbotUserLevel.deleteOne({ userId: req.user.id, levelId })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Level not found' })
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('[lightbot-app] delete-level failed:', error)
    res.status(500).json({ error: '删除关卡失败' })
  }
})

// ── 我的关卡 CRUD ──────────────────────────────────────────────

// 获取用户已发布关卡（含完整 content，供游戏启动时加载）
router.get('/lightbot/my-published-levels', authenticateToken, async (req, res) => {
  try {
    const records = await LightbotUserLevel.find(
      { userId: req.user.id, isPublished: true },
      { content: 1, levelId: 1 }
    ).sort({ updatedAt: -1 }).lean()

    const levels = records.map(r => {
      try { return JSON.parse(r.content) } catch { return null }
    }).filter(Boolean)

    res.json({ ok: true, levels })
  } catch (error) {
    console.error('[lightbot-app] my-published-levels failed:', error)
    res.status(500).json({ error: '获取关卡失败' })
  }
})

// 获取所有用户已发布关卡（社区关卡，无需登录，可选排除指定用户）
// 查询参数：excludeUserId=<number>
router.get('/lightbot/community-levels', async (req, res) => {
  try {
    const excludeUserId = req.query.excludeUserId ? Number(req.query.excludeUserId) : null
    const query = { isPublished: true, solutionSteps: { $gte: 10 } }
    if (excludeUserId && !isNaN(excludeUserId)) {
      query.userId = { $ne: excludeUserId }
    }
    const records = await LightbotUserLevel.find(query, { content: 1, levelId: 1, username: 1 })
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
    console.error('[lightbot-app] community-levels failed:', error)
    res.status(500).json({ error: '获取社区关卡失败' })
  }
})

// 获取用户所有关卡
router.get('/lightbot/my-levels', authenticateToken, async (req, res) => {
  try {
    const levels = await LightbotUserLevel.find(
      { userId: req.user.id },
      { content: 0 } // 列表不返回 content，减少传输量
    ).sort({ updatedAt: -1 }).lean()

    res.json({ ok: true, levels })
  } catch (error) {
    console.error('[lightbot-app] my-levels list failed:', error)
    res.status(500).json({ error: '获取关卡列表失败' })
  }
})

// 获取单个关卡（含 content，用于加载编辑器）
router.get('/lightbot/my-levels/:id', authenticateToken, async (req, res) => {
  try {
    const level = await LightbotUserLevel.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean()

    if (!level) return res.status(404).json({ error: '关卡不存在' })
    res.json({ ok: true, level })
  } catch (error) {
    console.error('[lightbot-app] my-levels get failed:', error)
    res.status(500).json({ error: '获取关卡失败' })
  }
})

// 切换发布状态
router.patch('/lightbot/my-levels/:id/publish', authenticateToken, async (req, res) => {
  try {
    const level = await LightbotUserLevel.findOne({
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
    console.error('[lightbot-app] my-levels publish failed:', error)
    res.status(500).json({ error: '操作失败' })
  }
})

// 删除关卡（通过 _id）
router.delete('/lightbot/my-levels/:id', authenticateToken, async (req, res) => {
  try {
    const result = await LightbotUserLevel.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: '关卡不存在' })
    }

    res.json({ ok: true })
  } catch (error) {
    console.error('[lightbot-app] my-levels delete failed:', error)
    res.status(500).json({ error: '删除关卡失败' })
  }
})

// 管理员删除任意关卡（官方关卡或用户关卡）
router.delete('/lightbot/admin/level/:levelId', authenticateToken, async (req, res) => {
  try {
    const isAdminUser = req.user.role === 'admin' || req.user.priv === -1
    if (!isAdminUser) {
      return res.status(403).json({ error: '需要管理员权限' })
    }

    const levelId = req.params.levelId
    if (!levelId) {
      return res.status(400).json({ error: '缺少 levelId' })
    }

    // 先尝试从官方关卡集合中删除
    const officialResult = await LightbotLevel.deleteOne({ id: levelId })
    if (officialResult.deletedCount > 0) {
      return res.json({ ok: true, from: 'official' })
    }

    // 再尝试从用户关卡集合中删除
    const userResult = await LightbotUserLevel.deleteOne({ levelId })
    if (userResult.deletedCount > 0) {
      return res.json({ ok: true, from: 'user' })
    }

    res.status(404).json({ error: '关卡不存在' })
  } catch (error) {
    console.error('[lightbot-app] admin delete-level failed:', error)
    res.status(500).json({ error: '删除关卡失败' })
  }
})

// POST /lightbot/levels/:levelId/complete — 登录用户提交/更新最优成绩
router.post('/lightbot/levels/:levelId/complete', authenticateToken, async (req, res) => {
  const { levelId } = req.params
  const { totalCommands, executionSteps } = req.body

  if (typeof totalCommands !== 'number' || typeof executionSteps !== 'number'
      || !Number.isInteger(totalCommands) || !Number.isInteger(executionSteps)
      || totalCommands < 0 || executionSteps < 0) {
    return res.status(400).json({ ok: false, error: '参数无效' })
  }

  try {
    const userId = req.user.id
    const username = req.user.username || req.user.name || String(userId)
    const existing = await LightbotResult.findOne({ userId, levelId })
    if (existing) {
      const isBetter =
        totalCommands < existing.totalCommands ||
        (totalCommands === existing.totalCommands && executionSteps < existing.executionSteps)
      if (isBetter) {
        existing.totalCommands = totalCommands
        existing.executionSteps = executionSteps
        existing.completedAt = new Date()
        await existing.save()
      }
    } else {
      await LightbotResult.create({ userId, username, levelId, totalCommands, executionSteps })
    }
    res.json({ ok: true })
  } catch (error) {
    console.error('[lightbot-app] submit-complete failed:', error)
    res.status(500).json({ ok: false, error: '提交失败' })
  }
})

// GET /lightbot/levels/:levelId/leaderboard — 公开排行榜（前10名）
router.get('/lightbot/levels/:levelId/leaderboard', async (req, res) => {
  const { levelId } = req.params
  try {
    const results = await LightbotResult.find({ levelId })
      .sort({ totalCommands: 1, executionSteps: 1, completedAt: 1 })
      .limit(10)
      .lean()
    res.json({
      ok: true,
      data: results.map((r, i) => ({
        rank: i + 1,
        username: r.username,
        totalCommands: r.totalCommands,
        executionSteps: r.executionSteps,
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      })),
    })
  } catch (error) {
    console.error('[lightbot-app] leaderboard failed:', error)
    res.status(500).json({ ok: false, error: '获取排行榜失败' })
  }
})

export default router