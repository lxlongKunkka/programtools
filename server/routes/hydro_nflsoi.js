/**
 * server/routes/hydro_nflsoi.js
 * nflsoi.cc:10611（基于 Hydro 框架）比赛与题目抓取
 *
 * URL 格式:
 *   比赛:  http://nflsoi.cc:10611/contest/{contestId}
 *   题目:  http://nflsoi.cc:10611/contest/{contestId}/problem/{pid}
 */

import axios from 'axios'
import { load } from 'cheerio'
import { HYDRO_NFLSOI_USER, HYDRO_NFLSOI_PWD } from '../config.js'

const BASE = 'http://nflsoi.cc:10611'

// ─── Session 缓存（Hydro 使用 sid cookie）────────────────────────────────────
let cachedCookies = ''
let sessionExpireAt = 0  // Unix ms

/** 登录并缓存 session cookie */
async function getSession() {
  const now = Date.now()
  if (cachedCookies && now < sessionExpireAt) return cachedCookies

  if (!HYDRO_NFLSOI_USER || !HYDRO_NFLSOI_PWD) {
    throw new Error('未配置 HYDRO_NFLSOI_USER / HYDRO_NFLSOI_PWD，请在 server/.env 中配置')
  }

  // Step 1: 获取登录页，提取 CSRF Token（部分 Hydro 版本需要）
  let csrfToken = ''
  let loginPageCookies = ''
  try {
    const lpResp = await axios.get(`${BASE}/login`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: BASE },
      responseType: 'text',
      transformResponse: [d => d],
      validateStatus: s => s < 600,
      timeout: 10000,
    })
    const lpCookies = (lpResp.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ')
    if (lpCookies) loginPageCookies = lpCookies

    const $lp = load(lpResp.data)
    csrfToken =
      $lp('input[name="csrf_token"]').val() ||
      $lp('meta[name="csrf-token"]').attr('content') || ''
    if (!csrfToken) {
      const m = lpResp.data.match(/window\._csrf_token\s*=\s*['"]([^'"]+)['"]/)
      if (m) csrfToken = m[1]
    }
  } catch (e) {
    console.warn('[hydro-nflsoi] 获取登录页失败，继续尝试登录:', e.message)
  }

  // Step 2: POST 登录
  const formFields = { uname: HYDRO_NFLSOI_USER, password: HYDRO_NFLSOI_PWD }
  if (csrfToken) formFields.csrf_token = csrfToken

  const reqHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Referer: `${BASE}/login`,
  }
  if (loginPageCookies) reqHeaders.Cookie = loginPageCookies

  const r = await axios.post(`${BASE}/login`, new URLSearchParams(formFields).toString(), {
    headers: reqHeaders,
    maxRedirects: 0,
    validateStatus: s => s < 600,
    timeout: 10000,
  })

  const setCookies = r.headers['set-cookie'] || []
  if (!setCookies.length) {
    // Hydro 有时在登录成功后以 200 + JSON 返回新 token
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data)
    if (body.includes('"error"') || body.includes('错误')) {
      throw new Error('Hydro OJ 登录失败：用户名或密码错误')
    }
    throw new Error('Hydro OJ 登录失败：未收到 session cookie')
  }

  // 合并登录前后的 cookie（Hydro 可能将 session 和 CSRF cookie 分两次下发）
  const allCookieMap = new Map()
  ;[loginPageCookies, ...setCookies.map(c => c.split(';')[0])]
    .filter(Boolean)
    .forEach(kv => {
      const [k, v] = kv.split('=')
      if (k && v !== undefined) allCookieMap.set(k.trim(), v.trim())
    })
  cachedCookies = [...allCookieMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
  sessionExpireAt = now + 4 * 60 * 60 * 1000  // 缓存 4 小时
  console.log('[hydro-nflsoi] 登录成功，session 已缓存')
  return cachedCookies
}

/** 构造请求 Headers */
function makeHeaders(cookies, extra = {}) {
  return {
    Cookie: cookies,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Referer: BASE,
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    ...extra,
  }
}

/** 通用 HTML 请求（自动带 session）*/
async function hydroGet(urlPath) {
  const cookies = await getSession()
  const r = await axios.get(BASE + urlPath, {
    headers: makeHeaders(cookies),
    responseType: 'text',
    transformResponse: [d => d],
    validateStatus: s => s < 600,
    timeout: 15000,
  })
  if (r.status === 403) throw new Error('Hydro OJ 无权访问（403），请检查账号权限')
  if (r.status === 404) throw new Error(`Hydro OJ 页面不存在（404）: ${urlPath}`)
  if (r.status >= 400) throw new Error(`Hydro OJ 请求失败，HTTP ${r.status}`)
  return r.data
}

/** JSON API 请求（Hydro 支持 ?json=1 返回 JSON）*/
async function hydroGetJson(urlPath) {
  const cookies = await getSession()
  const sep = urlPath.includes('?') ? '&' : '?'
  const r = await axios.get(BASE + urlPath + sep + 'json=1', {
    headers: makeHeaders(cookies, { Accept: 'application/json, */*' }),
    validateStatus: s => s < 600,
    timeout: 15000,
  })
  if (r.status === 403) throw new Error('Hydro OJ 无权访问（403）')
  if (r.status === 404) throw new Error(`Hydro OJ 页面不存在（404）: ${urlPath}`)
  if (r.status >= 400) throw new Error(`Hydro OJ 请求失败，HTTP ${r.status}`)
  return typeof r.data === 'string' ? JSON.parse(r.data) : r.data
}

// ─── URL 解析 ─────────────────────────────────────────────────────────────────

function parseContestId(url) {
  const m = url.match(/\/contest\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

function parseProblemIds(url) {
  // 比赛题目（Hydro 实际格式）：/p/{pid}?tid={contestId}
  const m1 = url.match(/\/p\/([a-zA-Z0-9_]+)[^?]*[?&]tid=([a-zA-Z0-9]+)/)
  if (m1) return { pid: m1[1], contestId: m1[2] }
  // 旧格式兼容：/contest/{contestId}/problem/{pid}
  const m2 = url.match(/\/contest\/([a-zA-Z0-9]+)\/problem\/([a-zA-Z0-9_]+)/)
  if (m2) return { contestId: m2[1], pid: m2[2] }
  // 独立题目：/p/{pid}
  const m3 = url.match(/\/p\/([a-zA-Z0-9_]+)/)
  if (m3) return { contestId: null, pid: m3[1] }
  return null
}

/** 判断 URL 是否为题库（/p 列表页，不含具体 pid） */
function isProblemBank(url) {
  return /\/p(?:\?.*)?$/.test(new URL(url).pathname)
}

// ─── 核心抓取函数 ─────────────────────────────────────────────────────────────

/**
 * 抓取 Hydro OJ 比赛信息和题目列表
 */
export async function fetchHydroNflsoiContest(url) {
  const contestId = parseContestId(url)
  if (!contestId) throw new Error('无法从 URL 中解析 Hydro OJ 比赛 ID')

  // 优先使用 JSON API（Hydro 支持 ?json=1，数据更准确）
  let data
  try {
    data = await hydroGetJson(`/contest/${contestId}`)
  } catch (e) {
    console.warn('[hydro-nflsoi] JSON API 失败，降级至 HTML 解析:', e.message)
  }

  if (data?.tdoc) {
    const { tdoc, tpdict = {} } = data
    const pids = tdoc.pids || []
    const problems = pids.map((pid, i) => {
      const pdoc = tpdict[String(pid)] || {}
      return {
        label: String.fromCharCode(65 + i),
        title: pdoc.title || `Problem ${i + 1}`,
        taskId: String(pid),
        url: `${BASE}/p/${pid}?tid=${contestId}`,
      }
    })
    if (problems.length > 0) {
      return {
        contestId,
        contestTitle: tdoc.title || `Contest ${contestId}`,
        problems,
      }
    }
  }

  // HTML 降级解析（从 /contest/{id}/problems 抓取题目链接）
  const html = await hydroGet(`/contest/${contestId}/problems`)
  const $ = load(html)

  const contestTitle =
    $('h1').first().text().trim() ||
    $('title').text().split('-')[0].trim() ||
    `Contest ${contestId}`

  // Hydro OJ 比赛题目链接格式：href="/p/{pid}?tid={contestId}"
  const problems = []
  const seen = new Set()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const m = href.match(/^\/p\/([a-zA-Z0-9_]+)\?tid=([a-zA-Z0-9]+)$/)
    if (!m) return
    const pid = m[1]
    if (seen.has(pid)) return
    seen.add(pid)
    // 获取标题：<b>A</b>&nbsp;&nbsp;Pie Progress → 去掉 <b> 标签
    const $a = $(el)
    $a.find('b').remove()
    const title = $a.text().replace(/\s+/g, ' ').trim() || pid
    // 获取同一行的标签：紧随 <a> 的 ul.problem__tags
    const $td = $a.closest('td')
    const tags = []
    $td.find('a.problem__tag-link').each((_, tagEl) => {
      const t = $(tagEl).text().trim()
      if (t) tags.push(t)
    })
    problems.push({
      label: String.fromCharCode(65 + problems.length),
      title,
      taskId: pid,
      url: `${BASE}${href}`,
      tags,
    })
  })

  if (problems.length === 0) throw new Error('未找到题目列表，比赛可能不存在或无权访问')
  return { contestId, contestTitle, problems }
}

/**
 * 抓取 Hydro OJ 题目完整内容
 */
export async function fetchHydroNflsoiProblem(url) {
  const ids = parseProblemIds(url)
  if (!ids) throw new Error('无法从 URL 中解析题目地址，格式应为 /p/{pid}?tid={contestId} 或 /p/{pid}')
  const { contestId, pid } = ids
  const apiPath = contestId ? `/p/${pid}?tid=${contestId}` : `/p/${pid}`

  // HTML 解析（此 Hydro 实例不支持 ?json=1 API）
  const html = await hydroGet(apiPath)
  const $ = load(html)

  const title =
    $('h1.problem-title, .problem-title h1, h1').first().text().trim() ||
    $('title').text().split('-')[0].trim() ||
    pid

  const content = parseHydroHTML($, title)

  let acCode = ''
  try {
    const timeout = new Promise(resolve => setTimeout(() => resolve(''), 20000))
    acCode = await Promise.race([fetchHydroNflsoiAcCode(contestId, pid), timeout])
  } catch (e) {
    console.warn('[hydro-nflsoi] AC code skipped:', e.message)
  }

  return { title, content, url, acCode }
}

// ─── AC 代码抓取 ─────────────────────────────────────────────────────────────

/**
 * 从 Hydro OJ 获取指定题目的一份 AC C++ 代码（HTML 爬取，该实例不支持 ?json=1）
 *
 * 流程：
 *   1. GET /record?pid={pid}&status=1[&tid={tid}]  → HTML，解析 href="/record/{hex}"
 *   2. GET /record/{hex}  → HTML，从 <pre><code> 中提取代码
 *
 * status=1 = Accepted（Hydro 约定）
 */
async function fetchHydroNflsoiAcCode(contestId, pid) {
  console.log(`[hydro-nflsoi] 查询 AC 提交 contestId=${contestId} pid=${pid}`)

  // 构造记录列表 URL
  let listPath = `/record?pid=${encodeURIComponent(pid)}&status=1`
  if (contestId) listPath += `&tid=${encodeURIComponent(contestId)}`

  let listHtml
  try {
    listHtml = await hydroGet(listPath)
  } catch (e) {
    console.warn('[hydro-nflsoi] 查询提交列表失败:', e.message)
    return ''
  }

  // 从 HTML 中提取记录 href
  const hrefMatches = [...listHtml.matchAll(/href="(\/record\/[a-f0-9]+)"/g)]
  const hrefs = hrefMatches.map(m => m[1])
  console.log(`[hydro-nflsoi] AC 提交链接数量: ${hrefs.length}`)
  if (!hrefs.length) return ''

  // 尝试前3条，取第一条能拿到代码的
  for (const href of hrefs.slice(0, 3)) {
    try {
      const detailHtml = await hydroGet(href)
      const $d = load(detailHtml)
      // 代码在 <pre><code class="language-..."> 中，cheerio .text() 自动 HTML 反转义
      const code = $d('pre code').first().text().trim()
      if (code && code.length > 10) {
        const cleaned = code.replace(/^[ \t]*freopen\b[^\n]*;[ \t]*\r?\n?/gm, '')
        console.log(`[hydro-nflsoi] 获取到 AC 代码 href=${href} len=${cleaned.length}`)
        return cleaned
      }
    } catch (e) {
      console.warn(`[hydro-nflsoi] 获取提交详情失败 ${href}:`, e.message)
    }
  }

  return ''
}

// ─── 题库批量获取 ─────────────────────────────────────────────────────────────

/**
 * 抓取 Hydro OJ 题库（/p）所有题目列表（多页）
 * 返回格式与 fetchHydroNflsoiContest 相同，便于前端统一渲染
 */
export async function fetchHydroNflsoiProblemBank(url) {
  const problems = []
  let page = 1
  let maxPage = 1

  while (page <= maxPage) {
    const html = await hydroGet(`/p?page=${page}`)
    const $ = load(html)

    // 解析题目链接：href="/p/{pid}"
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      const m = href.match(/^\/p\/([a-zA-Z0-9_]+)$/)
      if (!m) return
      const pid = m[1]
      if (problems.some(p => p.taskId === pid)) return  // 去重
      // 获取标题（去掉粗体 pid 前缀）
      const $a = $(el)
      $a.find('b').remove()
      const title = $a.text().replace(/\s+/g, ' ').trim() || pid
      // 获取同一格里的标签
      const $td = $a.closest('td')
      const tags = []
      $td.find('a.problem__tag-link').each((_, tagEl) => {
        const t = $(tagEl).text().trim()
        if (t) tags.push(t)
      })
      problems.push({
        label: String(problems.length + 1),
        title,
        taskId: pid,
        url: `${BASE}/p/${pid}`,
        tags,
      })
    })

    // 首页解析总页数（查找分页导航中最大页码）
    if (page === 1) {
      const pageNums = [...$('a[href]').map((_, el) => {
        const m = ($(el).attr('href') || '').match(/[?&]page=(\d+)/)
        return m ? parseInt(m[1]) : 0
      }).get()]
      maxPage = Math.max(1, ...pageNums)
      console.log(`[hydro-nflsoi] 题库共 ${maxPage} 页`)
    }
    page++
  }

  if (!problems.length) throw new Error('未找到题目，题库可能为空或无权访问')
  return {
    contestId: 'problem_bank',
    contestTitle: 'NFLSOI 题库',
    problems,
  }
}

// ─── HTML → Markdown 转换 ─────────────────────────────────────────────────────

/**
 * 将 Hydro 题目页面 HTML 转换为 Markdown
 * Hydro 使用 KaTeX 渲染公式，原始 LaTeX 在 <annotation encoding="application/x-tex"> 中
 */
function parseHydroHTML($, title) {
  // Hydro 题目内容容器
  let $root = $('.problem-content, .typo, .markdown-body').first()
  if (!$root.length) $root = $('main, article').first()
  if (!$root.length) return `# ${title}\n\n${$('body').text().trim()}`

  function processNode(el) {
    const tag = (el.tagName || '').toLowerCase()
    const $el = $(el)

    if (el.type === 'text') return el.data || ''

    // KaTeX HTML 渲染层（渲染后视觉用，跳过以避免乱码）
    if (tag === 'span' && $el.hasClass('katex-html')) return ''

    // KaTeX 公式容器：提取 <annotation> 中的原始 LaTeX
    if (tag === 'span' && ($el.hasClass('katex') || $el.hasClass('katex-display'))) {
      const isDisplay = $el.hasClass('katex-display') || $el.closest('.katex-display').length > 0
      const latex = $el.find('annotation[encoding="application/x-tex"]').first().text().trim()
      if (latex) return isDisplay ? `\n\n$$${latex}$$\n\n` : `$${latex}$`
      return ''
    }

    if (tag === 'p') return processChildren(el).trim() + '\n\n'
    if (tag === 'h1') return `# ${processChildren(el).trim()}\n\n`
    if (tag === 'h2') return `## ${processChildren(el).trim()}\n\n`
    if (tag === 'h3') return `### ${processChildren(el).trim()}\n\n`
    if (tag === 'h4') return `#### ${processChildren(el).trim()}\n\n`
    if (tag === 'pre') return '```\n' + $el.text().trim() + '\n```\n\n'
    if (tag === 'code' && $el.parent().prop('tagName')?.toLowerCase() !== 'pre') {
      return '`' + $el.text() + '`'
    }
    if (tag === 'strong' || tag === 'b') return '**' + processChildren(el) + '**'
    if (tag === 'em' || tag === 'i') return '*' + processChildren(el) + '*'
    if (tag === 'hr') return '---\n\n'
    if (tag === 'br') return '\n'
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
    if (tag === 'table') {
      let s = ''
      $el.find('tr').each((i, tr) => {
        const cells = []
        $(tr).find('th, td').each((_, td) => cells.push(processChildren(td).trim().replace(/\n/g, ' ')))
        s += '| ' + cells.join(' | ') + ' |\n'
        if (i === 0) s += '| ' + cells.map(() => '---').join(' | ') + ' |\n'
      })
      return s + '\n'
    }
    if (tag === 'img') {
      const src = $el.attr('src') || ''
      const alt = $el.attr('alt') || ''
      if (!src) return ''
      const fullSrc = src.startsWith('/') ? BASE + src : src
      return `\n![${alt}](${fullSrc})\n`
    }
    // 容器节点：递归
    return processChildren(el)
  }

  function processChildren(el) {
    let s = ''
    $(el).contents().each((_, child) => { s += processNode(child) })
    return s
  }

  let md = `# ${title}\n\n`
  md += processChildren($root[0])
  return md.replace(/\n{3,}/g, '\n\n').trim()
}
