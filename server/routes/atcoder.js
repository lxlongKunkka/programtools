import express from 'express'
import axios from 'axios'
import { load } from 'cheerio'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8'
}

// ─── Platform Detection ───────────────────────────────────────────────────────
function detectPlatform(url) {
  if (/atcoder\.jp/i.test(url)) return 'atcoder'
  if (/codeforces\.com/i.test(url)) return 'codeforces'
  if (/luogu\.com\.cn/i.test(url)) return 'luogu'
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
    return res.status(400).json({ error: '不支持的平台，目前支持 AtCoder / Codeforces / 洛谷' })
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
    return res.status(400).json({ error: '不支持的平台，目前支持 AtCoder / Codeforces / 洛谷' })
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

  return { title, content, hasEnglish, url: enUrl, editorial }
}

// ─── AtCoder Editorial (解题思路) ─────────────────────────────────────────────

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
  const indexUrl = `https://atcoder.jp/contests/${contestId}/editorial?lang=en`
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
    const jaUrl = `https://atcoder.jp/contests/${contestId}/editorial?lang=ja`
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
  // AtCoder 单题 editorial 的正文容器
  const $content = $('.editorial-content, #editorial-content, article.editorial, .lang-en, #task-editorial, main article').first()
  const $root = $content.length ? $content : $('article, main').first()
  if (!$root.length) return ''

  let md = ''
  let firstH1Skipped = false  // 跳过第一个 h1（页面标题如 "C - xxx Editorial"，不是内容）
  $root.find('h1, h2, h3, h4, h5, p, pre, ul, ol, blockquote').each((_, el) => {
    const tag = el.tagName?.toLowerCase() || ''
    const text = $(el).text().trim()
    if (!text) return
    if (/^h[1-5]$/.test(tag)) {
      // 跳过第一个 h1 —— 通常是 "X - Problem Name Editorial" 这样的页面标题
      if (tag === 'h1' && !firstH1Skipped) {
        firstH1Skipped = true
        return
      }
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

// ─── 洛谷 (Luogu) ─────────────────────────────────────────────────────────────

const LUOGU_HEADERS = {
  ...HEADERS,
  'x-luogu-type': 'content-only',
  'Referer': 'https://www.luogu.com.cn/'
}

async function fetchLuoguProblem(url) {
  const match = url.match(/luogu\.com\.cn\/problem\/([A-Z0-9]+)/i)
  if (!match) throw new Error('无法解析洛谷题目编号')
  const pid = match[1].toUpperCase()

  // 洛谷使用 Nuxt，题目数据直接嵌入 HTML 中，无需第二次请求
  // 策略一：直接从 HTML 提取嵌入的 JSON
  // 策略二：使用 _contentOnly=1 接口（备选）
  let problem = null

  // ── 策略一：GET 主页 HTML，从嵌入的 <script> 中解析题目数据 ─────────────
  let htmlResp
  try {
    htmlResp = await axios.get(`https://www.luogu.com.cn/problem/${pid}`, {
      headers: {
        ...HEADERS,
        'Referer': 'https://www.luogu.com.cn/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: s => s < 500
    })
  } catch (e) {
    throw new Error(`洛谷请求失败: ${e.message}`)
  }

  const html = typeof htmlResp.data === 'string' ? htmlResp.data : ''

  // 从 HTML 中提取 JSON 数据（Luogu 将数据注入 <script> 标签）
  // 多种可能的注入格式：
  //   window.__NUXT__ = {...}
  //   decodeData = '{...}'
  //   或 <script id="lc-state">...</script>
  if (html) {
    // 格式 1: window.__NUXT__ = (function(...){return ...})(...);
    let nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i)
    if (!nuxtMatch) {
      // 格式 2: window._feInstance = {...}
      nuxtMatch = html.match(/window\._feInstance\s*=\s*(\{[\s\S]*?\});\s*<\/script>/i)
    }
    if (nuxtMatch) {
      try {
        const nuxtData = JSON.parse(nuxtMatch[1])
        problem = nuxtData?.currentData?.problem
          || nuxtData?.data?.problem
          || nuxtData?.problem
      } catch {}
    }

    // 格式 3: <script>...JSON.parse("...")...</script> 形式（常见注入）
    if (!problem) {
      const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)
      for (const sm of scriptMatches) {
        const src = sm[1]
        if (!src.includes('currentData') && !src.includes('"problem"')) continue
        // 找 JSON 对象
        const jsonMatch = src.match(/(\{"currentData"[\s\S]*?\})\s*[;,\n]/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1])
            problem = parsed?.currentData?.problem || parsed?.problem
            if (problem) break
          } catch {}
        }
      }
    }
  }

  // ── 策略二：_contentOnly=1 接口 ──────────────────────────────────────
  if (!problem) {
    console.log('[Luogu] HTML 中未找到嵌入数据，尝试 _contentOnly=1 接口')
    const cookies = (() => {
      const setCookie = htmlResp?.headers?.['set-cookie']
      return setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : ''
    })()
    try {
      const apiResp = await axios.get(
        `https://www.luogu.com.cn/problem/${pid}?_contentOnly=1`,
        {
          headers: {
            ...LUOGU_HEADERS,
            'Accept': 'application/json, */*',
            ...(cookies ? { 'Cookie': cookies } : {})
          },
          timeout: 20000,
          maxRedirects: 3,
          validateStatus: s => s < 500
        }
      )
      let apiData = apiResp.data
      if (typeof apiData === 'string') {
        try { apiData = JSON.parse(apiData) } catch { apiData = null }
      }
      problem = apiData?.currentData?.problem
    } catch (e) {
      console.warn('[Luogu] _contentOnly=1 也失败:', e.message)
    }
  }

  if (!problem) throw new Error('洛谷：无法获取题目数据，可能需要登录或题号不存在')

  const title = problem.title || pid
  let md = `# ${title}\n\n`

  // 时间/空间限制
  if (problem.limits) {
    const t = problem.limits.time?.[0]
    const m = problem.limits.memory?.[0]
    if (t || m) md += `**时间限制**: ${t ? t + 'ms' : '?'}\t**内存限制**: ${m ? m + 'KB' : '?'}\n\n`
  }

  // 题目描述
  const desc = problem.description || problem.content || ''
  if (desc) md += `## 题目描述\n\n${desc}\n\n`

  // 输入/输出格式
  if (problem.inputFormat) md += `## 输入格式\n\n${problem.inputFormat}\n\n`
  if (problem.outputFormat) md += `## 输出格式\n\n${problem.outputFormat}\n\n`

  // 样例
  const samples = problem.samples || []
  if (samples.length) {
    md += `## 样例\n\n`
    samples.forEach((s, i) => {
      md += `**输入 ${i + 1}**\n\`\`\`\n${s[0] || s.input || ''}\n\`\`\`\n\n`
      md += `**输出 ${i + 1}**\n\`\`\`\n${s[1] || s.output || ''}\n\`\`\`\n\n`
    })
  }

  // 数据范围/说明
  if (problem.hint) md += `## 说明/提示\n\n${problem.hint}\n\n`

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
