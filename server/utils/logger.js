import fs from 'fs'
import path from 'path'
import { DIRS, DEBUG_LOG } from '../config.js'

export function debugLog(...args) {
  if (DEBUG_LOG) console.log('[debug]', ...args)
}

export async function ensureLogsDir() {
  try { await fs.promises.mkdir(DIRS.logs, { recursive: true }) } catch {}
}

function nowISO() {
  const d = new Date()
  const pad = (n) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export async function appendUsageLog(entry) {
  try {
    await ensureLogsDir()
    const date = new Date()
    const fname = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}.log`
    const file = path.join(DIRS.logs, fname)
    await fs.promises.appendFile(file, JSON.stringify(entry) + '\n', 'utf8')
  } catch (e) {
    debugLog('appendUsageLog failed', e)
  }
}

export const requestLogger = async (req, res, next) => {
  const start = Date.now()
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
  const ua = req.headers['user-agent'] || ''
  const method = req.method
  const pathName = req.path
  
  // 定义需要记录日志的条件
  const isApi = pathName && pathName.startsWith('/api/')
  const isPage = pathName === '/' || pathName === '/index.html'
  const isCourseware = pathName && (pathName.startsWith('/public/courseware/') || pathName.startsWith('/api/public/courseware/'))
  
  const shouldLog = isApi || isPage || isCourseware
  if (!shouldLog) return next()

  const chunks = []
  const origJson = res.json.bind(res)
  res.json = (body) => {
    try { chunks.push(body) } catch {}
    return origJson(body)
  }

  res.on('finish', async () => {
    try {
      const durationMs = Date.now() - start
      let status = res.statusCode
      let model = undefined
      try {
        // 优先从 res.locals 获取模型信息（由路由处理函数设置）
        if (res.locals && res.locals.logModel) {
          model = res.locals.logModel
        }
        // 否则尝试从请求体提取 model 字段
        else if (req.body && typeof req.body === 'object') {
          model = req.body.model
        }
      } catch {}
      // 序列化请求/响应内容（限制长度，避免日志过大）
      const bodyText = (() => {
        try {
          const b = req.body
          const s = typeof b === 'string' ? b : JSON.stringify(b)
          return (s || '').slice(0, 5000)
        } catch { return '' }
      })()
      const respText = (() => {
        try {
          const c = chunks.length ? chunks[chunks.length - 1] : null
          const s = typeof c === 'string' ? c : JSON.stringify(c)
          return (s || '').slice(0, 5000)
        } catch { return '' }
      })()

      const entry = {
        ts: nowISO(),
        method,
        path: pathName,
        status,
        ip,
        ua,
        duration_ms: durationMs,
        model: model || null,
        req_body: bodyText,
        res_body: respText,
        username: req.user ? req.user.username : undefined
      }
      await appendUsageLog(entry)
    } catch (e) { debugLog('log finish failed', e) }
  })

  next()
}
