/**
 * server/routes/lyrio_nflsoi.js
 * nflsoi.cc:10999（基于 Lyrio 框架）比赛与题目抓取
 *
 * Lyrio 是纯 SPA 框架，题目 statement 不通过 API 暴露（已知限制）。
 * 本模块提供比赛列表、题目列表、题目元数据、AC 代码抓取。
 *
 * URL 格式:
 *   比赛:  https://nflsoi.cc:10999/contest/{contestId}
 *   题目:  https://nflsoi.cc:10999/contest/{contestId}/problem/{displayOrder}
 *         https://nflsoi.cc:10999/p/{problemId}
 *
 * AC 代码: 通过 querySubmission + getSubmissionDetail 获取本人提交的代码
 */

import axios from 'axios'

const BASE = 'https://nflsoi.cc:10999'

// ─── Session 缓存 ─────────────────────────────────────────────────────────
let cachedToken = ''
let sessionExpireAt = 0  // Unix ms

/** 登录获取 token，缓存 4 小时 */
async function getToken(user, pwd) {
  const now = Date.now()
  if (cachedToken && now < sessionExpireAt) return cachedToken

  const r = await axios.post(`${BASE}/api/auth/login`, {
    username: user,
    password: pwd,
  }, {
    headers: { 'Content-Type': 'application/json' },
    validateStatus: s => s < 600,
    timeout: 10000,
  })

  if (r.status !== 201) {
    throw new Error(`Lyrio 登录失败，HTTP ${r.status}: ${JSON.stringify(r.data)}`)
  }

  cachedToken = r.data.token
  sessionExpireAt = now + 4 * 60 * 60 * 1000
  console.log(`[lyrio-nflsoi] 登录成功，token 已缓存`)
  return cachedToken
}

/** 构造请求 Headers */
function makeHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }
}

// ─── URL 解析 ─────────────────────────────────────────────────────────────

function parseContestId(url) {
  const m = url.match(/\/(?:contest|c)\/(\d+)/)
  return m ? m[1] : null
}

function parseProblemInContest(url) {
  const m = url.match(/\/(?:contest|c)\/(\d+)\/(?:problem|p)\/(\d+)/)
  return m ? { contestId: m[1], displayOrder: m[2] } : null
}

function parseStandaloneProblemId(url) {
  const m = url.match(/\/p\/(\d+)/)
  return m ? m[1] : null
}

// ─── 导出函数 ─────────────────────────────────────────────────────────────

/**
 * 获取比赛题目列表
 */
export async function fetchLyrioNflsoiContest(url, options = {}) {
  const { user, pwd } = options
  const contestId = parseContestId(url)
  if (!contestId) throw new Error('无法从 URL 中解析 Lyrio 比赛 ID')

  const token = await getToken(user, pwd)

  const contestR = await axios.get(`${BASE}/api/contest/getContest`, {
    params: { contestId },
    headers: makeHeaders(token),
    validateStatus: s => s < 600,
    timeout: 15000,
  })

  if (contestR.status !== 200) {
    throw new Error(`获取比赛失败，HTTP ${contestR.status}`)
  }

  const contestMeta = contestR.data.meta
  const contestTitle = contestMeta.name

  const problems = []
  for (let displayOrder = 1; displayOrder <= 30; displayOrder++) {
    try {
      const probR = await axios.get(`${BASE}/api/problem/getProblemInContest`, {
        params: { contestId, displayOrder },
        headers: makeHeaders(token),
        validateStatus: s => s < 600,
        timeout: 10000,
      })

      if (probR.status === 200) {
        const prob = probR.data
        problems.push({
          label: String.fromCharCode(64 + displayOrder),
          title: prob.meta.title,
          url: `${BASE}/contest/${contestId}/problem/${displayOrder}`,
          problemNumber: String(displayOrder),
          problemId: prob.meta.id,
        })
      } else {
        break
      }
    } catch {
      break
    }
  }

  return {
    contestId,
    contestTitle,
    problems,
    url: `${BASE}/contest/${contestId}`,
  }
}

/**
 * 抓取单个题目（含完整正文）
 * - 通过 contentSections=true 获取题目正文
 * - 包含 judgeInfo（时间/内存限制）
 */
export async function fetchLyrioNflsoiProblem(url, options = {}) {
  const { user, pwd } = options
  const token = await getToken(user, pwd)

  const inContest = parseProblemInContest(url)
  const standaloneId = parseStandaloneProblemId(url)

  // 获取题目详情（含正文）
  let problemData = null
  const queryParams = { contentSections: 'true', judgeInfo: 'true' }

  if (inContest) {
    const r = await axios.get(`${BASE}/api/problem/getProblemInContest`, {
      params: { contestId: inContest.contestId, displayOrder: inContest.displayOrder, ...queryParams },
      headers: makeHeaders(token),
      validateStatus: s => s < 600,
      timeout: 10000,
    })
    if (r.status === 200) problemData = r.data
  } else if (standaloneId) {
    const r = await axios.get(`${BASE}/api/problem/getProblem`, {
      params: { id: Number(standaloneId), ...queryParams },
      headers: makeHeaders(token),
      validateStatus: s => s < 600,
      timeout: 10000,
    })
    if (r.status === 200) problemData = r.data
  }

  if (!problemData) {
    throw new Error('无法从 URL 中解析 Lyrio 题目地址')
  }

  const prob = problemData
  const tags = (prob.tags || []).map(t => t.name)

  // 组装 Markdown 正文
  let content = ''

  // 题目正文
  if (prob.contentSections && prob.contentSections.length > 0) {
    for (const section of prob.contentSections) {
      if (section.title) {
        content += `## ${section.title}\n\n`
      }
      if (section.text) {
        // Lyrio 正文中的样例格式特殊处理：``` → 保持
        content += `${section.text}\n\n`
      }
    }
  } else {
    content += `> ⚠️ 未能获取题目正文。\n> 请访问 [原题链接](${url}) 查看完整题目。\n\n`
  }

  // 输入格式/输出格式 已在正文中

  // 限制信息
  if (prob.judgeInfo) {
    const ji = prob.judgeInfo
    const limits = []
    if (ji.time) limits.push(`时间限制: ${ji.time}ms`)
    if (ji.memory) limits.push(`内存限制: ${ji.memory}MB`)
    if (limits.length > 0) {
      content += `**${limits.join(' / ')}**\n\n`
    }
  }

  // 标签
  if (tags.length > 0) {
    content += `**标签**: ${tags.join(', ')}\n\n`
  }

  // 尝试获取 AC 代码（仅比赛中的题目）
  let acCode = null
  if (inContest) {
    try {
      const acCodes = await fetchLyrioNflsoiAcCodesFromStandings(token, inContest.contestId)
      const match = acCodes.find(c => c.displayOrder === Number(inContest.displayOrder))
      if (match && match.code) {
        acCode = match.code
      }
    } catch {
      // AC 代码获取失败不影响题目抓取
    }
  }

  return {
    title: prob.meta.title,
    content,
    problemId: prob.meta.id,
    tags,
    statistics: prob.statistics,
    judgeInfo: prob.judgeInfo,
    acCode,
  }
}

// ─── AC 代码辅助函数 ─────────────────────────────────────────────────────

/** 从排行榜获取所有题目的 AC 代码（内部使用，共享 token） */
async function fetchLyrioNflsoiAcCodesFromStandings(token, contestId) {
  const standingsR = await axios.get(`${BASE}/api/contest/queryContestStandings`, {
    params: { contestId },
    headers: makeHeaders(token),
    validateStatus: s => s < 600,
    timeout: 15000,
  })

  if (standingsR.status !== 200) return []

  const rows = standingsR.data.rows || []
  const bestAcPerProblem = new Map()

  for (const row of rows) {
    for (const problem of (row.problems || [])) {
      const do_ = problem.displayOrder
      if (!bestAcPerProblem.has(do_) && problem.bestSubmission?.status === 'Accepted') {
        bestAcPerProblem.set(do_, {
          submissionId: problem.bestSubmission.id,
          author: row.user?.username || 'unknown',
        })
      }
    }
    if (bestAcPerProblem.size >= 30) break
  }

  const results = []
  for (const [displayOrder, info] of bestAcPerProblem) {
    try {
      const detailR = await axios.get(`${BASE}/api/submission/getSubmissionDetail`, {
        params: { submissionId: info.submissionId },
        headers: makeHeaders(token),
        validateStatus: s => s < 600,
        timeout: 10000,
      })
      if (detailR.status === 200 && detailR.data.content?.text) {
        results.push({
          displayOrder,
          code: detailR.data.content.text,
          language: detailR.data.content.language || 'cpp',
          submissionId: info.submissionId,
          author: info.author,
        })
      }
    } catch {}
  }

  return results
}

/**
 * 通过排行榜获取比赛中所有题目的 AC 代码
 * 思路：从 standings API 获取每道题最高排名选手的 AC submissionId，再获取代码
 * @returns {{ acCodes: [{ displayOrder, code, language, problemTitle, author }] }}
 */
export async function fetchLyrioNflsoiAllAcCodes(contestId, options = {}) {
  const { user, pwd } = options
  if (!contestId) throw new Error('需要 contestId 参数')

  const token = await getToken(user, pwd)

  // 使用共享函数获取 AC 代码
  const acCodes = await fetchLyrioNflsoiAcCodesFromStandings(token, contestId)

  // 获取题目标题映射
  const problemTitles = new Map()
  for (let d = 1; d <= 30; d++) {
    try {
      const probR = await axios.get(`${BASE}/api/problem/getProblemInContest`, {
        params: { contestId, displayOrder: d },
        headers: makeHeaders(token),
        validateStatus: s => s < 600,
        timeout: 10000,
      })
      if (probR.status === 200) {
        problemTitles.set(d, probR.data.meta.title)
      } else break
    } catch { break }
  }

  // 组装结果
  const results = []
  const acMap = new Map(acCodes.map(c => [c.displayOrder, c]))
  for (let d = 1; d <= 30; d++) {
    const title = problemTitles.get(d)
    if (!title) break
    const ac = acMap.get(d)
    results.push({
      displayOrder: d,
      problemTitle: title,
      code: ac?.code || null,
      language: ac?.language || null,
      submissionId: ac?.submissionId || null,
      author: ac?.author || null,
    })
  }

  return { contestId, acCodes: results }
}

/**
 * 获取比赛列表
 */
export async function fetchLyrioNflsoiContestList(options = {}) {
  const { user, pwd, page = 0, pageSize = 50 } = options
  const token = await getToken(user, pwd)

  const r = await axios.get(`${BASE}/api/contest/getContestList`, {
    params: { skipCount: page * pageSize, takeCount: pageSize },
    headers: makeHeaders(token),
    validateStatus: s => s < 600,
    timeout: 15000,
  })

  if (r.status !== 200) {
    throw new Error(`获取比赛列表失败，HTTP ${r.status}`)
  }

  return {
    contests: r.data.contests || [],
    count: r.data.count || 0,
  }
}

/**
 * 获取题库题目列表
 */
export async function fetchLyrioNflsoiProblemList(options = {}) {
  const { user, pwd, page = 0, pageSize = 50 } = options
  const token = await getToken(user, pwd)

  const r = await axios.get(`${BASE}/api/problem/getProblemList`, {
    params: { skipCount: page * pageSize, takeCount: pageSize },
    headers: makeHeaders(token),
    validateStatus: s => s < 600,
    timeout: 15000,
  })

  if (r.status !== 200) {
    throw new Error(`获取题目列表失败，HTTP ${r.status}`)
  }

  return {
    problems: r.data.problems || [],
    count: r.data.count || 0,
  }
}
