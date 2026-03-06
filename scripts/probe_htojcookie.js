import axios from 'axios'
import { wrapper } from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  
  // Check if we can install tough-cookie
  let jar
  try {
    jar = new CookieJar()
    const client = wrapper(axios.create({ jar }))
    
    // Check htoj.com.cn cookies
    console.log('=== Testing htoj.com.cn main page cookies ===')
    const mainR = await client.get('https://htoj.com.cn/', {
      headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    })
    const cookies = jar.toJSON()
    console.log('Cookies after visiting htoj.com.cn:', JSON.stringify(cookies.cookies?.map(c => `${c.key}=${c.value?.slice(0,30)}`)))
    console.log('Htoj.com.cn resp status:', mainR.status)
  } catch(e) {
    console.log('Cookie jar error:', e.message)
    console.log('Trying without cookie jar...')
  }

  // Let's decode the full HTML to UTF-8 and look for JSON data
  console.log('\n=== Full HTML analysis for contest page ===')
  const cid = '22666004139776'
  const r = await axios.get(`https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    responseType: 'arraybuffer',
    timeout: 15000
  })
  
  // Try both UTF-8 and GBK decoding
  const bufUtf8 = Buffer.from(r.data).toString('utf-8')
  console.log('HTML length:', bufUtf8.length)
  
  // Look for all <script> content
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g
  let match
  let scriptN = 0
  while ((match = scriptRegex.exec(bufUtf8)) !== null) {
    const content = match[1].trim()
    if (content.length > 0) {
      scriptN++
      console.log(`\n--- Script ${scriptN} (len=${content.length}) ---`)
      console.log(content.slice(0, 500))
    }
  }
  
  // Check for any JSON-like embedded data
  const jsonBlocks = bufUtf8.match(/\{[^{}<>]{50,1000}\}/g) || []
  console.log(`\nFound ${jsonBlocks.length} JSON-like blocks`)
  jsonBlocks.slice(0, 5).forEach((b, i) => {
    try {
      JSON.parse(b)
      console.log(`Valid JSON block ${i}: ${b.slice(0, 200)}`)
    } catch(e) {}
  })

  // Look for specific contest-related patterns
  const patterns = ['contest', 'problem', 'cid', 'startTime', 'endTime', '"title"']
  patterns.forEach(p => {
    const idx = bufUtf8.indexOf(p)
    if (idx >= 0) {
      console.log(`\n"${p}" found at ${idx}: ...${bufUtf8.slice(Math.max(0,idx-20), idx+100)}...`)
    }
  })
}

main().catch(console.error)
