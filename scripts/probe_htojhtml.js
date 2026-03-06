import axios from 'axios'

async function main() {
  const cid = '22666004139776'
  
  // Fetch the contest HTML page and look for embedded data
  const urls = [
    `https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`,
    `https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`,
  ]

  for (const url of urls) {
    console.log(`\n=== GET ${url} ===`)
    try {
      const r = await axios.get(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 15000
      })
      const html = r.data
      console.log('Status:', r.status, 'Length:', html.length)

      // Look for Nuxt payload data
      const payloadMatch = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
      if (payloadMatch) {
        console.log('Found __NUXT_DATA__ script, first 500 chars:')
        console.log(payloadMatch[1].slice(0, 500))
      }

      // Look for window.__NUXT__
      const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\})(?:\s*;|<\/script>)/)
      if (nuxtMatch) {
        console.log('Found window.__NUXT__, first 500 chars:')
        console.log(nuxtMatch[1].slice(0, 500))
      }

      // Look for inline JSON data
      const jsonMatches = html.match(/\{"errCode":0,[^}]{1,2000}"data":\{[^<]{1,5000}/g)
      if (jsonMatches) {
        console.log('Found inline JSON data:')
        jsonMatches.forEach(m => console.log(m.slice(0, 300)))
      }

      // Look for contest title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/)
      if (titleMatch) console.log('Title:', titleMatch[1])

      // Look for meta or og:title
      const ogMatch = html.match(/og:title[^>]*content="([^"]+)"/)
      if (ogMatch) console.log('OG title:', ogMatch[1])

      // Look for any script tag with useful data
      const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
      console.log(`Found ${scripts.length} script tags`)
      for (const [, script] of scripts) {
        if (script.includes('contest') || script.includes('problem') || script.includes('cid')) {
          if (script.length > 50 && script.length < 5000) {
            console.log('Contest-related script:', script.slice(0, 400))
            console.log('---')
          }
        }
      }

    } catch(e) {
      console.log('Error:', e.message)
    }
  }
}

main().catch(console.error)
