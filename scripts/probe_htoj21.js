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

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'

  console.log('Logging in...')
  const token = await login(phone, pwd)
  console.log('Token:', token.slice(0, 40) + '...\n')

  const baseHeaders = {
    'Authorization': token,
    'HT_PLATFORM': 'htojWeb',
    'HT_SYSTEM': 'web',
    'HT_VERSION': '1.0.0',
    'app_id': 'com.hetao101.oj',
    'Hetao-Oj-Zone': 'cpp',
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'Origin': 'https://htoj.com.cn',
    'Referer': `https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Dest': 'empty',
  }

  const endpoints = [
    `/api/code-community/api/get-contest-info?cid=${cid}`,
    `/api/code-community/api/get-problem-list?cid=${cid}`,
    `/api/code-community/api/get-contest-detail?cid=${cid}`,
    `/api/code-community/api/contest-info?cid=${cid}`,
    `/api/code-community/api/problem-list?cid=${cid}`,
    // These were the ACTUAL calls seen in browser:
    `/api/code-community/api/get-contest-info?cid=${cid}&domain=htoj.com.cn`,
    `/api/code-community/api/get-problem-list?cid=${cid}&domain=htoj.com.cn`,
  ]

  for (const path of endpoints) {
    try {
      const r = await axios.get(`https://api.htoj.com.cn${path}`, { 
        headers: baseHeaders, 
        timeout: 8000 
      })
      const isHtml = typeof r.data === 'string' && r.data.includes('<html')
      console.log(`✅ ${path.split('?')[0].split('/').pop()} [${r.status}]: ${isHtml ? 'HTML' : JSON.stringify(r.data).slice(0, 300)}`)
    } catch(e) {
      const d = e.response?.data ? JSON.stringify(e.response.data).slice(0, 150) : e.message
      console.log(`❌ ${path.split('?')[0].split('/').pop()} [${e.response?.status || 'ERR'}]: ${d}`)
    }
  }
}

main().catch(console.error)
