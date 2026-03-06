import axios from 'axios'
import https from 'https'

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
  const HEADERS = {
    'Authorization': token,
    'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://htoj.com.cn',
    'Referer': 'https://htoj.com.cn/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }

  // Test hetao101.com OJ endpoints
  const tests = [
    `https://api.hetao101.com/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`,
    `https://api.hetao101.com/oj/contest/problem/list?cid=${cid}`,
    `https://api.hetao101.com/oj/contest/detail?cid=${cid}`,
    // Maybe the gateway path at hetao101
    `https://api.hetao101.com/htoj-biz/oj/contest/problem/list?cid=${cid}`,
    // Try contest API without /api path
    `https://api.htoj.com.cn/contest/problem/list?cid=${cid}`,
    // What about gwapi or other gw patterns?
    `https://api.htoj.com.cn/gw/oj/contest/problem/list?cid=${cid}`,
    // What about GET to the normal htoj.com.cn, but with the JSON Accept that forces Nuxt to use API handler?
    `https://htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}&_nuxt=0`,
  ]

  for (const url of tests) {
    try {
      const r = await axios.get(url, { 
        headers: HEADERS, 
        timeout: 8000,
        // Try with HTTP/2 equivalent settings
        httpsAgent: new https.Agent({ keepAlive: true })
      })
      const isHtml = typeof r.data === 'string' && r.data.includes('<html')
      console.log(`✅ ${url.slice(8, 60)}...`)
      console.log(`   Status: ${r.status}, isHtml: ${isHtml}`)
      if (!isHtml) console.log(`   Data: ${JSON.stringify(r.data).slice(0, 300)}`)
    } catch(e) {
      const d = e.response?.data ? JSON.stringify(e.response.data).slice(0, 150) : e.message
      console.log(`❌ ${url.slice(8, 60)}: HTTP ${e.response?.status || 'ERR'} - ${d}`)
    }
  }

  // Also: check DNS to see if api.htoj.com.cn is publicly accessible
  console.log('\n=== DNS check for api.htoj.com.cn ===')
  const { Resolver } = await import('dns/promises')
  const resolver = new Resolver()
  try {
    const addrs = await resolver.resolve('api.htoj.com.cn')
    console.log('IP addresses:', addrs)
  } catch(e) {
    console.log('DNS error:', e.message)
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
