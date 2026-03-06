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

async function tryPost(label, body, extra = {}) {
  const h = { ...BASE_H, ...extra }
  try {
    const r = await axios.post(`${AUTH_BASE}/login/v2/account/oauth/password`, body, { headers: h, timeout: 10000 })
    console.log(`[${label}]`, r.status, JSON.stringify(r.data).slice(0, 300))
    return r.data
  } catch (e) {
    console.log(`[${label}] ERR`, e.response?.status, JSON.stringify(e.response?.data).slice(0, 200))
    return null
  }
}

async function main() {
  const PHONE = process.env.HTOJ_PHONE
  const PWD = process.env.HTOJ_PWD

  // XOR encoded without body wrapper
  await tryPost('xl-direct', {
    phoneNumber: xl(PHONE),
    password: xl(PWD),
    countryCode: '86',
    short: false
  })

  // XOR encoded with buf - try Buffer approach to handle binary chars
  const encPwd = Buffer.from(PWD).map(b => b ^ 101).toString('latin1')
  const encPhone = Buffer.from(PHONE).map(b => b ^ 101).toString('latin1')
  await tryPost('xl-buf-latin1', {
    phoneNumber: encPhone,
    password: encPwd,
    countryCode: '86',
  })

  // XOR encoded, base64 output
  const encPwdB64 = Buffer.from(PWD.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')).toString('base64')
  const encPhoneB64 = Buffer.from(PHONE.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')).toString('base64')
  await tryPost('xl-base64', {
    phoneNumber: encPhoneB64,
    password: encPwdB64,
    countryCode: '86',
  })

  // Maybe no encoding, but maybe OJ/non-OJ platform needs different app_id
  await tryPost('plain-diff-app', 
    { phoneNumber: PHONE, password: PWD, countryCode: '86' },
    { 'app_id': 'com.hetao101.app' }
  )

  // Hetao-Oj-Zone header
  await tryPost('plain+zone', 
    { phoneNumber: PHONE, password: PWD, countryCode: '86' },
    { 'Hetao-Oj-Zone': 'cpp' }
  )
}

main().catch(console.error)
