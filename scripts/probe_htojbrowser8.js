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

  // Inject auth
  for (const pattern of ['**/api/code-community/**', '**/api/htoj-biz-gateway/**']) {
    await page.route(pattern, async (route) => {
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
  }

  // Log all NEW api calls
  const seenUrls = new Set()
  page.on('request', req => {
    const url = req.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('arms-retcode') && !url.includes('sensors')) {
      const key = url.replace('https://api.htoj.com.cn', '').split('?')[0]
      if (!seenUrls.has(key)) {
        seenUrls.add(key)
        const qs = url.includes('?') ? '?'+url.split('?')[1].slice(0,100) : ''
        console.log(`→ ${key}${qs}`)
      }
    }
  })
  
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('arms-retcode') && !url.includes('sensors')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.includes('<html') && body.length > 5) {
        try {
          const d = JSON.parse(body)
          const path = url.replace('https://api.htoj.com.cn', '').split('?')[0]
          if (d.errCode === 0 && d.data) {
            const dataStr = JSON.stringify(d.data)
            // Look for problem content fields
            if (dataStr.includes('inputDesc') || dataStr.includes('outputDesc') || dataStr.includes('problemContent') || dataStr.includes('"content"') || dataStr.includes('inputSample') || dataStr.includes('outputSample')) {
              console.log(`\n🎯🎯 PROBLEM CONTENT FOUND! ${path}`)
              console.log(dataStr.slice(0, 1500))
            }
          } else if (d.errCode !== 0) {
            const path = url.replace('https://api.htoj.com.cn', '').split('?')[0]
            console.log(`❌ ${path}: ${d.errMsg || d.errCode}`)
          }
        } catch(e) {}
      }
    }
  })

  // Navigate to contest problem list page  
  console.log('=== Contest problem list ===')
  await page.goto(
    `https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`,
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(3000)

  // Find and click on the first contest problem link
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a,tr'))
      .filter(el => el.tagName === 'TR' || (el.href && el.href.includes('problem')))
      .map(el => ({ tag: el.tagName, href: el.href || '', text: el.textContent.trim().slice(0, 80) }))
      .filter(l => l.href.includes('problem') || l.text.includes('瞬移'))
      .slice(0, 10)
  })
  console.log('\nLinks/rows found:', JSON.stringify(links, null, 2))
  
  // Try clicking on problem row
  try {
    await page.click('text=瞬移', { timeout: 5000 })
    await page.waitForTimeout(3000)
    console.log('\nAfter click, URL:', page.url())
    
    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 800))
    console.log('Page text after click:', pageText)
  } catch(e) {
    console.log('Could not click "瞬移":', e.message)
    
    // Try navigating via URL patterns
    const problemUrl = `https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}&pid=22663958373760`
    console.log('\nTrying direct URL:', problemUrl)
    await page.goto(problemUrl, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(5000)
    console.log('URL:', page.url())
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 800))
    console.log('Text:', txt)
  }

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
