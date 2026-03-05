import express from 'express'
import axios from 'axios'
import { load } from 'cheerio'
import { authenticateToken } from '../middleware/auth.js'
import { ATCODER_USERNAME, ATCODER_PASSWORD } from '../config.js'

const router = express.Router()

const sleep = ms => new Promise(r => setTimeout(r, ms))

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8'
}

// ─── AtCoder 登录 / Session 缓存 ─────────────────────────────────────────────

// 缓存已登录的 Cookie 字符串，避免每次抓取都重新登录
let _atcoderCookie = ''
let _atcoderCookieExpiry = 0  // Unix ms

/**
 * 登录 AtCoder，返回 Cookie 字符串。
 * AtCoder 使用 CSRF token + POST /login，成功后 Set-Cookie 返回 session。
 */
async function atcoderLogin() {
  if (!ATCODER_USERNAME || !ATCODER_PASSWORD) return ''

  // 1. GET /login → 提取 CSRF token
  const loginPage = await axios.get('https://atcoder.jp/login', {
    headers: HEADERS,
    maxRedirects: 0,
    validateStatus: s => s < 400,
    timeout: 20000
  })
  const $login = load(loginPage.data)
  const csrf = $login('input[name="csrf_token"]').val()
  if (!csrf) {
    console.warn('[AtCoder Login] 未找到 csrf_token')
    return ''
  }

  // 合并 GET 时拿到的 cookie（需要带着它才能 POST）
  const initCookie = (loginPage.headers['set-cookie'] || [])
    .map(c => c.split(';')[0]).join('; ')

  // 2. POST /login
  const params = new URLSearchParams()
  params.append('username', ATCODER_USERNAME)
  params.append('password', ATCODER_PASSWORD)
  params.append('csrf_token', csrf)

  const postResp = await axios.post('https://atcoder.jp/login', params.toString(), {
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': initCookie,
      'Referer': 'https://atcoder.jp/login',
      'Origin': 'https://atcoder.jp'
    },
    maxRedirects: 0,          // 不跟随重定向，直接从 302 响应拿 Set-Cookie
    validateStatus: s => s < 500,
    timeout: 20000
  })

  // 3. 收集所有 Set-Cookie（302 重定向响应里的 cookie）
  const rawCookies = postResp.headers['set-cookie'] || []
  // 正确合并：按 cookie name 去重，POST 返回的覆盖 GET 的
  // 避免两个 REVEL_SESSION= 共存导致服务器取到旧的（未登录）值
  const cookieMap = new Map()
  for (const c of initCookie.split('; ').filter(Boolean)) {
    const name = c.split('=')[0]
    if (name) cookieMap.set(name, c)
  }
  for (const raw of rawCookies) {
    const c = raw.split(';')[0]
    const name = c.split('=')[0]
    if (name) cookieMap.set(name, c)
  }
  const cookieStr = [...cookieMap.values()].filter(Boolean).join('; ')
  const location = postResp.headers['location'] || ''
  console.log(`[AtCoder Login] POST 状态码=${postResp.status}, Location=${location}, Set-Cookie 数量=${rawCookies.length}`)

  // AtCoder 登录成功 → 302 重定向到 /home 或 /；
  // 失败 → 302 重定向回 /login（带 REVEL_FLASH error）
  if (postResp.status !== 302 && postResp.status !== 303) {
    console.warn('[AtCoder Login] 登录后未重定向，可能账号密码有误（或被 AtCoder 封禁）')
    return ''
  }
  if (/\/login/i.test(location)) {
    console.warn(`[AtCoder Login] 登录失败：302 重定向回登录页 (Location=${location})，账号密码有误或被封禁`)
    return ''
  }
  if (!cookieStr) {
    console.warn('[AtCoder Login] 登录后未收到 Cookie，可能账号密码有误')
    return ''
  }

  console.log('[AtCoder Login] 登录成功，Cookie 已缓存')
  return cookieStr
}

/**
 * 获取带有有效 AtCoder session 的请求头。
 * Cookie 缓存 6 小时，超时自动重新登录。
 */
async function getAuthedHeaders() {
  const now = Date.now()
  if (!_atcoderCookie || now > _atcoderCookieExpiry) {
    _atcoderCookie = await atcoderLogin()
    // 登录成功则缓存 6 小时；失败时 5 分钟后重试
    _atcoderCookieExpiry = now + (_atcoderCookie ? 6 * 60 * 60 * 1000 : 5 * 60 * 1000)
  }
  if (!_atcoderCookie) return { ...HEADERS }
  return { ...HEADERS, Cookie: _atcoderCookie }
}

// ─── Platform Detection ───────────────────────────────────────────────────────
function detectPlatform(url) {
  if (/atcoder\.jp/i.test(url)) return 'atcoder'
  if (/codeforces\.com/i.test(url)) return 'codeforces'
  return 'unknown'
}

// SSRF 防护：只允许已知外部竞赛平台域名，拒绝内网/任意地址
const ALLOWED_HOSTS = [
  /^([\w-]+\.)?atcoder\.jp$/i,
  /^([\w-]+\.)?codeforces\.com$/i,
]
function isAllowedUrl(urlStr) {
  try {
    const { protocol, hostname } = new URL(urlStr)
    if (protocol !== 'https:' && protocol !== 'http:') return false
    return ALLOWED_HOSTS.some(re => re.test(hostname))
  } catch {
    return false
  }
}

function parseAtCoderContestId(url) {
  const match = url.match(/atcoder\.jp\/contests\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

// GET /api/atcoder/contest?url=...
// Returns the list of problems in a contest (supports AtCoder / Codeforces)
router.get('/contest', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!isAllowedUrl(url)) return res.status(400).json({ error: '不支持的 URL，仅允许 AtCoder / Codeforces' })

  const platform = detectPlatform(url)
  try {
    if (platform === 'atcoder') return res.json(await fetchAtCoderContest(url))
    if (platform === 'codeforces') return res.json(await fetchCodeforcesContest(url))
    return res.status(400).json({ error: '不支持的平台，目前支持 AtCoder / Codeforces' })
  } catch (err) {
    console.error(`[${platform}] contest fetch error:`, err.message)
    const code = err.response?.status
    if (code === 404) return res.status(404).json({ error: '比赛不存在 (404)' })
    if (code === 403) return res.status(403).json({ error: '无权访问，比赛可能尚未开始' })
    res.status(500).json({ error: `抓取失败: ${code ? `HTTP ${code}` : err.message}` })
  }
})

// GET /api/atcoder/problem?url=...
// Returns parsed problem content as markdown (supports AtCoder / Codeforces)
router.get('/problem', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!isAllowedUrl(url)) return res.status(400).json({ error: '不支持的 URL，仅允许 AtCoder / Codeforces' })

  const platform = detectPlatform(url)
  try {
    if (platform === 'atcoder') return res.json(await fetchAtCoderProblem(url))
    if (platform === 'codeforces') return res.json(await fetchCodeforcesProblem(url))
    return res.status(400).json({ error: '不支持的平台，目前支持 AtCoder / Codeforces' })
  } catch (err) {
    console.error(`[${platform}] problem fetch error:`, err.message)
    const code = err.response?.status
    res.status(500).json({ error: `抓取题目失败: ${code ? `HTTP ${code}` : err.message}` })
  }
})

// GET /api/atcoder/debug-ac?url=...  (临时调试接口，测试 AC 代码抓取流程)
router.get('/debug-ac', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })

  const logs = []
  const log = (...args) => { const msg = args.join(' '); logs.push(msg); console.log(msg) }

  try {
    // Step 1: 测试登录
    log('[debug-ac] Step1: 测试 AtCoder 登录')
    log(`[debug-ac] ATCODER_USERNAME="${ATCODER_USERNAME || '(未配置)'}"`)
    log(`[debug-ac] ATCODER_PASSWORD="${ATCODER_PASSWORD ? '***已配置***' : '(未配置)'}"`)

    if (!ATCODER_USERNAME || !ATCODER_PASSWORD) {
      return res.json({ logs, error: 'ATCODER_USERNAME 或 ATCODER_PASSWORD 未配置' })
    }

    // 强制重新登录（清除缓存）—— 内联诊断版
    _atcoderCookie = ''
    _atcoderCookieExpiry = 0

    // ---- 内联诊断：直接 GET /login 拿 CSRF 并 POST ----
    try {
      const loginPage = await axios.get('https://atcoder.jp/login', {
        headers: HEADERS, maxRedirects: 0, validateStatus: s => s < 400, timeout: 20000
      })
      const $lp = load(loginPage.data)
      const csrf = $lp('input[name="csrf_token"]').val()
      log(`[debug-ac] GET /login 状态码=${loginPage.status}, csrf="${csrf || '(未找到)'}"`)
      const initCookie = (loginPage.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ')
      log(`[debug-ac] GET /login Set-Cookie: ${loginPage.headers['set-cookie']?.join(' | ') || '(无)'}`)

      if (csrf) {
        const params = new URLSearchParams()
        params.append('username', ATCODER_USERNAME)
        params.append('password', ATCODER_PASSWORD)
        params.append('csrf_token', csrf)
        const postResp = await axios.post('https://atcoder.jp/login', params.toString(), {
          headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': initCookie, 'Referer': 'https://atcoder.jp/login', 'Origin': 'https://atcoder.jp' },
          maxRedirects: 0, validateStatus: s => s < 500, timeout: 20000
        })
        log(`[debug-ac] POST /login 状态码=${postResp.status}`)
        log(`[debug-ac] POST /login Location="${postResp.headers['location'] || '(无)'}"`)
        log(`[debug-ac] POST /login Set-Cookie: ${postResp.headers['set-cookie']?.join(' | ') || '(无)'}`)
      }
    } catch (diagErr) {
      log(`[debug-ac] 内联诊断异常: ${diagErr.message}`)
    }
    // ---- 内联诊断结束 ----

    const cookie = await atcoderLogin()
    log(`[debug-ac] 登录结果: cookie="${cookie ? cookie.substring(0, 80) + '...' : '(空，失败，将以无 Cookie 方式继续试 kenkoooo 和公开提交页)'}"`)
    // 注意：登录失败不 early return。kenkoooo 是公开 API 无需登录，ABC 提交详情页也公开可访问。

    // Step 2: 解析题目 URL
    const taskMatch = url.match(/contests\/([a-zA-Z0-9_-]+)\/tasks\/([a-zA-Z0-9_-]+)/)
    if (!taskMatch) return res.json({ logs, error: '无法从 URL 解析 contestId/taskId，请确认是题目页面 URL' })
    const [, contestId, taskId] = taskMatch
    log(`[debug-ac] Step2: contestId=${contestId}, taskId=${taskId}`)

    // Step 3: kenkoooo 真正分页翻页（每页500条，从头翻到找到为止，最多15页）
    const authedHeaders = await getAuthedHeaders()
    let userSubs = []
    let fromSec = 0
    const MAX_PAGES = 15
    for (let page = 0; page < MAX_PAGES; page++) {
      const apiUrl1 = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(ATCODER_USERNAME)}&from_second=${fromSec}`
      log(`[debug-ac] Step3 page=${page} from_second=${fromSec}: ${apiUrl1}`)
      if (page > 0) await sleep(1000)
      let apiResp1
      try {
        apiResp1 = await axios.get(apiUrl1, { headers: { 'User-Agent': HEADERS['User-Agent'] }, timeout: 20000, validateStatus: s => s < 500 })
      } catch (e) {
        log(`[debug-ac] kenkoooo 请求失败(${e.response?.status || e.message})，跳出`)
        break
      }
      if (apiResp1.status === 429) { log('[debug-ac] kenkoooo 429 限流，跳出'); break }
      const batch = (apiResp1.data || [])
      log(`[debug-ac] kenkoooo 返回总条数=${batch.length}`)
      const found = batch.filter(s => s.problem_id === taskId && s.result === 'AC')
      log(`[debug-ac] 用户${ATCODER_USERNAME} 本批 AC提交数=${found.length}`)
      if (found.length > 0) { userSubs = found; break }
      if (batch.length < 500) { log('[debug-ac] 已是最后一页，kenkoooo 无更多数据'); break }
      // 翻页：用最后一条的时间戳+1作为下一页起点
      fromSec = batch[batch.length - 1].epoch_second + 1
    }

    // Step 4: 从找到的 AC 提交里选目标（优先 C++），若 kenkoooo 无记录则爬列表页
    let cppSubs = userSubs.filter(s => s.language && /[Cc]\+\+/.test(s.language))
    if (cppSubs.length === 0) cppSubs = userSubs
    cppSubs.sort((a, b) => b.epoch_second - a.epoch_second)
    let targetSubId = cppSubs[0]?.id

    if (!targetSubId) {
      // 策略1.5：用备用知名用户查 kenkoooo
      log(`[debug-ac] Step4a: kunkka 无记录，尝试用备用知名用户查 kenkoooo`)
      const FALLBACK_USERS = ['qqqaaazzz', 'potato167', 'kotatsugame', 'm_99', 'maspy']
      const fallbackFrom = Math.floor(Date.now() / 1000) - 18 * 30 * 24 * 3600
      for (const fbUser of FALLBACK_USERS) {
        if (targetSubId) break
        let fbFrom = fallbackFrom
        for (let pg = 0; pg < 3; pg++) {
          const fbUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(fbUser)}&from_second=${fbFrom}`
          log(`[debug-ac] 备用用户 ${fbUser} page=${pg}: ${fbUrl}`)
          await sleep(1000)
          let fbResp
          try {
            fbResp = await axios.get(fbUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] }, timeout: 20000, validateStatus: s => s < 500 })
          } catch (e) {
            log(`[debug-ac] 备用用户 ${fbUser} 请求失败(${e.response?.status || e.message})，跳下一用户`)
            break
          }
          if (fbResp.status === 429) { log(`[debug-ac] kenkoooo 429 限流，停止备用用户搜索`); targetSubId = null; break }
          const fbBatch = fbResp.data || []
          log(`[debug-ac] 备用用户 ${fbUser} 返回 ${fbBatch.length} 条`)
          let acSubs = fbBatch.filter(s => s.problem_id === taskId && s.result === 'AC')
          const cppSubs = acSubs.filter(s => s.language && /[Cc]\+\+/.test(s.language))
          if (cppSubs.length > 0) acSubs = cppSubs
          if (acSubs.length > 0) {
            acSubs.sort((a, b) => b.epoch_second - a.epoch_second)
            targetSubId = String(acSubs[0].id)
            log(`[debug-ac] 备用用户 ${fbUser} 找到 AC 提交 id=${targetSubId}`)
            break
          }
          if (fbBatch.length < 500) break
          fbFrom = fbBatch[fbBatch.length - 1].epoch_second + 1
        }
      }
    }

    if (!targetSubId) {
      // 策略2：爬 AtCoder 提交列表页（需要登录）
      log(`[debug-ac] Step4b: 备用用户也无结果，回退到 AtCoder 提交列表页（需要登录）`)
      const listUrlCpp = `https://atcoder.jp/contests/${contestId}/submissions?f.Task=${encodeURIComponent(taskId)}&f.Status=AC&f.Language=C%2B%2B`
      const listUrlAny = `https://atcoder.jp/contests/${contestId}/submissions?f.Task=${encodeURIComponent(taskId)}&f.Status=AC`
      for (const lu of [listUrlCpp, listUrlAny]) {
        log(`[debug-ac] 爬列表页: ${lu}`)
        const lr = await axios.get(lu, { headers: authedHeaders, timeout: 20000 })
        const $l = load(lr.data)
        log(`[debug-ac] 列表页 title=${$l('title').text().trim()}, tbody tr 数=${$l('table tbody tr').length}`)
        $l('table tbody tr').each((_, row) => {
          if (targetSubId) return
          const href = $l(row).find('a[href*="/submissions/"]').last().attr('href') || ''
          const m = href.match(/\/submissions\/(\d+)/)
          if (m) targetSubId = m[1]
        })
        if (targetSubId) break
      }
    }

    log(`[debug-ac] Step4: 目标提交 id=${targetSubId || '(not found)'}`)
    if (!targetSubId) return res.json({ logs, error: '未找到任何 AC 提交' })

    const subHref = `/contests/${contestId}/submissions/${targetSubId}`

    // Step 5: 抓取提交详情页
    const detailUrl = `https://atcoder.jp${subHref}`
    log(`[debug-ac] Step6: 抓取详情页 ${detailUrl}`)
    const detailResp = await axios.get(detailUrl, { headers: authedHeaders, timeout: 20000 })
    const $d = load(detailResp.data)
    log(`[debug-ac] 详情页状态码=${detailResp.status}`)

    const pageTitle = $d('title').text().trim()
    log(`[debug-ac] 详情页 <title>=${pageTitle}`)
    if (/login|ログイン/i.test(pageTitle)) {
      log('[debug-ac] ⚠️  被重定向到登录页，Cookie 可能已失效')
    }

    const code1 = $d('#submission-code').text().trim()
    const code2 = $d('pre.prettyprint').text().trim()
    const code3 = $d('.source-code').text().trim()
    log(`[debug-ac] #submission-code 长度=${code1.length}`)
    log(`[debug-ac] pre.prettyprint 长度=${code2.length}`)
    log(`[debug-ac] .source-code 长度=${code3.length}`)

    const finalCode = code1 || code2 || code3
    log(`[debug-ac] 最终代码长度=${finalCode.length}`)
    return res.json({ logs, codeLength: finalCode.length, codePreview: finalCode.substring(0, 500), detailUrl })
  } catch (e) {
    log(`[debug-ac] 异常: ${e.message}`)
    return res.json({ logs, error: e.message })
  }
})

// ─── AtCoder ─────────────────────────────────────────────────────────────────

async function fetchAtCoderContest(url) {
  const contestId = parseAtCoderContestId(url)
  if (!contestId) throw new Error('无法从 URL 中解析 AtCoder 比赛 ID')

  const tasksUrl = `https://atcoder.jp/contests/${contestId}/tasks`
  const resp = await axios.get(tasksUrl, { headers: HEADERS, timeout: 20000 })
  const $ = load(resp.data)
  const problems = []

  $('table tbody tr').each((i, row) => {
    const cells = $(row).find('td')
    if (cells.length < 2) return
    const labelAnchor = $(cells[0]).find('a')
    const label = labelAnchor.text().trim() || $(cells[0]).text().trim()
    const titleAnchor = $(cells[1]).find('a')
    const title = titleAnchor.text().trim()
    const href = titleAnchor.attr('href') || labelAnchor.attr('href')
    if (href && (label || title)) {
      problems.push({ label, title, taskId: href.split('/').pop(), url: `https://atcoder.jp${href}` })
    }
  })

  if (problems.length === 0) throw new Error('未找到题目，比赛可能尚未开始或 URL 有误')

  const contestTitle =
    $('h1.contest-title').text().trim() ||
    $('title').text().split('-')[0].trim() ||
    contestId

  return { contestId, contestTitle, problems }
}

async function fetchAtCoderProblem(url) {
  const enUrl = url.replace(/[?#].*$/, '') + '?lang=en'
  const resp = await axios.get(enUrl, { headers: HEADERS, timeout: 20000 })
  const $ = load(resp.data)

  // 只取直接文本节点，忽略子元素（如 span.h2 内可能嵌有 <a>Editorial</a>）
  const rawTitle = $('span.h2').first().contents().filter((_, n) => n.type === 'text').text().trim()
  const pageTitle = $('title').text().trim()
  const title = rawTitle || pageTitle.split('-')[0].trim()

  const limitsRow = $('.col-sm-12.col-md-4').text().trim() ||
    $('p').filter((_, el) => /Time Limit|Memory Limit/i.test($(el).text()))
      .map((_, el) => $(el).text().trim()).get().join(' / ')

  let $stmt = $('#task-statement .lang-en')
  const hasEnglish = $stmt.length > 0
  if (!hasEnglish) $stmt = $('#task-statement')

  const content = parseStatement($, $stmt, title, limitsRow)

  // 尝试抓取解题思路（Editorial），失败不影响主流程
  let editorial = ''
  try {
    // 从题目 URL 中提取比赛 ID 和题目标识符
    // e.g. https://atcoder.jp/contests/abc388/tasks/abc388_a  =>  contestId=abc388, taskSuffix=a
    const taskMatch = url.match(/contests\/([a-zA-Z0-9_-]+)\/tasks\/([a-zA-Z0-9_-]+)/)
    if (taskMatch) {
      const contestId = taskMatch[1]
      const taskId = taskMatch[2]  // e.g. abc388_a
      // 题目字母通常是 taskId 最后一段，如 abc388_a => A
      const suffixMatch = taskId.match(/_([a-zA-Z]\d*)$/)
      const label = suffixMatch ? suffixMatch[1].toUpperCase() : taskId
      editorial = await fetchAtCoderEditorial(contestId, label, taskId)
    }
  } catch (e) {
    console.warn('[AtCoder Editorial] 抓取失败（不影响题目）:', e.message)
  }

  // 从提交记录中抓取 AC C++ 代码：优先指定用户，其次任意用户
  let acCode = ''
  try {
    const taskMatch = url.match(/contests\/([a-zA-Z0-9_-]+)\/tasks\/([a-zA-Z0-9_-]+)/)
    if (taskMatch) {
      acCode = await fetchAtCoderAcCode(taskMatch[1], taskMatch[2])
    }
  } catch (e) {
    console.warn('[AtCoder AC] 抓取提交代码失败（不影响题目）:', e.message)
  }

  return { title, content, hasEnglish, url: enUrl, editorial, acCode }
}

// ─── AtCoder AC 提交代码抓取 ──────────────────────────────────────────────────

/**
 * 从提交记录页抓取指定题目的 AC C++ 代码。
 * 策略：优先抓取 ATCODER_USERNAME 的，没有再抓任意用户的。
 */
async function fetchAtCoderAcCode(contestId, taskId) {
  // 依次尝试：指定用户 → 任意用户
  const usersToTry = ATCODER_USERNAME ? [ATCODER_USERNAME, ''] : ['']

  for (const user of usersToTry) {
    try {
      const code = await fetchFirstAcCppSubmission(contestId, taskId, user)
      if (code) {
        console.log(`[AtCoder AC] task=${taskId} 抓到 ${user || '(any user)'} 的 AC 代码`)
        return code
      }
    } catch (e) {
      console.warn(`[AtCoder AC] user="${user || 'any'}" 失败:`, e.message)
    }
  }
  return ''
}

/**
 * 从提交列表中找第一条 AC 提交，再抓取其源码。
 *
 * 策略：
 *  1. 配置用户（kunkka）：kenkoooo 真正分页翻页，每页500条，直到找到或翻完
 *  2. 任意用户 fallback：直接爬 AtCoder 提交列表页（登录 Cookie 已修复，现在可用）
 */
async function fetchFirstAcCppSubmission(contestId, taskId, user) {
  const authedHeaders = await getAuthedHeaders()

  // ── 策略1：kenkoooo 真正分页翻页（仅当指定了具体用户时） ─────────────────
  // user='' 表示"任意用户"，直接跳到策略2，避免重复搜配置账号
  if (user) {
    let fromSecond = 0
    const MAX_PAGES = 30
    for (let page = 0; page < MAX_PAGES; page++) {
      const apiUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(user)}&from_second=${fromSecond}`
      console.log(`[AtCoder AC] kenkoooo page=${page} from_second=${fromSecond}`)
      if (page > 0) await sleep(1000)
      try {
        const apiResp = await axios.get(apiUrl, {
          headers: { 'User-Agent': HEADERS['User-Agent'] },
          timeout: 20000,
          validateStatus: s => s < 500
        })
        if (apiResp.status === 429) { console.warn('[AtCoder AC] kenkoooo 429 限流，跳出'); break }
        const allSubs = apiResp.data || []
        console.log(`[AtCoder AC] 返回 ${allSubs.length} 条`)
        let acSubs = allSubs.filter(s => s.problem_id === taskId && s.result === 'AC')
        const cppSubs = acSubs.filter(s => s.language && /[Cc]\+\+/.test(s.language))
        if (cppSubs.length > 0) acSubs = cppSubs
        if (acSubs.length > 0) {
          acSubs.sort((a, b) => b.epoch_second - a.epoch_second)
          console.log(`[AtCoder AC] task=${taskId} 找到 AC 提交 id=${acSubs[0].id}`)
          return await fetchSubmissionCode(contestId, acSubs[0].id, authedHeaders)
        }
        if (allSubs.length < 500) break  // 已是最后一页
        // 翻页：取本批最后一条时间戳+1作为下一页起点
        fromSecond = allSubs[allSubs.length - 1].epoch_second + 1
      } catch (e) {
        console.warn(`[AtCoder AC] kenkoooo 请求失败: ${e.message}`)
        break
      }
    }
  }

  // ── 策略1.5：kenkoooo 用备用知名用户查（适用于高难度题，kunkka 无提交时）──
  const FALLBACK_USERS = ['qqqaaazzz', 'potato167', 'kotatsugame', 'm_99', 'maspy']
  const fallbackFrom = Math.floor(Date.now() / 1000) - 18 * 30 * 24 * 3600
  for (const fbUser of FALLBACK_USERS) {
    let fbFromSecond = fallbackFrom
    for (let page = 0; page < 3; page++) {
      const apiUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(fbUser)}&from_second=${fbFromSecond}`
      console.log(`[AtCoder AC] 备用用户 ${fbUser} page=${page}`)
      await sleep(1000)
      try {
        const apiResp = await axios.get(apiUrl, {
          headers: { 'User-Agent': HEADERS['User-Agent'] },
          timeout: 20000,
          validateStatus: s => s < 500
        })
        if (apiResp.status === 429) { console.warn('[AtCoder AC] kenkoooo 429 限流，停止备用用户搜索'); return '' }
        const allSubs = apiResp.data || []
        let acSubs = allSubs.filter(s => s.problem_id === taskId && s.result === 'AC')
        const cppSubs = acSubs.filter(s => s.language && /[Cc]\+\+/.test(s.language))
        if (cppSubs.length > 0) acSubs = cppSubs
        if (acSubs.length > 0) {
          acSubs.sort((a, b) => b.epoch_second - a.epoch_second)
          console.log(`[AtCoder AC] 备用用户 ${fbUser} 找到 AC 提交 id=${acSubs[0].id}`)
          return await fetchSubmissionCode(contestId, acSubs[0].id, authedHeaders)
        }
        if (allSubs.length < 500) break
        fbFromSecond = allSubs[allSubs.length - 1].epoch_second + 1
      } catch (e) {
        console.warn(`[AtCoder AC] 备用用户 ${fbUser} 请求失败: ${e.message}`)
        break
      }
    }
  }

  // ── 策略2：爬 AtCoder 提交列表页（需要登录 Cookie）─────────────────────
  console.log(`[AtCoder AC] 回退到 AtCoder 提交列表页（需要登录）`)
  const subId = await findAcSubIdFromListPage(contestId, taskId, authedHeaders, true)
    || await findAcSubIdFromListPage(contestId, taskId, authedHeaders, false)
  if (!subId) return ''
  return await fetchSubmissionCode(contestId, subId, authedHeaders)
}

/**
 * 爬 AtCoder 提交列表页，返回第一条 AC 提交的 ID。
 * URL: /contests/{id}/submissions?f.Task={taskId}&f.Status=AC[&f.Language=C%2B%2B]
 */
async function findAcSubIdFromListPage(contestId, taskId, authedHeaders, cppOnly) {
  let listUrl = `https://atcoder.jp/contests/${contestId}/submissions?f.Task=${encodeURIComponent(taskId)}&f.Status=AC`
  if (cppOnly) listUrl += '&f.Language=C%2B%2B'
  console.log(`[AtCoder AC] 爬提交列表页: ${listUrl}`)

  const resp = await axios.get(listUrl, { headers: authedHeaders, timeout: 20000 })
  const $ = load(resp.data)

  // 提交列表：每行最后一格有"Detail"链接，href="/contests/{id}/submissions/{subId}"
  let subId = null
  $('table tbody tr').each((_, row) => {
    if (subId) return
    const detailLink = $(row).find('a[href*="/submissions/"]').last()
    const href = detailLink.attr('href') || ''
    const m = href.match(/\/submissions\/(\d+)/)
    if (m) subId = m[1]
  })

  console.log(`[AtCoder AC] 列表页找到提交 id=${subId || '(未找到)'}, cppOnly=${cppOnly}`)
  return subId
}

/**
 * 访问提交详情页，抓取源码。
 * AtCoder 提交详情页是服务端渲染，源码在 #submission-code 或 pre.prettyprint 里。
 */
async function fetchSubmissionCode(contestId, subId, authedHeaders) {
  const detailUrl = `https://atcoder.jp/contests/${contestId}/submissions/${subId}`
  console.log(`[AtCoder AC] 抓取提交详情页: ${detailUrl}`)
  const detailResp = await axios.get(detailUrl, { headers: authedHeaders, timeout: 20000 })
  const $d = load(detailResp.data)
  const code = $d('#submission-code').text().trim()
    || $d('pre.prettyprint').text().trim()
    || $d('.source-code').text().trim()
  console.log(`[AtCoder AC] 源码长度=${code.length}`)
  return code
}

/**
 * 从 editorial 索引页面（cheerio 对象）中找到指定题目标签的 editorial 链接。
 *
 * 策略：
 *  1. 找到所有 h2/h3 节，匹配标题中含有题目字母（如 "B"）的节
 *  2. 取该节之后、下一个同级标题之前的所有 <a> 中第一个 editorial 链接
 *  3. 若未找到，回退：在所有 <a> 中全局匹配（旧比赛格式）
 */
function findEditorialLinkFromIndex($, labelUpper, taskId) {
  const labelRegex = new RegExp(`(^|\\s|Problem\\s+)${labelUpper}(\\s*[-–—:\\.]|$)`, 'i')
  let editorialLink = ''

  // 策略 1：定位到标题节，取节内第一个 editorial 链接
  const headings = $('h1, h2, h3, h4').toArray()
  let targetHeadingIdx = -1
  for (let i = 0; i < headings.length; i++) {
    const text = $(headings[i]).text().trim()
    if (labelRegex.test(text)) {
      targetHeadingIdx = i
      break
    }
  }

  if (targetHeadingIdx !== -1) {
    const targetEl = headings[targetHeadingIdx]
    const nextHeadingEl = headings[targetHeadingIdx + 1] || null

    // 收集该节内（两个标题之间）的所有节点
    let cur = $(targetEl).next()
    while (cur.length) {
      if (nextHeadingEl && cur.is(nextHeadingEl)) break
      // 取该节点及其子节点中的所有 <a>
      const anchors = cur.is('a') ? [cur] : cur.find('a').toArray().map(a => $(a))
      for (const a of anchors) {
        const href = (typeof a.attr === 'function' ? a.attr('href') : $(a).attr('href')) || ''
        // editorial 文章链接：/contests/{id}/editorial/{num}
        if (/\/editorial\/\d+/.test(href)) {
          editorialLink = href.startsWith('http') ? href : `https://atcoder.jp${href}`
          break
        }
      }
      if (editorialLink) break
      cur = cur.next()
    }
  }

  // 策略 2：全局匹配 taskId（用于旧比赛或非标准格式）
  if (!editorialLink) {
    $('a').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (href.includes(taskId) && href.includes('editorial')) {
        editorialLink = href.startsWith('http') ? href : `https://atcoder.jp${href}`
        return false
      }
    })
  }

  // 策略 3：全局匹配链接文字含标签（旧比赛格式：链接文字是 "B - xxx"）
  if (!editorialLink) {
    $('a').each((_, el) => {
      const text = $(el).text().trim()
      const href = $(el).attr('href') || ''
      if (/\/editorial\/\d+/.test(href) && labelRegex.test(text)) {
        editorialLink = href.startsWith('http') ? href : `https://atcoder.jp${href}`
        return false
      }
    })
  }

  return editorialLink
}

async function fetchAtCoderEditorial(contestId, label, taskId) {
  const labelUpper = label.toUpperCase()
  const indexUrl = `https://atcoder.jp/contests/${contestId}/editorial?editorialLang=en`
  let resp
  try {
    resp = await axios.get(indexUrl, { headers: HEADERS, timeout: 20000 })
  } catch (e) {
    console.warn('[Editorial] 无法访问 editorial 首页:', e.message)
    return ''
  }
  const $ = load(resp.data)

  // AtCoder editorial 页面有两种形态：
  //   (A) 页面内直接包含各题解说（旧比赛）
  //   (B) 页面列出各题的 editorial 链接（新比赛）

  // ── 形态 B：找到对应题目的 editorial 链接 ─────────────────────────────
  let editorialLink = findEditorialLinkFromIndex($, labelUpper, taskId)

  // ── 英文版没有题解时，回退到日文版页面重新查找 ──────────────────────────
  if (!editorialLink) {
    const jaUrl = `https://atcoder.jp/contests/${contestId}/editorial?editorialLang=ja`
    try {
      const jaResp = await axios.get(jaUrl, { headers: HEADERS, timeout: 20000 })
      const $ja = load(jaResp.data)
      editorialLink = findEditorialLinkFromIndex($ja, labelUpper, taskId)
      if (editorialLink) console.log(`[Editorial] 回退日文版找到链接: ${editorialLink}`)
    } catch (e) {
      console.warn('[Editorial] 日文版 editorial 首页访问失败:', e.message)
    }
  }

  if (editorialLink) {
    try {
      const editResp = await axios.get(
        editorialLink + (editorialLink.includes('?') ? '&lang=en' : '?lang=en'),
        { headers: HEADERS, timeout: 20000 }
      )
      const $e = load(editResp.data)
      // 单题 editorial 页面：直接提取正文内容（不需要再按标题筛选）
      const result = parseFullEditorialPage($e)
      if (result) return result
      return parseEditorialPage($e, label)
    } catch (e) {
      console.warn('[Editorial] 单题解说页抓取失败:', e.message)
    }
  }

  // ── 形态 A：在 editorial 首页直接解析各题节 ──────────────────────────
  return parseEditorialPage($, label)
}

// 单题 editorial 页面：直接提取正文（不按标题筛选）
function parseFullEditorialPage($) {
  // AtCoder 单题 editorial 的正文容器（尝试精确容器，不存在则降级）
  const $content = $('.editorial-content, #editorial-content, article.editorial, .lang-en, #task-editorial, main article').first()
  let $root = $content.length ? $content : $('article, main').first()

  // ── 降级策略：AtCoder 实际结构是 div.col-sm-12，内容从第一个 h2 开始 ──
  // 找到页面第一个 h2，从它开始收集所有兄弟/后续节点内容
  const usePageFallback = !$root.length

  let md = ''

  if (usePageFallback) {
    // 找第一个 h2，逐个处理其后的兄弟节点
    const firstH2 = $('h2').first()
    if (!firstH2.length) return ''

    const processEl = (el) => {
      const tag = (el.tagName || el.name || '').toLowerCase()
      const $el = $(el)
      const text = $el.text().trim()
      if (!text) return
      if (/^h[1-5]$/.test(tag)) {
        const lvl = '#'.repeat(Math.min(parseInt(tag[1]) + 1, 5))
        md += `${lvl} ${text}\n\n`
      } else if (tag === 'p') {
        md += text + '\n\n'
      } else if (tag === 'pre') {
        md += '```\n' + text + '\n```\n\n'
      } else if (tag === 'blockquote') {
        md += '> ' + text.replace(/\n/g, '\n> ') + '\n\n'
      } else if (tag === 'ul' || tag === 'ol') {
        $el.children('li').each((i, li) => {
          md += (tag === 'ol' ? `${i + 1}. ` : '- ') + $(li).text().trim() + '\n'
        })
        md += '\n'
      }
    }

    // 处理第一个 h2 本身及其后所有兄弟节点（跳过导航相关容器）
    processEl(firstH2[0])
    let sibling = firstH2.next()
    while (sibling.length) {
      // 跳过导航、页脚等无关容器
      if (sibling.is('#contest-nav-tabs, footer, .navbar, nav')) {
        sibling = sibling.next()
        continue
      }
      // 如果是容器（div/section），递归找里面的内容节点
      const sibTag = (sibling[0].tagName || '').toLowerCase()
      if (sibTag === 'div' || sibTag === 'section') {
        sibling.find('h1, h2, h3, h4, h5, p, pre, ul, ol, blockquote').each((_, el) => processEl(el))
      } else {
        processEl(sibling[0])
      }
      sibling = sibling.next()
    }
  } else {
    let firstH1Skipped = false
    $root.find('h1, h2, h3, h4, h5, p, pre, ul, ol, blockquote').each((_, el) => {
      const tag = el.tagName?.toLowerCase() || ''
      const text = $(el).text().trim()
      if (!text) return
      if (/^h[1-5]$/.test(tag)) {
        if (tag === 'h1' && !firstH1Skipped) { firstH1Skipped = true; return }
        firstH1Skipped = true
        const lvl = '#'.repeat(Math.min(parseInt(tag[1]) + 1, 5))
        md += `${lvl} ${text}\n\n`
      } else if (tag === 'p') {
        md += text + '\n\n'
      } else if (tag === 'pre') {
        md += '```\n' + text + '\n```\n\n'
      } else if (tag === 'blockquote') {
        md += '> ' + text.replace(/\n/g, '\n> ') + '\n\n'
      } else if (tag === 'ul' || tag === 'ol') {
        $(el).children('li').each((i, li) => {
          md += (tag === 'ol' ? `${i + 1}. ` : '- ') + $(li).text().trim() + '\n'
        })
        md += '\n'
      }
    })
  }

  if (md.length > 5000) md = md.slice(0, 5000) + '\n\n...（内容已截断）'
  return md.trim()
}

function parseEditorialPage($, label) {
  // 尝试找对应题目标签的 section / h2 / h3
  const labelUpper = label.toUpperCase()
  const labelRegex = new RegExp(`(^|\\s|Problem\\s+)${labelUpper}(\\s*[-–—:\\.]|$)`, 'i')
  let md = ''

  // 优先：找 lang-en 区域内对应题目的段落
  const $sections = $('#task-editorial, .lang-en, .editorial-content, article')
  const $root = $sections.length ? $sections : $('main, body')

  // 遍历所有 h2/h3/h4，找到标题匹配的节
  let inTarget = false
  let depth = 0

  $root.find('h1, h2, h3, h4, p, pre, ul, ol').each((_, el) => {
    const tag = el.tagName?.toLowerCase() || ''
    const text = $(el).text().trim()

    if (/^h[1-4]$/.test(tag)) {
      if (labelRegex.test(text)) {
        inTarget = true
        depth = parseInt(tag[1])
        md += `## ${text}\n\n`
        return
      } else if (inTarget) {
        const curDepth = parseInt(tag[1])
        if (curDepth <= depth) {
          // 遇到同级或更高级标题，说明当前题目的内容结束
          return false
        }
        md += `### ${text}\n\n`
        return
      }
    }

    if (!inTarget) return

    if (tag === 'p') {
      if (text) md += text + '\n\n'
    } else if (tag === 'pre') {
      md += '```\n' + text + '\n```\n\n'
    } else if (tag === 'ul' || tag === 'ol') {
      $(el).children('li').each((i, li) => {
        md += (tag === 'ol' ? `${i + 1}. ` : '- ') + $(li).text().trim() + '\n'
      })
      md += '\n'
    }
  })

  // 限制长度，避免返回过多内容
  if (md.length > 4000) md = md.slice(0, 4000) + '\n\n...（内容已截断）'

  return md.trim()
}

// ─── Codeforces ───────────────────────────────────────────────────────────────

async function fetchCodeforcesContest(url) {
  const match = url.match(/codeforces\.com\/(contest|gym)\/(\d+)/)
  if (!match) throw new Error('无法解析 Codeforces 比赛链接')
  const [, type, id] = match

  const resp = await axios.get(`https://codeforces.com/${type}/${id}`, {
    headers: HEADERS, timeout: 20000
  })
  const $ = load(resp.data)
  const problems = []

  $('#pageContent .problems tbody tr').each((i, row) => {
    const cells = $(row).find('td')
    if (cells.length < 2) return
    const label = $(cells[0]).find('a').text().trim()
    const titleA = $(cells[1]).find('a')
    const title = titleA.text().trim()
    const href = titleA.attr('href') || ''
    if (label && title) {
      problems.push({
        label,
        title,
        taskId: `${id}${label}`,
        url: href.startsWith('http') ? href : `https://codeforces.com${href}`
      })
    }
  })

  if (problems.length === 0) throw new Error('未找到题目，比赛可能尚未开始')

  const contestTitle =
    $('title').text().split('|')[0].trim() || `Codeforces ${type.toUpperCase()} #${id}`

  return { contestId: `cf_${id}`, contestTitle, problems }
}

async function fetchCodeforcesProblem(url) {
  const resp = await axios.get(url, { headers: HEADERS, timeout: 20000 })
  const $ = load(resp.data)
  const $stmt = $('.problem-statement')

  const title = $stmt.find('.title').first().text().trim() ||
    $('title').text().split('|')[0].trim()

  let md = `# ${title}\n\n`

  // Time & memory limits
  const timeLimit = $stmt.find('.time-limit').clone().children('.property-title').remove().end().text().trim()
  const memLimit = $stmt.find('.memory-limit').clone().children('.property-title').remove().end().text().trim()
  if (timeLimit) md += `**时间限制**: ${timeLimit}　**内存限制**: ${memLimit}\n\n`

  // Problem body (skip .header div which contains title/limits)
  const $body = $stmt.clone()
  $body.find('.header').remove()
  $body.find('.sample-tests').remove()

  $body.children().each((_, el) => {
    const $el = $(el)
    const sectionTitle = $el.find('.section-title').first().text().trim()
    if (sectionTitle) {
      md += `## ${sectionTitle}\n\n`
      $el.find('.section-title').remove()
    }
    const text = $el.text().trim()
    if (text) md += text + '\n\n'
  })

  // Sample tests
  const $samples = $stmt.find('.sample-tests')
  if ($samples.length) {
    md += '## 样例\n\n'
    $samples.find('.test-example-line').parent('.input').each((i, el) => {
      md += `**输入 ${i + 1}**\n\`\`\`\n${$(el).find('pre').text().trim()}\n\`\`\`\n\n`
    })
    $samples.find('.output').each((i, el) => {
      md += `**输出 ${i + 1}**\n\`\`\`\n${$(el).find('pre').text().trim()}\n\`\`\`\n\n`
    })
  }

  return { title, content: md.trim() }
}

// ─── HTML → Markdown converter ───────────────────────────────────────────────

function parseStatement($, $root, title, limitsRow) {
  let md = `# ${title}\n\n`
  if (limitsRow) md += `${limitsRow.trim()}\n\n`

  // Iterate over .part divs or sections
  $root.find('.part, > section').each((_, part) => {
    const $part = $(part)

    // Section heading
    const h3text = $part.find('> section > h3, > h3').first().text().trim()
    if (h3text) md += `## ${h3text}\n\n`

    // Working element: inner <section> or the part itself
    const $inner = $part.find('> section').length ? $part.find('> section') : $part

    // Process children (skip the h3 we already handled)
    $inner.children().each((_, child) => {
      if (!child.tagName) return
      const tag = child.tagName.toLowerCase()
      if (tag === 'h3') return // already added

      md += nodeToMd($, child)
    })
  })

  // Fallback: if we got almost nothing, just dump the text
  if (md.replace(/^#.*\n+/, '').trim().length < 30) {
    md = `# ${title}\n\n${$root.text().trim()}`
  }

  return md.trim()
}

function nodeToMd($, node) {
  const tag = node.tagName?.toLowerCase()
  if (!tag) return ''

  if (tag === 'img') {
    const src = $(node).attr('src') || ''
    const alt = $(node).attr('alt') || ''
    if (!src) return ''
    const fullSrc = src.startsWith('//') ? 'https:' + src : src
    return `\n![${alt}](${fullSrc})\n\n`
  }
  if (tag === 'p') {
    const text = getNodeText($, node).trim()
    return text ? text + '\n\n' : ''
  }
  if (tag === 'pre') {
    return '```\n' + $(node).text().trim() + '\n```\n\n'
  }
  if (tag === 'ul') {
    let s = ''
    $(node).children('li').each((_, li) => {
      s += `- ${getNodeText($, li).trim()}\n`
    })
    return s + '\n'
  }
  if (tag === 'ol') {
    let s = ''
    $(node).children('li').each((i, li) => {
      s += `${i + 1}. ${getNodeText($, li).trim()}\n`
    })
    return s + '\n'
  }
  if (tag === 'div' || tag === 'section') {
    let s = ''
    node.children.forEach(child => { s += nodeToMd($, child) })
    return s
  }
  // Anything else: just get text
  const text = $(node).text().trim()
  return text ? text + '\n\n' : ''
}

// Get text content preserving inline LaTeX (\( ... \) / \[ ... \])
function getNodeText($, node) {
  if (node.type === 'text') return node.data || ''
  if (!node.children) return $(node).text()

  const tag = node.tagName?.toLowerCase()
  if (tag === 'img') {
    const src = $(node).attr('src') || ''
    const alt = $(node).attr('alt') || ''
    if (!src) return ''
    const fullSrc = src.startsWith('//') ? 'https:' + src : src
    return `\n![${alt}](${fullSrc})\n`
  }

  let result = ''
  node.children.forEach(child => {
    result += getNodeText($, child)
  })
  return result
}

export default router
