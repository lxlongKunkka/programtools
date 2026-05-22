/**
 * Lightbot 关卡投稿 API（服务器端，Node.js v22+）
 * 监听 http://127.0.0.1:4201
 * Caddy 反代：/api/submit-level → 此服务
 * 运行方式：node --env-file=/root/lightbot/.env.local server/submit-api.mjs
 */

import { createServer } from 'node:http'
import { appendFileSync, readFileSync, existsSync } from 'node:fs'
import nodemailer from 'nodemailer'

const PORT = 4201
const EVENTS_FILE = '/data/bot-events.ndjson'
const { MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS, MAIL_FROM, MAIL_TO } = process.env

if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS || !MAIL_TO) {
  console.error('[submit-api] 缺少 SMTP 配置，退出')
  process.exit(1)
}

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT) || 465,
  secure: MAIL_SECURE !== 'false',
  auth: { user: MAIL_USER, pass: MAIL_PASS },
})

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  if (req.method === 'POST' && req.url === '/api/submit-level') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      let payload
      try { payload = JSON.parse(body) } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: '请求格式错误' }))
        return
      }

      const { title, author, url } = payload
      if (!title || !url) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: '缺少必要字段' }))
        return
      }

      const recipients = MAIL_TO.split(',').map((s) => s.trim()).filter(Boolean)
      transporter.sendMail({
        from: MAIL_FROM || MAIL_USER,
        to: recipients.join(', '),
        subject: `关卡投稿：${title}`,
        text: [
          '您好，有用户通过 Lightbot 投稿了一个自制关卡。',
          '',
          `关卡名称：${title}`,
          `作者昵称：${author || '匿名'}`,
          `预览链接：${url}`,
          '',
          '管理员打开链接后可在编辑器中测试，通过审核后直接保存为官方关卡。',
        ].join('\n'),
      }).then(() => {
        console.log(`[submit-api] 投稿邮件已发送：${title}`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      }).catch((e) => {
        console.error('[submit-api] 发送失败:', e.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: '邮件发送失败，请稍后再试' }))
      })
    })
  } else if (req.method === 'POST' && req.url === '/api/track') {
    // 游戏行为打点：写入 NDJSON
    const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').toString().split(',')[0].trim()
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        const line = JSON.stringify({ t: Date.now(), ip, ...payload }) + '\n'
        appendFileSync(EVENTS_FILE, line, 'utf8')
      } catch { /* 忽略格式错误 */ }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })

  } else if (req.method === 'GET' && req.url === '/api/stats') {
    // 统计汇总：读取 NDJSON 并聚合
    try {
      const lines = existsSync(EVENTS_FILE)
        ? readFileSync(EVENTS_FILE, 'utf8').trim().split('\n').filter(Boolean)
        : []
      const events = lines.map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)

      const todayStr = new Date().toISOString().slice(0, 10)
      const daily = {}
      const levelCompletions = {}
      const dailyIps = {}

      for (const ev of events) {
        const day = new Date(ev.t).toISOString().slice(0, 10)
        if (!daily[day]) daily[day] = {}
        daily[day][ev.event] = (daily[day][ev.event] ?? 0) + 1
        if (ev.event === 'level_complete' && ev.levelId) {
          levelCompletions[ev.levelId] = (levelCompletions[ev.levelId] ?? 0) + 1
        }
        if (!dailyIps[day]) dailyIps[day] = new Set()
        if (ev.ip) dailyIps[day].add(ev.ip)
      }

      const dailyUnique = Object.fromEntries(
        Object.entries(dailyIps).map(([d, s]) => [d, s.size])
      )

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        total_events: events.length,
        today: todayStr,
        today_visits: daily[todayStr]?.game_start ?? 0,
        today_unique_ips: dailyUnique[todayStr] ?? 0,
        level_completions: levelCompletions,
        daily,
        daily_unique_ips: dailyUnique,
      }, null, 2))
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: e.message }))
    }

  } else {
    res.writeHead(404); res.end()
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[submit-api] 监听 http://127.0.0.1:${PORT}`)
})
