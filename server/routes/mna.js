import axios from 'axios'
import { createHash } from 'crypto'
import { load } from 'cheerio'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { MNA_USER, MNA_PWD, MNA_HTTP_PROXY } from '../config.js'

const BASE = 'https://mna.wang'
const LOGIN_SALT = 'syzoj2_xxx'

let cachedCookies = ''
let sessionExpireAt = 0
const mnaProxyAgent = MNA_HTTP_PROXY ? new HttpsProxyAgent(MNA_HTTP_PROXY) : null

function normalizeUrl(urlOrPath, baseUrl = BASE) {
  try {
    return new URL(urlOrPath, baseUrl).href
  } catch {
    return urlOrPath
  }
}

function indexToLabel(index) {
  let value = index + 1
  let label = ''
  while (value > 0) {
    value -= 1
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26)
  }
  return label
}

function extractFilename(contentDisposition, fallback = 'additional_file.zip') {
  if (!contentDisposition) return fallback
  const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i)
  const raw = match?.[1] || match?.[2]
  if (!raw) return fallback
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function isEscaped(str, index) {
  let slashCount = 0
  for (let i = index - 1; i >= 0 && str[i] === '\\'; i -= 1) slashCount += 1
  return slashCount % 2 === 1
}

function extractAssignedJsString(source, variableName) {
  const marker = `${variableName} = "`
  const start = source.indexOf(marker)
  if (start === -1) return ''

  let cursor = start + marker.length
  let raw = ''
  while (cursor < source.length) {
    const ch = source[cursor]
    if (ch === '"' && !isEscaped(source, cursor)) break
    raw += ch
    cursor += 1
  }

  if (!raw) return ''
  try {
    return JSON.parse(`"${raw}"`)
  } catch {
    return ''
  }
}

function makeHeaders(cookies = '', extra = {}) {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': `${BASE}/`,
    ...(cookies ? { Cookie: cookies } : {}),
    ...extra,
  }
}

function makeRequestOptions(extra = {}) {
  return {
    ...(mnaProxyAgent ? {
      httpAgent: mnaProxyAgent,
      httpsAgent: mnaProxyAgent,
      proxy: false,
    } : {}),
    ...extra,
  }
}

async function getSession() {
  const now = Date.now()
  if (cachedCookies && now < sessionExpireAt) return cachedCookies

  if (!MNA_USER || !MNA_PWD) {
    throw new Error('未配置 MNA_USER / MNA_PWD，请在 server/.env 中配置梦熊联盟账号')
  }

  const password = createHash('md5').update(MNA_PWD + LOGIN_SALT).digest('hex')
  const resp = await axios.post(
    `${BASE}/api/login`,
    new URLSearchParams({ username: MNA_USER, password }).toString(),
    makeRequestOptions({
      headers: makeHeaders('', {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      }),
      maxRedirects: 0,
      validateStatus: status => status < 600,
      timeout: 15000,
    })
  )

  if (resp.data?.error_code !== 1) {
    throw new Error(`梦熊联盟登录失败: error_code=${resp.data?.error_code ?? 'unknown'}`)
  }

  const cookies = (resp.headers['set-cookie'] || []).map(item => item.split(';')[0]).join('; ')
  if (!cookies) throw new Error('梦熊联盟登录失败：未收到 session cookie')

  cachedCookies = cookies
  sessionExpireAt = now + 6 * 60 * 60 * 1000
  console.log('[mna] 登录成功，session 已缓存')
  return cachedCookies
}

async function mnaGet(path) {
  const cookies = await getSession()
  const resp = await axios.get(normalizeUrl(path), makeRequestOptions({
    headers: makeHeaders(cookies),
    responseType: 'text',
    transformResponse: [data => data],
    validateStatus: status => status < 600,
    timeout: 20000,
  }))

  if (resp.status === 403) throw new Error('梦熊联盟无权访问（403），请检查账号权限')
  if (resp.status === 404) throw new Error(`梦熊联盟页面不存在（404）: ${path}`)
  if (resp.status >= 400) throw new Error(`梦熊联盟请求失败，HTTP ${resp.status}`)
  return resp.data
}

async function mnaGetBinary(path) {
  const cookies = await getSession()
  const resp = await axios.get(normalizeUrl(path), makeRequestOptions({
    headers: makeHeaders(cookies),
    responseType: 'arraybuffer',
    validateStatus: status => status < 600,
    timeout: 30000,
  }))

  if (resp.status === 403) throw new Error('梦熊联盟无权下载（403）')
  if (resp.status === 404) throw new Error(`梦熊联盟文件不存在（404）: ${path}`)
  if (resp.status >= 400) throw new Error(`梦熊联盟下载失败，HTTP ${resp.status}`)
  return resp
}

function parseMnaContestId(url) {
  const match = url.match(/mna\.wang\/contest\/(\d+)/i)
  return match ? match[1] : null
}

function parseMnaProblemIds(url) {
  const match = url.match(/mna\.wang\/contest\/(\d+)\/problem\/(\d+)/i)
  return match ? { contestId: match[1], problemNumber: match[2] } : null
}

function getNodeText($, node, pageUrl) {
  if (!node) return ''
  if (node.type === 'text') return node.data || ''
  if (!node.children?.length) {
    if (node.tagName?.toLowerCase() === 'img') {
      const src = $(node).attr('src') || ''
      if (!src) return ''
      const alt = $(node).attr('alt') || ''
      return ` ![${alt}](${normalizeUrl(src, pageUrl)}) `
    }
    if (node.tagName?.toLowerCase() === 'a') {
      const href = $(node).attr('href') || ''
      const text = $(node).text().trim()
      if (!href || /\/download\/additional_file/.test(href)) return text
      return text ? `[${text}](${normalizeUrl(href, pageUrl)})` : normalizeUrl(href, pageUrl)
    }
    return $(node).text()
  }

  const tag = node.tagName?.toLowerCase()
  if (tag === 'img') {
    const src = $(node).attr('src') || ''
    if (!src) return ''
    const alt = $(node).attr('alt') || ''
    return ` ![${alt}](${normalizeUrl(src, pageUrl)}) `
  }
  if (tag === 'a') {
    const href = $(node).attr('href') || ''
    const text = node.children.map(child => getNodeText($, child, pageUrl)).join('').trim()
    if (!href || /\/download\/additional_file/.test(href)) return text
    return text ? `[${text}](${normalizeUrl(href, pageUrl)})` : normalizeUrl(href, pageUrl)
  }

  return node.children.map(child => getNodeText($, child, pageUrl)).join('')
}

function nodeToMd($, node, pageUrl) {
  if (!node?.tagName) return ''
  const tag = node.tagName.toLowerCase()

  if (tag === 'script' || tag === 'style') return ''
  if (tag === 'img') {
    const src = $(node).attr('src') || ''
    if (!src) return ''
    const alt = $(node).attr('alt') || ''
    return `![${alt}](${normalizeUrl(src, pageUrl)})\n\n`
  }
  if (tag === 'pre') {
    const text = $(node).text().trim()
    return text ? `\`\`\`\n${text}\n\`\`\`\n\n` : ''
  }
  if (tag === 'p') {
    const text = getNodeText($, node, pageUrl).replace(/\s+/g, ' ').trim()
    return text ? `${text}\n\n` : ''
  }
  if (tag === 'blockquote') {
    const text = getNodeText($, node, pageUrl).replace(/\n+/g, '\n').trim()
    return text ? `> ${text.replace(/\n/g, '\n> ')}\n\n` : ''
  }
  if (tag === 'ul' || tag === 'ol') {
    let out = ''
    $(node).children('li').each((index, li) => {
      const text = getNodeText($, li, pageUrl).replace(/\s+/g, ' ').trim()
      if (!text) return
      out += `${tag === 'ol' ? `${index + 1}.` : '-'} ${text}\n`
    })
    return out ? `${out}\n` : ''
  }
  if (/^h[1-6]$/.test(tag)) {
    const level = Math.min(Number(tag[1]) + 1, 6)
    const text = $(node).text().replace(/\s+/g, ' ').trim()
    return text ? `${'#'.repeat(level)} ${text}\n\n` : ''
  }
  if (tag === 'table') {
    const rows = $(node).find('tr').toArray().map(tr => $(tr).find('th,td').toArray().map(cell => getNodeText($, cell, pageUrl).replace(/\s+/g, ' ').trim()))
    const filtered = rows.filter(row => row.some(Boolean))
    if (!filtered.length) return ''
    return filtered.map(row => `| ${row.join(' | ')} |`).join('\n') + '\n\n'
  }
  if (tag === 'a') {
    const href = $(node).attr('href') || ''
    if (/\/download\/additional_file/.test(href)) return ''
    const text = getNodeText($, node, pageUrl).replace(/\s+/g, ' ').trim()
    if (!text) return ''
    return `[${text}](${normalizeUrl(href, pageUrl)})`
  }

  let out = ''
  node.children?.forEach(child => {
    out += child.tagName ? nodeToMd($, child, pageUrl) : getNodeText($, child, pageUrl)
  })
  return out
}

function parseMnaProblemContent($, title, pageUrl) {
  let md = `# ${title}\n\n`
  const titleNode = $('h1').first()
  const root = titleNode.closest('.ui.main.container, .ui.container').first()
  const candidateNodes = root.length ? root.children().toArray() : titleNode.parent().children().toArray()
  const startIndex = Math.max(0, candidateNodes.findIndex(node => $(node).find('h1').length || $(node).is('h1')))
  const siblings = candidateNodes.slice(startIndex + 1)

  for (const node of siblings) {
    const $node = $(node)
    if ($node.is('script, style, .ui.comments, #disqus_thread, .footer, footer')) continue
    md += nodeToMd($, node, pageUrl)
  }

  md = md
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

  if (md.length < 40) {
    const fallback = $('.ui.segment').toArray().map(node => nodeToMd($, node, pageUrl)).join('')
    md = (`# ${title}\n\n${fallback}`).replace(/\n{3,}/g, '\n\n').trim()
  }

  const existingImages = new Set(Array.from(md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)).map(match => match[1]))
  const extraImages = (root.length ? root : $('body')).find('img').toArray()
    .map(node => normalizeUrl($(node).attr('src') || '', pageUrl))
    .filter(src => src && !/\/logo\.png$/i.test(src) && !existingImages.has(src))

  if (extraImages.length) {
    md += '\n\n## 图片\n\n'
    extraImages.forEach(src => {
      md += `![](${src})\n\n`
    })
  }

  return md
}

function extractProblemLimits($) {
  const headerText = $('h1').first().parent().text().replace(/\s+/g, ' ')
  const timeMatch = headerText.match(/(\d+)\s*ms/i)
  const memoryMatch = headerText.match(/(\d+)\s*(MiB|MB|KiB|KB)/i)

  let memoryLimit = null
  if (memoryMatch) {
    const value = Number(memoryMatch[1])
    const unit = memoryMatch[2].toLowerCase()
    memoryLimit = unit === 'kib' || unit === 'kb' ? Math.round(value / 1024) : value
  }

  return {
    timeLimit: timeMatch ? Number(timeMatch[1]) : null,
    memoryLimit,
  }
}

async function fetchMnaSubmissionCode(submissionPath) {
  const html = await mnaGet(submissionPath)
  const highlighted = extractAssignedJsString(html, 'formattedCode') || extractAssignedJsString(html, 'unformattedCode')
  if (!highlighted) return ''

  const $ = load(`<div id="code-root">${highlighted}</div>`)
  return $('#code-root').text().trim()
}

async function fetchMnaAcCode(contestId, problemNumber) {
  const html = await mnaGet(`/contest/${contestId}/ranklist`)
  const $ = load(html)
  const targetIndex = Number(problemNumber) + 1
  const candidates = []

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length <= targetIndex) return
    const $cell = $(cells[targetIndex])
    const href = $cell.find('a[href*="/submission/"]').first().attr('href') || ''
    if (!href) return

    const text = $cell.text().replace(/\s+/g, ' ').trim()
    const scoreMatch = text.match(/(\d+)\s*\/\s*(\d+)/)
    candidates.push({
      href,
      score: scoreMatch ? Number(scoreMatch[1]) : 0,
      fullScore: scoreMatch ? Number(scoreMatch[1]) === Number(scoreMatch[2]) && Number(scoreMatch[1]) > 0 : false,
    })
  })

  candidates.sort((left, right) => {
    if (left.fullScore !== right.fullScore) return left.fullScore ? -1 : 1
    return right.score - left.score
  })

  for (const candidate of candidates.slice(0, 12)) {
    try {
      const code = await fetchMnaSubmissionCode(candidate.href)
      if (code) return code
    } catch (error) {
      console.warn(`[mna] 获取提交源码失败 ${candidate.href}: ${error.message}`)
    }
  }

  return ''
}

export async function fetchMnaContest(url) {
  const contestId = parseMnaContestId(url)
  if (!contestId) throw new Error('无法从 URL 中解析梦熊联盟比赛 ID')

  const html = await mnaGet(`/contest/${contestId}`)
  const $ = load(html)
  const problemMap = new Map()

  $(`a[href*="/contest/${contestId}/problem/"]`).each((_, link) => {
    const href = $(link).attr('href') || ''
    const match = href.match(new RegExp(`/contest/${contestId}/problem/(\\d+)`))
    if (!match) return
    const taskId = match[1]
    const title = $(link).text().replace(/\s+/g, ' ').trim()
    if (!title || problemMap.has(taskId)) return
    problemMap.set(taskId, {
      label: indexToLabel(problemMap.size),
      title,
      taskId,
      url: normalizeUrl(href),
    })
  })

  const problems = [...problemMap.values()].sort((left, right) => Number(left.taskId) - Number(right.taskId))
  if (!problems.length) throw new Error('未找到题目列表，比赛可能不存在或尚未开始')

  const contestTitle =
    $('title').text().split(' - 比赛')[0].trim() ||
    $('h1').first().text().replace(/\s+/g, ' ').trim() ||
    `mna-${contestId}`

  return { contestId, contestTitle, problems }
}

export async function fetchMnaProblem(url) {
  const ids = parseMnaProblemIds(url)
  if (!ids) throw new Error('无法从 URL 中解析梦熊联盟题目地址，格式应为 /contest/{id}/problem/{number}')

  const { contestId, problemNumber } = ids
  const pageUrl = `${BASE}/contest/${contestId}/problem/${problemNumber}`
  const html = await mnaGet(pageUrl)
  const $ = load(html)

  const title = $('h1').first().text().replace(/\s+/g, ' ').trim() || $('title').text().split(' - ')[0].trim()
  const content = parseMnaProblemContent($, title, pageUrl)
  const { timeLimit, memoryLimit } = extractProblemLimits($)

  let additionalFile = null
  const additionalHref = $('a[href*="/download/additional_file"]').first().attr('href') || ''
  if (additionalHref) {
    try {
      const resp = await mnaGetBinary(additionalHref)
      additionalFile = {
        filename: extractFilename(resp.headers['content-disposition'], `additional_file_${contestId}_${problemNumber}.zip`),
        base64: Buffer.from(resp.data).toString('base64'),
        size: Buffer.byteLength(resp.data),
      }
    } catch (error) {
      console.warn('[mna] 附件下载跳过:', error.message)
    }
  }

  let acCode = ''
  try {
    const timeout = new Promise(resolve => setTimeout(() => resolve(''), 20000))
    acCode = await Promise.race([fetchMnaAcCode(contestId, problemNumber), timeout])
  } catch (error) {
    console.warn('[mna] AC code skipped:', error.message)
  }

  return {
    title,
    content,
    url: pageUrl,
    acCode,
    additionalFile,
    timeLimit,
    memoryLimit,
  }
}

export { parseMnaContestId, parseMnaProblemIds }