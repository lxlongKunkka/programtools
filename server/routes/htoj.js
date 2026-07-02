/**
 * server/routes/htoj.js
 * 核桃OJ (htoj.com.cn) 比赛抓取路由
 *
 * API:
 *   GET /api/htoj/contest?url=https://htoj.com.cn/cpp/oj/contest/detail?cid=...
 *   GET /api/htoj/problem?url=https://htoj.com.cn/cpp/oj/problem/detail?pid=...&cid=...
 */

import express from 'express'
import axios from 'axios'
import { authenticateToken } from '../middleware/auth.js'
import { HTOJ_PHONE, HTOJ_PWD } from '../config.js'

const router = express.Router()

// ─── Token 缓存（有效期约 7 天，提前 10 分钟续期）────────────────────────────
let cachedToken = null
let tokenExpireAt = 0  // Unix ms

/** XOR(101) 编码，htoj 登录密钥混淆 */
function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

/** 登录并缓存 JWT Token */
async function getHtojToken() {
  const now = Date.now()
  if (cachedToken && now < tokenExpireAt) return cachedToken

  if (!HTOJ_PHONE || !HTOJ_PWD) {
    throw new Error('未配置 HTOJ_PHONE / HTOJ_PWD，请在 server/.env 中配置核桃OJ账号')
  }

  const r = await axios.post(
    'https://api.hetao101.com/login/v2/account/oauth/password',
    { phoneNumber: xl(HTOJ_PHONE), password: xl(HTOJ_PWD), countryCode: '86', short: false },
    {
      headers: {
        'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
        'app_id': 'com.hetao101.oj', 'Content-Type': 'application/json'
      },
      timeout: 10000
    }
  )

  const token = r.data?.data?.token
  if (!token) throw new Error(`核桃OJ 登录失败: ${JSON.stringify(r.data).slice(0, 200)}`)

  cachedToken = token
  tokenExpireAt = now + 6 * 24 * 60 * 60 * 1000  // 缓存 6 天
  console.log('[htoj] 登录成功，Token 已缓存')
  return token
}

/** 构造 API 请求 Headers */
function htojHeaders(token) {
  return {
    'Authorization': token,
    'HT_PLATFORM': 'htojWeb',
    'HT_SYSTEM': 'web',
    'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'Hetao-Oj-Zone': 'cpp',
    'Origin': 'https://htoj.com.cn',
    'Referer': 'https://htoj.com.cn/',
    'Content-Type': 'application/json'
  }
}

const HTOJ_API = 'https://api.htoj.com.cn'

function buildQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  return search.toString()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractFilename(contentDisposition, fallback = 'attachment.zip') {
  if (contentDisposition) {
    const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1])
      } catch {
        return utf8Match[1]
      }
    }

    const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
    if (plainMatch?.[1]) return plainMatch[1]
  }

  try {
    const pathname = new URL(fallback).pathname || ''
    const last = pathname.split('/').filter(Boolean).pop()
    if (last) return decodeURIComponent(last)
  } catch {
    // ignore URL parse failure and fall back to raw string below
  }

  return fallback
}

function normalizeAttachmentUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  return rawUrl.trim().replace(/[),.;]+$/, '')
}

function extractAttachmentUrlFromText(text) {
  if (!text || typeof text !== 'string') return ''

  const patterns = [
    /<a[^>]+href=["'](https?:\/\/[^"']+\/code-community\/file\/[^"']+)["'][^>]*>\s*附件\s*<\/a>/i,
    /\[[^\]]*附件[^\]]*\]\((https?:\/\/[^)]+\/code-community\/file\/[^)]+)\)/i,
    /(https?:\/\/[^\s"'<>]+\/code-community\/file\/[^\s"'<>]+\.(?:zip|rar|7z|tar|gz))/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return normalizeAttachmentUrl(match[1])
  }

  return ''
}

async function downloadAdditionalFile(fileUrl) {
  const resp = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
    validateStatus: status => status >= 200 && status < 400,
    headers: {
      'Referer': 'https://htoj.com.cn/',
      'User-Agent': 'Mozilla/5.0 ProgramTools/1.0'
    }
  })

  const buffer = Buffer.from(resp.data)
  const filename = extractFilename(resp.headers?.['content-disposition'], fileUrl)

  return {
    filename,
    base64: buffer.toString('base64'),
    size: buffer.length,
    sourceUrl: fileUrl,
  }
}

async function fetchAcceptedSubmissionCode({ pid, cid, tid, gid }, token) {
  const headers = htojHeaders(token)
  const pageSize = 20
  const maxPages = 5

  const requestWithRetry = async (requester, label) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await requester()
      const errMsg = response.data?.errMsg || ''
      if (response.data?.errCode === 0) return response
      if (/访问太频繁/.test(errMsg) && attempt < 3) {
        await sleep(600 * attempt)
        continue
      }
      throw new Error(`${label}失败: errCode=${response.data?.errCode}, ${errMsg}`)
    }

    throw new Error(`${label}失败: 重试次数过多`)
  }

  for (let currentPage = 1; currentPage <= maxPages; currentPage += 1) {
    const query = buildQuery({ cid, pid, tid, gid, currentPage, limit: pageSize })
    const listResp = await requestWithRetry(
      () => axios.get(
        `${HTOJ_API}/api/code-community/api/get-submission-list?${query}`,
        { headers, timeout: 10000 }
      ),
      '获取提交列表'
    )

    const records = listResp.data?.data?.records || []
    const accepted = records.find(item => item?.status?.id === 0)
    if (accepted?.submitId) {
      const detailResp = await requestWithRetry(
        () => axios.get(
          `${HTOJ_API}/api/code-community/api/get-submission-detail?submitId=${accepted.submitId}`,
          { headers, timeout: 10000 }
        ),
        '获取提交详情'
      )

      const code = (detailResp.data?.data?.userCode || '').trim()
      if (code) {
        return {
          submitId: accepted.submitId,
          language: detailResp.data?.data?.language || accepted.language || '',
          code
        }
      }
      // 别人的提交看不到代码，继续翻页找自己的 AC
    }

    if (records.length < pageSize) break
  }

  return null
}

// ─── 比赛抓取 ─────────────────────────────────────────────────────────────────

/**
 * 从 htoj 比赛 URL 提取 cid
 * 支持: https://htoj.com.cn/cpp/oj/contest/detail?cid=22666004139776
 */
function parseHtojCid(url) {
  const m = url.match(/[?&]cid=(\d+)/)
  return m ? m[1] : null
}

/**
 * 从 htoj 题目 URL 提取 pid 和 cid
 * 支持: https://htoj.com.cn/cpp/oj/problem/detail?pid=22663958373760&cid=22666004139776
 */
function parseHtojProblemIds(url) {
  const pidM = url.match(/[?&]pid=(\d+)/)
  const cidM = url.match(/[?&]cid=(\d+)/)
  const problemIdM = url.match(/[?&]problemId=(\d+)/)
  const tidM = url.match(/[?&]tid=(\d+)/)
  const gidM = url.match(/[?&]gid=(\d+)/)
  return {
    pid: pidM?.[1] || problemIdM?.[1] || null,
    cid: cidM?.[1] || null,
    tid: tidM?.[1] || null,
    gid: gidM?.[1] || null,
  }
}

/** 拉取比赛信息 + 题目列表 */
async function fetchHtojContest(url) {
  const cid = parseHtojCid(url)
  if (!cid) throw new Error('无法从 URL 中解析核桃OJ 比赛 ID (cid)')

  const token = await getHtojToken()
  const h = htojHeaders(token)

  // 并行请求比赛信息和题目列表
  const [infoResp, problemResp] = await Promise.all([
    axios.get(`${HTOJ_API}/api/code-community/api/get-contest-info?cid=${cid}`, { headers: h, timeout: 15000 }),
    axios.get(`${HTOJ_API}/api/code-community/api/get-contest-problem?cid=${cid}&currentPage=1&limit=50`, { headers: h, timeout: 15000 })
  ])

  if (infoResp.data.errCode !== 0) throw new Error(`获取比赛信息失败: errCode=${infoResp.data.errCode}`)
  if (problemResp.data.errCode !== 0) throw new Error(`获取题目列表失败: errCode=${problemResp.data.errCode}`)

  const info = infoResp.data.data
  const records = problemResp.data.data?.records || []

  const problems = records.map(p => ({
    label: p.indexTitle || String(p.displayId),
    title: p.displayTitle,
    // pid 作为 problemId 参数，cid 一起
    url: `https://htoj.com.cn/cpp/oj/problem/detail?pid=${p.pid}&cid=${cid}`,
    pid: String(p.pid),
    problemId: p.problemId  // 短ID, e.g. P11715
  }))

  if (problems.length === 0) throw new Error('未找到题目列表，比赛可能不存在或尚未开始')

  return {
    contestId: cid,
    contestTitle: info.title || `htoj-${cid}`,
    problems
  }
}

/** 拉取单道题目完整内容 */
async function fetchHtojProblem(url) {
  const { pid, cid, tid, gid } = parseHtojProblemIds(url)
  if (!pid) throw new Error('无法从 URL 中解析题目 ID (pid/problemId)')
  if (!cid) throw new Error('核桃OJ 题目必须提供比赛 ID (cid) 参数')

  const token = await getHtojToken()
  const h = htojHeaders(token)

  // API 用 problemId=<numeric pid> 和 cid
  const r = await axios.get(
    `${HTOJ_API}/api/htoj-biz-gateway/api/get-problem-detail?problemId=${pid}&cid=${cid}`,
    { headers: h, timeout: 15000 }
  )

  if (r.data.errCode !== 0) {
    throw new Error(`获取题目内容失败: errCode=${r.data.errCode}, ${r.data.errMsg || ''}`)
  }

  const data = r.data.data
  const base = data.problemBaseVO || {}
  const ojDetail = data.problemOjDetailVO || {}

  const title = base.title || `题目-${pid}`
  // content 已经是 Markdown 格式，包含 ### 题目描述, ### 输入格式, ### 输出格式, 样例 等
  const content = base.content || ''

  // 拼接时间/内存限制头部（如果不在 content 中）
  const limits = [
    ojDetail.timeLimit ? `**时间限制**: ${ojDetail.timeLimit}ms` : '',
    ojDetail.memoryLimit ? `**内存限制**: ${ojDetail.memoryLimit}MB` : ''
  ].filter(Boolean).join(' / ')

  const fullContent = limits
    ? `> ${limits}\n\n${content}`
    : content

  let additionalFile = null
  const attachmentUrl = extractAttachmentUrlFromText(content)
  if (attachmentUrl) {
    try {
      additionalFile = await downloadAdditionalFile(attachmentUrl)
      console.log(`[htoj] 附件下载成功: ${additionalFile.filename} (${additionalFile.size} bytes)`)
    } catch (error) {
      console.warn('[htoj] 附件下载失败，回退为 sourceUrl:', error.message)
      additionalFile = {
        filename: extractFilename('', attachmentUrl),
        size: 0,
        sourceUrl: attachmentUrl,
      }
    }
  }

  let acCode = ''
  try {
    const acceptedSubmission = await fetchAcceptedSubmissionCode({ pid, cid, tid, gid }, token)
    acCode = acceptedSubmission?.code || ''
    if (acCode) {
      console.log(`[htoj] 已抓取用户代码 pid=${pid} cid=${cid}, length=${acCode.length}`)
    }
  } catch (error) {
    console.warn('[htoj] AC code skipped:', error.message)
  }

  return {
    title,
    content: fullContent,
    url,
    problemId: base.problemId || '',  // P11715
    acCode,
    additionalFile,
    timeLimit: ojDetail.timeLimit,
    memoryLimit: ojDetail.memoryLimit,
    source: base.source?.name || ''
  }
}

// ─── 路由 ─────────────────────────────────────────────────────────────────────

/** GET /api/htoj/contest?url=... */
router.get('/contest', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!/htoj\.com\.cn/i.test(url)) return res.status(400).json({ error: '仅支持 htoj.com.cn 链接' })

  try {
    return res.json(await fetchHtojContest(url))
  } catch (err) {
    console.error('[htoj] contest fetch error:', err.message)
    const code = err.response?.status
    if (code === 404) return res.status(404).json({ error: '比赛不存在 (404)' })
    if (code === 403) return res.status(403).json({ error: '无权访问，比赛可能需要登录' })
    res.status(500).json({ error: `抓取失败: ${err.message}` })
  }
})

/** GET /api/htoj/problem?url=... */
router.get('/problem', authenticateToken, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!/htoj\.com\.cn/i.test(url)) return res.status(400).json({ error: '仅支持 htoj.com.cn 链接' })

  try {
    return res.json(await fetchHtojProblem(url))
  } catch (err) {
    console.error('[htoj] problem fetch error:', err.message)
    const code = err.response?.status
    res.status(500).json({ error: `抓取题目失败: ${err.message}` })
  }
})

/** GET /api/htoj/status  — 检查 token 是否有效 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const token = await getHtojToken()
    res.json({ ok: true, tokenCached: !!token, expiresAt: new Date(tokenExpireAt).toISOString() })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// ─── 自动提交代码（Playwright）───────────────────────────────────────────────
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'
const __htojDirname = path.dirname(fileURLToPath(import.meta.url))
const CHROME_PATH = path.join(__htojDirname, '../../other/dist/chrome-linux64/chrome')

router.post('/submit', authenticateToken, async (req, res) => {
  return handleSubmit(req, res)
})

async function handleSubmit(req, res) {
  const { url, code, language, token: browserToken } = req.body
  if (!url) return res.status(400).json({ error: '缺少 url 参数' })
  if (!code) return res.status(400).json({ error: '缺少 code 参数' })

  const ids = parseHtojProblemIds(url)
  if (!ids.pid || !ids.cid) return res.status(400).json({ error: '无法从 URL 解析 pid/cid' })

  let browser
  try {
    const lang = language || 'C++'

    // 优先用请求中的 browser token，否则用文件中的
    let htojBrowserToken = browserToken
    if (!htojBrowserToken) {
      try {
        const fs = await import('fs')
        htojBrowserToken = fs.readFileSync(path.join(__htojDirname, '../htoj_browser_token.txt'), 'utf8').trim()
      } catch { /* ignore */ }
    }
    if (!htojBrowserToken) throw new Error('缺少 htoj 浏览器 token')

    console.log('[htoj-submit] 启动浏览器...')
    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })

    const context = await browser.newContext()
    const page = await context.newPage()

    // ====== 注入浏览器 token + userInfo，跳过所有登录流程 ======
    console.log('[htoj-submit] 注入浏览器认证信息...')
    const userInfo = JSON.stringify({uid:"5af35ba36e214ff3861956eaae82648c",userId:50558995,countryCode:"86",countryShort:"CN",nickname:"kunkka",username:"kunkka",phoneNumber:"177dtwo1388",avatar:"https://public.hetaoimg.com/code-community/markdownImg/prod/2c3fd7b1e84c470cb2c04b23b2c660f0.png",isAdmin:false,setPassword:true,windowFlag:true,language:7,ccfLevel:0,city:"潍坊",province:"山东省",hasAccount:false,posterPermission:0,replyPermission:0,myGroup:[],myZone:[],permissions:[]})
    await page.goto('https://htoj.com.cn/', { waitUntil: 'load', timeout: 20000 })
    await page.evaluate((info) => {
      localStorage.setItem('KEY_USER_LOGIN_TOKEN', info.token)
      localStorage.setItem('KEY_USER_INFO', info.userInfo)
      localStorage.setItem('KEY_ZONE', 'cpp')
    }, { token: htojBrowserToken, userInfo })
    // 刷新让 SPA 读取
    await page.reload({ waitUntil: 'load', timeout: 20000 })
    await page.waitForTimeout(2000)

    // ====== 直接导航到题目页 ======
    console.log(`[htoj-submit] 导航到: ${url}`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(5000)

    // 截图调试
    await page.screenshot({ path: '/tmp/htoj_page_loaded.png' }).catch(() => {})

    // 验证登录状态
    const pageInfo = await page.evaluate(() => {
      const bodyTxt = document.body?.innerText?.substring(0, 500) || ''
      const allBtns = [...document.querySelectorAll('button')].map(b => ({
        text: (b.textContent || '').trim().substring(0, 30),
        cls: (b.className || '').toString().substring(0, 40)
      }))
      return {
        hasLogin: bodyTxt.includes('登 录') || bodyTxt.includes('登录'),
        monacoExists: !!document.querySelector('.monaco-editor'),
        textareaExists: !!document.querySelector('textarea'),
        buttonCount: allBtns.length,
        buttons: allBtns.slice(0, 15)
      }
    })
    console.log('[htoj-submit] 页面信息:', JSON.stringify(pageInfo).slice(0, 400))

    if (pageInfo.hasLogin) {
      await page.screenshot({ path: '/tmp/htoj_login_failed.png' }).catch(() => {})
      throw new Error('Token 注入后仍然显示登录页面，token 可能已过期')
    }
    console.log('[htoj-submit] 已登录')

    // ====== 填入代码 ======
    const hasMonaco = pageInfo.monacoExists

    if (hasMonaco) {
      await page.click('.monaco-editor', { timeout: 5000 })
      await page.waitForTimeout(1000)
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Delete')
      await page.waitForTimeout(300)
      await page.keyboard.type(code, { delay: 3 })
      console.log('[htoj-submit] 代码已填入 Monaco')
    } else if (pageInfo.textareaExists) {
      // Fallback via evaluate
      await page.evaluate((c) => {
        const ta = document.querySelector('textarea')
        if (ta) { 
          ta.focus()
          ta.value = c
          ta.dispatchEvent(new Event('input', { bubbles: true }))
          ta.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }, code)
      console.log('[htoj-submit] textarea 填入完成')
    } else {
      // 尝试 CodeMirror 或其他编辑器
      await page.evaluate((c) => {
        // 尝试找任何可见的代码区域
        const editors = document.querySelectorAll('.CodeMirror, .monaco-editor, [class*=\"code\"], [class*=\"editor\"]')
        if (editors.length > 0) {
          editors[0].click()
        }
        const ta = document.querySelector('textarea')
        if (ta) {
          ta.focus()
          ta.value = c
          ta.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }, code)
      console.log('[htoj-submit] 尝试通用代码填入')
    }

    // ====== 选择语言 ======
    try {
      const selects = await page.$$('select')
      for (const sel of selects) {
        const options = await sel.$$('option')
        for (const opt of options) {
          const text = await opt.textContent()
          if (text && text.includes(lang)) {
            const value = await opt.getAttribute('value')
            if (value) await sel.selectOption(value)
            break
          }
        }
      }
      console.log(`[htoj-submit] 语言选择完成`)
    } catch {}

    // ====== 截图调试（提交前） ======
    await page.screenshot({ path: '/tmp/htoj_before_submit.png' }).catch(() => {})

    // ====== 点击提交评测 ======
    // 先点击空白处让编辑器失焦
    await page.mouse.click(10, 10)
    await page.waitForTimeout(500)

    // 监听提交 API 响应
    const submitPromise = page.waitForResponse(
      resp => resp.url().includes('/api/') && (resp.url().includes('submit') || resp.url().includes('judge')) && resp.status() === 200,
      { timeout: 15000 }
    ).catch(() => null)

    // 用 evaluate 查找提交按钮（更宽松）
    const submitClicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button, a[class*=\"btn\"], div[class*=\"submit\"]')]
      // 优先级1: 精确"提交评测"
      for (const btn of btns) {
        const txt = (btn.textContent || '').trim()
        if (txt === '提交评测') { btn.click(); return txt }
      }
      // 优先级2: 包含"提交"且不含"运行"
      for (const btn of btns) {
        const txt = (btn.textContent || '').trim()
        if (txt.includes('提交') && !txt.includes('运行自测') && !txt.includes('运行结果')) {
          btn.click(); return txt
        }
      }
      // 优先级3: class 含 submit 且不含 run
      for (const btn of btns) {
        const cls = (btn.className || '').toString().toLowerCase()
        const txt = (btn.textContent || '').trim()
        if (cls.includes('submit') && !cls.includes('run') && !txt.includes('运行')) {
          btn.click(); return txt
        }
      }
      return ''
    })
    if (!submitClicked) {
      // 再试试所有按钮
      const allBtnTexts = await page.evaluate(() => {
        return [...document.querySelectorAll('button')].map(b => (b.textContent || '').trim())
      })
      console.log('[htoj-submit] 所有按钮:', JSON.stringify(allBtnTexts))
      throw new Error(`找不到提交评测按钮。页面按钮: ${JSON.stringify(allBtnTexts).slice(0, 200)}`)
    }
    console.log(`[htoj-submit] 点击了按钮: "${submitClicked}"`)

    // 等待提交 API 响应
    const submitResp = await submitPromise
    if (submitResp) {
      const respBody = await submitResp.json().catch(() => null)
      console.log('[htoj-submit] 提交API响应:', JSON.stringify(respBody).slice(0, 200))
    } else {
      console.log('[htoj-submit] 未捕获到提交API响应')
    }
    console.log('[htoj-submit] 提交评测已点击')
    await page.waitForTimeout(3000)

    // ====== 截图调试 ======
    await page.screenshot({ path: '/tmp/htoj_after_submit.png' }).catch(() => {})

    // ====== 用 API 轮询获取真实评测结果 ======
    await browser.close()
    let result = '已提交，等待评测...'

    const apiToken = await getHtojToken()
    const h = htojHeaders(apiToken)
    const submitTime = Date.now()

    // 等待 + 轮询（最多等 60 秒）
    for (let i = 0; i < 12; i++) {
      await sleep(5000)

      try {
        const query = buildQuery({ cid: ids.cid, pid: ids.pid, tid: ids.tid, gid: ids.gid, currentPage: 1, limit: 5 })
        const listResp = await axios.get(
          `${HTOJ_API}/api/code-community/api/get-submission-list?${query}`,
          { headers: h, timeout: 10000 }
        )

        if (listResp.data?.errCode === 0) {
          const records = listResp.data?.data?.records || []
          if (records.length > 0) {
            // 检查最新提交的状态
            const latest = records[0]
            const statusId = latest?.status?.id
            const statusName = latest?.status?.name || ''

            // status.id 映射: 0=Accepted, 1=Wrong Answer, 2=Compile Error, 3=Runtime Error, 4=Time Limit, 5=Memory Limit, 6=Pending/Judging
            const statusMap = {
              0: 'Accepted / 答案正确',
              1: 'Wrong Answer / 答案错误',
              2: 'Compile Error / 编译错误',
              3: 'Runtime Error / 运行错误',
              4: 'Time Limit Exceeded / 时间超限',
              5: 'Memory Limit Exceeded / 内存超限',
              6: '评测中...',
              7: 'System Error / 系统错误'
            }

            if (statusId !== undefined && statusId !== null && statusId !== 6) {
              result = statusMap[statusId] || statusName || `状态码: ${statusId}`
              console.log(`[htoj-submit] API轮询第${i + 1}轮获得结果: ${result} (statusId=${statusId})`)
              break
            } else if (statusId === 6) {
              console.log(`[htoj-submit] API轮询第${i + 1}轮: 评测中...`)
              result = '评测中...'
            }
          }
        }
      } catch (e) {
        console.log(`[htoj-submit] API轮询第${i + 1}轮出错:`, e.message)
      }
    }

    console.log(`[htoj-submit] 完成: ${result}`)
    res.json({ ok: true, message: result, url })

  } catch (err) {
    console.error('[htoj-submit] 失败:', err.message, err.stack)
    if (browser) await browser.close().catch(() => {})
    res.status(500).json({ ok: false, error: err.message, stack: err.stack?.split('\n').slice(0, 3).join(' | ') })
  }
}

// ─── 导出核心函数 ────────────────────────────────────────────────────────────
export { fetchHtojContest, fetchHtojProblem, parseHtojCid, parseHtojProblemIds }

export default router
