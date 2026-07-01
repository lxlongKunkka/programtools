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

// ─── 辅助：获取题目标题 ───────────────────────────────────────────────────

async function resolveProblemInfo(token, contestId, displayOrder, standaloneId) {
  if (contestId && displayOrder) {
    const r = await axios.get(`${BASE}/api/problem/getProblemInContest`, {
      params: { contestId, displayOrder },
      headers: makeHeaders(token),
      validateStatus: s => s < 600,
      timeout: 10000,
    })
    if (r.status === 200) {
      const p = r.data
      return { problemId: p.meta.id, title: p.meta.title, tags: (p.tags || []).map(t => t.name), statistics: p.statistics }
    }
  }
  if (standaloneId) {
    const r = await axios.get(`${BASE}/api/problem/getProblem`, {
      params: { id: Number(standaloneId) },
      headers: makeHeaders(token),
      validateStatus: s => s < 600,
      timeout: 10000,
    })
    if (r.status === 200) {
      const p = r.data
      return { problemId: p.meta.id, title: p.meta.title, tags: [], statistics: p.statistics }
    }
  }
  return { problemId: null, title: 'Unknown', tags: [], statistics: null }
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
 * 抓取单个题目
 * - 元数据通过 API 获取（标题、标签、统计）
 * - 正文：Lyrio API 不暴露，返回占位提示 + 原题链接
 */
export async function fetchLyrioNflsoiProblem(url, options = {}) {
  const { user, pwd } = options
  const token = await getToken(user, pwd)

  const inContest = parseProblemInContest(url)
  const standaloneId = parseStandaloneProblemId(url)

  const info = await resolveProblemInfo(
    token,
    inContest?.contestId || null,
    inContest?.displayOrder || null,
    standaloneId
  )

  if (!info.problemId && !inContest && !standaloneId) {
    throw new Error('无法从 URL 中解析 Lyrio 题目地址')
  }

  const tagsSection = info.tags.length > 0
    ? `**标签**: ${info.tags.join(', ')}\n\n`
    : ''

  const statsSection = info.statistics
    ? `**统计**: ${info.statistics.submissionCount || 0} 提交 / ${info.statistics.acceptedSubmissionCount || 0} AC\n\n`
    : ''

  return {
    title: info.title,
    content: `> ⚠️ 题目正文需在浏览器中查看：[原题链接](${url})\n\n${tagsSection}${statsSection}`,
    problemId: info.problemId,
    tags: info.tags,
    statistics: info.statistics,
  }
}

/**
 * 获取本人 AC 代码
 * @param {string} contestId - 比赛 ID
 * @param {string} displayOrder - 题目序号 (1, 2, 3...)
 * @param {object} options - { user, pwd }
 * @returns {{ code: string, language: string, submissionId: number, problemTitle: string }}
 */
export async function fetchLyrioNflsoiAcCode(contestId, displayOrder, options = {}) {
  const { user, pwd } = options

  if (!contestId || !displayOrder) {
    throw new Error('需要 contestId 和 displayOrder 参数')
  }

  const token = await getToken(user, pwd)

  // Step 1: 获取题目信息（拿到 problemId）
  let problemId
  try {
    const probR = await axios.get(`${BASE}/api/problem/getProblemInContest`, {
      params: { contestId, displayOrder },
      headers: makeHeaders(token),
      validateStatus: s => s < 600,
      timeout: 10000,
    })
    if (probR.status === 200) {
      problemId = probR.data.meta.id
    }
  } catch {
    // continue without problemId
  }

  // Step 2: 查询本人提交（默认拿当前登录用户）
  const r = await axios.get(`${BASE}/api/submission/querySubmission`, {
    params: { submitter: user, takeCount: 50 },
    headers: makeHeaders(token),
    validateStatus: s => s < 600,
    timeout: 10000,
  })

  if (r.status !== 200) {
    throw new Error(`查询提交记录失败，HTTP ${r.status}`)
  }

  const submissions = r.data.submissions || []

  // 过滤当前题目的 AC 提交
  const acSubs = submissions.filter(s => {
    if (s.status !== 'Accepted') return false
    if (problemId && s.problem?.id === problemId) return true
    // 如果没有 problemId，模糊匹配（不太可靠）
    return false
  })

  if (acSubs.length === 0) {
    // 没找到当前题目的 AC 提交，尝试不限制 problemId
    const anyAc = submissions.filter(s => s.status === 'Accepted')
    if (anyAc.length === 0) {
      return { code: null, language: null, submissionId: null, problemTitle: null, message: `账号 ${user} 没有 AC 提交记录` }
    }
    return { code: null, language: null, submissionId: null, problemTitle: null, message: `账号 ${user} 在该比赛中没有针对本题的 AC 提交（共有 ${anyAc.length} 个其他题目的 AC）` }
  }

  // 取第一个（最新）AC 提交
  const acSub = acSubs[0]

  // Step 3: 获取代码详情
  const detailR = await axios.get(`${BASE}/api/submission/getSubmissionDetail`, {
    params: { submissionId: acSub.id },
    headers: makeHeaders(token),
    validateStatus: s => s < 600,
    timeout: 10000,
  })

  if (detailR.status !== 200 || !detailR.data.content) {
    throw new Error(`获取提交详情失败`)
  }

  const content = detailR.data.content

  return {
    code: content.text || '',
    language: content.language || 'cpp',
    submissionId: acSub.id,
    problemTitle: acSub.problem?.title || '',
    specName: acSub.specName || '',
    answerSize: acSub.answerSize || 0,
  }
}

/**
 * 批量获取比赛中所有题目的 AC 代码
 * @returns { acCodes: [{ displayOrder, code, language, problemTitle }] }
 */
export async function fetchLyrioNflsoiAllAcCodes(contestId, options = {}) {
  const { user, pwd } = options
  if (!contestId) throw new Error('需要 contestId 参数')

  const token = await getToken(user, pwd)

  // 获取本人所有提交
  const r = await axios.get(`${BASE}/api/submission/querySubmission`, {
    params: { submitter: user, takeCount: 200 },
    headers: makeHeaders(token),
    validateStatus: s => s < 600,
    timeout: 15000,
  })

  if (r.status !== 200) {
    throw new Error(`查询提交记录失败`)
  }

  const submissions = r.data.submissions || []
  const acMap = new Map() // problemId → best submission

  for (const sub of submissions) {
    if (sub.status !== 'Accepted') continue
    const pid = sub.problem?.id
    if (!pid || acMap.has(pid)) continue
    acMap.set(pid, sub)
  }

  // 遍历比赛题目，匹配 AC 代码
  const results = []
  for (let displayOrder = 1; displayOrder <= 30; displayOrder++) {
    try {
      const probR = await axios.get(`${BASE}/api/problem/getProblemInContest`, {
        params: { contestId, displayOrder },
        headers: makeHeaders(token),
        validateStatus: s => s < 600,
        timeout: 10000,
      })
      if (probR.status !== 200) break

      const prob = probR.data
      const acSub = acMap.get(prob.meta.id)

      if (acSub) {
        try {
          const detailR = await axios.get(`${BASE}/api/submission/getSubmissionDetail`, {
            params: { submissionId: acSub.id },
            headers: makeHeaders(token),
            validateStatus: s => s < 600,
            timeout: 10000,
          })
          if (detailR.status === 200 && detailR.data.content) {
            results.push({
              displayOrder,
              problemTitle: prob.meta.title,
              code: detailR.data.content.text || '',
              language: detailR.data.content.language || 'cpp',
              submissionId: acSub.id,
            })
            continue
          }
        } catch {}
      }
      results.push({ displayOrder, problemTitle: prob.meta.title, code: null, language: null, submissionId: null })
    } catch {
      break
    }
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
