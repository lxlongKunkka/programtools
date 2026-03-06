import axios from 'axios'

const CDN = 'https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao'
const BASE = 'https://htoj.com.cn'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://htoj.com.cn/cpp/',
  'Origin': 'https://htoj.com.cn',
}

async function main() {
  // 1. 获取主页，找JS bundle链接（从CDN）
  const home = await axios.get(`${BASE}/cpp/`, { headers, timeout: 10000 })
  // nuxt通常把bundle放在CDN，html中只有link preload
  const cdnJs = [...home.data.matchAll(/href="([^"]+\.js)"/g)].map(m => m[1])
    .filter(u => u.includes('nuxt') || u.includes('_nuxt') || u.includes('hetao'))
  console.log('CDN JS links:', cdnJs.slice(0,5))
  
  // Also look for inline script tags
  const scriptSrcs = [...home.data.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1])
  console.log('Script srcs:', scriptSrcs.slice(0,5))
  
  // 2. 抓一个较大的bundle搜API
  const allBundles = [...cdnJs, ...scriptSrcs].filter(u => u.endsWith('.js')).slice(0, 10)
  const apiSet = new Set()
  for (const u of allBundles) {
    try {
      const url = u.startsWith('http') ? u : (u.startsWith('/') ? CDN + u : CDN + '/' + u)
      const r = await axios.get(url, { headers, timeout: 15000 })
      const matches = [...r.data.matchAll(/\/(?:api|gateway|oj|user)\/[\w\/-]{3,60}/g)]
      matches.forEach(m => apiSet.add(m[0]))
    } catch (e) {
      // ignore
    }
  }
  const apis = [...apiSet].filter(p => /login|contest|problem/.test(p))
  console.log('\n=== API paths from bundles ===')
  apis.slice(0, 30).forEach(p => console.log(p))

  // 3. 试GET /api/oj/user/login (看是不是需要GET请求)
  console.log('\n=== Trying GET on login paths ===')
  const probeGet = ['/api/oj/user/login', '/gateway/oj/user/login', '/gateway/user/login']
  for (const path of probeGet) {
    try {
      const r = await axios.get(`${BASE}${path}`, { headers, timeout: 5000 })
      console.log('GET', path, '->', r.status, JSON.stringify(r.data).slice(0, 200))
    } catch (e) {
      console.log('GET', path, '-> ERROR', e.response?.status, e.message.slice(0, 60))
    }
  }

  // 4. 尝试不同content-type的POST
  console.log('\n=== Trying POST with formdata ===')
  const qs = new URLSearchParams({ phone: '17753651388', password: 'Aa123456@', loginType: 1 })
  const loginPaths = ['/api/oj/user/login', '/gateway/oj/user/login', '/gateway/user/loginByPwd']
  for (const path of loginPaths) {
    try {
      const r = await axios.post(`${BASE}${path}`, qs.toString(),
        { headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 })
      console.log(path, '->', r.status, JSON.stringify(r.data).slice(0, 300))
    } catch (e) {
      console.log(path, '-> ERROR', e.response?.status, JSON.stringify(e.response?.data || e.message).slice(0, 200))
    }
  }
}

main().catch(console.error)
