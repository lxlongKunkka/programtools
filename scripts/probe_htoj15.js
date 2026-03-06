import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function login(phone, pwd) {
  const r = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl(phone),
    password: xl(pwd),
    countryCode: '86',
    short: false
  }, {
    headers: {
      'HT_PLATFORM': 'htojWeb',
      'HT_SYSTEM': 'web',
      'HT_VERSION': '1.0.0',
      'app_id': 'com.hetao101.oj',
      'Content-Type': 'application/json'
    }
  })
  return r.data.data.token
}

async function testApi(token, cid = '22666004139776') {
  const HEADERS = {
    'Authorization': token,
    'HT_PLATFORM': 'htojWeb',
    'HT_SYSTEM': 'web',
    'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }

  const tests = [
    // Using api.htoj.com.cn directly (Of variable)
    `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`,
    `https://api.htoj.com.cn/oj/contest/problem/list?cid=${cid}`,
    `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/detail?cid=${cid}`,
    `https://api.htoj.com.cn/oj/contest/detail?cid=${cid}`,
    // Try without JWT in header, just query params
    `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}&token=${token}`,
  ]

  for (const url of tests) {
    try {
      const r = await axios.get(url, { headers: HEADERS, timeout: 8000 })
      const body = typeof r.data === 'string' ? r.data.slice(0, 300) : JSON.stringify(r.data).slice(0, 300)
      const isHtml = typeof r.data === 'string' && r.data.includes('<html')
      console.log(`✅ ${url.split('htoj.com.cn')[1]}`)
      console.log(`   Status: ${r.status}, HTML: ${isHtml}`)
      if (!isHtml) console.log(`   Body: ${body}`)
    } catch(e) {
      console.log(`❌ ${url.split('htoj.com.cn')[1] || url}`)
      console.log(`   ${e.response ? `HTTP ${e.response.status}` : e.message}`)
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
  
  await testApi(token)
}

main().catch(console.error)
