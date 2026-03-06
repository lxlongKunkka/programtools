import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

const phone = process.env.HTOJ_PHONE
const pwd = process.env.HTOJ_PWD
const cid = '22666004139776'
const pid = '22663958373760'

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
  'Hetao-Oj-Zone': 'cpp', 'Origin': 'https://htoj.com.cn',
}

// 1. Get FULL response from get-contest-problem (no truncation)
const r = await axios.get(`https://api.htoj.com.cn/api/code-community/api/get-contest-problem?cid=${cid}&currentPage=1&limit=20`, { headers: h })
console.log('\n=== FULL get-contest-problem response ===')
console.log(JSON.stringify(r.data, null, 2))

// 2. Also check get-user-info from biz-gateway (what fields does user have?)
const r2 = await axios.get('https://api.htoj.com.cn/api/htoj-biz-gateway/api/get-user-info', { headers: h })
console.log('\n=== FULL get-user-info response ===')
console.log(JSON.stringify(r2.data, null, 2).slice(0, 2000))

// 3. Check if there is an endpoint for contest problem download or answer
const morePaths = [
  `https://api.htoj.com.cn/api/code-community/api/get-contest-problem?cid=${cid}&pid=${pid}&type=detail`,
  `https://api.htoj.com.cn/api/code-community/api/get-contest-problem-answer?cid=${cid}&pid=${pid}`,
  `https://api.htoj.com.cn/api/code-community/api/get-contest-answer?cid=${cid}`,
  `https://api.htoj.com.cn/api/code-community/api/contest-problem-info?cid=${cid}&pid=${pid}`,
]
console.log('\n=== Testing more paths ===')
for (const url of morePaths) {
  try {
    const r = await axios.get(url, { headers: h, timeout: 6000 })
    const d = r.data
    const str = JSON.stringify(d)
    const hasContent = ['inputDesc','outputDesc','sampleCase','content','timeLimit','input','output'].filter(k => str.includes(k)).length > 2
    const path = url.replace('https://api.htoj.com.cn','').split('?')[0]
    console.log(`${hasContent ? '🎯' : d.errCode === 0 ? '✅' : '❌'} ${path}: errCode=${d.errCode}${hasContent ? ' HAS CONTENT: ' + str.slice(0,500) : ''}`)
  } catch(e) {
    const path = url.replace('https://api.htoj.com.cn','').split('?')[0]
    console.log(`❌ ${path}: ${e.response?.status} ${JSON.stringify(e.response?.data).slice(0,80)}`)
  }
}
