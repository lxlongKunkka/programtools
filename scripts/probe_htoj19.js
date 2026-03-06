import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function login(phone, pwd) {
  const r = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl(phone),
    password: xl(pwd),
    countryCode: '86', short: false
  }, {
    headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
  })
  return r.data.data.token
}

async function testHeaders(token, cid = '22666004139776') {
  const url = `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`

  const tests = [
    // Minimal: just Authorization
    ['Only Authorization', { 'Authorization': token }],
    // With Hetao-Oj-Zone
    ['Auth + Zone:national', { 'Authorization': token, 'Hetao-Oj-Zone': 'national' }],
    // No Authorization but with all common headers
    ['No Auth, only COMMON_HEADERS', { 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj' }],
    // All common headers + auth + zone
    ['All common + zone:national', {
      'Authorization': token, 'Hetao-Oj-Zone': 'national',
      'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj',
      'Origin': 'https://htoj.com.cn', 'Referer': 'https://htoj.com.cn/'
    }],
    // Different zone values
    ['zone:province', { 'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Hetao-Oj-Zone':'province','Origin':'https://htoj.com.cn' }],
    ['zone:city', { 'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Hetao-Oj-Zone':'city','Origin':'https://htoj.com.cn' }],
    // Check certificate/WAF response on completely different path
    ['Different path: user info', { 'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Hetao-Oj-Zone':'national','Origin':'https://htoj.com.cn' }],
  ]

  for (const [label, headers] of tests) {
    const targetUrl = label.includes('user info')
      ? `https://api.htoj.com.cn/api/htoj-biz-gateway/uc/user/info`
      : url
    try {
      const r = await axios.get(targetUrl, { headers, timeout: 8000 })
      const isHtml = typeof r.data === 'string' && r.data.includes('<html')
      console.log(`✅ ${label}: ${r.status} isHtml:${isHtml}`)
      if (!isHtml) console.log(`   ${JSON.stringify(r.data).slice(0, 200)}`)
    } catch(e) {
      const d = e.response?.data ? JSON.stringify(e.response.data).slice(0, 100) : e.message
      console.log(`❌ ${label}: ${e.response?.status} - ${d}`)
    }
  }

  // Check what /api/htoj-biz-gateway/uc/user/info returns (user info is always accessible)
  console.log('\n=== All path variants for user info (should be accessible to any logged-in user) ===')
  const userPaths = [
    'https://api.htoj.com.cn/api/htoj-biz-gateway/uc/user/info',
    'https://api.htoj.com.cn/uc/user/info',
    'https://api.hetao101.com/uc/user/info',
    'https://api.hetao101.com/api/htoj-biz-gateway/uc/user/info',
  ]
  const commonH = { 'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Hetao-Oj-Zone':'national','Origin':'https://htoj.com.cn' }
  for (const p of userPaths) {
    try {
      const r = await axios.get(p, { headers: commonH, timeout: 6000 })
      const isHtml = typeof r.data === 'string' && r.data.includes('<html')
      console.log(`✅ ${p}: ${r.status}`)
      if (!isHtml) console.log(`   ${JSON.stringify(r.data).slice(0, 200)}`)
    } catch(e) {
      console.log(`❌ ${p}: ${e.response?.status} ${JSON.stringify(e.response?.data).slice(0, 100)}`)
    }
  }
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  if (!phone || !pwd) { console.error('需要 HTOJ_PHONE 和 HTOJ_PWD'); process.exit(1) }
  console.log('Logging in...')
  const token = await login(phone, pwd)
  console.log('Token:', token.slice(0, 50) + '...\n')
  await testHeaders(token)
}

main().catch(console.error)
