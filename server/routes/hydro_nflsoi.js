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
import JSZip from 'jszip'
import path from 'path'
import { HYDRO_NFLSOI_USER, HYDRO_NFLSOI_PWD } from '../config.js'
import { uploadImageToCos } from '../utils/cosUploader.js'

const BASE = 'http://nflsoi.cc:10611'

// ─── Session 缓存（Hydro 使用 sid cookie）────────────────────────────────────
let cachedCookies = ''
let sessionExpireAt = 0  // Unix ms

// ─── 比赛代码 ZIP 缓存（contestId → Map<pid, code>）─────────────────────────
const zipCodeCache = new Map()
const zipRawNamesCache = new Map() // contestId → 全部文件名（调试用）

/**
 * 下载比赛代码 zip（/contest/{id}/code），解析所有文件，按 pid 取最高分提交。
 * 文件名格式：U{uid}_P{pid}_R{rid}_S{score}@{rank}.{lang}.{langid}
 * 结果按 contestId 缓存，一场比赛只下载一次。
 */
async function fetchContestZipCodes(contestId) {
  if (zipCodeCache.has(contestId)) return zipCodeCache.get(contestId)

  const cookies = await getSession()
  const r = await axios.get(`${BASE}/contest/${contestId}/code`, {
    headers: makeHeaders(cookies),
    responseType: 'arraybuffer',
    validateStatus: s => s < 600,
    timeout: 60000,
  })

  if (r.status !== 200) {
    console.warn(`[hydro-nflsoi] zip 下载失败 contestId=${contestId} status=${r.status}`)
    return null
  }

  const zip = await JSZip.loadAsync(r.data)

  // 只收集 AC 提交（S1 = Accepted）：filename → U{uid}_P{pid}_R{rid}_S1@{score}.{lang}...
  const codeMap = new Map()  // pidKey → code

  const allNames = Object.keys(zip.files).filter(n => !zip.files[n].dir)
  zipRawNamesCache.set(contestId, allNames)
  console.log('[hydro-nflsoi] zip 文件列表 contestId=' + contestId + ':\n' + allNames.join('\n'))

  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue
    // 只处理 AC（S1）提交，格式：U{uid}_P{pid}_R{rid}_S1@{score}.{lang}.{langid}
    const m = name.match(/_P([a-zA-Z0-9]+)_R[0-9a-zA-Z]+_S1@/)
    if (!m) continue
    const pidKey = m[1]  // 如 "479"，对应 taskId "P479" 去掉 P 前缀
    if (codeMap.has(pidKey)) continue  // 同一题已有 AC，跳过
    const code = await file.async('string')
    codeMap.set(pidKey, code)
  }

  console.log(`[hydro-nflsoi] zip 解析完成 contestId=${contestId} 共 ${codeMap.size} 道题有提交`)
  zipCodeCache.set(contestId, codeMap)
  return codeMap
}

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

/** 二进制下载（用于图片、附件等），返回 Buffer */
async function hydroGetBinary(urlPath) {
  const cookies = await getSession()
  const r = await axios.get(BASE + urlPath, {
    headers: makeHeaders(cookies),
    responseType: 'arraybuffer',
    validateStatus: s => s < 600,
    timeout: 30000,
  })
  if (r.status === 403) throw new Error(`Hydro OJ 无权下载（403）: ${urlPath}`)
  if (r.status === 404) throw new Error(`Hydro OJ 文件不存在（404）: ${urlPath}`)
  if (r.status >= 400) throw new Error(`Hydro OJ 下载失败，HTTP ${r.status}`)
  return Buffer.from(r.data)
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

// ─── 图片代理：下载 Hydro OJ 图片（需要 session）并上传 COS ──────────────────────

/**
 * 将 markdown 中所有 nflsoi.cc:10611 域名的图片，带 session 下载后上传 COS，替换链接。
 * 失败时保留原链接。
 */
async function replaceHydroImages(markdown) {
  const imgRe = /!\[([^\]]*)\]\((https?:\/\/nflsoi\.cc:10611\/[^)]+)\)/g
  const matches = []
  let m
  while ((m = imgRe.exec(markdown)) !== null) {
    matches.push({ full: m[0], alt: m[1], src: m[2] })
  }
  if (!matches.length) return markdown

  let result = markdown
  for (const { full, alt, src } of matches) {
    try {
      const urlPath = src.replace(/^https?:\/\/nflsoi\.cc:10611/, '')
      const buffer = await hydroGetBinary(urlPath)
      const ext = path.extname(urlPath.split('?')[0]) || '.png'
      const fileName = `hydro_nflsoi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`
      const cosUrl = await uploadImageToCos(buffer, fileName)
      if (cosUrl) {
        result = result.replace(full, `![${alt}](${cosUrl})`)
        console.log(`[hydro-nflsoi] 图片已上传 COS: ${src} → ${cosUrl}`)
      }
    } catch (e) {
      console.warn(`[hydro-nflsoi] 图片上传跳过: ${src}`, e.message)
    }
  }
  return result
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

  // 直接 HTML 解析（/contest/{id}/problems），以便同时获取标签信息
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

  const content = parseHydroHTML($, title, apiPath)

  // 提取标签：优先从内嵌 JSON "tag" 字段，回退到 DOM a.problem__tag-link
  const tags = []
  const tagMatch = html.match(/"tag"\s*:\s*(\[[^\]]*\])/)
  if (tagMatch) {
    try {
      const parsed = JSON.parse(tagMatch[1])
      if (Array.isArray(parsed)) tags.push(...parsed.filter(t => typeof t === 'string' && t.trim()))
    } catch {}
  }
  if (!tags.length) {
    $('a.problem__tag-link').each((_, el) => {
      const t = $(el).text().trim()
      if (t) tags.push(t)
    })
  }
  if (tags.length) console.log(`[hydro-nflsoi] 提取到标签: ${tags.join(', ')}`)

  // 提取时间限制（ms）和内存限制（MB）
  let timeLimit = null
  let memoryLimit = null

  // DEBUG: 打印页面里所有含 time/memory 字样的 JSON 片段，帮助确认字段名
  const debugSnippets = (html.match(/["'](?:time|memory)[^"']{0,20}["']\s*:\s*["'\d][^,\n]{0,30}/gi) || []).slice(0, 8)
  console.log(`[hydro-nflsoi] DEBUG time/memory fields: ${JSON.stringify(debugSnippets)}`)

  // 方式1a: "timeLimit": 1000 (数字，部分 Hydro 版本)
  const tlMatch1 = html.match(/"timeLimit"\s*:\s*(\d+)/)
  if (tlMatch1) timeLimit = parseInt(tlMatch1[1])

  // 方式1b: "time": "1000ms" (字符串，Hydro config 格式)
  if (!timeLimit) {
    const m = html.match(/"time"\s*:\s*"(\d+)\s*ms"/)
    if (m) timeLimit = parseInt(m[1])
  }

  // 方式1c: "time": 1000 (数字)
  if (!timeLimit) {
    const m = html.match(/"time"\s*:\s*(\d+)(?!\s*[":])/)
    if (m) timeLimit = parseInt(m[1])
  }

  // 方式2a: "memoryLimit": 262144 (数字，需判断单位)
  const mlMatch1 = html.match(/"memoryLimit"\s*:\s*(\d+)/)
  if (mlMatch1) {
    const raw = parseInt(mlMatch1[1])
    if (raw > 100000) memoryLimit = Math.round(raw / 1048576)
    else if (raw > 1024) memoryLimit = Math.round(raw / 1024)
    else memoryLimit = raw
  }

  // 方式2b: "memory": "256m" / "256mb" / "256MB"
  if (!memoryLimit) {
    const m = html.match(/"memory"\s*:\s*"(\d+)\s*(?:mib|mb|m)"/i)
    if (m) memoryLimit = parseInt(m[1])
  }

  // 方式2c: "memory": 256 (数字，MB)
  if (!memoryLimit) {
    const m = html.match(/"memory"\s*:\s*(\d+)(?!\s*[":])/)
    if (m) {
      const raw = parseInt(m[1])
      if (raw > 100000) memoryLimit = Math.round(raw / 1048576)
      else if (raw > 1024) memoryLimit = Math.round(raw / 1024)
      else memoryLimit = raw
    }
  }

  // 方式3: 从页面可见文本提取（中文 Hydro 实例显示"时间限制: 1000ms"）
  if (!timeLimit) {
    const m = $('body').text().match(/时间?[限制]*\s*[:：]\s*(\d+)\s*ms/i)
      || $('body').text().match(/Time\s*Limit\s*[:：]?\s*(\d+)\s*ms/i)
    if (m) timeLimit = parseInt(m[1])
  }
  if (!memoryLimit) {
    const m = $('body').text().match(/内存[限制]*\s*[:：]\s*(\d+)\s*(?:M|MB|MiB)/i)
      || $('body').text().match(/Memory\s*Limit\s*[:：]?\s*(\d+)\s*(?:M|MB|MiB)/i)
    if (m) memoryLimit = parseInt(m[1])
  }

  console.log(`[hydro-nflsoi] 时间限制: ${timeLimit ?? '未找到'}ms, 内存限制: ${memoryLimit ?? '未找到'}MB`)

  // 从页面提取真实数字 pid（P12695 是别名，zip/附件里存的是真实 docId 如 5073）
  // 优先从页面内嵌 JSON 提取 "docId"，其次从 <a href> 中匹配
  let realPid = pid
  const docIdMatch = html.match(/"docId"\s*:\s*(\d+)/)
  if (docIdMatch) {
    realPid = docIdMatch[1]
  } else {
    realPid = $('a[href]').toArray().map(el => $(el).attr('href'))
      .map(h => h?.match(/\/p\/(\d+)(?:\/|\?|$)/)?.[1])
      .find(Boolean) || pid
  }
  if (realPid !== pid) {
    console.log('[hydro-nflsoi] 解析到真实 pid: ' + pid + ' -> ' + realPid)
  }

  let acCode = ''
  try {
    const timeout = new Promise(resolve => setTimeout(() => resolve(''), 20000))
    acCode = await Promise.race([fetchHydroNflsoiAcCode(contestId, realPid), timeout])
  } catch (e) {
    console.warn('[hydro-nflsoi] AC code skipped:', e.message)
  }

  // 图片上传 COS（替换 nflsoi.cc:10611 域名图片为 COS 链接）
  let finalContent = content
  try {
    finalContent = await replaceHydroImages(content)
  } catch (e) {
    console.warn('[hydro-nflsoi] 图片替换跳过:', e.message)
  }

  // 检测并下载附件
  // Hydro 将附件信息嵌入页面 JSON：additional_file:[{_id,name,...}]
  // 实际下载路径：/p/{numericPid}/file/{filename}
  let additionalFile = null
  try {
    // 方式1：从页面内嵌 JSON 中提取 additional_file 列表（最可靠）
    let attachFilename = null
    const afMatch = html.match(/"additional_file"\s*:\s*\[([^\]]+)\]/)
    if (afMatch) {
      const firstId = afMatch[1].match(/"_id"\s*:\s*"([^"]+)"/)
      if (firstId) attachFilename = firstId[1]
    }
    // 方式2：从 href 中找（兜底，兼容部分 Hydro 版本直接渲染 <a> 的情况）
    if (!attachFilename) {
      const addLink = $('a[href]').toArray()
        .map(el => $(el).attr('href') || '')
        .find(h => /\/p\/[^/]+\/file\//.test(h) || /\.\/\d+\/file\//.test(h))
      if (addLink) {
        attachFilename = addLink.split('/').pop()
      }
    }

    if (attachFilename) {
      const dlPath = `/p/${realPid}/file/${attachFilename}`
      const buffer = await hydroGetBinary(dlPath)
      additionalFile = {
        filename: 'sample.zip',
        base64: buffer.toString('base64'),
        size: buffer.length,
      }
      console.log(`[hydro-nflsoi] 附件下载成功: ${dlPath} (${buffer.length} bytes)`)
    }
  } catch (e) {
    console.warn('[hydro-nflsoi] 附件下载跳过:', e.message)
  }

  // 调试：返回 zip 文件名，方便前端 F12 查看
  const zipFiles = contestId ? (zipRawNamesCache.get(contestId) || null) : null

  return { title, content: finalContent, url, acCode, zipFiles, additionalFile, tags, timeLimit, memoryLimit }
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

  // 优先从比赛代码 ZIP 获取（避免 403，一场比赛只下载一次）
  if (contestId) {
    try {
      const codeMap = await fetchContestZipCodes(contestId)
      if (codeMap) {
        // taskId 存储为 'P5510'，zip 中 pidKey 为 '5510'，两种格式都尝试
        const pidKey = pid.replace(/^P/i, '')
        const code = codeMap.get(pidKey) || codeMap.get(pid)
        if (code) {
          const cleaned = code.replace(/^[ \t]*freopen\b[^\n]*;[ \t]*\r?\n?/gm, '')
          console.log(`[hydro-nflsoi] zip 获取到 AC 代码 pid=${pid} len=${cleaned.length}`)
          return cleaned
        }
        console.log(`[hydro-nflsoi] zip 中无 pid=${pid}(key=${pidKey}) 的提交，codeMap keys: [${[...codeMap.keys()].join(',')}]`)
      }
    } catch (e) {
      console.warn('[hydro-nflsoi] zip 获取失败，降级至记录列表:', e.message)
    }
  }

  // 降级：从提交记录列表 HTML 获取 AC 代码
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
function parseHydroHTML($, title, apiPath = '') {
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
      let fullSrc
      if (src.startsWith('http://') || src.startsWith('https://')) {
        fullSrc = src
      } else if (src.startsWith('/')) {
        fullSrc = BASE + src
      } else {
        // 相对路径（如 ./file/xxx.png），基于当前页面路径解析
        const basePath = apiPath.split('?')[0].replace(/\/[^\/]*$/, '/')
        fullSrc = BASE + basePath + src
      }
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
