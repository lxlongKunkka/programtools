import axios from 'axios'

async function main() {
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Find all https:// URLs
  const urls = new Set()
  let idx = 0
  while (idx < js.length) {
    const i = js.indexOf('https://', idx)
    if (i === -1) break
    const end = js.slice(i).search(/['"`,\s\)>]/)
    if (end > 5 && end < 200) {
      const url = js.slice(i, i + end)
      if (url.includes('hetao') || url.includes('htoj')) {
        urls.add(url.split('?')[0].split('#')[0])
      }
    }
    idx = i + 8
  }

  console.log('All hetao/htoj URLs:')
  ;[...urls].sort().forEach(u => console.log(u))

  // Find the actual OJ API service variable
  console.log('\n=== Variables near mc ===')
  const mcIdx = js.indexOf('mc="/api/htoj-biz-gateway"')
  if (mcIdx >= 0) {
    console.log(js.slice(Math.max(0, mcIdx - 200), mcIdx + 200))
  }
  
  // Find what Of is set to
  console.log('\n=== Of variable ===')
  let ofIdx = 0
  let found = 0
  while (ofIdx < js.length && found < 5) {
    const i = js.indexOf('Of=', ofIdx)
    if (i === -1) break
    const ctx = js.slice(Math.max(0, i-10), i+100)
    if (ctx.includes('http') || ctx.includes('//')) {
      console.log(ctx)
      found++
    }
    ofIdx = i + 3
  }
}

main().catch(console.error)
