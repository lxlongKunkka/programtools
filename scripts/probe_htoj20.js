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

async function testApi(token, cid = '22666004139776') {
  const baseUrl = `https://api.htoj.com.cn/api/htoj-biz-gateway`
  const path = `/oj/contest/problem/list?cid=${cid}`

  const tests = [
    // Try apiSecret: 123 in different header positions
    ['apiSecret as header', {
      'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj',
      'apiSecret': '123', 'Origin': 'https://htoj.com.cn', 'Hetao-Oj-Zone': 'national'
    }],
    ['app_secret: 123', {
      'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj',
      'app_secret': '123', 'Origin': 'https://htoj.com.cn'
    }],
    ['api_secret: 123', {
      'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj',
      'api_secret': '123', 'Origin': 'https://htoj.com.cn'
    }],
    // Try apiSecret in x-api-key or x-api-secret forms
    ['x-api-key: 123', {
      'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj',
      'x-api-key': '123', 'Origin': 'https://htoj.com.cn'
    }],
    ['x-api-secret: 123', {
      'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj',
      'x-api-secret': '123', 'Origin': 'https://htoj.com.cn'
    }],
    // Try both app_id variants
    ['app_id: 123', {
      'Authorization': token, 'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0',
      'app_id': '123', 'Origin': 'https://htoj.com.cn'
    }],
  ]

  for (const [label, headers] of tests) {
    try {
      const r = await axios.get(baseUrl + path, { headers, timeout: 8000 })
      const isHtml = typeof r.data === 'string' && r.data.includes('<html')
      console.log(`✅ ${label}: ${r.status} isHtml:${isHtml}`)
      if (!isHtml) console.log(`   ${JSON.stringify(r.data).slice(0, 300)}`)
    } catch(e) {
      const d = e.response?.data ? JSON.stringify(e.response.data).slice(0, 100) : e.message
      console.log(`❌ ${label}: ${e.response?.status} - ${d}`)
    }
  }
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  if (!phone || !pwd) { console.error('需要 HTOJ_PHONE 和 HTOJ_PWD'); process.exit(1) }
  console.log('Logging in...')
  const token = await login(phone, pwd)
  console.log('Token:', token.slice(0, 40) + '...\n')
  await testApi(token)
}

main().catch(console.error)
