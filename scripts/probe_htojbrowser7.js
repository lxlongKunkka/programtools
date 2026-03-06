import { chromium } from 'playwright'
import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'

  const loginR = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl(phone), password: xl(pwd), countryCode: '86', short: false
  }, {
    headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
  })
  const token = loginR.data.data.token

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Inject auth into all API requests
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
  await page.route('**/api/htoj-biz-gateway/**', async (route) => {
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

  // Log ALL requests to api.htoj
  page.on('request', req => {
    const url = req.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('arms-retcode') && !url.includes('sensors') && !url.includes('datacenter')) {
      const query = url.includes('?') ? '?'+url.split('?')[1].slice(0,80) : ''
      console.log(`→ REQ: ${url.replace('https://api.htoj.com.cn', '').split('?')[0]}${query}`)
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
            const dataStr = JSON.stringify(d.data)
            const hasContent = dataStr.includes('content') || dataStr.includes('inputDesc') || dataStr.includes('outputDesc') || dataStr.includes('"sample"')
            if (hasContent || dataStr.includes('题目') || dataStr.includes('输入') || dataStr.includes('输出')) {
              console.log(`\n🎯 PROBLEM CONTENT [${resp.status()}] ${path}`)
              console.log(dataStr.slice(0, 1000))
            } else {
              console.log(`\n✅ [${resp.status()}] ${path}: ${dataStr.slice(0, 150)}`)
            }
          } else if (d.errCode !== 0) {
            console.log(`\n❌ [${resp.status()}] ${path}: ${d.errMsg || d.errCode}`)
          }
        } catch(e) {}
      }
    }
  })

  // Navigate to contest
  console.log('=== Navigating to contest ===')
  await page.goto(
    `https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`,
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(2000)

  // Try to click on first problem link
  console.log('\n=== Clicking on problem ===')
  
  // Click on the problem "瞬移" (first problem in contest)
  const clickResult = await page.evaluate(() => {
    // Find all links that might be problem links
    const links = Array.from(document.querySelectorAll('a'))
    const problemLinks = links.filter(a => a.href && a.href.includes('problem'))
    return problemLinks.map(a => ({ href: a.href, text: a.textContent.trim().slice(0,50) }))
  })
  console.log('Problem links found:', JSON.stringify(clickResult))
  
  if (clickResult.length > 0) {
    const firstLink = clickResult[0]
    console.log('Clicking:', firstLink.href)
    await page.goto(firstLink.href, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(5000)
    
    // Get page URL
    const currentUrl = page.url()
    console.log('Current URL:', currentUrl)
    
    // Get page text
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 1000))
    console.log('\nPage text:', pageText)
  }

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
