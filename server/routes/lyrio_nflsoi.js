/**
 * server/routes/lyrio_nflsoi.js
 * nflsoi.cc:10999（基于 Lyrio 框架）比赛与题目抓取
 *
 * Lyrio 是纯 SPA 框架，题目内容通过 API 加载但 statement 不直接暴露。
 * 本模块提供比赛列表、比赛题目列表、题目元数据抓取。
 *
 * URL 格式:
 *   比赛:  https://nflsoi.cc:10999/contest/{contestId}
 *   题目:  https://nflsoi.cc:10999/contest/{contestId}/problem/{displayOrder}
 *         https://nflsoi.cc:10999/p/{problemId}
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
  const m = url.match(/\/contest\/(\d+)/)
  return m ? m[1] : null
}

function parseProblemInContest(url) {
  const m = url.match(/\/contest\/(\d+)\/problem\/(\d+)/)
  return m ? { contestId: m[1], displayOrder: m[2] } : null
}

function parseStandaloneProblemId(url) {
  const m = url.match(/\/p\/(\d+)/)
  return m ? m[1] : null
}

// ─── 导出函数 ─────────────────────────────────────────────────────────────

/**
 * 获取比赛题目列表
 * 返回格式与 fetchNflsojContest 一致:
 *   { contestId, contestTitle, problems: [{ label, title, url, problemNumber }], url }
 */
export async function fetchLyrioNflsoiContest(url, options = {}) {
  const { user, pwd } = options
  const contestId = parseContestId(url)
  if (!contestId) throw new Error('无法从 URL 中解析 Lyrio 比赛 ID')

  const token = await getToken(user, pwd)

  // 获取比赛元数据
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

  // 遍历 displayOrder 获取所有题目
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
          label: String.fromCharCode(64 + displayOrder), // A, B, C...
          title: prob.meta.title,
          url: `${BASE}/contest/${contestId}/problem/${displayOrder}`,
          problemNumber: String(displayOrder),
          problemId: prob.meta.id,
        })
      } else {
        // No more problems
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
 * 抓取单个题目（元数据，Lyrio API 不暴露 statement）
 * 返回格式: { title, content: markdown, problemId, tags[] }
 */
export async function fetchLyrioNflsoiProblem(url, options = {}) {
  const { user, pwd } = options
  const token = await getToken(user, pwd)

  // 尝试解析为比赛中的题目
  const inContest = parseProblemInContest(url)
  if (inContest) {
    const r = await axios.get(`${BASE}/api/problem/getProblemInContest`, {
      params: { contestId: inContest.contestId, displayOrder: inContest.displayOrder },
      headers: makeHeaders(token),
      validateStatus: s => s < 600,
      timeout: 10000,
    })

    if (r.status !== 200) {
      throw new Error(`获取题目失败，HTTP ${r.status}`)
    }

    const prob = r.data
    const tags = (prob.tags || []).map(t => t.name)

    return {
      title: prob.meta.title,
      content: `> ⚠️ Lyrio 框架的题目内容通过前端 SPA 加载，API 暂不暴露完整题面。\n> 请访问 [原题链接](${url}) 查看完整题目。\n\n`,
      problemId: prob.meta.id,
      tags,
      statistics: prob.statistics,
    }
  }

  // 尝试解析为独立题目
  const standaloneId = parseStandaloneProblemId(url)
  if (standaloneId) {
    const r = await axios.get(`${BASE}/api/problem/getProblem`, {
      params: { id: Number(standaloneId) },
      headers: makeHeaders(token),
      validateStatus: s => s < 600,
      timeout: 10000,
    })

    if (r.status !== 200) {
      throw new Error(`获取题目失败，HTTP ${r.status}`)
    }

    const prob = r.data

    return {
      title: prob.meta.title,
      content: `> ⚠️ Lyrio 框架的题目内容通过前端 SPA 加载，API 暂不暴露完整题面。\n> 请访问 [原题链接](${url}) 查看完整题目。\n\n`,
      problemId: prob.meta.id,
    }
  }

  throw new Error('无法从 URL 中解析 Lyrio 题目地址')
}

/**
 * 获取比赛列表（用于批量导入）
 * 返回: { contests: [{ id, name, startTime, endTime, mode }] }
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
 * 返回: { problems: [{ id, title, tags[], statistics }], count }
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
