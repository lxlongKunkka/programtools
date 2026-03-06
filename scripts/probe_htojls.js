import axios from 'axios'

const url = 'https://htoj.com.cn/_nuxt/Bd0RBS5H.js'
const r = await axios.get(url, { timeout: 30000, responseType: 'text' })
const code = r.data

// Search for localStorage keys related to zone and login token
const kws = ['localStorage', 'KEY_USER', 'ht_oj_zone', 'zone', 'localStore', 'preferZone', 'userZone', 'zoneKey', 'oj_zone', 'storage_zone', 'ZONE', 'getItem', 'setItem']

for (const kw of kws) {
  const indices = []
  let idx = 0
  while (true) {
    idx = code.indexOf(kw, idx)
    if (idx === -1) break
    const ctx = code.slice(Math.max(0, idx - 100), idx + 200)
    if (ctx.includes('"') && !ctx.includes('//')) {
      // Likely has string keys
      indices.push(ctx.replace(/\s+/g, ' ').slice(0, 250))
    }
    idx += kw.length
  }
  if (indices.length > 0) {
    console.log(`\n=== "${kw}" occurrences (${indices.length}) ===`)
    // Show first few unique-ish ones
    const shown = new Set()
    for (const i of indices.slice(0, 8)) {
      const key = i.slice(0, 60)
      if (!shown.has(key)) {
        shown.add(key)
        console.log(i)
      }
    }
  }
}
