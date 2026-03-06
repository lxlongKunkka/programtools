import axios from 'axios'

async function main() {
  const cid = '22666004139776'
  
  // First, get cookies from main page
  console.log('=== Getting cookies from htoj.com.cn ===')
  const mainR = await axios.get('https://htoj.com.cn/', {
    headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
    timeout: 10000
  })
  const cookies = mainR.headers['set-cookie']
  console.log('Cookies from main page:', cookies)

  console.log('\n=== Full HTML analysis for contest page ===')
  const r = await axios.get(`https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    timeout: 15000
  })
  
  const html = r.data
  console.log('HTML length:', html.length)
  console.log('Response cookies:', r.headers['set-cookie'])
  
  // Look for all <script> content
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g
  let match
  let scriptN = 0
  while ((match = scriptRegex.exec(html)) !== null) {
    const content = match[1].trim()
    if (content.length > 0) {
      scriptN++
      console.log(`\n--- Script ${scriptN} (len=${content.length}) ---`)
      console.log(content.slice(0, 300))
    }
  }
  
  // Find __NUXT_DATA__ fully
  const nuxtDataMatch = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nuxtDataMatch) {
    console.log('\n=== Full __NUXT_DATA__ ===')
    console.log(nuxtDataMatch[1])
  }

  // Find any link to JS files that might be page-specific chunks
  const scriptSrcs = [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)].map(m => m[1])
  console.log('\n=== JS chunk files loaded ===')
  scriptSrcs.forEach(s => console.log(s))
}

main().catch(console.error)
