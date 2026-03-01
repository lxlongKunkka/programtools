import express from 'express'
import axios from 'axios'
import { load } from 'cheerio'
import { authenticateToken } from '../middleware/auth.js'
import { HYDRO_CONFIG } from '../config.js'

const router = express.Router()

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8'
}

// ─── Hydro Auth Helpers ──────────────────────────────────────────────────────
// Returns true when the URL points to this server's own Hydro instance
function isOwnHydro(url) {
  if (!HYDRO_CONFIG?.API_URL) return false
  try {
    const target = new URL(url)
    const own = new URL(HYDRO_CONFIG.API_URL)
    return target.host === own.host
  } catch { return false }
}

// Build request headers for a Hydro OJ URL, injecting auth when available
function buildHydroHeaders(url) {
  const h = { ...HEADERS, Accept: 'application/json' }
  if (isOwnHydro(url) && HYDRO_CONFIG.API_TOKEN) {
    h['Authorization'] = `Bearer ${HYDRO_CONFIG.API_TOKEN}`
  }
  return h
}

// ─── Platform Detection ───────────────────────────────────────────────────────
function detectPlatform(url) {
  if (/atcoder\.jp/i.test(url)) return 'atcoder'
  if (/codeforces\.com/i.test(url)) return 'codeforces'
  if (/luogu\.com\.cn/i.test(url)) return 'luogu'
  if (/hydro\.|htoj\.|acjudge\.com/i.test(url)) return 'hydro'
  return 'unknown'
}

function parseAtCoderContestId(url) {
  const match = url.match(/atcoder\.jp\/contests\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

// GET /api/atcoder/contest?url=...
// Returns the list of problems in a contest (supports AtCoder / Codeforces / Luogu)
router.get('/contest', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })

  const platform = detectPlatform(url)
  try {
    if (platform === 'atcoder') return res.json(await fetchAtCoderContest(url))
    if (platform === 'codeforces') return res.json(await fetchCodeforcesContest(url))
    if (platform === 'luogu') return res.json(await fetchLuoguContest(url))
    if (platform === 'hydro') return res.json(await fetchHydroContest(url))
    return res.status(400).json({ error: '不支持的平台，目前支持 AtCoder / Codeforces / 洛谷 / Hydro OJ' })
  } catch (err) {
    console.error(`[${platform}] contest fetch error:`, err.message)
    const code = err.response?.status
    if (code === 404) return res.status(404).json({ error: '比赛不存在 (404)' })
    if (code === 403) return res.status(403).json({ error: '无权访问，比赛可能尚未开始' })
    res.status(500).json({ error: `抓取失败: ${code ? `HTTP ${code}` : err.message}` })
  }
})

// GET /api/atcoder/problem?url=...
// Returns parsed problem content as markdown (supports AtCoder / Codeforces / Luogu)
router.get('/problem', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })

  const platform = detectPlatform(url)
  try {
    if (platform === 'atcoder') return res.json(await fetchAtCoderProblem(url))
    if (platform === 'codeforces') return res.json(await fetchCodeforcesProblem(url))
    if (platform === 'luogu') return res.json(await fetchLuoguProblem(url))
    if (platform === 'hydro') return res.json(await fetchHydroProblem(url))
    return res.status(400).json({ error: '不支持的平台，目前支持 AtCoder / Codeforces / 洛谷 / Hydro OJ' })
  } catch (err) {
    console.error(`[${platform}] problem fetch error:`, err.message)
    const code = err.response?.status
    res.status(500).json({ error: `抓取题目失败: ${code ? `HTTP ${code}` : err.message}` })
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

  const rawTitle = $('span.h2').first().text().trim()
  const pageTitle = $('title').text().trim()
  const title = rawTitle || pageTitle.split('-')[0].trim()

  const limitsRow = $('.col-sm-12.col-md-4').text().trim() ||
    $('p').filter((_, el) => /Time Limit|Memory Limit/i.test($(el).text()))
      .map((_, el) => $(el).text().trim()).get().join(' / ')

  let $stmt = $('#task-statement .lang-en')
  const hasEnglish = $stmt.length > 0
  if (!hasEnglish) $stmt = $('#task-statement')

  const content = parseStatement($, $stmt, title, limitsRow)
  return { title, content, hasEnglish, url: enUrl }
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

// ─── 洛谷 (Luogu) ─────────────────────────────────────────────────────────────

const LUOGU_HEADERS = {
  ...HEADERS,
  'x-luogu-type': 'content-only',
  'Referer': 'https://www.luogu.com.cn/'
}

async function fetchLuoguProblem(url) {
  const match = url.match(/luogu\.com\.cn\/problem\/([A-Z0-9]+)/i)
  if (!match) throw new Error('无法解析洛谷题目编号')
  const pid = match[1]

  const resp = await axios.get(`https://www.luogu.com.cn/problem/${pid}`, {
    headers: LUOGU_HEADERS, timeout: 20000
  })
  const problem = resp.data?.currentData?.problem
  if (!problem) throw new Error('洛谷返回数据结构异常')

  const title = problem.title || pid
  let md = `# ${title}\n\n`
  if (problem.difficulty) md += `**难度**: ${problem.difficulty}\n\n`
  if (problem.content) md += problem.content
  else if (problem.description) md += problem.description

  return { title, content: md.trim() }
}

async function fetchLuoguContest(url) {
  // If it looks like a single problem URL, treat as virtual contest
  if (/\/problem\//.test(url)) {
    const problem = await fetchLuoguProblem(url)
    const pid = url.match(/luogu\.com\.cn\/problem\/([A-Z0-9]+)/i)?.[1] || 'P0'
    return {
      contestId: `lg_${pid}`,
      contestTitle: problem.title,
      problems: [{ label: pid, title: problem.title, taskId: pid, url }]
    }
  }

  const match = url.match(/luogu\.com\.cn\/contest\/(\d+)/)
  if (!match) throw new Error('无法解析洛谷比赛链接')
  const cid = match[1]

  const resp = await axios.get(`https://www.luogu.com.cn/contest/${cid}`, {
    headers: LUOGU_HEADERS, timeout: 20000
  })
  const data = resp.data?.currentData?.contest
  const list = data?.problems || []

  const problems = list.map((p, i) => ({
    label: String.fromCharCode(65 + i),
    title: p.title || p.pid,
    taskId: p.pid,
    url: `https://www.luogu.com.cn/problem/${p.pid}`
  }))

  return {
    contestId: `lg_${cid}`,
    contestTitle: data?.name || `洛谷比赛 ${cid}`,
    problems
  }
}

// ─── Hydro / HTOJ ────────────────────────────────────────────────────────────

function parseHydroOrigin(url) {
  const u = new URL(url)
  return `${u.protocol}//${u.host}`
}

async function fetchHydroProblem(url) {
  const origin = parseHydroOrigin(url)
  // Extract problem id from paths like /p/P1001 or /d/domain/p/P1001
  const match = url.match(/\/p\/([A-Za-z0-9_-]+)/)
  if (!match) throw new Error('无法解析 Hydro 题目 ID（路径中找不到 /p/{id}）')
  const pid = match[1]

  const headers = buildHydroHeaders(url)
  let resp
  try {
    // Hydro: ?_contentOnly=1 returns JSON including pdoc.content
    resp = await axios.get(`${origin}/p/${pid}`, {
      headers,
      params: { _contentOnly: 1 },
      timeout: 20000
    })
  } catch (err) {
    const code = err.response?.status
    if (code === 401 || code === 403) {
      const hint = isOwnHydro(url)
        ? '获取失败（401/403），请检查 HYDRO_API_TOKEN 是否正确配置'
        : '该 Hydro OJ 题目需要登录才能访问'
      throw Object.assign(new Error(hint), { response: err.response })
    }
    throw err
  }

  const data = resp.data
  // JSON response from _contentOnly
  if (data?.pdoc) {
    const doc = data.pdoc
    const title = doc.title || pid
    let md = `# ${title}\n\n`
    const body = doc.content
    if (body) md += typeof body === 'string' ? body : JSON.stringify(body, null, 2)
    return { title, content: md.trim() }
  }

  // Fallback: HTML (should not reach here with _contentOnly, but just in case)
  const $ = load(typeof data === 'string' ? data : '')
  const title = $('h1').first().text().trim() || pid
  const content = `# ${title}\n\n` + $('.problem-content, .typo').text().trim()
  return { title, content }
}

async function fetchHydroContest(url) {
  const origin = parseHydroOrigin(url)
  const match = url.match(/\/(contest|homework|training)\/([A-Za-z0-9_-]+)/)
  if (!match) throw new Error('无法解析 Hydro 比赛链接（需包含 /contest/{id}）')
  const [, type, cid] = match

  const headers = buildHydroHeaders(url)
  let resp
  try {
    resp = await axios.get(`${origin}/${type}/${cid}/problems`, {
      headers: { ...headers, Accept: 'text/html,application/json' },
      params: { _contentOnly: 1 },
      timeout: 20000
    })
  } catch (err) {
    const code = err.response?.status
    if (code === 401 || code === 403) {
      const hint = isOwnHydro(url)
        ? '获取比赛失败（401/403），请检查 HYDRO_API_TOKEN 是否正确配置'
        : '该 Hydro OJ 比赛需要登录才能访问'
      throw Object.assign(new Error(hint), { response: err.response })
    }
    throw err
  }

  const data = resp.data

  // JSON response from _contentOnly (Hydro contest returns pdict)
  if (data?.pdocs || data?.pdict) {
    const list = data.pdocs || Object.values(data.pdict || {})
    const problems = list.map((p, i) => ({
      label: String.fromCharCode(65 + i),
      title: p.title || p.docId,
      taskId: String(p.docId),
      url: `${origin}/p/${p.docId}`
    }))
    const contestTitle = data?.tdoc?.title || `Hydro ${type} ${cid}`
    return { contestId: `hydro_${cid}`, contestTitle, problems }
  }

  // Fallback: HTML
  const $ = load(typeof data === 'string' ? data : '')
  const problems = []
  $('table tbody tr').each((i, row) => {
    const cells = $(row).find('td')
    if (cells.length < 2) return
    const label = $(cells[0]).text().trim()
    const a = $(cells[1]).find('a')
    const title = a.text().trim()
    const href = a.attr('href') || ''
    if (title) {
      problems.push({
        label: label || String.fromCharCode(65 + i),
        title,
        taskId: href.split('/').pop(),
        url: href.startsWith('http') ? href : `${origin}${href}`
      })
    }
  })

  const contestTitle = $('h1, h2').first().text().trim() || `Hydro ${type} ${cid}`
  return { contestId: `hydro_${cid}`, contestTitle, problems }
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

  let result = ''
  node.children.forEach(child => {
    result += getNodeText($, child)
  })
  return result
}

export default router
