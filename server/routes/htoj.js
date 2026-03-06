/**
 * server/routes/htoj.js
 * 核桃OJ (htoj.com.cn) 比赛抓取路由
 *
 * API:
 *   GET /api/htoj/contest?url=https://htoj.com.cn/cpp/oj/contest/detail?cid=...
 *   GET /api/htoj/problem?url=https://htoj.com.cn/cpp/oj/problem/detail?pid=...&cid=...
 */

import express from 'express'
import axios from 'axios'
import { authenticateToken } from '../middleware/auth.js'
import { HTOJ_PHONE, HTOJ_PWD } from '../config.js'

const router = express.Router()

// ─── Token 缓存（有效期约 7 天，提前 10 分钟续期）────────────────────────────
let cachedToken = null
let tokenExpireAt = 0  // Unix ms

/** XOR(101) 编码，htoj 登录密钥混淆 */
function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

/** 登录并缓存 JWT Token */
async function getHtojToken() {
  const now = Date.now()
  if (cachedToken && now < tokenExpireAt) return cachedToken

  if (!HTOJ_PHONE || !HTOJ_PWD) {
    throw new Error('未配置 HTOJ_PHONE / HTOJ_PWD，请在 server/.env 中配置核桃OJ账号')
  }

  const r = await axios.post(
    'https://api.hetao101.com/login/v2/account/oauth/password',
    { phoneNumber: xl(HTOJ_PHONE), password: xl(HTOJ_PWD), countryCode: '86', short: false },
    {
      headers: {
        'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
        'app_id': 'com.hetao101.oj', 'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  )

  const token = r.data?.data?.token
  if (!token) throw new Error(`核桃OJ 登录失败: ${JSON.stringify(r.data).slice(0, 200)}`)

  cachedToken = token
  tokenExpireAt = now + 6 * 24 * 60 * 60 * 1000  // 缓存 6 天
  console.log('[htoj] 登录成功，Token 已缓存')
  return token
}

/** 构造 API 请求 Headers */
function htojHeaders(token) {
  return {
    'Authorization': token,
    'HT_PLATFORM': 'htojWeb',
    'HT_SYSTEM': 'web',
    'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'Hetao-Oj-Zone': 'cpp',
    'Origin': 'https://htoj.com.cn',
    'Referer': 'https://htoj.com.cn/',
    'Content-Type': 'application/json'
  }
}

const HTOJ_API = 'https://api.htoj.com.cn'

// ─── 比赛抓取 ─────────────────────────────────────────────────────────────────

/**
 * 从 htoj 比赛 URL 提取 cid
 * 支持: https://htoj.com.cn/cpp/oj/contest/detail?cid=22666004139776
 */
function parseHtojCid(url) {
  const m = url.match(/[?&]cid=(\d+)/)
  return m ? m[1] : null
}

/**
 * 从 htoj 题目 URL 提取 pid 和 cid
 * 支持: https://htoj.com.cn/cpp/oj/problem/detail?pid=22663958373760&cid=22666004139776
 */
function parseHtojProblemIds(url) {
  const pidM = url.match(/[?&]pid=(\d+)/)
  const cidM = url.match(/[?&]cid=(\d+)/)
  const problemIdM = url.match(/[?&]problemId=(\d+)/)
  return {
    pid: pidM?.[1] || problemIdM?.[1] || null,
    cid: cidM?.[1] || null
  }
}

/** 拉取比赛信息 + 题目列表 */
async function fetchHtojContest(url) {
  const cid = parseHtojCid(url)
  if (!cid) throw new Error('无法从 URL 中解析核桃OJ 比赛 ID (cid)')

  const token = await getHtojToken()
  const h = htojHeaders(token)

  // 并行请求比赛信息和题目列表
  const [infoResp, problemResp] = await Promise.all([
    axios.get(`${HTOJ_API}/api/code-community/api/get-contest-info?cid=${cid}`, { headers: h, timeout: 15000 }),
    axios.get(`${HTOJ_API}/api/code-community/api/get-contest-problem?cid=${cid}&currentPage=1&limit=50`, { headers: h, timeout: 15000 })
  ])

  if (infoResp.data.errCode !== 0) throw new Error(`获取比赛信息失败: errCode=${infoResp.data.errCode}`)
  if (problemResp.data.errCode !== 0) throw new Error(`获取题目列表失败: errCode=${problemResp.data.errCode}`)

  const info = infoResp.data.data
  const records = problemResp.data.data?.records || []

  const problems = records.map(p => ({
    label: p.indexTitle || String(p.displayId),
    title: p.displayTitle,
    // pid 作为 problemId 参数，cid 一起
    url: `https://htoj.com.cn/cpp/oj/problem/detail?pid=${p.pid}&cid=${cid}`,
    pid: String(p.pid),
    problemId: p.problemId  // 短ID, e.g. P11715
  }))

  if (problems.length === 0) throw new Error('未找到题目列表，比赛可能不存在或尚未开始')

  return {
    contestId: cid,
    contestTitle: info.title || `htoj-${cid}`,
    problems
  }
}

/** 拉取单道题目完整内容 */
async function fetchHtojProblem(url) {
  const { pid, cid } = parseHtojProblemIds(url)
  if (!pid) throw new Error('无法从 URL 中解析题目 ID (pid/problemId)')
  if (!cid) throw new Error('核桃OJ 题目必须提供比赛 ID (cid) 参数')

  const token = await getHtojToken()
  const h = htojHeaders(token)

  // API 用 problemId=<numeric pid> 和 cid
  const r = await axios.get(
    `${HTOJ_API}/api/htoj-biz-gateway/api/get-problem-detail?problemId=${pid}&cid=${cid}`,
    { headers: h, timeout: 15000 }
  )

  if (r.data.errCode !== 0) {
    throw new Error(`获取题目内容失败: errCode=${r.data.errCode}, ${r.data.errMsg || ''}`)
  }

  const data = r.data.data
  const base = data.problemBaseVO || {}
  const ojDetail = data.problemOjDetailVO || {}

  const title = base.title || `题目-${pid}`
  // content 已经是 Markdown 格式，包含 ### 题目描述, ### 输入格式, ### 输出格式, 样例 等
  const content = base.content || ''

  // 拼接时间/内存限制头部（如果不在 content 中）
  const limits = [
    ojDetail.timeLimit ? `**时间限制**: ${ojDetail.timeLimit}ms` : '',
    ojDetail.memoryLimit ? `**内存限制**: ${ojDetail.memoryLimit}MB` : ''
  ].filter(Boolean).join(' / ')

  const fullContent = limits
    ? `> ${limits}\n\n${content}`
    : content

  return {
    title,
    content: fullContent,
    url,
    problemId: base.problemId || '',  // P11715
    timeLimit: ojDetail.timeLimit,
    memoryLimit: ojDetail.memoryLimit,
    source: base.source?.name || ''
  }
}

// ─── 路由 ─────────────────────────────────────────────────────────────────────

/** GET /api/htoj/contest?url=... */
router.get('/contest', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!/htoj\.com\.cn/i.test(url)) return res.status(400).json({ error: '仅支持 htoj.com.cn 链接' })

  try {
    return res.json(await fetchHtojContest(url))
  } catch (err) {
    console.error('[htoj] contest fetch error:', err.message)
    const code = err.response?.status
    if (code === 404) return res.status(404).json({ error: '比赛不存在 (404)' })
    if (code === 403) return res.status(403).json({ error: '无权访问，比赛可能需要登录' })
    res.status(500).json({ error: `抓取失败: ${err.message}` })
  }
})

/** GET /api/htoj/problem?url=... */
router.get('/problem', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!/htoj\.com\.cn/i.test(url)) return res.status(400).json({ error: '仅支持 htoj.com.cn 链接' })

  try {
    return res.json(await fetchHtojProblem(url))
  } catch (err) {
    console.error('[htoj] problem fetch error:', err.message)
    const code = err.response?.status
    res.status(500).json({ error: `抓取题目失败: ${err.message}` })
  }
})

/** GET /api/htoj/status  — 检查 token 是否有效 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const token = await getHtojToken()
    res.json({ ok: true, tokenCached: !!token, expiresAt: new Date(tokenExpireAt).toISOString() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── 导出核心函数供其他路由使用（如 atcoder.js 统一 URL 分发）──────────────
export { fetchHtojContest, fetchHtojProblem, parseHtojCid, parseHtojProblemIds }

export default router
