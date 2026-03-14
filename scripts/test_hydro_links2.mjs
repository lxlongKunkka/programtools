// 带登录 session 查看 P12695 页面的真实附件链接
import { default as axios } from 'axios'
import { load } from 'cheerio'
import { HYDRO_NFLSOI_USER, HYDRO_NFLSOI_PWD } from '../server/config.js'

const BASE = 'http://nflsoi.cc:10611'

// 登录
const loginResp = await axios.post(`${BASE}/login`,
  new URLSearchParams({ uname: HYDRO_NFLSOI_USER, password: HYDRO_NFLSOI_PWD }).toString(),
  { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', Referer: BASE },
    maxRedirects: 0, validateStatus: s => s < 600, timeout: 10000 }
)
const cookies = (loginResp.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ')
console.log('cookies:', cookies ? cookies.slice(0, 60) + '...' : 'none')

// 访问题目页
const r = await axios.get(`${BASE}/p/P12695`, {
  headers: { Cookie: cookies, 'User-Agent': 'Mozilla/5.0', Referer: BASE },
  responseType: 'text', transformResponse: [d => d], timeout: 15000, validateStatus: s => s < 600
})
console.log('status:', r.status, 'len:', r.data.length)

const $ = load(r.data)

// 找所有含 file/download/attach 的链接
console.log('\n--- links with file/download/attach ---')
let found = 0
$('a[href]').each((_, el) => {
  const href = $(el).attr('href') || ''
  if (/file|download|attach|zip|sample/i.test(href)) {
    console.log('HREF:', href, '| TEXT:', $(el).text().trim())
    found++
  }
})
if (!found) console.log('(none found)')

// 打印所有 img src
console.log('\n--- img sources ---')
$('img').each((_, el) => console.log('IMG:', $(el).attr('src')))

// 打印页面标题和前200字文字
console.log('\n--- page title ---', $('title').text())
