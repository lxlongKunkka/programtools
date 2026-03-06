import axios from 'axios'
import { Buffer } from 'buffer'

async function main() {
  const cid = '22666004139776'
  
  const r = await axios.get(`https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    responseType: 'arraybuffer',
    timeout: 15000
  })
  
  const html = Buffer.from(r.data).toString('utf-8')
  
  // Check content type and encoding from headers
  console.log('Content-Type:', r.headers['content-type'])
  console.log('Content-Encoding:', r.headers['content-encoding'])
  
  // Save the full HTML for inspection
  import('fs').then(({default: fs}) => {
    fs.writeFileSync('/tmp/htoj_contest.html', html)
    console.log('Saved to /tmp/htoj_contest.html')
  }).catch(() => {
    // Windows path
    import('fs').then(({default: fs}) => fs.writeFileSync('C:\\Temp\\htoj_contest.html', html)).catch(()=>{})
    import('fs').then(({default: fs}) => {
      fs.mkdirSync('scripts/.tmp', {recursive: true})
      fs.writeFileSync('scripts/.tmp/htoj_contest.html', html)
      console.log('Saved to scripts/.tmp/htoj_contest.html')
    }).catch(e => console.log('Save error:', e.message))
  })

  // Look at the HTML body for any rendered content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/)
  if (bodyMatch) {
    const body = bodyMatch[1]
    console.log('\n=== Body first 2000 chars ===')
    console.log(body.slice(0, 2000))
    
    // Look for specific content in body
    console.log('\n=== div content (first 5 non-empty divs) ===')
    const divs = [...body.matchAll(/<div[^>]*class="([^"]+)"[^>]*>((?!<div).{10,200})/g)]
    divs.slice(0, 10).forEach(d => console.log(`class="${d[1]}": ${d[2].replace(/<[^>]+>/g,'').trim().slice(0,100)}`))
  }
  
  // Check if it's a SPA shell (only JS, no rendered content)
  const hasRenderedContent = html.includes('data-v-') || html.length > 50000
  console.log('\nHTML length:', html.length, 'Has vue content:', hasRenderedContent)
  
  // Print the head meta tags  
  const metas = [...html.matchAll(/<meta[^>]+>/g)].map(m => m[0])
  console.log('\n=== Meta tags ===')
  metas.forEach(m => console.log(m))
  
  // Check for any link tags (preload, canonical)
  const links = [...html.matchAll(/<link[^>]+>/g)].map(m => m[0])
  console.log('\n=== Link tags (first 15) ===')
  links.slice(0, 15).forEach(l => console.log(l))
}

main().catch(console.error)
