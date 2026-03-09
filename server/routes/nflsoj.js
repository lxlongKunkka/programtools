/**
 * server/routes/nflsoj.js
 * NFLSOJ (nflsoi.cc:20035，基于 SYZOJ 框架) 比赛抓取路由
 *
 * API:
 *   GET /api/nflsoj/contest?url=http://nflsoi.cc:20035/contest/2341
 *   GET /api/nflsoj/problem?url=http://nflsoi.cc:20035/contest/2341/problem/1
 */

import express from 'express'
import axios from 'axios'
import crypto from 'crypto'
import { load } from 'cheerio'
import { authenticateToken } from '../middleware/auth.js'
import { NFLSOJ_USER, NFLSOJ_PWD } from '../config.js'

const router = express.Router()

const NFLSOJ_BASE = 'http://nflsoi.cc:20035'
const SYZOJ_SALT = 'syzoj2_xxx'

// ─── 会话缓存（SYZOJ 使用 connect.sid + login cookie）─────────────────────────
let cachedCookies = ''
let sessionExpireAt = 0  // Unix ms

/** 登录并缓存 session cookie */
async function getNflsojSession() {
  const now = Date.now()
  if (cachedCookies && now < sessionExpireAt) return cachedCookies

  if (!NFLSOJ_USER || !NFLSOJ_PWD) {
    throw new Error('未配置 NFLSOJ_USER / NFLSOJ_PWD，请在 server/.env 中配置')
  }

  const hashedPwd = crypto.createHash('md5').update(NFLSOJ_PWD + SYZOJ_SALT).digest('hex')
  const body = new URLSearchParams({ username: NFLSOJ_USER, password: hashedPwd }).toString()

  const r = await axios.post(`${NFLSOJ_BASE}/api/login`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      'Referer': NFLSOJ_BASE,
    },
    maxRedirects: 0,
    validateStatus: s => s < 600,
    timeout: 10000
  })

  // 解析 set-cookie
  const setCookies = r.headers['set-cookie'] || []
  if (!setCookies.length) throw new Error('NFLSOJ 登录失败：未返回 cookie')

  // 验证 error_code（1 = 成功，1001 = 用户不存在，1002 = 密码错误）
  let body2
  try { body2 = typeof r.data === 'string' ? JSON.parse(r.data) : r.data } catch { body2 = r.data }
  if (body2?.error_code && body2.error_code !== 1) {
    throw new Error(`NFLSOJ 登录失败：error_code=${body2.error_code}`)
  }

  cachedCookies = setCookies.map(c => c.split(';')[0]).join('; ')
  sessionExpireAt = now + 4 * 60 * 60 * 1000  // 缓存 4 小时
  console.log('[nflsoj] 登录成功，session 已缓存')
  return cachedCookies
}

/** 构造请求 Headers */
function nflsojHeaders(cookies) {
  return {
    Cookie: cookies,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': NFLSOJ_BASE,
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  }
}

/** 通用请求（自动带 session）*/
async function nflsojGet(path) {
  const cookies = await getNflsojSession()
  const r = await axios.get(NFLSOJ_BASE + path, {
    headers: nflsojHeaders(cookies),
    responseType: 'text',
    transformResponse: [d => d],
    validateStatus: s => s < 600,
    timeout: 15000
  })
  if (r.status === 403) throw new Error('NFLSOJ 无权访问（403），请更新账号权限')
  if (r.status === 404) throw new Error(`NFLSOJ 页面不存在（404）: ${path}`)
  if (r.status >= 400) throw new Error(`NFLSOJ 请求失败，HTTP ${r.status}`)
  return r.data
}

// ─── URL 解析 ─────────────────────────────────────────────────────────────────

/**
 * 从比赛 URL 中提取 contestId
 * 支持:
 *   http://nflsoi.cc:20035/contest/2341
 *   http://nflsoi.cc:20035/contest/2341/problems
 */
function parseNflsojContestId(url) {
  const m = url.match(/\/contest\/(\d+)/)
  return m ? m[1] : null
}

/**
 * 从题目 URL 中提取 contestId + problemNumber
 * 支持:
 *   http://nflsoi.cc:20035/contest/2341/problem/1
 */
function parseNflsojProblemIds(url) {
  const m = url.match(/\/contest\/(\d+)\/problem\/(\d+)/)
  return m ? { contestId: m[1], problemNumber: m[2] } : null
}

// ─── 代码提取（从提交详情页的 HTML 中）────────────────────────────────────────

/**
 * 从 SYZOJ 提交页面 HTML 提取源代码
 * SYZOJ 将 source-highlight 渲染后的代码嵌入 JS 变量：
 *   let unformattedCode = "...html...";
 * 去掉 HTML tags 后即为纯代码文本。
 */
function extractCodeFromSubmissionHtml(html) {
  const m = html.match(/(?:let|const|var)\s+unformattedCode\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/)
  if (!m) return null
  try {
    const rawHtml = JSON.parse('"' + m[1] + '"')
    return rawHtml
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
  } catch {
    return null
  }
}

// ─── 题目内容解析（cheerio）───────────────────────────────────────────────────

/**
 * 将 SYZOJ 题目页面的 HTML 转换为 Markdown
 * 主要内容在 class 包含 "font-content" 的 div 中
 */
function parseProblemContent($) {
  // 主内容容器：SYZOJ 渲染的题目 HTML 在 .font-content 里
  let $content = $('.font-content').first()
  if (!$content.length) $content = $('[class*="content"]').first()

  if (!$content.length) return ''

  let md = ''

  // 遍历子节点
  function processNode(el) {
    const tag = el.tagName?.toLowerCase()
    const $el = $(el)

    if (el.type === 'text') {
      return el.data || ''
    }

    // SVG 数学公式：替换为 [公式]
    if (tag === 'svg' || ($el.attr('role') === 'img' && $el.find('path').length)) {
      return '[公式]'
    }

    // 段落
    if (tag === 'p') {
      const text = processChildren(el)
      return text.trim() ? text.trim() + '\n\n' : ''
    }

    // 标题
    if (tag === 'h1') return `# ${processChildren(el).trim()}\n\n`
    if (tag === 'h2') return `## ${processChildren(el).trim()}\n\n`
    if (tag === 'h3') return `### ${processChildren(el).trim()}\n\n`
    if (tag === 'h4') return `#### ${processChildren(el).trim()}\n\n`

    // 代码块（样例输入/输出）
    if (tag === 'pre') {
      const codeText = $el.text()
      return '```\n' + codeText + '\n```\n\n'
    }

    // 行内代码
    if (tag === 'code') return '`' + $el.text() + '`'

    // 强调
    if (tag === 'strong' || tag === 'b') return '**' + processChildren(el) + '**'
    if (tag === 'em' || tag === 'i') return '*' + processChildren(el) + '*'

    // 列表
    if (tag === 'ul') {
      let s = ''
      $el.children('li').each((_, li) => { s += `- ${processChildren(li).trim()}\n` })
      return s + '\n'
    }
    if (tag === 'ol') {
      let s = ''
      $el.children('li').each((i, li) => { s += `${i + 1}. ${processChildren(li).trim()}\n` })
      return s + '\n'
    }

    // 表格
    if (tag === 'table') {
      let s = ''
      $el.find('tr').each((i, tr) => {
        const cells = []
        $(tr).find('td, th').each((_, td) => cells.push(processChildren(td).trim().replace(/\n/g, ' ')))
        s += '| ' + cells.join(' | ') + ' |\n'
        if (i === 0) s += '| ' + cells.map(() => '---').join(' | ') + ' |\n'
      })
      return s + '\n'
    }

    // 线
    if (tag === 'hr') return '---\n\n'

    // 换行
    if (tag === 'br') return '\n'

    // img
    if (tag === 'img') {
      const src = $el.attr('src') || ''
      const alt = $el.attr('alt') || ''
      if (!src) return ''
      const fullSrc = src.startsWith('//') ? 'http:' + src : src.startsWith('/') ? NFLSOJ_BASE + src : src
      return `\n![${alt}](${fullSrc})\n`
    }

    // div/span/section 等容器：递归处理子节点
    return processChildren(el)
  }

  function processChildren(el) {
    let s = ''
    $(el).contents().each((_, child) => { s += processNode(child) })
    return s
  }

  md = processChildren($content[0])

  // 清理多余空行
  return md.replace(/\n{3,}/g, '\n\n').trim()
}

// ─── 核心抓取函数 ─────────────────────────────────────────────────────────────

/**
 * 抓取 NFLSOJ 比赛信息和题目列表
 */
export async function fetchNflsojContest(url) {
  const contestId = parseNflsojContestId(url)
  if (!contestId) throw new Error('无法从 URL 中解析 NFLSOJ 比赛 ID')

  const html = await nflsojGet(`/contest/${contestId}`)

  // 提取比赛标题："S+图论综合 - 比赛 - NFLSOJ" → "S+图论综合"
  const titleMatch = html.match(/<title>([^<]+)<\/title>/)
  const rawTitle = titleMatch?.[1]?.trim() || ''
  const contestTitle = rawTitle.split(' - ')[0]?.trim() || `NFLSOJ-${contestId}`

  // 提取题目链接和名称
  const problemMap = new Map()
  const linkRe = /href="(\/contest\/\d+\/problem\/(\d+))"[^>]*>([^<]+)<\/a>/g
  let m
  while ((m = linkRe.exec(html)) !== null) {
    const problemNumber = m[2]
    const label = m[3].trim()
    if (!problemMap.has(problemNumber)) {
      problemMap.set(problemNumber, {
        label,
        title: label,
        url: `${NFLSOJ_BASE}/contest/${contestId}/problem/${problemNumber}`,
        problemNumber,
      })
    }
  }

  const problems = [...problemMap.values()].sort((a, b) => Number(a.problemNumber) - Number(b.problemNumber))

  if (problems.length === 0) throw new Error('未找到题目列表，比赛可能不存在或无权访问')

  return {
    contestId,
    contestTitle,
    problems,
    url: `${NFLSOJ_BASE}/contest/${contestId}`,
  }
}

/**
 * 抓取 NFLSOJ 题目完整内容（含标题、题面文字、样例）
 */
export async function fetchNflsojProblem(url) {
  const ids = parseNflsojProblemIds(url)
  if (!ids) throw new Error('无法从 URL 中解析 NFLSOJ 题目地址，格式应为 /contest/:id/problem/:n')
  const { contestId, problemNumber } = ids

  const html = await nflsojGet(`/contest/${contestId}/problem/${problemNumber}`)
  const $ = load(html)

  // 提取题目标题（<title> = "A. 次短路 - 比赛名 - 比赛 - NFLSOJ"）
  const rawTitle = $('title').text().trim()
  const title = rawTitle.split(' - ')[0]?.trim() || `题目 ${problemNumber}`

  // 提取正文内容
  const content = parseProblemContent($)

  return {
    title,
    content,
    url: `${NFLSOJ_BASE}/contest/${contestId}/problem/${problemNumber}`,
    contestId,
    problemNumber,
  }
}

/**
 * 抓取 NFLSOJ 某道题目的一道 AC 代码（优先 C++）
 * @param {string} contestId
 * @param {string} problemNumber  题目在比赛中的序号（1-indexed）
 * @returns {string|null} 源代码字符串，或 null
 */
export async function fetchNflsojAcCode(contestId, problemNumber) {
  // 获取该题 AC 提交列表
  const listHtml = await nflsojGet(`/contest/${contestId}/submissions?problem_id=${problemNumber}&status=Accepted`)
  const itemMatch = listHtml.match(/const itemList = (\[[\s\S]*?\]);/)
  if (!itemMatch) throw new Error('NFLSOJ：无法解析提交列表（itemList）')

  let items
  try { items = JSON.parse(itemMatch[1]) } catch { throw new Error('NFLSOJ：提交列表 JSON 解析失败') }

  if (!items.length) return null

  // 优先选 C++ 提交
  const sorted = [...items].sort((a, b) => {
    const aIsCpp = /[Cc]\+\+|cpp/i.test(a.info.language || '')
    const bIsCpp = /[Cc]\+\+|cpp/i.test(b.info.language || '')
    if (aIsCpp && !bIsCpp) return -1
    if (!aIsCpp && bIsCpp) return 1
    return 0
  })

  const subId = sorted[0].info.submissionId

  // 获取提交详情页（代码嵌入在页面 HTML 里）
  const subHtml = await nflsojGet(`/submission/${subId}`)
  const code = extractCodeFromSubmissionHtml(subHtml)
  if (!code) throw new Error(`NFLSOJ：无法从提交 #${subId} 页面提取代码`)

  return code
}

// ─── 路由 ─────────────────────────────────────────────────────────────────────

/** GET /api/nflsoj/contest?url=... */
router.get('/contest', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!/nflsoi\.cc/i.test(url)) return res.status(400).json({ error: '仅支持 nflsoi.cc 链接' })

  try {
    return res.json(await fetchNflsojContest(url))
  } catch (err) {
    console.error('[nflsoj] contest fetch error:', err.message)
    res.status(500).json({ error: `抓取失败: ${err.message}` })
  }
})

/** GET /api/nflsoj/problem?url=... */
router.get('/problem', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!/nflsoi\.cc/i.test(url)) return res.status(400).json({ error: '仅支持 nflsoi.cc 链接' })

  try {
    return res.json(await fetchNflsojProblem(url))
  } catch (err) {
    console.error('[nflsoj] problem fetch error:', err.message)
    res.status(500).json({ error: `抓取题目失败: ${err.message}` })
  }
})

/** GET /api/nflsoj/ac-code?contestId=2341&problemNumber=1 */
router.get('/ac-code', authenticateToken, async (req, res) => {
  const { contestId, problemNumber } = req.query
  if (!contestId || !problemNumber) return res.status(400).json({ error: '缺少 contestId 或 problemNumber 参数' })

  try {
    const code = await fetchNflsojAcCode(contestId, problemNumber)
    if (!code) return res.status(404).json({ error: '未找到 AC 提交' })
    return res.json({ code })
  } catch (err) {
    console.error('[nflsoj] ac-code fetch error:', err.message)
    res.status(500).json({ error: `抓取代码失败: ${err.message}` })
  }
})

/** GET /api/nflsoj/status — 检查 session 是否有效 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const cookies = await getNflsojSession()
    res.json({ ok: true, user: NFLSOJ_USER, expiresAt: new Date(sessionExpireAt).toISOString() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

export default router
