import axios from 'axios'

async function main() {
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Find zone service - what values zone can be
  console.log('\n=== zoneService ===')
  let idx = js.indexOf('zoneService')
  let cnt = 0
  while (idx >= 0 && cnt < 4) {
    console.log(js.slice(Math.max(0, idx-20), idx+200))
    console.log('---')
    idx = js.indexOf('zoneService', idx + 11)
    cnt++
  }

  // Find zone values
  console.log('\n=== zone values ===')
  ;['national', 'province', 'city', 'Hetao-Oj-Zone'].forEach(p => {
    const i = js.indexOf(p)
    if (i >= 0) console.log(`"${p}" at ${i}: ` + js.slice(Math.max(0, i-50), i+150))
  })

  // Find contest API call sites - look for how the API service is called
  console.log('\n=== contest API calls ===')
  ;['contest/problem', 'contest/detail', 'contest/list', 'oj/contest'].forEach(p => {
    let i = js.indexOf(p)
    let c = 0
    while (i >= 0 && c < 3) {
      console.log(`"${p}" at ${i}: ` + js.slice(Math.max(0, i-100), i+200))
      console.log('---')
      i = js.indexOf(p, i + p.length)
      c++
    }
  })
}

main().catch(console.error)
