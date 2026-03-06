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
      'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
      'app_id': 'com.hetao101.oj', 'Content-Type': 'application/json'
    }
  })
  return r.data.data.token
}

async function testApi(token, cid = '22666004139776') {
  const baseHeaders = {
    'Authorization': token,
    'HT_PLATFORM': 'htojWeb',
    'HT_SYSTEM': 'web',
    'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://htoj.com.cn',
    'Referer': 'https://htoj.com.cn/',
  }

  const tests = [
    ['api.htoj.com.cn + gateway + Origin/Referer', 
     `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`, baseHeaders],
    ['api.htoj.com.cn + direct oj path + Origin/Referer', 
     `https://api.htoj.com.cn/oj/contest/problem/list?cid=${cid}`, baseHeaders],
    ['api.htoj.com.cn + with Hetao-Oj-Zone', 
     `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`, 
     {...baseHeaders, 'Hetao-Oj-Zone': 'national'}],
    // Try oj.htcdn-a.com (CDN variant found in bundle)
    ['oj.htcdn-a.com + gateway', 
     `https://oj.htcdn-a.com/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`, baseHeaders],
    // Contest detail
    ['contest detail', 
     `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/detail?cid=${cid}`, baseHeaders],
    // Try GET contest list
    ['contest list', 
     `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/list?pageNum=1&pageSize=10`, baseHeaders],
  ]

  for (const [label, url, headers] of tests) {
    try {
      const r = await axios.get(url, { headers, timeout: 8000 })
      const isHtml = typeof r.data === 'string' && r.data.includes('<html')
      const body = typeof r.data === 'string' ? r.data.slice(0, 300) : JSON.stringify(r.data).slice(0, 300)
      console.log(`✅ ${label}`)
      console.log(`   Status: ${r.status}, isHtml: ${isHtml}`)
      if (!isHtml) console.log(`   Body: ${body}`)
    } catch(e) {
      const status = e.response?.status
      console.log(`❌ ${label}: HTTP ${status || e.message}`)
      if (e.response?.data) {
        const d = typeof e.response.data === 'string' ? e.response.data.slice(0, 200) : JSON.stringify(e.response.data).slice(0, 200)
        console.log(`   Response: ${d}`)
      }
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
