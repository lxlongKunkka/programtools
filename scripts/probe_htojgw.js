import axios from 'axios'

async function main() {
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Find gateway-specific auth or signing
  const patterns = ['gateway', 'app_key', 'app_secret', 'sign', 'signature', 'X-Ca-', 'nonce', 'timestamp', 'Access Denied', 'biz-gateway', 'htoj-biz']
  for (const p of patterns) {
    let idx = js.indexOf(p)
    let cnt = 0
    while (idx >= 0 && cnt < 2) {
      const ctx = js.slice(Math.max(0, idx - 100), idx + 200)
      if (!ctx.includes('comment') && !ctx.includes('README')) {
        console.log(`\n=== "${p}" at ${idx} ===`)
        console.log(ctx)
        cnt++
      }
      idx = js.indexOf(p, idx + p.length)
    }
  }

  // Look for Hetao-Oj-Zone values
  console.log('\n\n=== Hetao-Oj-Zone ===')
  let zoneIdx = js.indexOf('Hetao-Oj-Zone')
  while (zoneIdx >= 0) {
    console.log(js.slice(Math.max(0, zoneIdx - 50), zoneIdx + 150))
    zoneIdx = js.indexOf('Hetao-Oj-Zone', zoneIdx + 13)
  }

  // Look for how request method is called  
  console.log('\n\n=== request method setup ===')
  const reqIdx = js.indexOf('getCommonHeaders')
  if (reqIdx >= 0) {
    console.log(js.slice(Math.max(0, reqIdx - 100), reqIdx + 500))
  }
}

main().catch(console.error)
