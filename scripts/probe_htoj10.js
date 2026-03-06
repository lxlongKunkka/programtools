import axios from 'axios'

const AUTH_BASE = 'https://api.hetao101.com'
const OJ_BASE = 'https://htoj.com.cn'
const GW = '/api/htoj-biz-gateway'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

const COMMON_HEADERS = {
  'HT_PLATFORM': 'htojWeb',
  'HT_SYSTEM': 'web',
  'HT_VERSION': '1.0.0',
  'app_id': 'com.hetao101.oj',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': OJ_BASE + '/cpp/',
  'Origin': OJ_BASE,
  'Accept': 'application/json, text/plain, */*',
}

async function post(base, path, body, token) {
  const h = { ...COMMON_HEADERS, 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = token
  try {
    const r = await axios.post(`${base}${path}`, body, { headers: h, timeout: 10000 })
    return { ok: true, status: r.status, data: r.data }
  } catch (e) {
    return { ok: false, status: e.response?.status, data: e.response?.data, msg: e.message }
  }
}

async function get(base, path, token) {
  const h = { ...COMMON_HEADERS }
  if (token) h['Authorization'] = token
  try {
    const r = await axios.get(`${base}${path}`, { headers: h, timeout: 10000 })
    const isHtml = typeof r.data === 'string' && r.data.includes('<!DOCTYPE')
    return { ok: true, status: r.status, data: r.data, isHtml }
  } catch (e) {
    return { ok: false, status: e.response?.status, data: e.response?.data, msg: e.message }
  }
}

async function main() {
  const PHONE = process.env.HTOJ_PHONE
  const PWD = process.env.HTOJ_PWD

  // Encode credentials with xl()
  const encPhone = xl(PHONE)
  const encPwd = xl(PWD)
  console.log('Encoded phone length:', encPhone.length, 'pwd length:', encPwd.length)

  // 1. Login with correct endpoint and encoded credentials
  console.log('\n=== Login /login/v2/account/oauth/password ===')
  const loginBody = { 
    body: { 
      phoneNumber: encPhone, 
      password: encPwd, 
      countryCode: '86',
      short: false
    }
  }
  const r = await post(AUTH_BASE, '/login/v2/account/oauth/password', loginBody)
  console.log('Status:', r.status)
  console.log('Data:', JSON.stringify(r.data).slice(0, 500))
  
  let token = r.ok && r.data?.data?.token ? r.data.data.token : null
  if (token) {
    console.log('\n✅ TOKEN:', token.slice(0, 50))
  } else {
    console.log('\nNo token. Trying plain password (no xl)...')
    const r2 = await post(AUTH_BASE, '/login/v2/account/oauth/password', {
      body: { phoneNumber: PHONE, password: PWD, countryCode: '86' }
    })
    console.log('Status:', r2.status, 'Data:', JSON.stringify(r2.data).slice(0, 300))
    if (r2.ok && r2.data?.data?.token) token = r2.data.data.token
  }

  if (!token) { console.log('Cannot get token'); return }

  // 2. Contest problem list - try via OJ gateway  
  console.log('\n=== Contest Problem List ===')
  const cid = '22666004139776'
  const cp = await get(OJ_BASE, `${GW}/oj/contest/problem/list?cid=${cid}`, token)
  console.log('Status:', cp.status, 'IsHTML:', cp.isHtml)
  if (!cp.isHtml) console.log('Data:', JSON.stringify(cp.data).slice(0, 800))

  // 3. Try contest problem list via the auth API base  
  console.log('\n=== Contest via api.hetao101.com ===')
  const cp2 = await get(AUTH_BASE, `/oj/contest/problem/list?cid=${cid}`, token)
  console.log('Status:', cp2.status, 'IsHTML:', cp2.isHtml)
  if (!cp2.isHtml) console.log('Data:', JSON.stringify(cp2.data).slice(0, 500))

  // 4. Problem detail - just test getting something
  console.log('\n=== User info ===')
  const ui = await get(AUTH_BASE, `/oj/user/info`, token)
  console.log('Status:', ui.status, 'Data:', JSON.stringify(ui.data).slice(0, 300))
}

main().catch(console.error)
