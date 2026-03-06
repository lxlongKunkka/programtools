import axios from 'axios'

const BASE = 'https://htoj.com.cn'

async function main() {
  // Fetch the main JS bundle
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Find Ef value (login base)
  const efMatches = []
  let idx = 0
  while (idx < js.length) {
    const i = js.indexOf('Ef', idx)
    if (i === -1) break
    const ctx = js.slice(Math.max(0, i-10), i+80)
    if (ctx.includes('=') && (ctx.includes('http') || ctx.includes('gateway') || ctx.includes('/api'))) {
      efMatches.push(ctx)
    }
    idx = i + 2
    if (efMatches.length >= 20) break
  }
  console.log('=== Ef contexts with URLs ===')
  efMatches.slice(0, 10).forEach(c => console.log(c.replace(/\n/g, ' ')))

  // Find COMMON_HEADERS
  const chIdx = js.indexOf('COMMON_HEADERS')
  if (chIdx >= 0) {
    console.log('\n=== COMMON_HEADERS context ===')
    console.log(js.slice(Math.max(0, chIdx-200), chIdx+400))
  }

  // Find loginByPwd function
  let loginFnIdx = 0
  while (loginFnIdx < js.length) {
    const i = js.indexOf('loginByPassword', loginFnIdx)
    if (i === -1) break
    console.log('\n>>> loginByPassword context:')
    console.log(js.slice(Math.max(0, i-20), i+400))
    loginFnIdx = i + 15
    if (loginFnIdx > js.length - 1) break
  }

  // Find zone header - the API secret might be in a header
  const secretCtx = []
  for (const kw of ['apiSecret', 'x-api-secret', 'x-token', 'Authorization', 'ZONE', 'zone']) {
    const i = js.indexOf(kw)
    if (i >= 0) secretCtx.push({ kw, ctx: js.slice(Math.max(0, i-30), i+150) })
  }
  console.log('\n=== Auth header contexts ===')
  secretCtx.forEach(({ kw, ctx }) => console.log(`[${kw}]`, ctx.replace(/\n/g, ' ')))
}

main().catch(console.error)
