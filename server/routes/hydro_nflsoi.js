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
  const m = url.match(/\/contest\/([a-zA-Z0-9]+)\/problem\/([a-zA-Z0-9_]+)/)
  if (m) return { contestId: m[1], pid: m[2] }
  return null
}

// ─── 核心抓取函数 ─────────────────────────────────────────────────────────────

/**
 * 抓取 Hydro OJ 比赛信息和题目列表
 */
export async function fetchHydroNflsoiContest(url) {
  const contestId = parseContestId(url)
  if (!contestId) throw new Error('无法从 URL 中解析 Hydro OJ 比赛 ID')

  // 直接 HTML 解析 /contest/{id}/problems，该页面包含标签信息
  const html = await hydroGet(`/contest/${contestId}/problems`)
  const $ = load(html)

  const contestTitle =
    $('h1').first().text().trim() ||
    $('title').text().split('-')[0].trim() ||
    `Contest ${contestId}`

  const problems = []
  const seen = new Set()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    // 匹配 /p/{pid}?tid={contestId} 或 /contest/{id}/problem/{pid}
    const m1 = href.match(/\/p\/([a-zA-Z0-9_]+)[^?]*[?&]tid=([a-zA-Z0-9]+)/)
    const m2 = href.match(/\/contest\/[a-zA-Z0-9]+\/problem\/([a-zA-Z0-9_]+)/)
    const pid = m1 ? m1[1] : (m2 ? m2[1] : null)
    if (!pid || seen.has(pid)) return
    seen.add(pid)

    const $a = $(el)
    $a.find('b').remove()
    const title = $a.text().replace(/\s+/g, ' ').trim() || pid
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
      url: `${BASE}/contest/${contestId}/problem/${pid}`,
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
  if (!ids) throw new Error('无法从 URL 中解析题目地址，格式应为 /contest/{id}/problem/{pid}')
  const { contestId, pid } = ids
  const apiPath = `/contest/${contestId}/problem/${pid}`

  // 优先 JSON API：Hydro 的 pdoc.content 是原始 Markdown，质量最高
  let data
  try {
    data = await hydroGetJson(apiPath)
  } catch (e) {
    console.warn('[hydro-nflsoi] JSON API 失败，降级至 HTML 解析:', e.message)
  }

  if (data?.pdoc) {
    const { pdoc } = data
    const title = pdoc.title || pid
    let content = pdoc.content || ''

    // Hydro content 有两种格式：
    //   1. 纯 Markdown 字符串
    //   2. JSON 对象 {"zh": "...", "en": "..."}（多语言）
    if (typeof content === 'string' && content.trimStart().startsWith('{')) {
      try {
        const obj = JSON.parse(content)
        content = obj.zh || obj['zh-CN'] || obj.default || obj.en || Object.values(obj)[0] || ''
      } catch {}
    }

    if (content) {
      const cfg = pdoc.config || {}
      const limits = [
        cfg.time ? `**时间限制**: ${cfg.time}ms` : '',
        cfg.memory ? `**内存限制**: ${cfg.memory}MB` : '',
      ].filter(Boolean).join(' / ')
      const fullContent = `# ${title}\n\n${limits ? `> ${limits}\n\n` : ''}${content}`

      let acCode = ''
      try {
        const timeout = new Promise(resolve => setTimeout(() => resolve(''), 20000))
        acCode = await Promise.race([fetchHydroNflsoiAcCode(contestId, pid, contestId), timeout])
      } catch (e) {
        console.warn('[hydro-nflsoi] AC code skipped:', e.message)
      }

      return { title, content: fullContent, url, acCode }
    }
  }

  // HTML 降级解析
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
    acCode = await Promise.race([fetchHydroNflsoiAcCode(contestId, pid, contestId), timeout])
  } catch (e) {
    console.warn('[hydro-nflsoi] AC code skipped:', e.message)
  }

  return { title, content, url, acCode }
}

// ─── AC 代码抓取 ─────────────────────────────────────────────────────────────

/**
 * 从 Hydro OJ 比赛中获取指定题目的一份 AC C++ 代码
 *
 * Hydro API:
 *   GET /record?json=1&tid={tid}&pid={pid}&status=1
 *   → rdocs[]: [{ _id, lang, ... }]
 *
 *   GET /record/{recordId}?json=1
 *   → rdoc.code: 源码字符串
 *
 * status=1 = Accepted（Hydro 约定）
 * lang 优先选 C++（cc / c++／cpp 等包含 c 的关键词）
 */
async function fetchHydroNflsoiAcCode(contestId, pid, tid) {
  console.log(`[hydro-nflsoi] 查询 AC 提交 tid=${tid} pid=${pid}`)

  // Hydro 的 /record 列表接口支持 json=1，返回 { rdocs: [...], ... }
  let rdocs = []
  try {
    const data = await hydroGetJson(`/record?tid=${encodeURIComponent(tid)}&pid=${encodeURIComponent(pid)}&status=1`)
    rdocs = data?.rdocs || []
    console.log(`[hydro-nflsoi] AC 提交数量: ${rdocs.length}`)
  } catch (e) {
    console.warn('[hydro-nflsoi] 查询提交列表失败:', e.message)
    return ''
  }

  if (!rdocs.length) return ''

  // 优先选 C++ 提交（lang 字段通常为 'cc' / 'cc.cc17' / 'c++' 等）
  const sorted = [...rdocs].sort((a, b) => {
    const aC = /^c[c+]/i.test(a.lang || '') ? -1 : 1
    const bC = /^c[c+]/i.test(b.lang || '') ? -1 : 1
    return aC - bC
  })

  // 尝试前3条，取第一条能拿到代码的
  for (const rdoc of sorted.slice(0, 3)) {
    const rid = rdoc._id || rdoc.id
    if (!rid) continue
    try {
      const detail = await hydroGetJson(`/record/${rid}`)
      const code = detail?.rdoc?.code || ''
      if (code) {
        // 去掉常见文件重定向行（freopen）
        const cleaned = code.replace(/^[ \t]*freopen\b[^\n]*;[ \t]*\r?\n?/gm, '')
        console.log(`[hydro-nflsoi] 获取到 AC 代码 rid=${rid} lang=${rdoc.lang} len=${cleaned.length}`)
        return cleaned
      }
    } catch (e) {
      console.warn(`[hydro-nflsoi] 获取提交详情失败 rid=${rid}:`, e.message)
    }
  }

  return ''
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
