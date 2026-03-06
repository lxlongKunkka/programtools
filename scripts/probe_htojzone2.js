import axios from 'axios'

async function main() {
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Find KEY_ZONE and zone service
  console.log('=== KEY_ZONE ===')
  let idx = 0
  while (true) {
    const i = js.indexOf('KEY_ZONE', idx)
    if (i === -1) break
    console.log(`at ${i}: ${js.slice(Math.max(0,i-80), i+200)}`)
    console.log('---')
    idx = i + 8
  }

  // Find zoneService.zone usage
  console.log('\n=== zoneService.zone access ===')
  idx = 0
  let cnt = 0
  while (cnt < 5) {
    const i = js.indexOf('.zone', idx)
    if (i === -1) break
    const ctx = js.slice(Math.max(0,i-50), i+100)
    if (ctx.includes('zone') && !ctx.includes('timezone') && !ctx.includes('zoneId')) {
      console.log(`at ${i}: ${ctx}`)
    }
    idx = i + 5
    cnt++
  }

  // Find To (zoneService) implementation 
  console.log('\n=== Ts/To class methods ===')
  const toIdx = js.indexOf('To=Cb([Ko()],To)')
  if (toIdx >= 0) {
    console.log(js.slice(Math.max(0, toIdx - 500), toIdx + 100))
  }
}

main().catch(e => console.error(e.message))
