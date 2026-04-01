async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

const DEFAULT_TARGET_ORIGIN = 'https://ai.acjudge.com'

function sanitizeDownloadFileName(value, fallback = 'editorials') {
  const text = String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
  return text || fallback
}

function isAtcoderProblemUrl(url) {
  return /https:\/\/atcoder\.jp\/contests\/[^/]+\/tasks\/[^/?#]+/i.test(url || '')
}

function isAtcoderContestUrl(url) {
  return /https:\/\/atcoder\.jp\/contests\/[^/?#]+\/?(?:\?.*)?$/i.test(url || '')
}

function isHtojProblemUrl(url) {
  return /https:\/\/htoj\.com\.cn\/cpp\/oj\/problem\/detail\?[^#]*\bpid=\d+/i.test(url || '')
}

function isHtojContestUrl(url) {
  return /https:\/\/htoj\.com\.cn\/cpp\/oj\/contest\/detail(?:\/problem)?\?[^#]*\bcid=\d+/i.test(url || '')
}

function isNflsoiProblemUrl(url) {
  return /https?:\/\/nflsoi\.cc(?::\d+)?\/(contest\/[a-z0-9]+\/problem\/[a-z0-9_]+|p\/[a-z0-9_]+)/i.test(url || '')
}

function isNflsoiContestUrl(url) {
  return /https?:\/\/nflsoi\.cc(?::\d+)?\/contest\/[a-z0-9]+(?:\/problems)?\/?(?:\?.*)?$/i.test(url || '')
}

function isYbtOjProblemUrl(url) {
  return /https?:\/\/noip\.ybtoj\.com\.cn\/(?:contest\/\d+\/problem\/\d+|problem\/\d+)\/?(?:\?.*)?$/i.test(url || '')
}

function isYbtOjContestUrl(url) {
  return /https?:\/\/noip\.ybtoj\.com\.cn\/contest\/\d+\/?(?:\?.*)?$/i.test(url || '')
}

function getImportContext(url) {
  if (isMnaProblemUrl(url)) return { site: 'MNA', mode: 'problem', strategy: 'scrape' }
  if (isMnaContestUrl(url)) return { site: 'MNA', mode: 'contest', strategy: 'scrape', collectionLabel: '比赛' }
  if (isMnaCourseUrl(url)) return { site: 'MNA', mode: 'contest', strategy: 'scrape', collectionLabel: '课程' }
  if (isYbtOjProblemUrl(url)) return { site: 'YbtOJ', mode: 'problem', strategy: 'scrape' }
  if (isYbtOjContestUrl(url)) return { site: 'YbtOJ', mode: 'contest', strategy: 'scrape', collectionLabel: '题单' }
  if (isAtcoderProblemUrl(url)) return { site: 'AtCoder', mode: 'problem', strategy: 'url' }
  if (isAtcoderContestUrl(url)) return { site: 'AtCoder', mode: 'contest', strategy: 'url' }
  if (isHtojProblemUrl(url)) return { site: '核桃 OJ', mode: 'problem', strategy: 'url' }
  if (isHtojContestUrl(url)) return { site: '核桃 OJ', mode: 'contest', strategy: 'url' }
  if (isNflsoiProblemUrl(url)) return { site: 'NFLSOI', mode: 'problem', strategy: 'scrape' }
  if (isNflsoiContestUrl(url)) return { site: 'NFLSOI', mode: 'contest', strategy: 'scrape', collectionLabel: '比赛' }
  return null
}

function isMnaProblemUrl(url) {
  return /https:\/\/mna\.wang\/(contest|course)\/\d+\/problem\/\d+/i.test(url || '')
}

function isMnaContestUrl(url) {
  return /https:\/\/mna\.wang\/contest\/\d+\/?(?:\?.*)?$/i.test(url || '')
}

function isMnaCourseUrl(url) {
  return /https:\/\/mna\.wang\/course\/\d+\/?(?:\?.*)?$/i.test(url || '')
}

async function waitForTabComplete(tabId) {
  const tab = await chrome.tabs.get(tabId)
  if (tab.status === 'complete') return

  await new Promise((resolve) => {
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

async function ensureSolveDataTab(targetOrigin) {
  const targetPrefix = `${targetOrigin}/solvedata`
  const tabs = await chrome.tabs.query({})
  const existing = tabs.find((tab) => tab.url && tab.url.startsWith(targetPrefix))
  if (existing?.id) {
    await chrome.tabs.update(existing.id, { active: true })
    await waitForTabComplete(existing.id)
    return existing.id
  }

  const created = await chrome.tabs.create({ url: `${targetPrefix}?from=edge-extension` })
  await waitForTabComplete(created.id)
  return created.id
}

async function createHiddenCollectorTab(url) {
  const tab = await chrome.tabs.create({ url, active: false })
  await waitForTabComplete(tab.id)
  return tab.id
}

async function navigateTab(tabId, url) {
  await chrome.tabs.update(tabId, { url, active: false })
  await waitForTabComplete(tabId)
}

async function sendToSolveData(tabId, type, payload) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type,
        requestId: `req_${Date.now()}_${attempt}`,
        payload,
      })
      if (!response?.ok) {
        throw new Error(response?.error || 'SolveData 页面拒绝了导入请求')
      }
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }
  throw new Error('SolveData 页面未能接收扩展数据，请确认页面已打开并完成加载')
}

async function sendTaskToSolveData(tabId, payload) {
  return sendToSolveData(tabId, 'PROGRAMTOOLS_IMPORT_TASK', payload)
}

async function sendUrlToSolveData(tabId, url) {
  return sendToSolveData(tabId, 'PROGRAMTOOLS_IMPORT_URL', { url })
}

async function runScriptInTab(tabId, func, args = []) {
  const [execution] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  })
  return execution?.result
}

async function collectCurrentMnaProblem() {
  const MAX_INLINE_ATTACHMENT_BYTES = 5 * 1024 * 1024

  function parseFilename(contentDisposition, fallback) {
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

  function normalizeUrl(urlOrPath, baseUrl = location.origin) {
    try {
      return new URL(urlOrPath, baseUrl).href
    } catch {
      return urlOrPath
    }
  }

  function isEscaped(str, index) {
    let slashCount = 0
    for (let pointer = index - 1; pointer >= 0 && str[pointer] === '\\'; pointer -= 1) slashCount += 1
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

  function isIgnorableProblemLink(href = '', text = '') {
    const normalizedHref = href.trim()
    const normalizedText = text.replace(/\s+/g, ' ').trim()

    if (!normalizedHref) return true
    if (/\/download\/additional_file/.test(normalizedHref)) return true
    if (/#[a-z0-9_-]+$/i.test(normalizedHref)) return true
    if (/\/(contest|course)\/\d+\/(submissions|ranklist)(\?|$)/i.test(normalizedHref)) return true
    if (/\/(contest|course)\/submission\/\d+/i.test(normalizedHref)) return true
    if (/^(返回课程|返回比赛|提交|提交记录|排行榜)$/.test(normalizedText)) return true

    return false
  }

  function getNodeText(node, pageUrl) {
    if (!node) return ''
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (!(node instanceof Element)) return ''
    const tag = node.tagName.toLowerCase()
    if (tag === 'img') {
      const src = node.getAttribute('src') || ''
      if (!src) return ''
      const alt = node.getAttribute('alt') || ''
      return ` ![${alt}](${normalizeUrl(src, pageUrl)}) `
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || ''
      const text = [...node.childNodes].map((child) => getNodeText(child, pageUrl)).join('').trim()
      if (isIgnorableProblemLink(href, text)) return text && !href ? text : ''
      return text ? `[${text}](${normalizeUrl(href, pageUrl)})` : normalizeUrl(href, pageUrl)
    }
    return [...node.childNodes].map((child) => getNodeText(child, pageUrl)).join('')
  }

  function nodeToMarkdown(node, pageUrl) {
    if (!(node instanceof Element)) return getNodeText(node, pageUrl)
    const tag = node.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style') return ''
    if (tag === 'img') {
      const src = node.getAttribute('src') || ''
      if (!src) return ''
      const alt = node.getAttribute('alt') || ''
      return `![${alt}](${normalizeUrl(src, pageUrl)})\n\n`
    }
    if (tag === 'pre') {
      const text = node.textContent?.trim() || ''
      return text ? `\`\`\`\n${text}\n\`\`\`\n\n` : ''
    }
    if (tag === 'p') {
      const text = getNodeText(node, pageUrl).replace(/\s+/g, ' ').trim()
      return text ? `${text}\n\n` : ''
    }
    if (tag === 'blockquote') {
      const text = getNodeText(node, pageUrl).replace(/\n+/g, '\n').trim()
      return text ? `> ${text.replace(/\n/g, '\n> ')}\n\n` : ''
    }
    if (tag === 'ul' || tag === 'ol') {
      let out = ''
      const items = [...node.children].filter((child) => child.tagName?.toLowerCase() === 'li')
      items.forEach((item, index) => {
        const text = getNodeText(item, pageUrl).replace(/\s+/g, ' ').trim()
        if (!text) return
        out += `${tag === 'ol' ? `${index + 1}.` : '-'} ${text}\n`
      })
      return out ? `${out}\n` : ''
    }
    if (/^h[1-6]$/.test(tag)) {
      const level = Math.min(Number(tag[1]) + 1, 6)
      const text = node.textContent?.replace(/\s+/g, ' ').trim() || ''
      return text ? `${'#'.repeat(level)} ${text}\n\n` : ''
    }
    if (tag === 'table') {
      const rows = [...node.querySelectorAll('tr')].map((row) => [...row.querySelectorAll('th,td')].map((cell) => getNodeText(cell, pageUrl).replace(/\s+/g, ' ').trim()))
      const filtered = rows.filter((row) => row.some(Boolean))
      return filtered.length ? filtered.map((row) => `| ${row.join(' | ')} |`).join('\n') + '\n\n' : ''
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || ''
      const text = getNodeText(node, pageUrl).replace(/\s+/g, ' ').trim()
      if (isIgnorableProblemLink(href, text)) return ''
      if (!text) return ''
      return `[${text}](${normalizeUrl(href, pageUrl)})`
    }
    return [...node.childNodes].map((child) => nodeToMarkdown(child, pageUrl)).join('')
  }

  function parseProblemContent() {
    const titleNode = document.querySelector('h1')
    const title = titleNode?.textContent?.replace(/\s+/g, ' ').trim() || document.title.split(' - ')[0].trim()
    let markdown = `# ${title}\n\n`
    const root = titleNode?.closest('.ui.main.container, .ui.container') || titleNode?.parentElement || document.body
    const candidateNodes = [...(root?.children || [])]
    const startIndex = Math.max(0, candidateNodes.findIndex((node) => node.matches?.('h1') || node.querySelector?.('h1')))
    const siblings = candidateNodes.slice(startIndex + 1)
    for (const node of siblings) {
      if (node.matches?.('script, style, .ui.comments, #disqus_thread, .footer, footer')) continue
      markdown += nodeToMarkdown(node, location.href)
    }
    markdown = markdown.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim()
    return { title, content: markdown }
  }

  function extractLimits() {
    const headerText = (document.querySelector('h1')?.parentElement?.textContent || '').replace(/\s+/g, ' ')
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

  async function fetchText(url) {
    const response = await fetch(normalizeUrl(url), { credentials: 'include' })
    if (!response.ok) throw new Error(`请求失败: ${response.status}`)
    return response.text()
  }

  async function fetchBinary(url) {
    const response = await fetch(normalizeUrl(url), { credentials: 'include' })
    if (!response.ok) throw new Error(`下载失败: ${response.status}`)
    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) {
      throw new Error('附件下载返回了 HTML 页面，而不是二进制文件')
    }
    const contentDisposition = response.headers.get('content-disposition') || ''
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_INLINE_ATTACHMENT_BYTES) {
      return {
        headers: { contentDisposition, contentType },
        size: contentLength,
        skippedBinary: true,
      }
    }
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (bytes.length > MAX_INLINE_ATTACHMENT_BYTES) {
      return {
        headers: { contentDisposition, contentType },
        size: bytes.length,
        skippedBinary: true,
      }
    }
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return {
      headers: {
        contentDisposition,
        contentType,
      },
      base64: btoa(binary),
      size: bytes.length,
    }
  }

  function findAdditionalFileLink() {
    const links = [...document.querySelectorAll('a[href]')]
    const scored = links.map((link) => {
      const href = link.getAttribute('href') || ''
      const text = (link.textContent || '').replace(/\s+/g, ' ').trim()
      let score = 0
      if (/\/download\/additional_file/i.test(href)) score += 100
      if (/\/download\//i.test(href)) score += 30
      if (/additional|sample|zip|file/i.test(href)) score += 20
      if (/附加文件|附件|sample|zip|additional/i.test(text)) score += 20
      return { href, text, score }
    }).filter((item) => item.score > 0)

    scored.sort((left, right) => right.score - left.score)
    return scored[0] || null
  }

  async function fetchAcCode(contestId, problemNumber) {
    const rankHtml = await fetchText(`/contest/${contestId}/ranklist`)
    const rankDoc = new DOMParser().parseFromString(rankHtml, 'text/html')
    const targetIndex = Number(problemNumber) + 1
    const candidates = []
    rankDoc.querySelectorAll('table tbody tr').forEach((row) => {
      const cells = row.querySelectorAll('td')
      if (cells.length <= targetIndex) return
      const cell = cells[targetIndex]
      const link = cell.querySelector('a[href*="/submission/"]')
      const href = link?.getAttribute('href') || ''
      if (!href) return
      const text = cell.textContent?.replace(/\s+/g, ' ').trim() || ''
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
        const submissionHtml = await fetchText(candidate.href)
        const highlighted = extractAssignedJsString(submissionHtml, 'formattedCode') || extractAssignedJsString(submissionHtml, 'unformattedCode')
        if (!highlighted) continue
        const doc = new DOMParser().parseFromString(`<div id="code-root">${highlighted}</div>`, 'text/html')
        const code = doc.querySelector('#code-root')?.textContent?.trim() || ''
        if (code) return code
      } catch {
        // continue
      }
    }
    return ''
  }

  const match = location.href.match(/\/(contest|course)\/(\d+)\/problem\/(\d+)/i)
  if (!match) {
    throw new Error('当前页面不是 MNA 单题页面')
  }

  const [, collectionType, groupId, problemNumber] = match
  const { title, content } = parseProblemContent()
  const { timeLimit, memoryLimit } = extractLimits()

  let additionalFile = null
  const additionalLink = findAdditionalFileLink()
  if (additionalLink?.href) {
    const sourceUrl = normalizeUrl(additionalLink.href)
    try {
      const binary = await fetchBinary(sourceUrl)
      additionalFile = {
        filename: parseFilename(binary.headers.contentDisposition, `additional_file_${groupId}_${problemNumber}.zip`),
        size: binary.size,
        sourceUrl,
        ...(binary.base64 ? { base64: binary.base64 } : {}),
        ...(binary.skippedBinary ? { skippedBinary: true } : {}),
      }
    } catch {
      additionalFile = {
        filename: `additional_file_${groupId}_${problemNumber}.zip`,
        size: 0,
        sourceUrl,
      }
    }
  }

  let acCode = ''
  if (collectionType === 'contest') {
    try {
      acCode = await Promise.race([
        fetchAcCode(groupId, problemNumber),
        new Promise((resolve) => setTimeout(() => resolve(''), 15000)),
      ])
    } catch {
      acCode = ''
    }
  }

  return {
    url: location.href,
    title,
    content,
    acCode,
    additionalFile,
    timeLimit,
    memoryLimit,
  }
}

async function collectCurrentNflsoiProblem() {
  const MAX_INLINE_ATTACHMENT_BYTES = 5 * 1024 * 1024

  function normalizeUrl(urlOrPath, baseUrl = location.href) {
    try {
      return new URL(urlOrPath, baseUrl).href
    } catch {
      return urlOrPath
    }
  }

  function parseFilename(contentDisposition, fallback) {
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
    for (let pointer = index - 1; pointer >= 0 && str[pointer] === '\\'; pointer -= 1) slashCount += 1
    return slashCount % 2 === 1
  }

  function readAssignedString(source, variableName) {
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

  function encodeArrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 0x8000
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
    }
    return btoa(binary)
  }

  function cleanupMarkdown(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  function parseProblemUrl(currentUrl) {
    const parsed = new URL(currentUrl)
    const tid = parsed.searchParams.get('tid') || ''
    let pid = ''
    let contestId = tid || ''

    const pathMatch = parsed.pathname.match(/^\/p\/([a-zA-Z0-9_]+)/)
    if (pathMatch) pid = pathMatch[1]

    const legacyMatch = parsed.pathname.match(/^\/contest\/([a-zA-Z0-9]+)\/problem\/([a-zA-Z0-9_]+)/)
    if (legacyMatch) {
      contestId = contestId || legacyMatch[1]
      pid = pid || legacyMatch[2]
    }

    return {
      pid,
      contestId,
      currentUrl: parsed.href,
      origin: parsed.origin,
    }
  }

  function extractIdentifiersFromPage(html) {
    const parsed = parseProblemUrl(location.href)
    const docIdMatch = html.match(/"docId"\s*:\s*(\d+)/)
    const realPid = docIdMatch?.[1] || parsed.pid
    return {
      pid: parsed.pid,
      realPid,
      contestId: parsed.contestId,
      origin: parsed.origin,
      currentUrl: parsed.currentUrl,
    }
  }

  function extractLimits(rawHtml) {
    const bodyText = document.body?.textContent?.replace(/\s+/g, ' ') || ''
    const configBlockMatch = rawHtml.match(/"config"\s*:\s*\{([^}]{0,300})\}/)
    let timeLimit = null
    let memoryLimit = null

    if (configBlockMatch) {
      const block = configBlockMatch[1]
      const tlm = block.match(/"time"\s*:\s*"(\d+)\s*ms"/i)
      if (tlm) timeLimit = Number(tlm[1])
      const mlm = block.match(/"memory"\s*:\s*"(\d+)\s*(?:mib|mb|m)"/i)
      if (mlm) memoryLimit = Number(mlm[1])
    }

    if (!timeLimit) {
      const m = bodyText.match(/(\d+)\s*ms/i)
      if (m) timeLimit = Number(m[1])
    }
    if (!memoryLimit) {
      const m = bodyText.match(/(\d+)\s*(?:MiB|MB|M)(?!\w)/i)
      if (m) memoryLimit = Number(m[1])
    }

    return { timeLimit, memoryLimit }
  }

  function processChildren(node) {
    let result = ''
    node.childNodes.forEach((child) => {
      result += processNode(child)
    })
    return result
  }

  function processNode(node) {
    if (!node) return ''
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (!(node instanceof Element)) return ''

    const tag = node.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style') return ''
    if (tag === 'span' && node.classList.contains('katex-html')) return ''
    if (tag === 'span' && (node.classList.contains('katex') || node.classList.contains('katex-display'))) {
      const latex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim() || ''
      if (!latex) return ''
      const isDisplay = node.classList.contains('katex-display') || !!node.closest('.katex-display')
      return isDisplay ? `\n\n$$${latex}$$\n\n` : `$${latex}$`
    }
    if (tag === 'p') return `${processChildren(node).trim()}\n\n`
    if (tag === 'h1') return `# ${processChildren(node).trim()}\n\n`
    if (tag === 'h2') return `## ${processChildren(node).trim()}\n\n`
    if (tag === 'h3') return `### ${processChildren(node).trim()}\n\n`
    if (tag === 'h4') return `#### ${processChildren(node).trim()}\n\n`
    if (tag === 'pre') return `\`\`\`\n${node.textContent?.trim() || ''}\n\`\`\`\n\n`
    if (tag === 'code' && node.parentElement?.tagName?.toLowerCase() !== 'pre') return `\`${node.textContent || ''}\``
    if (tag === 'strong' || tag === 'b') return `**${processChildren(node)}**`
    if (tag === 'em' || tag === 'i') return `*${processChildren(node)}*`
    if (tag === 'hr') return '---\n\n'
    if (tag === 'br') return '\n'
    if (tag === 'ul') {
      let out = ''
      node.querySelectorAll(':scope > li').forEach((li) => {
        out += `- ${processChildren(li).trim()}\n`
      })
      return `${out}\n`
    }
    if (tag === 'ol') {
      let out = ''
      node.querySelectorAll(':scope > li').forEach((li, index) => {
        out += `${index + 1}. ${processChildren(li).trim()}\n`
      })
      return `${out}\n`
    }
    if (tag === 'table') {
      const rows = []
      node.querySelectorAll('tr').forEach((tr) => {
        const cells = [...tr.querySelectorAll('th,td')].map((cell) => processChildren(cell).trim().replace(/\n/g, ' '))
        if (cells.some(Boolean)) rows.push(cells)
      })
      if (!rows.length) return ''
      let out = rows.map((row) => `| ${row.join(' | ')} |`).join('\n')
      out = `${out.slice(0, out.indexOf('\n') > -1 ? out.indexOf('\n') : out.length)}${out.includes('\n') ? '' : ''}`
      const header = `| ${rows[0].map(() => '---').join(' | ')} |`
      return `${rows[0] ? `| ${rows[0].join(' | ')} |\n${header}\n` : ''}${rows.slice(1).map((row) => `| ${row.join(' | ')} |`).join('\n')}\n\n`
    }
    if (tag === 'img') {
      const src = node.getAttribute('src') || ''
      if (!src) return ''
      const alt = node.getAttribute('alt') || ''
      return `\n![${alt}](${normalizeUrl(src)})\n`
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || ''
      const text = processChildren(node).replace(/\s+/g, ' ').trim()
      if (!href) return text
      return text ? `[${text}](${normalizeUrl(href)})` : normalizeUrl(href)
    }

    return processChildren(node)
  }

  function parseProblemContent(rawHtml, title) {
    let root = document.querySelector('.problem-content, .typo, .markdown-body')
    if (!root) root = document.querySelector('main, article')
    if (!root) {
      return cleanupMarkdown(`# ${title}\n\n${document.body?.textContent || ''}`)
    }

    const markdown = `# ${title}\n\n${processChildren(root)}`
    return cleanupMarkdown(markdown)
  }

  async function fetchText(url) {
    const response = await fetch(normalizeUrl(url), { credentials: 'include' })
    if (!response.ok) throw new Error(`请求失败: ${response.status}`)
    return response.text()
  }

  async function fetchBinary(url) {
    const response = await fetch(normalizeUrl(url), { credentials: 'include' })
    if (!response.ok) throw new Error(`下载失败: ${response.status}`)
    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) throw new Error('附件下载返回了 HTML 页面')
    const contentDisposition = response.headers.get('content-disposition') || ''
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_INLINE_ATTACHMENT_BYTES) {
      return {
        contentDisposition,
        size: contentLength,
        skippedBinary: true,
      }
    }
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_INLINE_ATTACHMENT_BYTES) {
      return {
        contentDisposition,
        size: buffer.byteLength,
        skippedBinary: true,
      }
    }
    return {
      contentDisposition,
      base64: encodeArrayBufferToBase64(buffer),
      size: buffer.byteLength,
    }
  }

  function findAdditionalFileLink() {
    const links = [...document.querySelectorAll('a[href]')]
    const scored = links.map((link) => {
      const href = link.getAttribute('href') || ''
      const text = (link.textContent || '').replace(/\s+/g, ' ').trim()
      let score = 0
      if (/\/p\/[^/]+\/file\//i.test(href)) score += 100
      if (/additional_file/i.test(href)) score += 50
      if (/zip|rar|7z|tar|gz/i.test(href)) score += 30
      if (/附件|样例|下载|file/i.test(text)) score += 20
      return { href, text, score }
    }).filter((item) => item.score > 0)

    scored.sort((left, right) => right.score - left.score)
    return scored[0] || null
  }

  async function fetchAcCode({ pid, realPid, contestId }) {
    const candidatePids = [...new Set([realPid, pid].filter(Boolean))]
    const listPaths = []
    candidatePids.forEach((currentPid) => {
      let path = `/record?pid=${encodeURIComponent(currentPid)}&status=1`
      if (contestId) path += `&tid=${encodeURIComponent(contestId)}`
      listPaths.push(path)
    })

    for (const listPath of listPaths) {
      let listHtml = ''
      try {
        listHtml = await fetchText(listPath)
      } catch {
        continue
      }

      const hrefs = [...listHtml.matchAll(/href="(\/record\/[a-f0-9]+)"/g)].map((match) => match[1])
      for (const href of hrefs.slice(0, 5)) {
        try {
          const detailHtml = await fetchText(href)
          const detailDoc = new DOMParser().parseFromString(detailHtml, 'text/html')
          const code = detailDoc.querySelector('pre code')?.textContent?.trim()
          if (code && code.length > 10) {
            return code.replace(/^[ \t]*freopen\b[^\n]*;[ \t]*\r?\n?/gm, '').trim()
          }
          const formattedCode = readAssignedString(detailHtml, 'formattedCode') || readAssignedString(detailHtml, 'unformattedCode')
          if (formattedCode) {
            const codeDoc = new DOMParser().parseFromString(`<div id="code-root">${formattedCode}</div>`, 'text/html')
            const fallbackCode = codeDoc.querySelector('#code-root')?.textContent?.trim() || ''
            if (fallbackCode) return fallbackCode.replace(/^[ \t]*freopen\b[^\n]*;[ \t]*\r?\n?/gm, '').trim()
          }
        } catch {
          // continue
        }
      }
    }

    return ''
  }

  const rawHtml = document.documentElement.outerHTML || ''
  const ids = extractIdentifiersFromPage(rawHtml)
  if (!ids.pid) {
    throw new Error('当前页面不是 NFLSOI 单题页面')
  }

  const title = (document.querySelector('h1.problem-title, .problem-title h1, h1')?.textContent || document.title || ids.pid)
    .replace(/\s+/g, ' ')
    .trim()
  const content = parseProblemContent(rawHtml, title)
  const { timeLimit, memoryLimit } = extractLimits(rawHtml)

  let additionalFile = null
  const additionalLink = findAdditionalFileLink()
  if (additionalLink?.href) {
    const sourceUrl = normalizeUrl(additionalLink.href)
    try {
      const binary = await fetchBinary(sourceUrl)
      additionalFile = {
        filename: parseFilename(binary.headers.contentDisposition, sourceUrl.split('/').pop() || `${ids.pid}.zip`),
        size: binary.size,
        sourceUrl,
        ...(binary.base64 ? { base64: binary.base64 } : {}),
        ...(binary.skippedBinary ? { skippedBinary: true } : {}),
      }
    } catch {
      additionalFile = {
        filename: sourceUrl.split('/').pop() || `${ids.pid}.zip`,
        size: 0,
        sourceUrl,
      }
    }
  }

  let acCode = ''
  try {
    acCode = await Promise.race([
      fetchAcCode(ids),
      new Promise((resolve) => setTimeout(() => resolve(''), 15000)),
    ])
  } catch {
    acCode = ''
  }

  return {
    url: ids.currentUrl,
    title,
    content,
    acCode,
    additionalFile,
    timeLimit,
    memoryLimit,
  }
}

async function collectCurrentYbtOjProblem() {
  const MAX_INLINE_ATTACHMENT_BYTES = 5 * 1024 * 1024

  function normalizeUrl(urlOrPath, baseUrl = location.href) {
    try {
      return new URL(urlOrPath, baseUrl).href
    } catch {
      return urlOrPath
    }
  }

  function parseFilename(contentDisposition, fallback) {
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
    for (let pointer = index - 1; pointer >= 0 && str[pointer] === '\\'; pointer -= 1) slashCount += 1
    return slashCount % 2 === 1
  }

  function readAssignedString(source, variableName) {
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

  const MML_CHAR_MAP = {
    0x2026: '\\ldots', 0x22EF: '\\cdots', 0x22EE: '\\vdots', 0x22F1: '\\ddots',
    0x00D7: '\\times', 0x00F7: '\\div', 0x00B1: '\\pm', 0x2213: '\\mp',
    0x2264: '\\le', 0x2265: '\\ge', 0x2260: '\\ne', 0x226A: '\\ll', 0x226B: '\\gg',
    0x221E: '\\infty', 0x2205: '\\emptyset', 0x2202: '\\partial', 0x2207: '\\nabla',
    0x2211: '\\sum', 0x220F: '\\prod', 0x222B: '\\int', 0x222C: '\\iint', 0x222D: '\\iiint',
    0x221A: '\\sqrt', 0x2308: '\\lceil', 0x2309: '\\rceil', 0x230A: '\\lfloor', 0x230B: '\\rfloor',
    0x2208: '\\in', 0x2209: '\\notin', 0x2282: '\\subset', 0x2283: '\\supset',
    0x2286: '\\subseteq', 0x2287: '\\supseteq', 0x222A: '\\cup', 0x2229: '\\cap',
    0x2200: '\\forall', 0x2203: '\\exists', 0x00B7: '\\cdot', 0x2218: '\\circ',
    0x2192: '\\to', 0x21D2: '\\Rightarrow', 0x21D4: '\\Leftrightarrow',
    0x2190: '\\leftarrow', 0x21D0: '\\Leftarrow', 0x2194: '\\leftrightarrow',
    0x2234: '\\therefore', 0x2235: '\\because', 0x2016: '\\|', 0x2223: '\\mid',
    0x2225: '\\parallel', 0x22A5: '\\perp', 0x22C5: '\\cdot', 0x22C6: '\\star',
    0x2227: '\\land', 0x2228: '\\lor', 0x00AC: '\\lnot', 0x03B1: '\\alpha',
    0x03B2: '\\beta', 0x03B3: '\\gamma', 0x03B4: '\\delta', 0x03B5: '\\epsilon',
    0x03B6: '\\zeta', 0x03B7: '\\eta', 0x03B8: '\\theta', 0x03B9: '\\iota',
    0x03BA: '\\kappa', 0x03BB: '\\lambda', 0x03BC: '\\mu', 0x03BD: '\\nu',
    0x03BE: '\\xi', 0x03C0: '\\pi', 0x03C1: '\\rho', 0x03C3: '\\sigma',
    0x03C4: '\\tau', 0x03C5: '\\upsilon', 0x03C6: '\\varphi', 0x03C7: '\\chi',
    0x03C8: '\\psi', 0x03C9: '\\omega', 0x0393: '\\Gamma', 0x0394: '\\Delta',
    0x0398: '\\Theta', 0x039B: '\\Lambda', 0x039E: '\\Xi', 0x03A0: '\\Pi',
    0x03A3: '\\Sigma', 0x03A5: '\\Upsilon', 0x03A6: '\\Phi', 0x03A8: '\\Psi',
    0x03A9: '\\Omega', 0x2113: '\\ell', 0x210F: '\\hbar', 0x2118: '\\wp',
    0x211C: '\\Re', 0x2111: '\\Im', 0x2135: '\\aleph'
  }

  function decodeDataC(hex) {
    if (!hex) return ''
    const cp = parseInt(hex, 16)
    if (Number.isNaN(cp)) return ''
    if (MML_CHAR_MAP[cp]) return MML_CHAR_MAP[cp]
    if (cp >= 0x1D44E && cp <= 0x1D467) return String.fromCharCode(cp - 0x1D44E + 97)
    if (cp >= 0x1D434 && cp <= 0x1D44D) return String.fromCharCode(cp - 0x1D434 + 65)
    if (cp >= 0x1D482 && cp <= 0x1D49B) return String.fromCharCode(cp - 0x1D482 + 97)
    if (cp >= 0x1D468 && cp <= 0x1D481) return String.fromCharCode(cp - 0x1D468 + 65)
    if (cp >= 0x20 && cp <= 0x7E) return String.fromCharCode(cp)
    return String.fromCharCode(cp)
  }

  function getMmlChildrenArr(el) {
    return [...(el?.children || [])]
      .filter((child) => child.matches?.('g[data-mml-node]'))
      .map((child) => decodeMmlNode(child))
  }

  function decodeMmlChildren(el) {
    return getMmlChildrenArr(el).join(' ')
  }

  function decodeMmlNode(el) {
    const node = el?.getAttribute?.('data-mml-node') || ''
    if (!node || ['mi', 'mn', 'mo', 'mtext'].includes(node)) {
      const chars = [...el.querySelectorAll(':scope > use[data-c]')].map((item) => decodeDataC(item.getAttribute('data-c')))
      if (chars.length > 0) return chars.join('')
      return decodeMmlChildren(el)
    }

    if (['math', 'mrow', 'mstyle', 'mpadded', 'mphantom', 'mfenced'].includes(node)) {
      return decodeMmlChildren(el)
    }

    if (node === 'msub') {
      const ch = getMmlChildrenArr(el)
      return ch.length >= 2 ? `${ch[0]}_{${ch[1]}}` : decodeMmlChildren(el)
    }
    if (node === 'msup') {
      const ch = getMmlChildrenArr(el)
      return ch.length >= 2 ? `${ch[0]}^{${ch[1]}}` : decodeMmlChildren(el)
    }
    if (node === 'msubsup') {
      const ch = getMmlChildrenArr(el)
      return ch.length >= 3 ? `${ch[0]}_{${ch[1]}}^{${ch[2]}}` : decodeMmlChildren(el)
    }
    if (node === 'mfrac') {
      const ch = getMmlChildrenArr(el)
      return ch.length >= 2 ? `\\frac{${ch[0]}}{${ch[1]}}` : decodeMmlChildren(el)
    }
    if (node === 'msqrt') return `\\sqrt{${decodeMmlChildren(el)}}`
    if (node === 'mroot') {
      const ch = getMmlChildrenArr(el)
      return ch.length >= 2 ? `\\sqrt[${ch[1]}]{${ch[0]}}` : decodeMmlChildren(el)
    }
    if (node === 'mover') {
      const ch = getMmlChildrenArr(el)
      if (ch.length < 2) return decodeMmlChildren(el)
      const acc = { '\\cdot': '\\dot', '−': '\\bar', '∼': '\\tilde', '∧': '\\hat', '⃗': '\\vec' }[ch[1]]
      return acc ? `${acc}{${ch[0]}}` : `\\overset{${ch[1]}}{${ch[0]}}`
    }
    if (node === 'munder') {
      const ch = getMmlChildrenArr(el)
      return ch.length >= 2 ? `\\underset{${ch[1]}}{${ch[0]}}` : decodeMmlChildren(el)
    }
    if (node === 'munderover') {
      const ch = getMmlChildrenArr(el)
      return ch.length >= 3 ? `${ch[0]}_{${ch[1]}}^{${ch[2]}}` : decodeMmlChildren(el)
    }
    if (node === 'mtable') {
      const rows = [...el.querySelectorAll(':scope > g[data-mml-node="mtr"]')].map((tr) => {
        const cols = [...tr.querySelectorAll(':scope > g[data-mml-node="mtd"]')].map((td) => decodeMmlChildren(td))
        return cols.join(' & ')
      })
      return `\\begin{matrix}${rows.join(' \\\\ ')}\\end{matrix}`
    }

    return decodeMmlChildren(el)
  }

  function decodeSvgFormula(svg, ownerDocument = document) {
    const ariaLabel = svg?.getAttribute?.('aria-label')?.trim?.() || ''
    if (ariaLabel) return ariaLabel

    const labelledBy = svg?.getAttribute?.('aria-labelledby') || ''
    if (labelledBy) {
      const labels = labelledBy.split(/\s+/).map((item) => item.trim()).filter(Boolean)
      for (const labelId of labels) {
        const titleNode = ownerDocument.getElementById(labelId)
        const titleText = titleNode?.textContent?.trim() || ''
        if (titleText) return titleText
      }
    }

    const inlineTitle = svg?.querySelector?.('title')?.textContent?.trim?.() || ''
    if (inlineTitle) return inlineTitle

    const inlineDesc = svg?.querySelector?.('desc')?.textContent?.trim?.() || ''
    if (inlineDesc) return inlineDesc

    const math = svg?.querySelector?.('g[data-mml-node="math"]')
    if (!math) return null
    const result = decodeMmlNode(math)
    return result && result.trim() ? result.trim() : null
  }

  function hasClass(node, className) {
    return !!node?.classList?.contains?.(className)
  }

  function getDirectChildByClass(element, className) {
    return [...(element?.children || [])].find((child) => hasClass(child, className)) || null
  }

  function getDirectChildTag(element, tagName) {
    const safeTagName = String(tagName || '').toLowerCase()
    return [...(element?.children || [])].find((child) => child.tagName?.toLowerCase() === safeTagName) || null
  }

  function cleanupMarkdown(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/<html[\s\S]*$/i, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  function processChildren(node, pageUrl = location.href, ownerDocument = document) {
    return [...(node?.childNodes || [])].map((child) => processNode(child, pageUrl, ownerDocument)).join('')
  }

  function processNode(node, pageUrl = location.href, ownerDocument = document) {
    if (!node) return ''
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (!(node instanceof Element)) return ''

    const tag = node.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style') return ''
    if (tag === 'html' || tag === 'head' || tag === 'body') return ''
    if (tag === 'form' || tag === 'textarea' || tag === 'input' || tag === 'button') return ''
    if (hasClass(node, 'monaco-editor') || hasClass(node, 'editor') || node.id === 'editor') return ''
    if (hasClass(node, 'ui') && hasClass(node, 'buttons')) return ''
    if (tag === 'svg' && (node.getAttribute('role') === 'img' || node.querySelector('g[data-mml-node]'))) {
      const latex = decodeSvgFormula(node, ownerDocument)
      return latex ? `$${latex}$` : ''
    }
    if (tag === 'p') {
      const text = processChildren(node, pageUrl, ownerDocument).trim()
      return text ? `${text}\n\n` : ''
    }
    if (tag === 'h1') return `# ${processChildren(node, pageUrl, ownerDocument).trim()}\n\n`
    if (tag === 'h2') return `## ${processChildren(node, pageUrl, ownerDocument).trim()}\n\n`
    if (tag === 'h3') return `### ${processChildren(node, pageUrl, ownerDocument).trim()}\n\n`
    if (tag === 'h4') return `#### ${processChildren(node, pageUrl, ownerDocument).trim()}\n\n`
    if (tag === 'pre') return `\`\`\`\n${node.textContent?.trimEnd() || ''}\n\`\`\`\n\n`
    if (tag === 'code' && node.parentElement?.tagName?.toLowerCase() !== 'pre') return `\`${node.textContent || ''}\``
    if (tag === 'strong' || tag === 'b') return `**${processChildren(node, pageUrl, ownerDocument)}**`
    if (tag === 'em' || tag === 'i') return `*${processChildren(node, pageUrl, ownerDocument)}*`
    if (tag === 'ul') {
      const lines = [...node.querySelectorAll(':scope > li')].map((item) => `- ${processChildren(item, pageUrl, ownerDocument).trim()}`)
      return lines.length ? `${lines.join('\n')}\n\n` : ''
    }
    if (tag === 'ol') {
      const lines = [...node.querySelectorAll(':scope > li')].map((item, index) => `${index + 1}. ${processChildren(item, pageUrl, ownerDocument).trim()}`)
      return lines.length ? `${lines.join('\n')}\n\n` : ''
    }
    if (tag === 'table') {
      const rows = [...node.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('th,td')].map((cell) => processChildren(cell, pageUrl, ownerDocument).trim().replace(/\n/g, ' '))).filter((row) => row.some(Boolean))
      if (!rows.length) return ''
      const head = `| ${rows[0].join(' | ')} |`
      const divider = `| ${rows[0].map(() => '---').join(' | ')} |`
      const body = rows.slice(1).map((row) => `| ${row.join(' | ')} |`).join('\n')
      return `${head}\n${divider}${body ? `\n${body}` : ''}\n\n`
    }
    if (tag === 'hr') return '---\n\n'
    if (tag === 'br') return '\n'
    if (tag === 'img') {
      const src = node.getAttribute('src') || ''
      if (!src) return ''
      const alt = node.getAttribute('alt') || ''
      return `![${alt}](${normalizeUrl(src, pageUrl)})`
    }
    if (tag === 'a') {
      const href = node.getAttribute('href') || ''
      const text = processChildren(node, pageUrl, ownerDocument).replace(/\s+/g, ' ').trim()
      if (!href) return text
      return text ? `[${text}](${normalizeUrl(href, pageUrl)})` : normalizeUrl(href, pageUrl)
    }

    return processChildren(node, pageUrl, ownerDocument)
  }

  function parseProblemContent(title, sourceDoc = document, pageUrl = location.href) {
    const segments = [...sourceDoc.querySelectorAll('h4.ui.top.attached.block.header')]
      .map((header) => ({
        header,
        contentRoot: header.nextElementSibling && hasClass(header.nextElementSibling, 'ui') && hasClass(header.nextElementSibling, 'bottom')
          ? getDirectChildByClass(header.nextElementSibling, 'font-content') || header.nextElementSibling
          : null,
      }))
      .filter((segment) => segment.contentRoot)

    let markdown = `# ${title}\n\n`

    if (segments.length) {
      for (const segment of segments) {
        const sectionTitle = segment.header?.textContent?.trim() || ''
        const contentRoot = segment.contentRoot
        if (sectionTitle) markdown += `## ${sectionTitle}\n\n`
        markdown += `${processChildren(contentRoot, pageUrl, sourceDoc)}\n\n`
      }
      return cleanupMarkdown(markdown)
    }

    const contentRoot = sourceDoc.querySelector('.font-content') || getDirectChildByClass(sourceDoc.querySelector('.ui.main.container'), 'font-content') || getDirectChildTag(sourceDoc.querySelector('.ui.main.container'), 'main') || null
    if (!contentRoot) {
      throw new Error('未找到可解析的 YbtOJ 题面内容区域')
    }
    markdown += processChildren(contentRoot, pageUrl, sourceDoc)
    return cleanupMarkdown(markdown)
  }

  function isEditorialKeyword(text) {
    return /(题解|解析|讲解|solution|editorial|analysis)/i.test(String(text || ''))
  }

  function readPossibleUrl(rawValue, baseUrl = location.href) {
    const value = String(rawValue || '').trim()
    if (!value) return ''
    const matched = value.match(/(https?:\/\/[^'"\s)]+|\/[^'"\s)]+)/i)
    if (!matched?.[1]) return ''
    return normalizeUrl(matched[1], baseUrl)
  }

  function appendCandidateUrl(candidateSet, rawValue, baseUrl = location.href) {
    const resolved = readPossibleUrl(rawValue, baseUrl)
    if (!resolved) return
    if (!/^https?:\/\//i.test(resolved)) return
    candidateSet.add(resolved)
  }

  function extractEditorialMarkdown(sourceDoc, fallbackTitle, pageUrl = location.href) {
    const blocks = []
    const headers = [...sourceDoc.querySelectorAll('h1,h2,h3,h4,.ui.header,.header')]

    for (const header of headers) {
      const headerText = (header.textContent || '').replace(/\s+/g, ' ').trim()
      if (!isEditorialKeyword(headerText)) continue
      const sibling = header.nextElementSibling
      const contentRoot =
        getDirectChildByClass(sibling, 'font-content') ||
        sibling?.querySelector?.('.font-content') ||
        sibling?.querySelector?.('.content') ||
        sibling
      const markdown = cleanupMarkdown(processChildren(contentRoot, pageUrl, sourceDoc))
      if (markdown.length >= 20) {
        blocks.push({ title: headerText, markdown })
      }
    }

    if (blocks.length > 0) {
      let output = `# 题解：${fallbackTitle}\n\n`
      for (const block of blocks) {
        output += `## ${block.title}\n\n${block.markdown}\n\n`
      }
      return cleanupMarkdown(output)
    }

    const pageTitle = (sourceDoc.querySelector('h1.ui.header, h1')?.textContent || sourceDoc.title || '').replace(/\s+/g, ' ').trim()
    const contentRoot =
      sourceDoc.querySelector('.font-content') ||
      sourceDoc.querySelector('.ui.bottom.attached.segment .font-content') ||
      sourceDoc.querySelector('.ui.attached.segment .font-content') ||
      sourceDoc.querySelector('article') ||
      sourceDoc.querySelector('main') ||
      sourceDoc.querySelector('.padding') ||
      null
    if (!contentRoot) return ''

    const body = cleanupMarkdown(processChildren(contentRoot, pageUrl, sourceDoc))
    if (body.length < 40) return ''
    const heading = isEditorialKeyword(pageTitle) ? pageTitle : `题解：${fallbackTitle}`
    return cleanupMarkdown(`# ${heading}\n\n${body}`)
  }

  function findEditorialCandidateUrls(ids) {
    const candidates = new Set()
    const pageHtml = document.documentElement?.outerHTML || ''

    const interactiveNodes = [...document.querySelectorAll('a[href], button[onclick], [data-href], [data-url], .item, .button')]
    for (const node of interactiveNodes) {
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
      const href = node.getAttribute?.('href') || ''
      const dataHref = node.getAttribute?.('data-href') || ''
      const dataUrl = node.getAttribute?.('data-url') || ''
      const onclick = node.getAttribute?.('onclick') || ''
      const rawCombined = `${href} ${dataHref} ${dataUrl} ${onclick}`
      if (!isEditorialKeyword(text) && !isEditorialKeyword(rawCombined)) continue
      appendCandidateUrl(candidates, href)
      appendCandidateUrl(candidates, dataHref)
      appendCandidateUrl(candidates, dataUrl)
      appendCandidateUrl(candidates, onclick)
    }

    const rawMatches = [...pageHtml.matchAll(/(["'`])(\/[^"'`]*(?:solution|editorial|analysis|answer|discuss|discussion)[^"'`]*)\1/ig)]
    for (const match of rawMatches) {
      appendCandidateUrl(candidates, match[2])
    }

    const problemBase = ids?.contestId
      ? `/contest/${ids.contestId}/problem/${ids.problemNumber}`
      : `/problem/${ids.problemNumber}`
    const suffixes = [
      '/solution',
      '/editorial',
      '/analysis',
      '/answer',
      '/discuss',
      '/discussion',
      '?tab=solution',
      '?tab=editorial',
      '?show=solution',
      '?show=editorial',
    ]
    suffixes.forEach((suffix) => appendCandidateUrl(candidates, `${problemBase}${suffix}`))

    return [...candidates]
  }

  async function fetchEditorial(ids, fallbackTitle, problemContent) {
    const currentMarkdown = extractEditorialMarkdown(document, fallbackTitle, location.href)
    if (currentMarkdown && cleanupMarkdown(currentMarkdown) !== cleanupMarkdown(problemContent)) {
      return currentMarkdown
    }

    const candidates = findEditorialCandidateUrls(ids)
    for (const url of candidates.slice(0, 12)) {
      try {
        const html = await fetchText(url)
        if (!html || /<title>\s*(登录|Login)/i.test(html)) continue
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const markdown = extractEditorialMarkdown(doc, fallbackTitle, normalizeUrl(url))
        if (!markdown) continue
        if (cleanupMarkdown(markdown) === cleanupMarkdown(problemContent)) continue
        return markdown
      } catch {
        // continue
      }
    }

    return ''
  }

  function extractLimits() {
    const labelText = [...document.querySelectorAll('.ui.label')].map((node) => node.textContent?.replace(/\s+/g, ' ').trim() || '').join(' ')
    const timeMatch = labelText.match(/时间限制[:：]\s*(\d+)\s*ms/i)
    const memoryMatch = labelText.match(/内存限制[:：]\s*(\d+)\s*(?:MiB|MB|M)/i)
    return {
      timeLimit: timeMatch ? Number(timeMatch[1]) : null,
      memoryLimit: memoryMatch ? Number(memoryMatch[1]) : null,
    }
  }

  async function fetchText(url) {
    const response = await fetch(normalizeUrl(url), { credentials: 'include' })
    if (!response.ok) throw new Error(`请求失败: ${response.status}`)
    return response.text()
  }

  async function fetchBinary(url) {
    const response = await fetch(normalizeUrl(url), { credentials: 'include' })
    if (!response.ok) throw new Error(`下载失败: ${response.status}`)
    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType.includes('text/html')) throw new Error('附件下载返回了 HTML 页面')
    const contentDisposition = response.headers.get('content-disposition') || ''
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_INLINE_ATTACHMENT_BYTES) {
      return {
        contentDisposition,
        size: contentLength,
        skippedBinary: true,
      }
    }
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_INLINE_ATTACHMENT_BYTES) {
      return {
        contentDisposition,
        size: buffer.byteLength,
        skippedBinary: true,
      }
    }
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 0x8000
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
    }
    return {
      contentDisposition,
      base64: btoa(binary),
      size: buffer.byteLength,
    }
  }

  function findAdditionalFileLink() {
    const scored = [...document.querySelectorAll('a[href]')].map((link) => {
      const href = link.getAttribute('href') || ''
      const text = (link.textContent || '').replace(/\s+/g, ' ').trim()
      let score = 0
      if (/\/download\/additional_file/i.test(href)) score += 100
      if (/additional|sample|zip|file/i.test(href)) score += 25
      if (/附件|样例|下载|file|zip/i.test(text)) score += 20
      return { href, text, score }
    }).filter((item) => item.score > 0)

    scored.sort((left, right) => right.score - left.score)
    return scored[0] || null
  }

  function parseProblemIds(url) {
    const contestMatch = String(url || '').match(/\/contest\/(\d+)\/problem\/(\d+)/i)
    if (contestMatch) {
      return { contestId: contestMatch[1], problemNumber: contestMatch[2] }
    }
    const problemMatch = String(url || '').match(/\/problem\/(\d+)/i)
    return problemMatch ? { contestId: '', problemNumber: problemMatch[1] } : null
  }

  async function fetchAcCode(ids) {
    if (!ids?.contestId || !ids?.problemNumber) return ''
    let listHtml = ''
    try {
      listHtml = await fetchText(`/contest/${ids.contestId}/submissions?problem_id=${ids.problemNumber}&status=Accepted`)
    } catch {
      return ''
    }

    const hrefs = [...listHtml.matchAll(/href="(\/submission\/\d+)"/g)].map((match) => match[1])
    const fallbackIds = [...listHtml.matchAll(/submissionId\D+(\d+)/g)].map((match) => `/submission/${match[1]}`)
    const candidates = [...new Set([...hrefs, ...fallbackIds])]

    for (const href of candidates.slice(0, 5)) {
      try {
        const detailHtml = await fetchText(href)
        const highlighted = readAssignedString(detailHtml, 'unformattedCode') || readAssignedString(detailHtml, 'formattedCode')
        if (!highlighted) continue
        const code = highlighted
          .replace(/<[^>]+>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, ' ')
          .replace(/^[ \t]*freopen\b[^\n]*;[ \t]*\r?\n?/gm, '')
          .trim()
        if (code) return code
      } catch {
        // continue
      }
    }

    return ''
  }

  const ids = parseProblemIds(location.href)
  if (!ids?.problemNumber) {
    throw new Error('当前页面不是 YbtOJ 单题页面')
  }

  const title = (document.querySelector('h1.ui.header, h1')?.textContent || document.title || `题目 ${ids.problemNumber}`)
    .replace(/\s+/g, ' ')
    .trim()
  const content = parseProblemContent(title)
  const { timeLimit, memoryLimit } = extractLimits()

  let additionalFile = null
  const additionalLink = findAdditionalFileLink()
  if (additionalLink?.href) {
    const sourceUrl = normalizeUrl(additionalLink.href)
    try {
      const binary = await fetchBinary(sourceUrl)
      additionalFile = {
        filename: parseFilename(binary.headers.contentDisposition, sourceUrl.split('/').pop() || `${ids.problemNumber}.zip`),
        size: binary.size,
        sourceUrl,
        ...(binary.base64 ? { base64: binary.base64 } : {}),
        ...(binary.skippedBinary ? { skippedBinary: true } : {}),
      }
    } catch {
      additionalFile = {
        filename: sourceUrl.split('/').pop() || `${ids.problemNumber}.zip`,
        size: 0,
        sourceUrl,
      }
    }
  }

  let acCode = ''
  try {
    acCode = await Promise.race([
      fetchAcCode(ids),
      new Promise((resolve) => setTimeout(() => resolve(''), 12000)),
    ])
  } catch {
    acCode = ''
  }

  let editorial = ''
  try {
    editorial = await Promise.race([
      fetchEditorial(ids, title, content),
      new Promise((resolve) => setTimeout(() => resolve(''), 12000)),
    ])
  } catch {
    editorial = ''
  }

  return {
    url: location.href,
    title,
    content,
    editorial,
    acCode,
    additionalFile,
    timeLimit,
    memoryLimit,
  }
}

function collectCurrentYbtOjCollection() {
  function normalizeUrl(urlOrPath, baseUrl = location.href) {
    try {
      return new URL(urlOrPath, baseUrl).href
    } catch {
      return urlOrPath
    }
  }

  const match = location.href.match(/\/contest\/(\d+)/i)
  if (!match) {
    throw new Error('当前页面不是 YbtOJ 题单页面')
  }

  const contestId = match[1]
  const title = (document.querySelector('.padding > h1, h1')?.textContent || document.title || `YbtOJ-${contestId}`)
    .replace(/\s+/g, ' ')
    .trim()
  const dedup = new Map()
  const links = [...document.querySelectorAll(`a[href*="/contest/${contestId}/problem/"]`)]

  for (const link of links) {
    const href = link.getAttribute('href') || ''
    const url = normalizeUrl(href, location.origin)
    const problemMatch = url.match(new RegExp(`/contest/${contestId}/problem/(\\d+)`, 'i'))
    if (!problemMatch) continue
    const problemNumber = Number(problemMatch[1])
    if (!dedup.has(url)) {
      dedup.set(url, {
        url,
        problemNumber,
        label: (link.textContent || '').replace(/\s+/g, ' ').trim(),
      })
    }
  }

  const problems = [...dedup.values()].sort((left, right) => left.problemNumber - right.problemNumber)
  return {
    title,
    collectionLabel: '题单',
    problems,
  }
}

function collectCurrentMnaCollection() {
  const pageMatch = location.href.match(/\/(contest|course)\/(\d+)/i)
  if (!pageMatch) {
    throw new Error('当前页面不是 MNA 比赛页或课程页')
  }

  const [, collectionType, collectionId] = pageMatch
  const title = (document.querySelector('h1')?.textContent || document.title || '').replace(/\s+/g, ' ').trim()
  const links = [...document.querySelectorAll(`a[href*="/${collectionType}/${collectionId}/problem/"]`)]
  const dedup = new Map()

  for (const link of links) {
    const href = link.getAttribute('href') || ''
    const url = new URL(href, location.origin).href
    const match = url.match(new RegExp(`/${collectionType}/${collectionId}/problem/(\\d+)`, 'i'))
    if (!match) continue
    const problemNumber = Number(match[1])
    if (!dedup.has(url)) {
      dedup.set(url, {
        url,
        problemNumber,
        label: (link.textContent || '').replace(/\s+/g, ' ').trim(),
      })
    }
  }

  const problems = [...dedup.values()].sort((left, right) => left.problemNumber - right.problemNumber)
  return {
    title,
    collectionLabel: collectionType === 'course' ? '课程' : '比赛',
    problems,
  }
}

async function collectCurrentNflsoiCollection() {
  function normalizeUrl(urlOrPath, baseUrl = location.href) {
    try {
      return new URL(urlOrPath, baseUrl).href
    } catch {
      return urlOrPath
    }
  }

  function parseContestId(url) {
    const match = String(url || '').match(/\/contest\/([a-zA-Z0-9]+)/)
    return match ? match[1] : ''
  }

  function uniqueProblems(problems) {
    const seen = new Set()
    return problems.filter((problem) => {
      const key = `${problem.taskId || ''}:${problem.url || ''}`
      if (!problem?.url || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  function parseProblemLinks(doc, contestId) {
    const links = [...doc.querySelectorAll('a[href]')]
    const problems = []

    links.forEach((link) => {
      const href = link.getAttribute('href') || ''
      const match = href.match(/^\/p\/([a-zA-Z0-9_]+)\?tid=([a-zA-Z0-9]+)$/)
      if (!match) return
      if (contestId && match[2] !== contestId) return

      const cloned = link.cloneNode(true)
      cloned.querySelectorAll('b').forEach((node) => node.remove())
      const title = (cloned.textContent || '').replace(/\s+/g, ' ').trim() || match[1]
      problems.push({
        label: String.fromCharCode(65 + problems.length),
        title,
        taskId: match[1],
        url: normalizeUrl(href),
      })
    })

    return uniqueProblems(problems)
  }

  const contestId = parseContestId(location.href)
  if (!contestId) {
    throw new Error('当前页面不是 NFLSOI 比赛页面')
  }

  const problemsUrl = normalizeUrl(`/contest/${contestId}/problems`, location.origin)
  let problemsDoc = document
  let problems = parseProblemLinks(problemsDoc, contestId)

  if (!problems.length && location.pathname !== `/contest/${contestId}/problems`) {
    const response = await fetch(problemsUrl, { credentials: 'include' })
    if (!response.ok) {
      throw new Error(`无法读取 NFLSOI 比赛题目列表: HTTP ${response.status}`)
    }
    const html = await response.text()
    problemsDoc = new DOMParser().parseFromString(html, 'text/html')
    problems = parseProblemLinks(problemsDoc, contestId)
  }

  if (!problems.length) {
    throw new Error('未能在当前 NFLSOI 比赛页找到题目列表')
  }

  const title = (
    problemsDoc.querySelector('h1')?.textContent ||
    document.querySelector('h1')?.textContent ||
    problemsDoc.title ||
    document.title ||
    `Contest ${contestId}`
  ).replace(/\s+/g, ' ').trim()

  return {
    title,
    collectionLabel: '比赛',
    problems,
  }
}

async function collectProblemPayloadFromUrl(tabId, url, site) {
  await navigateTab(tabId, url)
  let collector = null
  if (site === 'MNA') collector = collectCurrentMnaProblem
  if (site === 'NFLSOI') collector = collectCurrentNflsoiProblem
  if (site === 'YbtOJ') collector = collectCurrentYbtOjProblem
  if (!collector) throw new Error(`暂不支持 ${site || '当前站点'} 题目批量抓取`)

  const payload = await runScriptInTab(tabId, collector)
  if (!payload?.content) {
    throw new Error(`抓取失败: ${url}`)
  }
  return payload
}

async function importSingleProblem(activeTab, targetOrigin, context) {
  if (!activeTab?.id || !context?.site) {
    throw new Error('当前标签页不是支持的单题页面')
  }

  let payload = null
  if (context.site === 'MNA') {
    if (!isMnaProblemUrl(activeTab.url)) {
      throw new Error('请先在 Edge 中打开 MNA 单题页面，再点击扩展按钮')
    }
    payload = await runScriptInTab(activeTab.id, collectCurrentMnaProblem)
  } else if (context.site === 'NFLSOI') {
    if (!isNflsoiProblemUrl(activeTab.url)) {
      throw new Error('请先在 Edge 中打开 NFLSOI 单题页面，再点击扩展按钮')
    }
    payload = await runScriptInTab(activeTab.id, collectCurrentNflsoiProblem)
  } else if (context.site === 'YbtOJ') {
    if (!isYbtOjProblemUrl(activeTab.url)) {
      throw new Error('请先在 Edge 中打开 YbtOJ 单题页面，再点击扩展按钮')
    }
    payload = await runScriptInTab(activeTab.id, collectCurrentYbtOjProblem)
  } else {
    throw new Error(`暂不支持 ${context.site} 单题本地抓取`)
  }

  if (!payload) throw new Error('未能抓取到题面数据')

  const solveDataTabId = await ensureSolveDataTab(targetOrigin)
  await sendTaskToSolveData(solveDataTabId, payload)
  return { ok: true, mode: 'problem', site: context.site, strategy: 'scrape' }
}

async function importCollection(activeTab, targetOrigin, context) {
  if (!activeTab?.id || !context?.site) {
    throw new Error('请先在 Edge 中打开支持的批量导入页面，再点击扩展按钮')
  }

  let contestInfo = null
  if (context.site === 'MNA') {
    if (!isMnaContestUrl(activeTab.url) && !isMnaCourseUrl(activeTab.url)) {
      throw new Error('请先在 Edge 中打开 MNA 比赛页或课程页，再点击扩展按钮')
    }
    contestInfo = await runScriptInTab(activeTab.id, collectCurrentMnaCollection)
  } else if (context.site === 'NFLSOI') {
    if (!isNflsoiContestUrl(activeTab.url)) {
      throw new Error('请先在 Edge 中打开 NFLSOI 比赛页，再点击扩展按钮')
    }
    contestInfo = await runScriptInTab(activeTab.id, collectCurrentNflsoiCollection)
  } else if (context.site === 'YbtOJ') {
    if (!isYbtOjContestUrl(activeTab.url)) {
      throw new Error('请先在 Edge 中打开 YbtOJ 题单页，再点击扩展按钮')
    }
    contestInfo = await runScriptInTab(activeTab.id, collectCurrentYbtOjCollection)
  } else {
    throw new Error(`暂不支持 ${context.site} 批量本地抓取`)
  }

  if (!contestInfo?.problems?.length) {
    throw new Error(`未能在当前${contestInfo?.collectionLabel || '页面'}找到题目列表`)
  }

  const solveDataTabId = await ensureSolveDataTab(targetOrigin)
  const collectorTabId = await createHiddenCollectorTab(contestInfo.problems[0].url)
  let importedCount = 0
  let failedCount = 0
  const failedProblems = []

  try {
    for (const problem of contestInfo.problems) {
      try {
        const payload = await collectProblemPayloadFromUrl(collectorTabId, problem.url, context.site)
        await sendTaskToSolveData(solveDataTabId, payload)
        importedCount += 1
      } catch (error) {
        failedCount += 1
        failedProblems.push(`#${problem.problemNumber} ${problem.label || problem.url}: ${error.message}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  } finally {
    await chrome.tabs.remove(collectorTabId)
  }

  if (importedCount === 0) {
    const collectionLabel = contestInfo.collectionLabel || '比赛'
    const batchLabel = collectionLabel === '课程' ? '整课导入' : (collectionLabel === '题单' ? '整份题单导入' : '整场导入')
    throw new Error(`${batchLabel}失败。${failedProblems[0] || '没有成功抓到任何题目'}`)
  }

  return {
    ok: true,
    mode: 'contest',
    site: context.site,
    strategy: 'scrape',
    collectionLabel: contestInfo.collectionLabel || '比赛',
    contestTitle: contestInfo.title,
    importedCount,
    failedCount,
    failedProblems,
  }
}

function buildContestEditorialMarkdown(contestInfo, collectedProblems) {
  const collectionLabel = contestInfo?.collectionLabel || '比赛'
  const title = String(contestInfo?.title || '未命名比赛').trim()
  const items = Array.isArray(collectedProblems) ? collectedProblems : []
  let markdown = `# ${title}${collectionLabel === '题单' ? ' 题解汇总' : ' 比赛题解汇总'}\n\n`

  const withEditorial = items.filter((item) => String(item?.editorial || '').trim())
  const withoutEditorial = items.filter((item) => !String(item?.editorial || '').trim())

  markdown += `- 共 ${items.length} 题\n`
  markdown += `- 已抓到题解 ${withEditorial.length} 题\n`
  markdown += `- 未抓到题解 ${withoutEditorial.length} 题\n\n`

  withEditorial.forEach((item, index) => {
    const problemTitle = String(item?.title || item?.label || item?.url || `题目 ${index + 1}`).trim()
    markdown += `## ${index + 1}. ${problemTitle}\n\n`
    if (item?.url) {
      markdown += `原题链接：${item.url}\n\n`
    }
    markdown += `${String(item.editorial).trim()}\n\n`
  })

  if (withoutEditorial.length > 0) {
    markdown += '## 未抓到题解的题目\n\n'
    withoutEditorial.forEach((item, index) => {
      const problemTitle = String(item?.title || item?.label || item?.url || `题目 ${index + 1}`).trim()
      markdown += `- ${problemTitle}${item?.url ? ` (${item.url})` : ''}\n`
    })
    markdown += '\n'
  }

  return markdown.trim() + '\n'
}

async function downloadContestEditorials(activeTab, context) {
  if (!activeTab?.id || !context?.site || context.mode !== 'contest' || context.strategy !== 'scrape') {
    throw new Error('当前页面不支持直接下载比赛题解')
  }

  let contestInfo = null
  if (context.site === 'MNA') {
    contestInfo = await runScriptInTab(activeTab.id, collectCurrentMnaCollection)
  } else if (context.site === 'NFLSOI') {
    contestInfo = await runScriptInTab(activeTab.id, collectCurrentNflsoiCollection)
  } else if (context.site === 'YbtOJ') {
    contestInfo = await runScriptInTab(activeTab.id, collectCurrentYbtOjCollection)
  } else {
    throw new Error(`暂不支持 ${context.site} 比赛题解下载`)
  }

  if (!contestInfo?.problems?.length) {
    throw new Error(`未能在当前${contestInfo?.collectionLabel || '页面'}找到题目列表`)
  }

  const collectorTabId = await createHiddenCollectorTab(contestInfo.problems[0].url)
  const collectedProblems = []

  try {
    for (const problem of contestInfo.problems) {
      try {
        const payload = await collectProblemPayloadFromUrl(collectorTabId, problem.url, context.site)
        collectedProblems.push({
          ...problem,
          title: payload?.title || problem.label || problem.url,
          url: payload?.url || problem.url,
          editorial: payload?.editorial || '',
        })
      } catch {
        collectedProblems.push({
          ...problem,
          title: problem.label || problem.url,
          url: problem.url,
          editorial: '',
        })
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  } finally {
    await chrome.tabs.remove(collectorTabId)
  }

  const exportedCount = collectedProblems.filter((item) => String(item.editorial || '').trim()).length
  if (exportedCount === 0) {
    throw new Error('没有抓到任何可导出的题解')
  }

  const markdown = buildContestEditorialMarkdown(contestInfo, collectedProblems)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    await chrome.downloads.download({
      url,
      filename: `${sanitizeDownloadFileName(contestInfo.title, 'contest')}_editorials.md`,
      saveAs: true,
      conflictAction: 'uniquify',
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000)
  }

  return {
    ok: true,
    mode: 'contest',
    site: context.site,
    collectionLabel: contestInfo.collectionLabel || '比赛',
    contestTitle: contestInfo.title,
    exportedCount,
    missingCount: collectedProblems.length - exportedCount,
  }
}

async function importSupportedUrl(activeTab, targetOrigin, context) {
  if (!activeTab?.url) {
    throw new Error('当前标签页没有可导入的链接')
  }

  const solveDataTabId = await ensureSolveDataTab(targetOrigin)
  await sendUrlToSolveData(solveDataTabId, activeTab.url)
  return {
    ok: true,
    mode: context.mode,
    site: context.site,
    strategy: context.strategy,
  }
}

async function handleImportCurrentPage(targetOrigin = DEFAULT_TARGET_ORIGIN) {
  const activeTab = await getActiveTab()
  const context = getImportContext(activeTab?.url)
  if (!context) {
    throw new Error('请先打开支持的网站页面。目前支持 MNA、AtCoder、核桃 OJ、NFLSOI、YbtOJ')
  }

  if (context.strategy === 'scrape' && context.mode === 'problem') {
    return importSingleProblem(activeTab, targetOrigin, context)
  }

  if (context.strategy === 'scrape' && context.mode === 'contest') {
    return importCollection(activeTab, targetOrigin, context)
  }

  return importSupportedUrl(activeTab, targetOrigin, context)
}

async function flashActionBadge(tabId, text, color) {
  if (!tabId) return
  await chrome.action.setBadgeBackgroundColor({ tabId, color })
  await chrome.action.setBadgeText({ tabId, text })
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {})
  }, 3000)
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'PROGRAMTOOLS_DOWNLOAD_CONTEST_EDITORIALS') {
    ;(async () => {
      try {
        const activeTab = await getActiveTab()
        const context = getImportContext(activeTab?.url)
        const result = await downloadContestEditorials(activeTab, context)
        sendResponse(result)
      } catch (error) {
        sendResponse({ ok: false, error: error.message || '题解下载失败' })
      }
    })()

    return true
  }

  if (!['PROGRAMTOOLS_IMPORT_CURRENT_PAGE', 'PROGRAMTOOLS_IMPORT_CURRENT_MNA_PAGE'].includes(message?.type)) return false

  ;(async () => {
    try {
      const result = await handleImportCurrentPage(message.targetOrigin || DEFAULT_TARGET_ORIGIN)
      sendResponse(result)
    } catch (error) {
      sendResponse({ ok: false, error: error.message || 'unknown error' })
    }
  })()

  return true
})

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const result = await handleImportCurrentPage(DEFAULT_TARGET_ORIGIN)
    await flashActionBadge(tab?.id, 'OK', '#166534')
    const title = result?.mode === 'contest'
      ? `已导入比赛到 ${DEFAULT_TARGET_ORIGIN}`
      : `已导入题目到 ${DEFAULT_TARGET_ORIGIN}`
    chrome.action.setTitle({ tabId: tab?.id, title }).catch(() => {})
  } catch (error) {
    await flashActionBadge(tab?.id, 'ERR', '#b91c1c')
    chrome.action.setTitle({
      tabId: tab?.id,
      title: error?.message || '导入失败',
    }).catch(() => {})
  }
})