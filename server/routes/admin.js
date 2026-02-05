import express from 'express'
import nodemailer from 'nodemailer'
import cron from 'node-cron'
import fs from 'fs'
import path from 'path'
import { MAIL_CONFIG, DIRS } from '../config.js'
import { debugLog, ensureLogsDir } from '../utils/logger.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import User from '../models/User.js'
import AppSetting from '../models/AppSetting.js'

const router = express.Router()

// Protect all admin routes
router.use(authenticateToken, requireRole('admin'))

// Get all users with pagination and search
router.get('/users', async (req, res) => {
  try {
    const { q, role, page = 1, limit = 20 } = req.query
    const pageNum = Math.max(1, parseInt(page))
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)))
    
    let query = {}
    if (q) {
      const keyword = String(q).trim()
      
      if (/^\d+$/.test(keyword)) {
        query = { _id: parseInt(keyword, 10) }
      } else {
        query = {
          $or: [
            { uname: { $regex: keyword, $options: 'i' } },
            { mail: { $regex: keyword, $options: 'i' } }
          ]
        }
      }
    }

    if (role) {
      if (role === 'user') {
        // Users who are not admin, teacher, or premium
        query.role = { $in: ['user', null, undefined] }
        query.priv = { $ne: -1 }
      } else {
        query.role = role
      }
    }

    const total = await User.countDocuments(query)
    const users = await User.find(query, 'uname priv mail _id role')
      .sort({ _id: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean()

    const usersWithRoles = users.map(u => {
      const isAdmin = u.priv === -1 || u.uname === 'admin' || u.role === 'admin'
      const isTeacher = u.role === 'teacher'
      const isPremium = u.role === 'premium'
      
      // Normalize role for frontend
      let r = u.role || 'user'
      if (isAdmin) r = 'admin'
      
      return { ...u, role: r, isTeacher, isPremium, isAdmin }
    })
      
    res.json({
      users: usersWithRoles,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum)
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update user role
router.post('/users/:id/role', async (req, res) => {
  try {
    const { role, enable } = req.body
    
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    
    debugLog(`Updating user ${user.uname} (${user._id}) role: ${role}, enable: ${enable}`)
    
    if (enable === false) {
        // If disabling a role, revert to 'user'
        // But only if the current role matches the one being disabled
        if (user.role === role) {
            user.role = 'user'
        }
    } else {
        // Enabling a role
        if (role === 'teacher' || role === 'premium' || role === 'admin') {
            user.role = role
        } else if (role === 'user') {
            user.role = 'user'
        }
    }
    
    await user.save()
    res.json({ message: 'Role updated' })
  } catch (e) {
    console.error('Update role error:', e)
    res.status(500).json({ error: e.message })
  }
})

// Get app settings (admin)
router.get('/settings', async (req, res) => {
  try {
    let settings = await AppSetting.findById('global').lean()
    if (!settings) {
      settings = await AppSetting.create({ _id: 'global', gamesEnabled: true, updatedAt: new Date() })
    }
    res.json({ gamesEnabled: settings.gamesEnabled !== false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Update app settings (admin)
router.post('/settings', async (req, res) => {
  try {
    const { gamesEnabled } = req.body || {}
    if (typeof gamesEnabled !== 'boolean') {
      return res.status(400).json({ error: 'gamesEnabled must be boolean' })
    }
    const settings = await AppSetting.findByIdAndUpdate(
      'global',
      { gamesEnabled, updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean()
    res.json({ gamesEnabled: settings.gamesEnabled !== false })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

async function sendDailyReport(dateStr) {
  await ensureLogsDir()
  let d
  if (dateStr) {
    const [y,m,dd] = dateStr.split('-').map(x=>parseInt(x,10))
    d = new Date(y, (m||1)-1, dd||1)
  } else {
    const now = new Date()
    d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1)
  }
  const fname = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.log`
  const file = path.join(DIRS.logs, fname)
  let raw = ''
  try { raw = await fs.promises.readFile(file, 'utf8') } catch {}

  const lines = raw ? raw.trim().split(/\n+/) : []
  const total = lines.length
  let byPath = {}
  let byModel = {}
  let byStatus = {}
  let ipCount = {}
  let userCount = {}
  let avgMs = 0
  let sumMs = 0
  for (const ln of lines) {
    try {
      const obj = JSON.parse(ln)
      sumMs += Number(obj.duration_ms)||0
      const p = obj.path || 'unknown'
      byPath[p] = (byPath[p]||0)+1
      const m = obj.model || 'unknown'
      byModel[m] = (byModel[m]||0)+1
      const s = Number(obj.status)||0
      byStatus[s] = (byStatus[s]||0)+1
      const ip = (obj.ip||'unknown')
      ipCount[ip] = (ipCount[ip]||0)+1
      const u = obj.username || 'anonymous'
      userCount[u] = (userCount[u]||0)+1
    } catch {}
  }
  avgMs = total ? Math.round(sumMs/total) : 0

  const topIPs = Object.entries(ipCount)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10)

  const reportText = [
    `日期: ${fname.replace('.log','')}`,
    `总请求数: ${total}`,
    `平均耗时(ms): ${avgMs}`,
    `失败请求数(状态>=400): ${Object.entries(byStatus).filter(([k])=>Number(k)>=400).reduce((acc, [,v])=>acc+v,0)}`,
    '',
    '按用户统计:',
    ...Object.entries(userCount).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`- ${k}: ${v}`),
    '',
    '按路径统计:',
    ...Object.entries(byPath).map(([k,v])=>`- ${k}: ${v}`),
    '',
    '按模型统计:',
    ...Object.entries(byModel).map(([k,v])=>`- ${k}: ${v}`),
    '',
    '按状态统计:',
    ...Object.entries(byStatus).map(([k,v])=>`- ${k}: ${v}`),
    '',
    'Top IP (前10):',
    ...topIPs.map(([k,v])=>`- ${k}: ${v}`)
  ].join('\n')

  const transporter = nodemailer.createTransport({
    host: MAIL_CONFIG.host,
    port: MAIL_CONFIG.port,
    secure: MAIL_CONFIG.secure,
    auth: MAIL_CONFIG.user ? {
      user: MAIL_CONFIG.user,
      pass: MAIL_CONFIG.pass
    } : undefined
  })

  const from = MAIL_CONFIG.from
  const to = MAIL_CONFIG.to
  if (!to) { debugLog('MAIL_TO missing; skip sending') ; return }

  const attachments = raw ? [{ filename: fname, content: raw }] : []
  let csv = 'ts,method,path,status,duration_ms,model,req_body,res_body\n'
  try {
    for (const ln of lines) {
      try {
        const o = JSON.parse(ln)
        const esc = (v) => {
          const s = (v === undefined || v === null) ? '' : String(v)
          const needsQuote = /[",\r\n]/.test(s)
          const q = s.replace(/"/g, '""')
          return needsQuote ? `"${q}"` : q
        }
        csv += [
          esc(o.ts), esc(o.method), esc(o.path), esc(o.status), esc(o.duration_ms), esc(o.model), esc(o.req_body), esc(o.res_body)
        ].join(',') + '\n'
      } catch {}
    }
  } catch {}

  if (lines.length) {
    const csvWithBOM = "\uFEFF" + csv
    attachments.push({ filename: fname.replace('.log', '.csv'), content: csvWithBOM })
  }
  const info = await transporter.sendMail({
    from,
    to,
    subject: `程序工具 - 使用日志日报 (${fname.replace('.log','')})`,
    text: reportText,
    attachments
  })
  debugLog('Daily report sent:', info.messageId)
}

router.post('/send-daily-report', async (req, res) => {
  try {
    const { date } = req.body || {}
    await sendDailyReport(date)
    return res.json({ ok: true })
  } catch (e) {
    console.error('send-daily-report error:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

router.post('/send-test-email', async (req, res) => {
  try {
    const to = (req.body && req.body.to) || MAIL_CONFIG.to || ''
    if (!to) return res.status(400).json({ ok: false, error: '缺少收件人：请在 body.to 或 MAIL_TO 配置' })

    const transporter = nodemailer.createTransport({
      host: MAIL_CONFIG.host,
      port: MAIL_CONFIG.port,
      secure: MAIL_CONFIG.secure,
      auth: MAIL_CONFIG.user ? {
        user: MAIL_CONFIG.user,
        pass: MAIL_CONFIG.pass
      } : undefined
    })

    const from = MAIL_CONFIG.from
    const info = await transporter.sendMail({
      from,
      to,
      subject: '程序工具 - 测试邮件',
      text: `这是一封测试邮件。时间：${new Date().toISOString()}`
    })
    return res.json({ ok: true, messageId: info.messageId })
  } catch (e) {
    console.error('send-test-email error:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
})

// Init cron
try {
  const cronExp = MAIL_CONFIG.cron
  cron.schedule(cronExp, async () => {
    try { await sendDailyReport() } catch (e) { console.error('cron sendDailyReport failed:', e) }
  })
  debugLog('Cron scheduled:', cronExp)
} catch (e) {
  debugLog('cron init failed', e)
}

// --- Prompts Management ---

// Get list of prompt files
router.get('/prompts/list', async (req, res) => {
  try {
    const promptsDir = path.resolve(process.cwd(), 'server/prompts')
    if (!fs.existsSync(promptsDir)) {
      return res.json({ files: [] })
    }
    const files = await fs.promises.readdir(promptsDir)
    // Filter only .js files
    const jsFiles = files.filter(f => f.endsWith('.js'))
    res.json({ files: jsFiles })
  } catch (err) {
    console.error('List prompts error:', err)
    res.status(500).json({ error: 'Failed to list prompt files' })
  }
})

// Get specific prompt file content
router.get('/prompts', async (req, res) => {
  try {
    const { filename } = req.query
    let promptsPath
    
    if (filename) {
      // Security check: prevent directory traversal
      const safeFilename = path.basename(filename)
      promptsPath = path.resolve(process.cwd(), 'server/prompts', safeFilename)
    } else {
      // Fallback to old behavior or default file? 
      // Let's default to translate.js if no filename provided, or error.
      // But for backward compatibility with my previous edit, let's handle the case where frontend might not send filename yet.
      // Actually, I will update frontend too.
      return res.status(400).json({ error: 'Filename is required' })
    }
    
    if (!fs.existsSync(promptsPath)) {
        return res.status(404).json({ error: 'Prompts file not found' })
    }

    const content = await fs.promises.readFile(promptsPath, 'utf-8')
    res.json({ content })
  } catch (err) {
    console.error('Read prompts error:', err)
    res.status(500).json({ error: 'Failed to read prompts file' })
  }
})

// Update prompts file content
router.post('/prompts', async (req, res) => {
  try {
    const { content, filename } = req.body
    if (!content) return res.status(400).json({ error: 'Content is required' })
    if (!filename) return res.status(400).json({ error: 'Filename is required' })
    
    const safeFilename = path.basename(filename)
    const promptsPath = path.resolve(process.cwd(), 'server/prompts', safeFilename)
    
    // Create a backup
    const backupPath = promptsPath + '.bak-' + Date.now()
    await fs.promises.copyFile(promptsPath, backupPath)
    
    await fs.promises.writeFile(promptsPath, content, 'utf-8')
    res.json({ success: true })
  } catch (err) {
    console.error('Save prompts error:', err)
    res.status(500).json({ error: 'Failed to save prompts file' })
  }
})

export default router
