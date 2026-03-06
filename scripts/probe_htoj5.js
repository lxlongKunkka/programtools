import axios from 'axios'

const AUTH_BASE = 'https://api.hetao101.com'
const OJ_BASE = 'https://htoj.com.cn'
const GW = '/api/htoj-biz-gateway'

const COMMON_HEADERS = {
  'HT_PLATFORM': 'oj-web',
  'HT_SYSTEM': 'web',
  'HT_VERSION': '1.0.0',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': OJ_BASE + '/cpp/',
  'Origin': OJ_BASE,
}

async function post(base, path, body, extraHeaders = {}) {
  try {
    const r = await axios.post(`${base}${path}`, body, {
      headers: { ...COMMON_HEADERS, 'Content-Type': 'application/json', ...extraHeaders },
      timeout: 10000
    })
    return { ok: true, status: r.status, data: r.data }
  } catch (e) {
    return { ok: false, status: e.response?.status, data: e.response?.data, msg: e.message }
  }
}

async function get(base, path, token) {
  try {
    const h = { ...COMMON_HEADERS, 'Accept': 'application/json' }
    if (token) h['Authorization'] = token
    const r = await axios.get(`${base}${path}`, { headers: h, timeout: 10000 })
    return { ok: true, status: r.status, data: r.data }
  } catch (e) {
    return { ok: false, status: e.response?.status, data: e.response?.data, msg: e.message }
  }
}

async function main() {
  const PHONE = process.env.HTOJ_PHONE
  const PWD = process.env.HTOJ_PWD

  // 1. Try login at api.hetao101.com
  console.log('=== Testing login at api.hetao101.com ===')
  const loginPaths = [
    '/login/v1/loginByPwd',
    '/login/v2/loginByPwd',
    '/login/loginByPwd',
    '/user/login',
  ]
  let token = null
  for (const path of loginPaths) {
    const r = await post(AUTH_BASE, path, { phoneNumber: PHONE, password: PWD, countryCode: '86' })
    const preview = JSON.stringify(r.data).slice(0, 300)
    console.log(path, '->', r.status, preview)
    if (r.ok && r.data?.data?.token) {
      token = r.data.data.token
      console.log('✅ GOT TOKEN:', token.slice(0, 30) + '...')
    }
  }

  if (!token) {
    console.log('\nNo token obtained, trying contest API without auth...')
  }

  // 2. Try contest problem list
  console.log('\n=== Contest problem list ===')
  const cid = '22666004139776'
  const contestPaths = [
    `${GW}/oj/contest/problem/list?cid=${cid}`,
    `${GW}/oj/contest/problemList?cid=${cid}`,
    `${GW}/oj/contest/detail!getProblems?cid=${cid}`,
  ]
  for (const path of contestPaths) {
    const r = await get(OJ_BASE, path, token)
    console.log(path.split('?')[0], '->', r.status, JSON.stringify(r.data).slice(0, 300))
  }
}

main().catch(console.error)
