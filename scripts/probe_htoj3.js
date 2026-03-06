import axios from 'axios'

const BASE = 'https://htoj.com.cn'
const GW = '/api/htoj-biz-gateway'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, */*',
  'Referer': 'https://htoj.com.cn/cpp/',
  'Origin': 'https://htoj.com.cn',
}

async function post(path, body) {
  try {
    const r = await axios.post(`${BASE}${path}`, body, {
      headers: { ...headers, 'Content-Type': 'application/json' }, timeout: 10000
    })
    return { ok: true, status: r.status, data: r.data }
  } catch (e) {
    return { ok: false, status: e.response?.status, data: e.response?.data, msg: e.message }
  }
}

async function get(path, token) {
  try {
    const h = { ...headers }
    if (token) h['Authorization'] = `Bearer ${token}`
    const r = await axios.get(`${BASE}${path}`, { headers: h, timeout: 10000 })
    return { ok: true, status: r.status, data: r.data }
  } catch (e) {
    return { ok: false, status: e.response?.status, data: e.response?.data, msg: e.message }
  }
}

async function main() {
  const PHONE = process.env.HTOJ_PHONE
  const PWD = process.env.HTOJ_PWD

  // Try common login paths
  const loginPaths = [
    `${GW}/login/v2/loginByPwd`,
    `${GW}/login/v1/loginByPwd`,
    `${GW}/login/loginByPwd`,
    `${GW}/user/login`,
    `${GW}/api/login`,
  ]

  console.log('=== Testing login paths ===')
  for (const path of loginPaths) {
    const r = await post(path, { phoneNumber: PHONE, password: PWD })
    console.log(path, '->', r.status, JSON.stringify(r.data).slice(0, 200))
  }

  // Also try getting contest info without auth
  console.log('\n=== Test contest API (no auth) ===')
  const contestPaths = [
    `${GW}/oj/contest/info?cid=22666004139776`,
    `${GW}/oj/contest/problem/list?cid=22666004139776`,
    `${GW}/oj/contest/getContestInfo?cid=22666004139776`,
  ]
  for (const path of contestPaths) {
    const r = await get(path)
    console.log(path, '->', r.status, JSON.stringify(r.data).slice(0, 200))
  }
}

main().catch(console.error)
