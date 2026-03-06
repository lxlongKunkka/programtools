import axios from 'axios'

const AUTH_BASE = 'https://api.hetao101.com'

async function tryLogin(variant, body, extraHeaders = {}) {
  const h = {
    'HT_PLATFORM': 'htojWeb',
    'HT_SYSTEM': 'web',
    'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://htoj.com.cn/cpp/',
    'Origin': 'https://htoj.com.cn',
    'Content-Type': 'application/json',
    ...extraHeaders
  }
  try {
    const r = await axios.post(`${AUTH_BASE}/login/v2/account/oauth/password`, body, {
      headers: h, timeout: 10000
    })
    console.log(`[${variant}]`, r.status, JSON.stringify(r.data).slice(0, 200))
  } catch (e) {
    console.log(`[${variant}]`, e.response?.status, JSON.stringify(e.response?.data).slice(0, 200))
  }
}

async function main() {
  const PHONE = process.env.HTOJ_PHONE
  const PWD = process.env.HTOJ_PWD

  // Try various body structures
  await tryLogin('plain-minimal', { phoneNumber: PHONE, password: PWD })
  await tryLogin('plain+country', { phoneNumber: PHONE, password: PWD, countryCode: '86' })
  await tryLogin('plain+country+short', { phoneNumber: PHONE, password: PWD, countryCode: '86', short: false })
  await tryLogin('plain+all', { phoneNumber: PHONE, password: PWD, countryCode: '86', short: false, loginSource: 'ACCOUNT_PASSWORD' })
  
  // Try with phone as string with +86 prefix
  await tryLogin('with+86', { phoneNumber: `+86${PHONE}`, password: PWD, countryCode: '86' })
  
  // Try alternative content-type
  await tryLogin('form-encoded', 
    new URLSearchParams({ phoneNumber: PHONE, password: PWD, countryCode: '86' }).toString(),
    { 'Content-Type': 'application/x-www-form-urlencoded' }
  )
}

main().catch(console.error)
