import axios from 'axios'

const AUTH_BASE = 'https://api.hetao101.com'
const OJ_BASE = 'https://htoj.com.cn'
const GW = '/api/htoj-biz-gateway'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

const BASE_H = {
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

async function main() {
  const PHONE = process.env.HTOJ_PHONE
  const PWD = process.env.HTOJ_PWD

  // Login
  const loginResp = await axios.post(`${AUTH_BASE}/login/v2/account/oauth/password`, {
    phoneNumber: xl(PHONE),
    password: xl(PWD),
    countryCode: '86',
    short: false
  }, { headers: BASE_H, timeout: 10000 })
  
  console.log('Login full response:')
  console.log(JSON.stringify(loginResp.data, null, 2))
  
  // Extract token - might be in response headers or in data
  const token = loginResp.data?.data?.token || loginResp.headers?.authorization || loginResp.headers?.['x-token']
  console.log('\nToken from data:', loginResp.data?.data?.token?.slice(0, 50))
  console.log('Response headers:', JSON.stringify(loginResp.headers, null, 2).slice(0, 500))
  
  if (!token) {
    console.log('\nNo token in data. Maybe need 2-step auth?')
    console.log('Full data keys:', Object.keys(loginResp.data?.data || {}))
    return
  }

  // Try getting contest problem list with token
  console.log('\n=== Contest with token ===')
  const cid = '22666004139776'
  try {
    const r = await axios.get(`${OJ_BASE}${GW}/oj/contest/problem/list?cid=${cid}`, {
      headers: { ...BASE_H, 'Authorization': token },
      timeout: 10000
    })
    const isHtml = typeof r.data === 'string' && r.data.includes('<!DOCTYPE')
    console.log('Status:', r.status, 'isHtml:', isHtml)
    if (!isHtml) console.log(JSON.stringify(r.data).slice(0, 600))
  } catch (e) {
    console.log('Error:', e.response?.status, JSON.stringify(e.response?.data).slice(0, 200))
  }
}

main().catch(console.error)
