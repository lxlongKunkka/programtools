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

function parseContestId(url) {
  const match = url.match(/atcoder\.jp\/contests\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

// GET /api/atcoder/contest?url=...
// Returns the list of problems in a contest
router.get('/contest', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })

  const contestId = parseContestId(url)
  if (!contestId) return res.status(400).json({ error: '无法从 URL 中解析比赛 ID' })

  try {
    const tasksUrl = `https://atcoder.jp/contests/${contestId}/tasks`
    const resp = await axios.get(tasksUrl, { headers: HEADERS, timeout: 20000 })

    const $ = load(resp.data)
    const problems = []

    $('table tbody tr').each((i, row) => {
      const cells = $(row).find('td')
      if (cells.length < 2) return

      // First cell: problem label (A, B, C, ...)
      const labelAnchor = $(cells[0]).find('a')
      const label = labelAnchor.text().trim() || $(cells[0]).text().trim()

      // Second cell: problem title
      const titleAnchor = $(cells[1]).find('a')
      const title = titleAnchor.text().trim()
      const href = titleAnchor.attr('href') || labelAnchor.attr('href')

      if (href && (label || title)) {
        const taskId = href.split('/').pop()
        problems.push({
          label,
          title,
          taskId,
          url: `https://atcoder.jp${href}`
        })
      }
    })

    if (problems.length === 0) {
      return res.status(404).json({ error: '未找到题目，比赛可能尚未开始或 URL 有误' })
    }

    // Try to get contest title
    const contestTitle =
      $('h1.contest-title').text().trim() ||
      $('title').text().split('-')[0].trim() ||
      contestId

    res.json({ contestId, contestTitle, problems })
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: '比赛不存在 (404)' })
    }
    if (err.response?.status === 403) {
      return res.status(403).json({ error: '无权访问，比赛可能尚未开始' })
    }
    console.error('AtCoder contest fetch error:', err.message)
    res.status(500).json({ error: `抓取失败: ${err.response?.status ? `HTTP ${err.response.status}` : err.message}` })
  }
})

// GET /api/atcoder/problem?url=...
// Returns parsed problem content as plain text / markdown
router.get('/problem', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })

  try {
    // Request English version
    const enUrl = url.replace(/[?#].*$/, '') + '?lang=en'

    const resp = await axios.get(enUrl, { headers: HEADERS, timeout: 20000 })
    const $ = load(resp.data)

    // Problem title
    const rawTitle = $('span.h2').first().text().trim()
    const pageTitle = $('title').text().trim()
    const title = rawTitle || pageTitle.split('-')[0].trim()

    // Time / Memory limits
    const limitsRow = $('.col-sm-12.col-md-4').text().trim() ||
      $('p').filter((_, el) => /Time Limit|Memory Limit/i.test($(el).text())).map((_, el) => $(el).text().trim()).get().join(' / ')

    // Prefer English task-statement; fall back to full task-statement
    let $stmt = $('#task-statement .lang-en')
    const hasEnglish = $stmt.length > 0
    if (!hasEnglish) $stmt = $('#task-statement')

    // Convert HTML → readable markdown
    const content = parseStatement($, $stmt, title, limitsRow)

    res.json({ title, content, hasEnglish, url: enUrl })
  } catch (err) {
    console.error('AtCoder problem fetch error:', err.message)
    const code = err.response?.status
    res.status(500).json({ error: `抓取题目失败: ${code ? `HTTP ${code}` : err.message}` })
  }
})

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
