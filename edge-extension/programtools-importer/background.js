async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

const DEFAULT_TARGET_ORIGIN = 'https://ai.acjudge.com'

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

function getImportContext(url) {
  if (isMnaProblemUrl(url)) return { site: 'MNA', mode: 'problem', strategy: 'scrape' }
  if (isMnaContestUrl(url)) return { site: 'MNA', mode: 'contest', strategy: 'scrape' }
  if (isAtcoderProblemUrl(url)) return { site: 'AtCoder', mode: 'problem', strategy: 'url' }
  if (isAtcoderContestUrl(url)) return { site: 'AtCoder', mode: 'contest', strategy: 'url' }
  if (isHtojProblemUrl(url)) return { site: '核桃 OJ', mode: 'problem', strategy: 'url' }
  if (isHtojContestUrl(url)) return { site: '核桃 OJ', mode: 'contest', strategy: 'url' }
  if (isNflsoiProblemUrl(url)) return { site: 'NFLSOI', mode: 'problem', strategy: 'url' }
  if (isNflsoiContestUrl(url)) return { site: 'NFLSOI', mode: 'contest', strategy: 'url' }
  return null
}

function isMnaProblemUrl(url) {
  return /https:\/\/mna\.wang\/contest\/\d+\/problem\/\d+/i.test(url || '')
}

function isMnaContestUrl(url) {
  return /https:\/\/mna\.wang\/contest\/\d+\/?(?:\?.*)?$/i.test(url || '')
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
      if (!href || /\/download\/additional_file/.test(href)) return text
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
    const buffer = await response.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return {
      headers: {
        contentDisposition: response.headers.get('content-disposition') || '',
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

  const match = location.href.match(/\/contest\/(\d+)\/problem\/(\d+)/i)
  if (!match) {
    throw new Error('当前页面不是 MNA 单题页面')
  }

  const [, contestId, problemNumber] = match
  const { title, content } = parseProblemContent()
  const { timeLimit, memoryLimit } = extractLimits()

  let additionalFile = null
  const additionalLink = findAdditionalFileLink()
  if (additionalLink?.href) {
    const sourceUrl = normalizeUrl(additionalLink.href)
    try {
      const binary = await fetchBinary(sourceUrl)
      additionalFile = {
        filename: parseFilename(binary.headers.contentDisposition, `additional_file_${contestId}_${problemNumber}.zip`),
        base64: binary.base64,
        size: binary.size,
        sourceUrl,
      }
    } catch {
      additionalFile = {
        filename: `additional_file_${contestId}_${problemNumber}.zip`,
        size: 0,
        sourceUrl,
      }
    }
  }

  let acCode = ''
  try {
    acCode = await Promise.race([
      fetchAcCode(contestId, problemNumber),
      new Promise((resolve) => setTimeout(() => resolve(''), 15000)),
    ])
  } catch {
    acCode = ''
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

function collectCurrentMnaContest() {
  const title = (document.querySelector('h1')?.textContent || document.title || '').replace(/\s+/g, ' ').trim()
  const links = [...document.querySelectorAll('a[href*="/contest/"][href*="/problem/"]')]
  const dedup = new Map()

  for (const link of links) {
    const href = link.getAttribute('href') || ''
    const url = new URL(href, location.origin).href
    const match = url.match(/\/contest\/(\d+)\/problem\/(\d+)/i)
    if (!match) continue
    const problemNumber = Number(match[2])
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
    problems,
  }
}

async function collectProblemPayloadFromUrl(tabId, url) {
  await navigateTab(tabId, url)
  const payload = await runScriptInTab(tabId, collectCurrentMnaProblem)
  if (!payload?.content) {
    throw new Error(`抓取失败: ${url}`)
  }
  return payload
}

async function importSingleProblem(activeTab, targetOrigin) {
  if (!activeTab?.id || !isMnaProblemUrl(activeTab.url)) {
    throw new Error('请先在 Edge 中打开 MNA 单题页面，再点击扩展按钮')
  }

  const payload = await runScriptInTab(activeTab.id, collectCurrentMnaProblem)
  if (!payload) throw new Error('未能抓取到题面数据')

  const solveDataTabId = await ensureSolveDataTab(targetOrigin)
  await sendTaskToSolveData(solveDataTabId, payload)
  return { ok: true, mode: 'problem' }
}

async function importContest(activeTab, targetOrigin) {
  if (!activeTab?.id || !isMnaContestUrl(activeTab.url)) {
    throw new Error('请先在 Edge 中打开 MNA 比赛页面，再点击扩展按钮')
  }

  const contestInfo = await runScriptInTab(activeTab.id, collectCurrentMnaContest)
  if (!contestInfo?.problems?.length) {
    throw new Error('未能在当前比赛页找到题目列表')
  }

  const solveDataTabId = await ensureSolveDataTab(targetOrigin)
  const collectorTabId = await createHiddenCollectorTab(contestInfo.problems[0].url)
  let importedCount = 0
  let failedCount = 0
  const failedProblems = []

  try {
    for (const problem of contestInfo.problems) {
      try {
        const payload = await collectProblemPayloadFromUrl(collectorTabId, problem.url)
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
    throw new Error(`整场导入失败。${failedProblems[0] || '没有成功抓到任何题目'}`)
  }

  return {
    ok: true,
    mode: 'contest',
    contestTitle: contestInfo.title,
    importedCount,
    failedCount,
    failedProblems,
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
    throw new Error('请先打开支持的网站页面。目前支持 MNA、AtCoder、核桃 OJ、NFLSOI')
  }

  if (context.strategy === 'scrape' && context.mode === 'problem') {
    return importSingleProblem(activeTab, targetOrigin)
  }

  if (context.strategy === 'scrape' && context.mode === 'contest') {
    return importContest(activeTab, targetOrigin)
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