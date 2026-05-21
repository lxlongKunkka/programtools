import express from 'express'
import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { fileURLToPath } from 'url'
import { MAIL_CONFIG } from '../config.js'

const router = express.Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const EVENTS_DIR = path.join(__dirname, '../logs')
const EVENTS_FILE = path.join(EVENTS_DIR, 'lightbot-events.ndjson')
const SUBMISSIONS_FILE = path.join(EVENTS_DIR, 'lightbot-submissions.ndjson')
const SAVED_LEVELS_DIR = path.join(__dirname, '../temp_lightbot_levels')

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function appendNdjson(filePath, payload) {
  ensureDir(path.dirname(filePath))
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8')
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

router.post('/save-level', (req, res) => {
  try {
    const levelId = sanitizeLevelId(req.body?.levelId)
    const content = String(req.body?.content || '')
    if (!levelId || !content) {
      return res.status(400).json({ error: 'Missing levelId or content' })
    }

    ensureDir(SAVED_LEVELS_DIR)
    const targetPath = path.join(SAVED_LEVELS_DIR, `${levelId}.json`)
    fs.writeFileSync(targetPath, content, 'utf8')
    res.json({ ok: true, path: targetPath.replace(/\\/g, '/') })
  } catch (error) {
    console.error('[lightbot-app] save-level failed:', error)
    res.status(500).json({ error: '保存关卡失败' })
  }
})

router.post('/delete-level', (req, res) => {
  try {
    const levelId = sanitizeLevelId(req.body?.levelId)
    if (!levelId) {
      return res.status(400).json({ error: 'Missing levelId' })
    }

    const targetPath = path.join(SAVED_LEVELS_DIR, `${levelId}.json`)
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Level not found' })
    }

    fs.unlinkSync(targetPath)
    res.json({ ok: true })
  } catch (error) {
    console.error('[lightbot-app] delete-level failed:', error)
    res.status(500).json({ error: '删除关卡失败' })
  }
})

export default router