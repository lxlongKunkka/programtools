import axios from 'axios'

async function main() {
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Find Os (HT_PLATFORM value)
  for (const kw of ['HT_PLATFORM', 'app_id', 'yF', 'Os=', 'appId']) {
    let idx = 0
    let count = 0
    while (idx < js.length && count < 5) {
      const i = js.indexOf(kw, idx)
      if (i === -1) break
      console.log(`[${kw}]`, js.slice(Math.max(0, i-30), i+150).replace(/\n/g, ' '))
      idx = i + kw.length
      count++
    }
  }

  // Find platform string - look for "oj-web" or "htoj"
  for (const kw of ['oj-web', 'oj_web', 'htoj-web', 'platform']) {
    const i = js.indexOf(kw)
    if (i >= 0) {
      console.log(`\n[platform kw: ${kw}]`, js.slice(Math.max(0, i-50), i+100).replace(/\n/g, ' '))
    }
  }
}

main().catch(console.error)
