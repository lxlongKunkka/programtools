import http2 from 'http2'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

function loginAxios(phone, pwd) {
  return import('axios').then(({ default: axios }) =>
    axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
      phoneNumber: xl(phone),
      password: xl(pwd),
      countryCode: '86', short: false
    }, {
      headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
    }).then(r => r.data.data.token)
  )
}

function http2Get(host, path, headers) {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`)
    client.on('error', reject)
    
    const req = client.request({
      ':method': 'GET',
      ':path': path,
      ':authority': host,
      ':scheme': 'https',
      ...headers
    })
    
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      const status = req.sentHeaders[':status'] || req.headers?.[':status']
      client.close()
      resolve({ data, headers: req.sentHeaders })
    })
    req.on('error', err => { client.close(); reject(err) })
    req.end()
    
    req.on('response', (responseHeaders) => {
      req._responseHeaders = responseHeaders
    })
  })
}

function http2GetWithResponse(host, path, headers) {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`)
    client.on('error', reject)
    
    const reqHeaders = {
      ':method': 'GET',
      ':path': path,
      ':authority': host,
      ':scheme': 'https',
      ...headers
    }
    
    const req = client.request(reqHeaders)
    let responseHeaders = {}
    let data = ''
    
    req.on('response', (hdrs) => { responseHeaders = hdrs })
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      client.close()
      resolve({ status: responseHeaders[':status'], data, responseHeaders })
    })
    req.on('error', err => { client.close(); reject(err) })
    req.end()
  })
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  if (!phone || !pwd) { console.error('需要 HTOJ_PHONE 和 HTOJ_PWD'); process.exit(1) }
  
  console.log('Logging in...')
  const token = await loginAxios(phone, pwd)
  console.log('Token:', token.slice(0, 50) + '...\n')

  const cid = '22666004139776'
  const path = `/api/htoj-biz-gateway/oj/contest/problem/list?cid=${cid}`
  
  const reqHeaders = {
    'authorization': token,
    'ht_platform': 'htojWeb',
    'ht_system': 'web',
    'ht_version': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'content-type': 'application/json',
    'accept': '*/*',
    'origin': 'https://htoj.com.cn',
    'referer': 'https://htoj.com.cn/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'sec-fetch-dest': 'empty',
    'accept-language': 'zh-CN,zh;q=0.9',
  }

  console.log('=== Test: HTTP/2 direct to api.htoj.com.cn ===')
  try {
    const { status, data, responseHeaders } = await http2GetWithResponse('api.htoj.com.cn', path, reqHeaders)
    const isHtml = data.includes('<html')
    console.log('Status:', status, 'isHtml:', isHtml)
    console.log('Response headers:', JSON.stringify(responseHeaders))
    console.log('Data:', data.slice(0, 400))
  } catch(e) {
    console.log('Error:', e.message)
  }

  // Also try without Origin/Referer
  console.log('\n=== Test: HTTP/2 without Origin/Referer ===')
  try {
    const h = { ...reqHeaders }
    delete h['origin']
    delete h['referer']
    const { status, data } = await http2GetWithResponse('api.htoj.com.cn', path, h)
    console.log('Status:', status)
    console.log('Data:', data.slice(0, 400))
  } catch(e) {
    console.log('Error:', e.message)
  }
}

main().catch(console.error)
