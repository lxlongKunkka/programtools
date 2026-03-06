import axios from 'axios'

const AUTH_BASE = 'https://api.hetao101.com'
const OJ_BASE = 'https://htoj.com.cn'
const GW = '/api/htoj-biz-gateway'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function htojLogin(phone, pwd) {
  const h = {
    'HT_PLATFORM': 'htojWeb',
    'HT_SYSTEM': 'web',
    'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': OJ_BASE + '/cpp/',
    'Origin': OJ_BASE,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
  const r = await axios.post(`${AUTH_BASE}/login/v2/account/oauth/password`, {
    phoneNumber: xl(phone), password: xl(pwd), countryCode: '86', short: false
  }, { headers: h, timeout: 10000 })
  return r.data?.data?.token
}

async function ojGet(path, token) {
  const h = {
    'HT_PLATFORM': 'htojWeb',
    'HT_SYSTEM': 'web',
    'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'Authorization': token,
    'Hetao-Oj-Zone': 'cpp',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': OJ_BASE + '/cpp/',
    'X-Requested-With': 'XMLHttpRequest',
  }
  try {
    const r = await axios.get(path.startsWith('http') ? path : `${OJ_BASE}${path}`, {
      headers: h, timeout: 10000
    })
    const isHtml = typeof r.data === 'string' && r.data.includes('<!DOCTYPE')
    return { status: r.status, data: r.data, isHtml }
  } catch (e) {
    return { status: e.response?.status, data: e.response?.data, error: e.message }
  }
}

async function main() {
  const PHONE = process.env.HTOJ_PHONE
  const PWD = process.env.HTOJ_PWD

  const token = await htojLogin(PHONE, PWD)
  console.log('Token:', token?.slice(0, 50))

  const cid = '22666004139776'

  // Try via htoj.com.cn GW (with XHR+auth)
  console.log('\n=== htoj.com.cn gateway (with auth) ===')
  for (const path of [
    `${GW}/oj/contest/problem/list?cid=${cid}`,
    `${GW}/oj/contest/detail?cid=${cid}`,
  ]) {
    const r = await ojGet(path, token)
    console.log(path.split('?')[0], '->', r.status, r.isHtml ? '[HTML]' : JSON.stringify(r.data).slice(0, 400))
  }

  // Try directly via api.hetao101.com for OJ data
  console.log('\n=== api.hetao101.com OJ paths ===')
  for (const path of [
    `${AUTH_BASE}/oj/contest/problem/list?cid=${cid}`,
    `${AUTH_BASE}/oj/contest/detail?cid=${cid}`,
    `${AUTH_BASE}${GW}/oj/contest/problem/list?cid=${cid}`,
  ]) {
    const r = await ojGet(path, token)
    console.log(path.split('?')[0], '->', r.status, r.isHtml ? '[HTML]' : JSON.stringify(r.data).slice(0, 400))
  }
}

main().catch(console.error)
