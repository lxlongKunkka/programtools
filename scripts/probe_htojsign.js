import axios from 'axios'

async function main() {
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Look for HMAC, aliyun, api gateway signing
  const patterns = ['HMAC', 'hmac', 'sha256', 'SHA256', 'X-Ca-', 'aliyun', 'api-gw', 'apiGw', 'sign(', 'CryptoJS', '$F', 'app_secret', 'appSecret', 'secret']
  for (const p of patterns) {
    let idx = js.indexOf(p)
    let cnt = 0
    while (idx >= 0 && cnt < 2) {
      const ctx = js.slice(Math.max(0, idx - 80), idx + 200)
      if (ctx.match(/api|gateway|request|header/i)) {
        console.log(`\n=== "${p}" at ${idx} ===`)
        console.log(ctx)
        cnt++
      }
      idx = js.indexOf(p, idx + p.length)
    }
  }

  // Find $F usage
  console.log('\n=== $F usage (feature flag near mc/gateway) ===')
  const mcIdx = js.indexOf('const mc="/api/htoj-biz-gateway",$F=!0')
  if (mcIdx >= 0) {
    // Find all $F references
    let idx = 0
    let cnt = 0
    while (cnt < 10) {
      const i = js.indexOf('$F', idx)
      if (i === -1) break
      const ctx = js.slice(Math.max(0, i-50), i+100)
      if (!ctx.includes('$Fp') && !ctx.includes('$Fa') && !ctx.includes('$Fr') && !ctx.includes('$Fe')) {
        console.log(`$F at ${i}: ${ctx}`)
      }
      idx = i + 2
      cnt++
    }
  }

  // Look for how the OJ API module f calls are structured
  // The OJ service class constructor
  console.log('\n=== OJ API service constructor ===')
  const consIdx = js.indexOf('"COMMON_HEADERS"')
  if (consIdx >= 0) {
    console.log(js.slice(Math.max(0, consIdx - 500), consIdx + 800))
  }
}

main().catch(console.error)
