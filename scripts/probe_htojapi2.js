import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

const phone = process.env.HTOJ_PHONE
const pwd = process.env.HTOJ_PWD
const cid = '22666004139776'
const pid = '22663958373760'   // numeric internal pid
const problemId = 'P11715'     // short alphanumeric

const loginR = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
  phoneNumber: xl(phone), password: xl(pwd), countryCode: '86', short: false
}, {
  headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
})
const token = loginR.data.data.token
console.log('Login OK, token:', token.slice(0,32) + '...')

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
const testUrls = [
  // Single problem in contest
  `${base}/get-contest-problem?cid=${cid}&pid=${pid}`,
  `${base}/get-contest-problem?cid=${cid}&pid=${pid}&currentPage=1&limit=1`,
  // Problem by short ID
  `${base}/get-problem?problemId=${problemId}`,
  `${base}/problem?problemId=${problemId}`,
  `${base}/get-problem-info?problemId=${problemId}`,
  `${base}/problem-info?problemId=${problemId}`,
  `${base}/get-problem-detail?problemId=${problemId}`,
  `${base}/problem-detail?problemId=${problemId}`,
  // Problem by numeric pid
  `${base}/get-problem?pid=${pid}`,
  `${base}/get-problem-info?pid=${pid}`,
  `${base}/problem-detail?pid=${pid}`,
  // Contest-specific problem detail
  `${base}/get-contest-problem-detail?cid=${cid}&pid=${pid}`,
  `${base}/get-contest-problem-info?cid=${cid}&pid=${pid}`,
  `${base}/contest-problem?cid=${cid}&pid=${pid}`,
]

for (const url of testUrls) {
  const short = url.replace(base, '')
  try {
    const r = await axios.get(url, { headers: h, timeout: 8000 })
    const d = r.data
    const str = JSON.stringify(d)
    const hasContent = ['inputDesc','outputDesc','sampleCase','answer','inputSample','outputSample','content'].some(k => str.includes(k))
    console.log(`${hasContent ? '🎯' : r.data.errCode === 0 ? '✅' : '❌'} [${r.status}] ${short}: errCode=${d.errCode} ${hasContent ? 'HAS CONTENT! -> ' + str.slice(0,300) : ''}`)
  } catch(e) {
    const status = e.response?.status
    const msg = e.response?.data ? JSON.stringify(e.response.data).slice(0,100) : e.message.slice(0,60)
    console.log(`❌ [${status||'N/A'}] ${short}: ${msg}`)
  }
}
