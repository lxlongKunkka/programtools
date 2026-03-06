import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

const phone = process.env.HTOJ_PHONE
const pwd = process.env.HTOJ_PWD
const cid = '22666004139776'
const pid = '22663958373760'
const problemId = 'P11715'

const loginR = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
  phoneNumber: xl(phone), password: xl(pwd), countryCode: '86', short: false
}, {
  headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
})
const token = loginR.data.data.token
console.log('Login OK')

const h = {
  'Authorization': token,
  'HT_PLATFORM': 'htojWeb',
  'HT_SYSTEM': 'web',
  'HT_VERSION': '1.0.0',
  'app_id': 'com.hetao101.oj',
  'Hetao-Oj-Zone': 'cpp',
  'Origin': 'https://htoj.com.cn',
  'Referer': 'https://htoj.com.cn/',
}

const base = 'https://api.htoj.com.cn/api/code-community/api'

// 1. Check what get-contest-problem returns with pid param (was errCode=0)
console.log('\n--- get-contest-problem with pid ---')
const r1 = await axios.get(`${base}/get-contest-problem?cid=${cid}&pid=${pid}`, { headers: h })
console.log(JSON.stringify(r1.data, null, 2).slice(0, 3000))

// 2. Check get-problem-detail with problemId (was errCode=500)
console.log('\n--- get-problem-detail?problemId=P11715 ---')
const r2 = await axios.get(`${base}/get-problem-detail?problemId=${problemId}`, { headers: h })
console.log(JSON.stringify(r2.data, null, 2).slice(0, 1000))

// 3. Try get-problem-detail with cid+pid (different combinations since pid alone is 403)
// but what if it's only blocked without cid?
console.log('\n--- get-problem-detail?problemId=P11715&cid=' + cid + ' ---')
try {
  const r3 = await axios.get(`${base}/get-problem-detail?problemId=${problemId}&cid=${cid}`, { headers: h })
  console.log(JSON.stringify(r3.data, null, 2).slice(0, 2000))
} catch(e) { console.log(e.response?.status, JSON.stringify(e.response?.data)) }

// 4. Try other short problem IDs (other problems in the contest)
// From get-contest-problem: P11716, P11717, P11718
for (const pid_ of ['P11716', 'P11717', 'P11718']) {
  try {
    const r = await axios.get(`${base}/get-problem-detail?problemId=${pid_}`, { headers: h })
    const str = JSON.stringify(r.data)
    const hasContent = ['inputDesc','outputDesc','sampleCase','content'].some(k => str.includes(k))
    console.log(`\n--- get-problem-detail?problemId=${pid_}: errCode=${r.data.errCode} ${hasContent ? '🎯 HAS CONTENT' : ''}`)
    if (hasContent) {
      console.log(str.slice(0, 2000))
    }
  } catch(e) { console.log(`get-problem-detail ${pid_}:`, e.response?.status) }
}

// 5. Search for problem on a non-contest page (the warehouse)
console.log('\n--- get-problem-list?pid=' + pid + ' ---')
try {
  const r5 = await axios.get(`${base}/get-problem-list?pid=${pid}`, { headers: h })
  console.log(JSON.stringify(r5.data, null, 2).slice(0, 2000))
} catch(e) { console.log(e.response?.status, JSON.stringify(e.response?.data).slice(0,100)) }

// 6. Try the oj-problem path under code-community
console.log('\n--- Testing more paths ---')
const morePaths = [
  `${base}/oj-problem?problemId=${problemId}`,
  `${base}/get-oj-problem?problemId=${problemId}`,
  `${base}/problem/detail?problemId=${problemId}`,
  `${base}/problem/info?problemId=${problemId}`,
]
for (const url of morePaths) {
  try {
    const r = await axios.get(url, { headers: h, timeout: 6000 })
    const str = JSON.stringify(r.data)
    const hasContent = ['inputDesc','outputDesc','sampleCase','content'].some(k => str.includes(k))
    const short = url.replace(base, '')
    console.log(`${hasContent ? '🎯' : r.data.errCode === 0 ? '✅' : '❌'} ${short}: errCode=${r.data.errCode}${hasContent ? ' ' + str.slice(0,300) : ''}`)
  } catch(e) {
    const short = url.replace(base, '')
    console.log(`❌ ${short}: ${e.response?.status} ${JSON.stringify(e.response?.data||e.message).slice(0,100)}`)
  }
}
