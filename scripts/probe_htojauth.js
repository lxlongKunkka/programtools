import axios from 'axios'

async function main() {
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Find Authorization header or token header usage
  const patterns = ['Authorization', 'X-User-Token', 'X-Token', 'ht_token', 'httoken', 'Bearer', 'x-access-token', 'userToken']
  for (const p of patterns) {
    let idx = js.indexOf(p)
    let cnt = 0
    while (idx >= 0 && cnt < 3) {
      const ctx = js.slice(Math.max(0, idx - 100), idx + 150)
      console.log(`\n=== "${p}" at ${idx} ===`)
      console.log(ctx)
      idx = js.indexOf(p, idx + p.length)
      cnt++
    }
  }

  // Find headers being set on requests to api.htoj or Of
  const ofIdx = js.indexOf('"https://api.htoj.com.cn"')
  if (ofIdx >= 0) {
    console.log('\n=== context around Of ===')
    console.log(js.slice(Math.max(0, ofIdx - 300), ofIdx + 500))
  }
}

main().catch(console.error)
