import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

const phone = process.env.HTOJ_PHONE
const pwd = process.env.HTOJ_PWD
const cid = '22666004139776'
const pid = '22663958373760'   // numeric pid (used as "problemId" param)

const loginR = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
  phoneNumber: xl(phone), password: xl(pwd), countryCode: '86', short: false
}, {
  headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
})
const token = loginR.data.data.token
console.log('Login OK')

const h = {
  'Authorization': token,
  'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0', 'app_id': 'com.hetao101.oj',
  'Hetao-Oj-Zone': 'cpp', 'Origin': 'https://htoj.com.cn', 'Referer': 'https://htoj.com.cn/',
}

// THE KEY API ENDPOINT: htoj-biz-gateway/api/get-problem-detail WITH problemId (numeric) + cid
const url = `https://api.htoj.com.cn/api/htoj-biz-gateway/api/get-problem-detail?problemId=${pid}&cid=${cid}`
console.log('\nCalling:', url)
try {
  const r = await axios.get(url, { headers: h, timeout: 10000 })
  console.log('\nStatus:', r.status)
  console.log('errCode:', r.data.errCode)
  if (r.data.errCode === 0) {
    console.log('\n✅ SUCCESS! Full data:')
    console.log(JSON.stringify(r.data.data, null, 2).slice(0, 5000))
  } else {
    console.log('Response:', JSON.stringify(r.data))
  }
} catch(e) {
  console.log('Error:', e.response?.status, JSON.stringify(e.response?.data))
}

// Also test without cid (for non-contest problems)
const urlNoCid = `https://api.htoj.com.cn/api/htoj-biz-gateway/api/get-problem-detail?problemId=${pid}`
console.log('\n\nCalling without cid:', urlNoCid)
try {
  const r2 = await axios.get(urlNoCid, { headers: h, timeout: 10000 })
  console.log('Status:', r2.status, 'errCode:', r2.data.errCode)
} catch(e) {
  console.log('Error:', e.response?.status, JSON.stringify(e.response?.data))
}
