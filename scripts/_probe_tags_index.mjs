import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'

async function main() {
  const agent = new HttpsProxyAgent('http://127.0.0.1:10808')
  const client = axios.create({
    timeout: 20000, httpsAgent: agent,
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' }
  })

  const res = await client.get('https://atcoder-tags.herokuapp.com/')
  const html = res.data

  // 尝试 /tags 和 /explain 页面
  for (const url of [
    'https://atcoder-tags.herokuapp.com/tags',
    'https://atcoder-tags.herokuapp.com/explain',
    'https://atcoder-tags.herokuapp.com/category',
  ]) {
    try {
      const r = await client.get(url, { timeout: 10000 })
      const links = [...new Set([...r.data.matchAll(/href="(\/[^"]+)"/g)].map(m => m[1]))]
      console.log(`\n=== ${url} (${r.status}) ===`)
      console.log('内部链接:', links.slice(0, 30).join('\n'))
      console.log('--- HTML前1500 ---')
      console.log(r.data.slice(0, 1500))
    } catch(e) { console.log(`${url}: ${e.message}`) }
  }
}

main().catch(e => console.error('ERR:', e.message))
