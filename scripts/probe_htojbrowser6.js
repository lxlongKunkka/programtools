import { chromium } from 'playwright'
import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'
  const contestPid = '22663958373760' // 瞬移 

  const loginR = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl(phone), password: xl(pwd), countryCode: '86', short: false
  }, {
    headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
  })
  const token = loginR.data.data.token

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false  // Show browser to see what's happening
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Inject auth into API requests
  await page.route('**/api/code-community/**', async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        'authorization': token,
        'hetao-oj-zone': 'cpp',
        'ht_platform': 'htojWeb',
        'ht_system': 'web',
        'ht_version': '1.0.0',
        'app_id': 'com.hetao101.oj',
      }
    })
  })
  
  // Also catch requests to htoj-biz-gateway to see if it's used
  await page.route('**/api/htoj-biz-gateway/**', async (route) => {
    const url = route.request().url()
    console.log('⚠️ GATEWAY REQUEST:', url)
    await route.continue()
  })

  // Log ALL requests to api.htoj domains
  page.on('request', req => {
    const url = req.url()
    if (url.includes('api.htoj') && !url.includes('arms-retcode') && !url.includes('sensors') && !url.includes('datacenter')) {
      console.log('→ REQ:', url.replace('https://api.htoj.com.cn', '').split('?')[0])
    }
  })
  
  // Capture successful responses
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('arms-retcode') && !url.includes('sensors') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.includes('<html') && body.length > 5) {
        try {
          const d = JSON.parse(body)
          const path = url.replace('https://api.htoj.com.cn', '').split('?')[0]
          if (d.errCode === 0 && d.data) {
            console.log(`\n✅ [${resp.status()}] ${path}`)
            const dataStr = JSON.stringify(d.data)
            // Check for problem content fields
            if (dataStr.includes('content') || dataStr.includes('input') || dataStr.includes('output') || dataStr.includes('description')) {
              console.log('📝 HAS PROBLEM CONTENT!')
              console.log(dataStr.slice(0, 800))
            } else {
              console.log(dataStr.slice(0, 200))
            }
          } else if (d.errCode !== 0) {
            console.log(`\n❌ [${resp.status()}] ${path}: ${d.errMsg || d.errCode}`)
          }
        } catch(e) {}
      }
    }
  })

  // Navigate to problem page
  console.log('\n=== Contest problem page ===')
  await page.goto(
    `https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}&pid=${contestPid}`,
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(8000) // Wait longer for all API calls
  
  // Try to get page text after load to see if content is present
  const pageText = await page.evaluate(() => document.body.innerText.slice(0, 500))
  console.log('\nPage text:', pageText)

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
