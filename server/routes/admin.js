import express from 'express'
import nodemailer from 'nodemailer'
import cron from 'node-cron'
import fs from 'fs'
import path from 'path'
import { MAIL_CONFIG, DIRS } from '../config.js'
import { debugLog, ensureLogsDir } from '../utils/logger.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { markdownToPlainText } from '../utils/gesp/objectiveImport.js'
import User from '../models/User.js'
import AppSetting from '../models/AppSetting.js'
import QuizQuestion from '../models/QuizQuestion.js'
import QuizQuestionIssue, { ISSUE_STATUSES, ISSUE_TYPES } from '../models/QuizQuestionIssue.js'

const router = express.Router()
const QUIZ_REVIEW_STATUSES = ['pending', 'reviewed', 'rejected']

// Protect all admin routes
router.use(authenticateToken, requireRole('admin'))

function normalizeQuizAnswer(answer, question) {
  const rawAnswer = String(answer || '').trim()
  if (!rawAnswer) return ''

  if (question.type === 'judge') {
    const normalized = rawAnswer.toLowerCase()
    if (['true', 't', '1', 'yes', 'y', '对', '正确'].includes(normalized)) return 'true'
    if (['false', 'f', '0', 'no', 'n', '错', '错误'].includes(normalized)) return 'false'
    return rawAnswer
  }

  return rawAnswer.toUpperCase()
}

function normalizeQuizTags(value) {
  const rawItems = Array.isArray(value)
    ? value
    : String(value || '')
      .split(/[\n,，、]/)

  return [...new Set(rawItems
    .map((item) => String(item || '').trim())
    .filter(Boolean))]
}

function normalizeQuizStem(value) {
  return String(value || '').trim()
}

function normalizeQuizOptions(value, questionType) {
  if (questionType === 'judge') {
    return []
  }

  const rawItems = Array.isArray(value) ? value : []
  const normalized = rawItems
    .map((item, index) => {
      const key = String(item?.key || '').trim().toUpperCase() || String.fromCharCode(65 + index)
      const text = String(item?.text || '').trim()
      return {
        key,
        text,
        textPlain: markdownToPlainText(text),
        images: Array.isArray(item?.images) ? item.images.filter(Boolean) : []
      }
    })
    .filter((item) => item.key && item.text)

  if (normalized.length < 2) {
    throw new Error('单选题至少需要 2 个有效选项')
  }

  const keys = normalized.map((item) => item.key)
  if (new Set(keys).size !== keys.length) {
    throw new Error('选项标识不能重复')
  }

  return normalized
}

function buildQuizQuestionAdminPayload(question) {
  return {
    questionUid: question.questionUid,
    paperUid: question.paperUid,
    source: question.source,
    sourceDocId: question.sourceDocId,
    paperQuestionNo: question.paperQuestionNo,
    type: question.type,
    stem: question.stem,
    stemText: question.stemText,
    options: question.options || [],
    answer: question.answer || '',
    explanation: question.explanation || '',
    explanationText: question.explanationText || '',
    tags: question.tags || [],
    levelTag: question.levelTag || '',
    reviewStatus: question.reviewStatus || 'pending',
    enabled: question.enabled !== false,
    updatedAt: question.updatedAt || null
  }
}

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
    const settings = await AppSetting.findById('global').lean()
    // 未找到时返回默认值，不写入 DB（避免 GET 有写入副作用）
    res.json({ gamesEnabled: settings ? settings.gamesEnabled !== false : true })
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

router.get('/quiz-issues', async (req, res) => {
  try {
    const pageNum = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
    const limitNum = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 20))
    const status = String(req.query.status || '').trim()
    const issueType = String(req.query.issueType || '').trim()
    const keyword = String(req.query.q || '').trim()

    const query = {}
    if (ISSUE_STATUSES.includes(status)) {
      query.status = status
    }
    if (ISSUE_TYPES.includes(issueType)) {
      query.issueType = issueType
    }
    if (keyword) {
      query.$or = [
        { questionUid: { $regex: keyword, $options: 'i' } },
        { sourceTitle: { $regex: keyword, $options: 'i' } },
        { stemPreview: { $regex: keyword, $options: 'i' } },
        { reporterName: { $regex: keyword, $options: 'i' } },
        { detail: { $regex: keyword, $options: 'i' } }
      ]
    }

    const [items, total, statusStats] = await Promise.all([
      QuizQuestionIssue.find(query)
        .sort({ status: 1, reportedAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      QuizQuestionIssue.countDocuments(query),
      QuizQuestionIssue.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ])

    const questionUids = [...new Set(items.map((item) => item.questionUid).filter(Boolean))]
    const questions = await QuizQuestion.find(
      { questionUid: { $in: questionUids } },
      'questionUid enabled reviewStatus updatedAt tags levelTag'
    ).lean()
    const questionMap = new Map(questions.map((item) => [item.questionUid, item]))

    res.json({
      items: items.map((item) => {
        const question = questionMap.get(item.questionUid)
        return {
          ...item,
          questionEnabled: question ? question.enabled !== false : false,
          questionReviewStatus: question?.reviewStatus || '',
          questionUpdatedAt: question?.updatedAt || null,
          questionTags: question?.tags || item.tags || [],
          questionLevelTag: question?.levelTag || item.levelTag || ''
        }
      }),
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      statusStats: statusStats.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/quiz-questions/:questionUid', async (req, res) => {
  try {
    const questionUid = String(req.params.questionUid || '').trim()
    if (!questionUid) {
      return res.status(400).json({ error: '缺少 questionUid' })
    }

    const question = await QuizQuestion.findOne({ questionUid }).lean()
    if (!question) {
      return res.status(404).json({ error: '题目不存在' })
    }

    res.json({ item: buildQuizQuestionAdminPayload(question) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/quiz-questions/:questionUid', async (req, res) => {
  try {
    const questionUid = String(req.params.questionUid || '').trim()
    if (!questionUid) {
      return res.status(400).json({ error: '缺少 questionUid' })
    }

    const question = await QuizQuestion.findOne({ questionUid })
    if (!question) {
      return res.status(404).json({ error: '题目不存在' })
    }

    const nextUpdate = {}
    let touched = false
    const body = req.body || {}

    if (Object.prototype.hasOwnProperty.call(body, 'stem')) {
      const stem = normalizeQuizStem(body.stem)
      if (!stem) {
        return res.status(400).json({ error: '题干不能为空' })
      }
      if (stem.length > 20000) {
        return res.status(400).json({ error: '题干内容不能超过 20000 个字符' })
      }
      nextUpdate.stem = stem
      nextUpdate.stemText = markdownToPlainText(stem)
      touched = true
    }

    if (Object.prototype.hasOwnProperty.call(body, 'options')) {
      try {
        nextUpdate.options = normalizeQuizOptions(body.options, question.type)
      } catch (optionError) {
        return res.status(400).json({ error: optionError.message || '选项不合法' })
      }
      touched = true
    }

    if (Object.prototype.hasOwnProperty.call(body, 'answer')) {
      const normalizedAnswer = normalizeQuizAnswer(body.answer, question)
      if (!normalizedAnswer) {
        return res.status(400).json({ error: '答案不能为空' })
      }

      const effectiveOptions = nextUpdate.options || question.options || []

      if (question.type === 'single') {
        const validAnswers = new Set(effectiveOptions.map((item) => String(item.key || '').trim().toUpperCase()).filter(Boolean))
        if (validAnswers.size > 0 && !validAnswers.has(normalizedAnswer)) {
          return res.status(400).json({ error: `答案必须是现有选项：${[...validAnswers].join(' / ')}` })
        }
      }

      if (question.type === 'judge' && !['true', 'false'].includes(normalizedAnswer)) {
        return res.status(400).json({ error: '判断题答案只能是 true 或 false' })
      }

      nextUpdate.answer = normalizedAnswer
      touched = true
    }

    if (Object.prototype.hasOwnProperty.call(body, 'explanation')) {
      const explanation = String(body.explanation || '').trim()
      if (explanation.length > 20000) {
        return res.status(400).json({ error: '解析内容不能超过 20000 个字符' })
      }
      nextUpdate.explanation = explanation
      nextUpdate.explanationText = markdownToPlainText(explanation)
      touched = true
    }

    if (Object.prototype.hasOwnProperty.call(body, 'tags')) {
      nextUpdate.tags = normalizeQuizTags(body.tags)
      touched = true
    }

    if (Object.prototype.hasOwnProperty.call(body, 'levelTag')) {
      const levelTag = String(body.levelTag || '').trim()
      if (levelTag.length > 100) {
        return res.status(400).json({ error: '级别标签不能超过 100 个字符' })
      }
      nextUpdate.levelTag = levelTag
      touched = true
    }

    if (Object.prototype.hasOwnProperty.call(body, 'reviewStatus')) {
      const reviewStatus = String(body.reviewStatus || '').trim()
      if (!QUIZ_REVIEW_STATUSES.includes(reviewStatus)) {
        return res.status(400).json({ error: 'reviewStatus 不合法' })
      }
      nextUpdate.reviewStatus = reviewStatus
      touched = true
    }

    if (Object.prototype.hasOwnProperty.call(body, 'enabled')) {
      if (typeof body.enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled 必须是布尔值' })
      }
      nextUpdate.enabled = body.enabled
      touched = true
    }

    if (!touched) {
      return res.status(400).json({ error: '没有可更新的字段' })
    }

    Object.assign(question, nextUpdate)
    await question.save()

    await QuizQuestionIssue.updateMany(
      { questionUid },
      {
        $set: {
          tags: question.tags || [],
          levelTag: question.levelTag || ''
        }
      }
    )

    res.json({ item: buildQuizQuestionAdminPayload(question) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/quiz-issues/:id', async (req, res) => {
  try {
    const issue = await QuizQuestionIssue.findById(req.params.id)
    if (!issue) {
      return res.status(404).json({ error: '反馈记录不存在' })
    }

    const nextStatus = String(req.body?.status || '').trim()
    const adminNote = req.body?.adminNote
    const questionEnabled = req.body?.questionEnabled
    const nextUpdate = {}
    let touched = false

    if (nextStatus) {
      if (!ISSUE_STATUSES.includes(nextStatus)) {
        return res.status(400).json({ error: 'status 不合法' })
      }
      nextUpdate.status = nextStatus
      nextUpdate.handledAt = new Date()
      nextUpdate.handledBy = req.user.id
      nextUpdate.handledByName = req.user.username || ''
      touched = true
    }

    if (typeof adminNote === 'string') {
      if (adminNote.trim().length > 500) {
        return res.status(400).json({ error: '管理员备注不能超过 500 个字符' })
      }
      nextUpdate.adminNote = adminNote.trim()
      nextUpdate.handledAt = new Date()
      nextUpdate.handledBy = req.user.id
      nextUpdate.handledByName = req.user.username || ''
      touched = true
    }

    if (!touched && typeof questionEnabled !== 'boolean') {
      return res.status(400).json({ error: '没有可更新的字段' })
    }

    if (touched) {
      await QuizQuestionIssue.updateOne({ _id: issue._id }, { $set: nextUpdate })
    }

    if (typeof questionEnabled === 'boolean') {
      await QuizQuestion.updateOne(
        { questionUid: issue.questionUid },
        { $set: { enabled: questionEnabled } }
      )
    }

    const refreshedIssue = await QuizQuestionIssue.findById(issue._id).lean()
    const refreshedQuestion = await QuizQuestion.findOne(
      { questionUid: issue.questionUid },
      'questionUid enabled reviewStatus updatedAt tags levelTag'
    ).lean()

    res.json({
      success: true,
      item: {
        ...refreshedIssue,
        questionEnabled: refreshedQuestion ? refreshedQuestion.enabled !== false : false,
        questionReviewStatus: refreshedQuestion?.reviewStatus || '',
        questionUpdatedAt: refreshedQuestion?.updatedAt || null,
        questionTags: refreshedQuestion?.tags || refreshedIssue?.tags || [],
        questionLevelTag: refreshedQuestion?.levelTag || refreshedIssue?.levelTag || ''
      }
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
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
