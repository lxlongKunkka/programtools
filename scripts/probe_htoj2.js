import axios from 'axios'

const CDN = 'https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao'
const BASE = 'https://htoj.com.cn'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': '*/*',
  'Referer': 'https://htoj.com.cn/cpp/',
  'Origin': 'https://htoj.com.cn',
}

async function main() {
  // Fetch the main JS bundle
  const bundleUrl = `${CDN}/_nuxt/Bd0RBS5H.js`
  console.log('Fetching bundle:', bundleUrl)
  const r = await axios.get(bundleUrl, { headers, timeout: 30000, responseType: 'text' })
  const js = r.data
  console.log('Bundle size:', js.length)

  // Look for "login" related patterns
  const loginCtx = []
  let idx = 0
  while (idx < js.length) {
    const i = js.indexOf('login', idx)
    if (i === -1) break
    loginCtx.push(js.slice(Math.max(0, i-50), i+100))
    idx = i + 5
    if (loginCtx.length >= 30) break
  }
  console.log('\n=== login contexts ===')
  loginCtx.forEach(c => console.log('>>>', c.replace(/\n/g, ' '), '\n'))

  // Look for phone/password patterns
  const phoneCtx = []
  idx = 0
  while (idx < js.length) {
    const i = js.indexOf('loginByPwd', idx)
    if (i === -1) break
    phoneCtx.push(js.slice(Math.max(0, i-100), i+200))
    idx = i + 5
    if (phoneCtx.length >= 10) break
  }
  console.log('\n=== loginByPwd contexts ===')
  phoneCtx.forEach(c => console.log('>>>', c.replace(/\n/g, ' '), '\n'))

  // Look for gateway patterns
  const gwCtx = []
  idx = 0
  while (idx < js.length) {
    const i = js.indexOf('gateway', idx)
    if (i === -1) break
    gwCtx.push(js.slice(Math.max(0, i-30), i+120))
    idx = i + 7
    if (gwCtx.length >= 20) break
  }
  console.log('\n=== gateway contexts ===')
  gwCtx.forEach(c => console.log('>>>', c.replace(/\n/g, ' '), '\n'))

  // Look for baseURL / apiBase
  const baseCtx = []
  for (const kw of ['baseURL', 'apiBase', 'apiUrl', 'API_BASE', 'htoj']) {
    idx = 0
    while (idx < js.length) {
      const i = js.indexOf(kw, idx)
      if (i === -1) break
      baseCtx.push(js.slice(Math.max(0, i-20), i+100))
      idx = i + kw.length
      if (baseCtx.length >= 40) break
    }
  }
  console.log('\n=== baseURL/apiBase contexts ===')
  baseCtx.slice(0, 20).forEach(c => console.log('>>>', c.replace(/\n/g, ' '), '\n'))
}

main().catch(console.error)
