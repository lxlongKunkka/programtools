import { fetchHydroNflsoiProblem } from '../server/routes/hydro_nflsoi.js'
import axios from 'axios'
import { load } from 'cheerio'

// 直接看页面 HTML 里的附件链接
const BASE = 'http://nflsoi.cc:10611'

// 简单看一下页面里所有 href
const r = await axios.get(BASE + '/p/P12695', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
  responseType: 'text',
  transformResponse: [d => d],
  timeout: 15000,
  validateStatus: s => s < 600
})
const $ = load(r.data)

// 找所有包含 file 的链接
$('a[href]').each((_, el) => {
  const href = $(el).attr('href')
  if (href && (href.includes('file') || href.includes('download') || href.includes('attach'))) {
    console.log('LINK:', href, '|', $(el).text().trim())
  }
})

// 也打印前30个链接
console.log('\n--- all hrefs (first 30) ---')
$('a[href]').each((i, el) => {
  if (i < 30) console.log($(el).attr('href'))
})
