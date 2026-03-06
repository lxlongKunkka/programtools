import axios from 'axios'

const OJ_BASE = 'https://htoj.com.cn'

const COMMON_HEADERS = {
  'HT_PLATFORM': 'htojWeb',
  'HT_SYSTEM': 'web',
  'HT_VERSION': '1.0.0',
  'app_id': 'com.hetao101.oj',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': OJ_BASE + '/cpp/',
  'Origin': OJ_BASE,
  'X-Requested-With': 'XMLHttpRequest',
  'Accept': 'application/json',
  'Content-Type': 'application/json',
}

async function req(method, path, body, extraHeaders = {}) {
  try {
    const h = { ...COMMON_HEADERS, ...extraHeaders }
    const config = { headers: h, timeout: 10000 }
    
    let r
    if (method === 'GET') {
      r = await axios.get(`${OJ_BASE}${path}`, config)
    } else {
      r = await axios.post(`${OJ_BASE}${path}`, body, config)
    }
    const isHtml = typeof r.data === 'string' && r.data.includes('<!DOCTYPE')
    return { ok: true, status: r.status, data: r.data, isHtml }
  } catch (e) {
    return { ok: false, status: e.response?.status, data: e.response?.data, msg: e.message }
  }
}

async function main() {
  const PHONE = process.env.HTOJ_PHONE
  const PWD = process.env.HTOJ_PWD
  const cid = '22666004139776'

  // Try login through htoj.com.cn proxy (not api.hetao101.com directly)
  console.log('=== Login via htoj proxy ===')
  const loginPaths = [
    '/api/htoj-biz-gateway/login/v1/loginByPwd',
    '/api/htoj-biz-gateway/login/v2/loginByPwd',
    '/api/login/loginByPwd',
  ]
  let token = null
  for (const path of loginPaths) {
    const r = await req('POST', path, { phoneNumber: PHONE, password: PWD, countryCode: '86' })
    console.log(path, '->', r.status, r.isHtml ? '[HTML]' : JSON.stringify(r.data).slice(0, 200))
    if (!r.isHtml && r.data?.data?.token) {
      token = r.data.data.token
      console.log('✅ TOKEN:', token.slice(0, 40))
      break
    }
  }

  // Try GET with XHR header
  console.log('\n=== Contest list with XHR header ===')
  const contestPaths = [
    `/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`,
  ]
  for (const path of contestPaths) {
    const r = await req('GET', path, null, token ? { 'Authorization': token } : {})
    console.log(path, '->', r.status, r.isHtml ? '[HTML]' : JSON.stringify(r.data).slice(0, 500))
  }
}

main().catch(console.error)
