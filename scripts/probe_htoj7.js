import axios from 'axios'

const AUTH_BASE = 'https://api.hetao101.com'
const OJ_BASE = 'https://htoj.com.cn'
const GW = '/api/htoj-biz-gateway'

const COMMON_HEADERS = {
  'HT_PLATFORM': 'htojWeb',
  'HT_SYSTEM': 'web',
  'HT_VERSION': '1.0.0',
  'app_id': 'com.hetao101.oj',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': OJ_BASE + '/cpp/',
  'Origin': OJ_BASE,
  'Accept': 'application/json, text/plain, */*',
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
    const h = { ...COMMON_HEADERS }
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

  // 1. Login
  console.log('=== Login ===')
  const loginPaths = [
    '/login/v1/loginByPwd',
    '/login/v2/loginByPwd',
  ]
  let token = null
  for (const path of loginPaths) {
    const r = await post(AUTH_BASE, path, { phoneNumber: PHONE, password: PWD, countryCode: '86' })
    console.log(path, '->', r.status, JSON.stringify(r.data).slice(0, 400))
    if (r.ok && r.data?.data?.token) {
      token = r.data.data.token
      console.log('✅ TOKEN:', token.slice(0, 40) + '...')
      break
    }
  }

  if (!token) {
    console.log('No token, stopping.')
    return
  }

  // 2. Get user info
  console.log('\n=== User Info ===')
  const ui = await get(OJ_BASE, `${GW}/api/get-user-info?loginSource=ACCOUNT_PASSWORD&distinguish=1`, token)
  console.log('User:', JSON.stringify(ui.data).slice(0, 300))

  // 3. Get contest problem list
  console.log('\n=== Contest Problems ===')
  const cid = '22666004139776'
  const cp = await get(OJ_BASE, `${GW}/oj/contest/problem/list?cid=${cid}`, token)
  console.log('Status:', cp.status)
  console.log('Data:', JSON.stringify(cp.data).slice(0, 500))
}

main().catch(console.error)
