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
  const url = `https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`

  // Test 1: Full browser-like headers including Sec-Fetch headers
  console.log('\n=== Test 1: Full browser simulation (Sec-Fetch-Mode: cors) ===')
  try {
    const r = await axios.get(url, {
      headers: {
        'Authorization': token,
        'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
        'app_id': 'com.hetao101.oj',
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Origin': 'https://htoj.com.cn',
        'Referer': 'https://htoj.com.cn/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
      },
      timeout: 10000
    })
    console.log('Status:', r.status, 'isHtml:', (typeof r.data === 'string' && r.data.includes('<html')))
    console.log('Data:', JSON.stringify(r.data).slice(0, 300))
  } catch(e) {
    console.log('Error:', e.response?.status, JSON.stringify(e.response?.data).slice(0, 200))
  }

  // Test 2: POST with the same path
  console.log('\n=== Test 2: POST to api.htoj.com.cn ===')
  try {
    const r = await axios.post(`https://api.htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list`, 
      { cid },
      {
        headers: {
          'Authorization': token,
          'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
          'app_id': 'com.hetao101.oj',
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Origin': 'https://htoj.com.cn',
          'Referer': 'https://htoj.com.cn/',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      }
    )
    console.log('Status:', r.status)
    console.log('Data:', JSON.stringify(r.data).slice(0, 300))
  } catch(e) {
    console.log('Error:', e.response?.status, JSON.stringify(e.response?.data).slice(0, 200))
  }

  // Test 3: Try via OPTIONS (check CORS)
  console.log('\n=== Test 3: CORS preflight OPTIONS ===')
  try {
    const r = await axios.options(url, {
      headers: {
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type,ht_platform,ht_system,ht_version,app_id',
        'Origin': 'https://htoj.com.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000
    })
    console.log('Status:', r.status)
    console.log('CORS headers:', {
      'allow-origin': r.headers['access-control-allow-origin'],
      'allow-methods': r.headers['access-control-allow-methods'],
      'allow-headers': r.headers['access-control-allow-headers'],
    })
  } catch(e) {
    console.log('Error:', e.response?.status, JSON.stringify(e.response?.data).slice(0, 200))
    if (e.response?.headers) {
      console.log('Response headers:', Object.fromEntries(Object.entries(e.response.headers).filter(([k]) => k.startsWith('access-control') || k.startsWith('x-'))))
    }
  }

  // Test 4: Try htoj.com.cn with POST to proxy path
  console.log('\n=== Test 4: POST to htoj.com.cn proxy ===')
  try {
    const r = await axios.post(`https://htoj.com.cn/api/htoj-biz-gateway/oj/contest/problem/list`,
      JSON.stringify({ cid }),
      {
        headers: {
          'Authorization': token,
          'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
          'app_id': 'com.hetao101.oj',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000
      }
    )
    const isHtml = typeof r.data === 'string' && r.data.includes('<html')
    console.log('Status:', r.status, 'isHtml:', isHtml)
    if (!isHtml) console.log('Data:', JSON.stringify(r.data).slice(0, 300))
  } catch(e) {
    console.log('Error:', e.response?.status, JSON.stringify(e.response?.data || e.response?.headers).slice(0, 200))
  }
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  if (!phone || !pwd) { console.error('需要 HTOJ_PHONE 和 HTOJ_PWD'); process.exit(1) }
  
  console.log('Logging in...')
  const token = await login(phone, pwd)
  console.log('Token:', token.slice(0, 50) + '...')
  
  await testApi(token)
}

main().catch(console.error)
