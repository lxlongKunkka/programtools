// 详查 P12695 页面结构
import { default as axios } from 'axios'
import { load } from 'cheerio'
import { HYDRO_NFLSOI_USER, HYDRO_NFLSOI_PWD } from '../server/config.js'

const BASE = 'http://nflsoi.cc:10611'

const loginResp = await axios.post(`${BASE}/login`,
  new URLSearchParams({ uname: HYDRO_NFLSOI_USER, password: HYDRO_NFLSOI_PWD }).toString(),
  { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0', Referer: BASE },
    maxRedirects: 0, validateStatus: s => s < 600, timeout: 10000 }
)
const cookies = (loginResp.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ')

const r = await axios.get(`${BASE}/p/P12695`, {
  headers: { Cookie: cookies, 'User-Agent': 'Mozilla/5.0', Referer: BASE },
  responseType: 'text', transformResponse: [d => d], timeout: 15000, validateStatus: s => s < 600
})

const $ = load(r.data)

// 所有链接
console.log('--- ALL hrefs ---')
$('a[href]').each((_, el) => {
  console.log($(el).attr('href'), '|', $(el).text().trim().slice(0, 40))
})

// 打印 HTML 里含 file 的原始片段
const matches = r.data.match(/.{0,80}file.{0,80}/gi) || []
console.log('\n--- raw html containing "file" ---')
matches.slice(0, 15).forEach(m => console.log(m))
