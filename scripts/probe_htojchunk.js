import axios from 'axios'

async function main() {
  // These are the contest page chunks found in the main bundle
  const baseUrl = 'https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/'
  const chunks = ['CLXVF7qG.js', 'DE6W-BCI.js']

  for (const chunk of chunks) {
    console.log(`\n\n====== ${chunk} ======`)
    try {
      const r = await axios.get(baseUrl + chunk, { timeout: 20000, responseType: 'text' })
      const js = r.data

      // Find API paths
      const patterns = ['contest', 'problem/list', 'problem/detail', '/api/', 'biz-gateway', 'getContest', 'fetchContest']
      for (const p of patterns) {
        let idx = js.indexOf(p)
        let cnt = 0
        while (idx >= 0 && cnt < 3) {
          const ctx = js.slice(Math.max(0, idx - 50), idx + 150)
          if (ctx.match(/['"\/]/) && !ctx.includes('function') && !ctx.includes('component')) {
            console.log(`"${p}": ${ctx}`)
            console.log('---')
            cnt++
          }
          idx = js.indexOf(p, idx + p.length)
        }
      }
    } catch(e) {
      console.log('Error:', e.message)
    }
  }
}

main().catch(console.error)
