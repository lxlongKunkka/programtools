import axios from 'axios'

async function main() {
  const bundleUrl = `https://fedmarketing.htcdn-a.com/fe-oj-monorepo-hetao/_nuxt/Bd0RBS5H.js`
  const r = await axios.get(bundleUrl, { timeout: 30000, responseType: 'text' })
  const js = r.data

  // Find xl function definition
  console.log('=== xl function ===')
  let idx = 0
  while (idx < js.length) {
    const i = js.indexOf('function xl', idx)
    if (i === -1) break
    console.log(js.slice(i, i + 300).replace(/\n/g, ' '))
    idx = i + 10
    if (idx > js.length) break
  }
  
  // Also search for xl= (arrow function)
  idx = 0
  let count = 0
  while (idx < js.length && count < 5) {
    const i = js.indexOf('xl=', idx)
    if (i === -1) break
    const ctx = js.slice(Math.max(0, i-10), i + 200)
    if (ctx.includes('md5') || ctx.includes('encrypt') || ctx.includes('crypto') || ctx.includes('hash') || ctx.includes('base64') || ctx.includes('btoa')) {
      console.log('\n[xl= crypto]', ctx.replace(/\n/g, ' '))
      count++
    }
    idx = i + 3
  }
  
  // Find Kae function (loginByPassword actual call)
  idx = 0
  console.log('\n=== Kae function ===')
  while (idx < js.length) {
    const i = js.indexOf('function Kae', idx)
    if (i === -1) break
    console.log(js.slice(i, i+300).replace(/\n/g, ' '))
    idx = i + 10
  }
  // Also Kae=
  idx = 0
  while (idx < js.length) {
    const i = js.indexOf('Kae=', idx)
    if (i === -1) break
    console.log('[Kae=]', js.slice(Math.max(0, i-5), i+200).replace(/\n/g, ' '))
    idx = i + 4
    if (idx > js.length - 1) break
  }
  
  // Find md5 or encryption related to password
  for (const kw of ['md5', 'MD5', 'sha1', 'SHA1', 'hex', 'CryptoJS']) {
    const i = js.indexOf(kw)
    if (i >= 0) {
      console.log(`\n[${kw}]`, js.slice(Math.max(0,i-50), i+200).replace(/\n/g, ' '))
    }
  }
}

main().catch(console.error)
