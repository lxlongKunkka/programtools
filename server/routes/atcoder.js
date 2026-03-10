import express from 'express'
import axios from 'axios'
import { load } from 'cheerio'
import { authenticateToken } from '../middleware/auth.js'
import { ATCODER_USERNAME } from '../config.js'
import { fetchHtojContest, fetchHtojProblem } from './htoj.js'
import { fetchNflsojContest, fetchNflsojProblem } from './nflsoj.js'

const router = express.Router()

const sleep = ms => new Promise(r => setTimeout(r, ms))

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8'
}


// ─── Platform Detection ───────────────────────────────────────────────────────
function detectPlatform(url) {
  if (/atcoder\.jp/i.test(url)) return 'atcoder'
  if (/codeforces\.com/i.test(url)) return 'codeforces'
  if (/htoj\.com\.cn/i.test(url)) return 'htoj'
  if (/nflsoi\.cc/i.test(url)) return 'nflsoj'
  return 'unknown'
}

// SSRF 防护：只允许已知外部竞赛平台域名，拒绝内网/任意地址
const ALLOWED_HOSTS = [
  /^([\w-]+\.)?atcoder\.jp$/i,
  /^([\w-]+\.)?codeforces\.com$/i,
  /^([\w-]+\.)?htoj\.com\.cn$/i,
  /^nflsoi\.cc$/i,
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
// Returns the list of problems in a contest (supports AtCoder / Codeforces / htoj)
router.get('/contest', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!isAllowedUrl(url)) return res.status(400).json({ error: '不支持的 URL，仅允许 AtCoder / Codeforces / 核桃OJ' })

  const platform = detectPlatform(url)
  try {
    if (platform === 'atcoder') return res.json(await fetchAtCoderContest(url))
    if (platform === 'codeforces') return res.json(await fetchCodeforcesContest(url))
    if (platform === 'htoj') return res.json(await fetchHtojContest(url))
    if (platform === 'nflsoj') return res.json(await fetchNflsojContest(url))
    return res.status(400).json({ error: '不支持的平台，目前支持 AtCoder / Codeforces / 核桃OJ / NFLSOJ' })
  } catch (err) {
    console.error(`[${platform}] contest fetch error:`, err.message)
    const code = err.response?.status
    if (code === 404) return res.status(404).json({ error: '比赛不存在 (404)' })
    if (code === 403) return res.status(403).json({ error: '无权访问，比赛可能尚未开始' })
    res.status(500).json({ error: `抓取失败: ${code ? `HTTP ${code}` : err.message}` })
  }
})

// GET /api/atcoder/problem?url=...
// Returns parsed problem content as markdown (supports AtCoder / Codeforces / htoj)
router.get('/problem', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!isAllowedUrl(url)) return res.status(400).json({ error: '不支持的 URL，仅允许 AtCoder / Codeforces / 核桃OJ' })

  const platform = detectPlatform(url)
  try {
    if (platform === 'atcoder') return res.json(await fetchAtCoderProblem(url))
    if (platform === 'codeforces') return res.json(await fetchCodeforcesProblem(url))
    if (platform === 'htoj') return res.json(await fetchHtojProblem(url))
    if (platform === 'nflsoj') return res.json(await fetchNflsojProblem(url))
    return res.status(400).json({ error: '不支持的平台，目前支持 AtCoder / Codeforces / 核桃OJ / NFLSOJ' })
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
  const KOPTS = { headers: { 'User-Agent': HEADERS['User-Agent'] }, timeout: 20000, validateStatus: s => s < 500 }

  try {
    // Step 1: 解析题目 URL
    const taskMatch = url.match(/contests\/([a-zA-Z0-9_-]+)\/tasks\/([a-zA-Z0-9_-]+)/)
    if (!taskMatch) return res.json({ logs, error: '无法从 URL 解析 contestId/taskId' })
    const [, contestId, taskId] = taskMatch
    log(`[debug-ac] contestId=${contestId}, taskId=${taskId}`)

    let targetSubId = null

    // Step 1.5: ABC001-100 / ARC001-100 老比赛，优先从 kmjp 历史记录从头查
    if (!targetSubId && /^(abc|arc)(0\d{2}|100)$/i.test(contestId)) {
      log(`[debug-ac] Step1.5: 老比赛 ${contestId}，优先查 kmjp 历史记录 (from_second=0)`)
      let fromSec = 0
      for (let pg = 0; pg < 8 && !targetSubId; pg++) {
        const apiUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=kmjp&from_second=${fromSec}`
        log(`[debug-ac] kmjp early page=${pg} from=${fromSec}`)
        if (pg > 0) await sleep(1000)
        let r
        try { r = await axios.get(apiUrl, KOPTS) } catch (e) { log(`[debug-ac] kmjp 失败: ${e.message}`); break }
        if (r.status === 429) { log('[debug-ac] kenkoooo 429 限流'); break }
        const batch = r.data || []
        log(`[debug-ac] kmjp 返回 ${batch.length} 条`)
        let ac = batch.filter(s => s.problem_id === taskId && s.result === 'AC')
        const cpp = ac.filter(s => s.language && /[Cc]\+\+/.test(s.language))
        if (cpp.length) ac = cpp
        if (ac.length) {
          ac.sort((a, b) => b.epoch_second - a.epoch_second)
          targetSubId = String(ac[0].id)
          log(`[debug-ac] kmjp early 找到 AC 提交 id=${targetSubId}`)
        }
        if (batch.length < 500) { log('[debug-ac] kmjp early 已翻完'); break }
        fromSec = batch[batch.length - 1].epoch_second + 1
      }
    }

    // Step 2: kenkoooo 查 kunkka
    if (!targetSubId && ATCODER_USERNAME) {
      log(`[debug-ac] Step2: kenkoooo 查 kunkka (${ATCODER_USERNAME})`)
      let fromSec = 0
      for (let page = 0; page < 15 && !targetSubId; page++) {
        const apiUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(ATCODER_USERNAME)}&from_second=${fromSec}`
        log(`[debug-ac] page=${page} from_second=${fromSec}`)
        if (page > 0) await sleep(1000)
        let r
        try { r = await axios.get(apiUrl, KOPTS) } catch (e) { log(`[debug-ac] 请求失败: ${e.message}`); break }
        if (r.status === 429) { log('[debug-ac] kenkoooo 429 限流'); break }
        const batch = r.data || []
        log(`[debug-ac] 返回 ${batch.length} 条`)
        let ac = batch.filter(s => s.problem_id === taskId && s.result === 'AC')
        const cpp = ac.filter(s => s.language && /[Cc]\+\+/.test(s.language))
        if (cpp.length) ac = cpp
        if (ac.length) {
          ac.sort((a, b) => b.epoch_second - a.epoch_second)
          targetSubId = String(ac[0].id)
          log(`[debug-ac] kunkka 找到 AC 提交 id=${targetSubId}`)
        }
        if (batch.length < 500) { log('[debug-ac] kunkka kenkoooo 最后一页'); break }
        fromSec = batch[batch.length - 1].epoch_second + 1
      }
    }

    // Step 3: kenkoooo 查备用用户（近 18 个月）
    if (!targetSubId) {
      log('[debug-ac] Step3: kenkoooo 查备用活跃用户')
      const FALLBACK_USERS = ['kmjp', 'qqqaaazzz', 'potato167', 'kotatsugame', 'm_99', 'maspy']
      const fallbackFrom = Math.floor(Date.now() / 1000) - 18 * 30 * 24 * 3600
      for (const fbUser of FALLBACK_USERS) {
        if (targetSubId) break
        let fbFrom = fallbackFrom
        for (let pg = 0; pg < 3; pg++) {
          const fbUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(fbUser)}&from_second=${fbFrom}`
          log(`[debug-ac] 备用 ${fbUser} page=${pg}`)
          await sleep(1000)
          let fbResp
          try { fbResp = await axios.get(fbUrl, KOPTS) } catch (e) { log(`[debug-ac] ${fbUser} 失败: ${e.message}`); break }
          if (fbResp.status === 429) { log('[debug-ac] kenkoooo 429 限流，停止'); break }
          const fbBatch = fbResp.data || []
          log(`[debug-ac] ${fbUser} 返回 ${fbBatch.length} 条`)
          let ac = fbBatch.filter(s => s.problem_id === taskId && s.result === 'AC')
          const cpp = ac.filter(s => s.language && /[Cc]\+\+/.test(s.language))
          if (cpp.length) ac = cpp
          if (ac.length) {
            ac.sort((a, b) => b.epoch_second - a.epoch_second)
            targetSubId = String(ac[0].id)
            log(`[debug-ac] ${fbUser} 找到 AC 提交 id=${targetSubId}`)
            break
          }
          if (fbBatch.length < 500) break
          fbFrom = fbBatch[fbBatch.length - 1].epoch_second + 1
        }
      }
    }

    // Step 3.5: 历史全量搜索（from_second=0，专为远古比赛）
    if (!targetSubId) {
      log('[debug-ac] Step3.5: 历史全量搜索（from_second=0）')
      const HISTORICAL_USERS = ['kmjp', 'uwi', 'tourist', 'rng_58']
      for (const hUser of HISTORICAL_USERS) {
        if (targetSubId) break
        let hFrom = 0
        for (let pg = 0; pg < 6; pg++) {
          const hUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(hUser)}&from_second=${hFrom}`
          log(`[debug-ac] 历史搜索 ${hUser} page=${pg} from=${hFrom}`)
          await sleep(1200)
          let hResp
          try { hResp = await axios.get(hUrl, KOPTS) } catch (e) { log(`[debug-ac] ${hUser} 失败: ${e.message}`); break }
          if (hResp.status === 429) { log('[debug-ac] kenkoooo 429 限流，停止历史搜索'); break }
          const hBatch = hResp.data || []
          log(`[debug-ac] 历史 ${hUser} 返回 ${hBatch.length} 条`)
          let ac = hBatch.filter(s => s.problem_id === taskId && s.result === 'AC')
          const cpp = ac.filter(s => s.language && /[Cc]\+\+/.test(s.language))
          if (cpp.length) ac = cpp
          if (ac.length) {
            ac.sort((a, b) => b.epoch_second - a.epoch_second)
            targetSubId = String(ac[0].id)
            log(`[debug-ac] 历史搜索 ${hUser} 找到 AC 提交 id=${targetSubId}`)
            break
          }
          if (hBatch.length < 500) break
          hFrom = hBatch[hBatch.length - 1].epoch_second + 1
        }
      }
    }

    log(`[debug-ac] 目标提交 id=${targetSubId || '(未找到)'}`)
    if (!targetSubId) return res.json({ logs, error: '未找到任何 AC 提交' })

    // Step 5: 抓取提交详情页（公开可访问，无需 cookie）
    const detailUrl = `https://atcoder.jp/contests/${contestId}/submissions/${targetSubId}`
    log(`[debug-ac] 抓取详情页: ${detailUrl}`)
    const dr = await axios.get(detailUrl, { headers: HEADERS, timeout: 20000 })
    const $d = load(dr.data)
    log(`[debug-ac] 详情页 title="${$d('title').text().trim()}"`)
    const code1 = $d('#submission-code').text().trim()
    const code2 = $d('pre.prettyprint').text().trim()
    const code3 = $d('.source-code').text().trim()
    const finalCode = code1 || code2 || code3
    log(`[debug-ac] 代码长度=${finalCode.length}`)
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

  // 从提交记录中抓取 AC C++ 代码：优先指定用户，其次任意用户（最多30秒超时）
  let acCode = ''
  try {
    const taskMatch = url.match(/contests\/([a-zA-Z0-9_-]+)\/tasks\/([a-zA-Z0-9_-]+)/)
    if (taskMatch) {
      const timeout = new Promise(resolve => setTimeout(() => resolve(''), 30000))
      acCode = await Promise.race([fetchAtCoderAcCode(taskMatch[1], taskMatch[2]), timeout])
    }
  } catch (e) {
    console.warn('[AtCoder AC] 抓取提交代码失败（不影响题目）:', e.message)
  }

  return { title, content, hasEnglish, url: enUrl, editorial, acCode }
}

// ─── AtCoder AC 提交代码抓取 ──────────────────────────────────────────────────

/**
 * 从提交列表中找第一条 AC C++ 提交，再抓取其源码。
 * 策略0  : ABC001-100 / ARC001-100 老比赛，直接从 kmjp 历史记录（from_second=0）从头查
 * 策略1  : kenkoooo 查 kunkka（最多30页，从最早翻到最新）
 * 策略1.5: kenkoooo 查备用活跃用户（每人最多3页，从18个月前开始）
 * 策略1.6: 历史全量搜索（from_second=0，专为其余老比赛兜底）
 */
async function fetchAtCoderAcCode(contestId, taskId) {
  if (!ATCODER_USERNAME) return ''

  const KENKOOOO_OPTS = { headers: { 'User-Agent': HEADERS['User-Agent'] }, timeout: 20000, validateStatus: s => s < 500 }

  // 根据比赛号码动态估算起始时间：号码越小说明比赛越早
  let fromSecond = Math.floor(Date.now() / 1000) - 3 * 365 * 24 * 3600  // 默认3年前
  const numMatch = contestId.match(/\d+/)
  if (numMatch) {
    const num = parseInt(numMatch[0])
    if (num <= 100) fromSecond = 0                                                           // 2012~2016 年老比赛，从时间戳0开始
    else if (num <= 200) fromSecond = Math.floor(Date.now() / 1000) - 8 * 365 * 24 * 3600  // ~2018年
    else if (num <= 300) fromSecond = Math.floor(Date.now() / 1000) - 5 * 365 * 24 * 3600  // ~2021年
  }

  console.log(`[AtCoder AC] 查询 ${ATCODER_USERNAME} from=${fromSecond}`)
  for (let page = 0; page < 30; page++) {
    const apiUrl = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(ATCODER_USERNAME)}&from_second=${fromSecond}`
    console.log(`[AtCoder AC] page=${page}`)
    if (page > 0) await sleep(800)
    try {
      const r = await axios.get(apiUrl, KENKOOOO_OPTS)
      if (r.status === 429) { console.warn('[AtCoder AC] kenkoooo 429，跳出'); break }
      const all = r.data || []
      let ac = all.filter(s => s.problem_id === taskId && s.result === 'AC')
      const cpp = ac.filter(s => s.language && /[Cc]\+\+/.test(s.language))
      if (cpp.length) ac = cpp
      if (ac.length) {
        ac.sort((a, b) => b.epoch_second - a.epoch_second)
        console.log(`[AtCoder AC] 找到 id=${ac[0].id}`)
        return await fetchSubmissionCode(contestId, ac[0].id)
      }
      if (all.length < 500) { console.log('[AtCoder AC] 已翻完，未找到'); break }
      fromSecond = all[all.length - 1].epoch_second + 1
    } catch (e) {
      console.warn(`[AtCoder AC] 失败: ${e.message}`); break
    }
  }

  return ''
}

/**
 * 访问提交详情页，抓取源码。AtCoder ABC 提交页公开可见，无需 Cookie。
 */
async function fetchSubmissionCode(contestId, subId) {
  const detailUrl = `https://atcoder.jp/contests/${contestId}/submissions/${subId}`
  console.log(`[AtCoder AC] 抓取提交详情页: ${detailUrl}`)
  const detailResp = await axios.get(detailUrl, { headers: HEADERS, timeout: 20000 })
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
  if (tag === 'div' || tag === 'section' || tag === 'center') {
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
