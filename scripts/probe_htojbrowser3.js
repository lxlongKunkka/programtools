import { chromium } from 'playwright'
import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'
  const pid = '22169438826624' // P1000 A+B

  const loginR = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl(phone), password: xl(pwd), countryCode: '86', short: false
  }, {
    headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
  })
  const token = loginR.data.data.token
  console.log('Token:', token.slice(0, 30) + '...')

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Collect all API requests (not assets)
  const apiCalls = []
  page.on('request', req => {
    const url = req.url()
    if ((url.includes('api.htoj') || url.includes('api.hetao')) && !url.includes('sensors') && !url.includes('datacenter') && !url.includes('hm.baidu')) {
      const headers = req.headers()
      apiCalls.push({ method: req.method(), url, headers_auth: headers['authorization']?.slice(0,20), headers_zone: headers['hetao-oj-zone'] })
    }
  })
  page.on('response', async resp => {
    const url = resp.url()
    if ((url.includes('api.htoj') || url.includes('api.hetao')) && !url.includes('sensors') && !url.includes('datacenter') && !url.includes('hm.baidu')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.includes('<html')) {
        console.log(`\n[${resp.status()}] ${url.replace('https://api.htoj.com.cn', '').split('?')[0]}`)
        console.log(body.slice(0, 400))
      }
    }
  })

  // Setup: visit htoj.com.cn and set token
  await page.goto('https://htoj.com.cn', { waitUntil: 'domcontentloaded' })
  await page.evaluate((t) => {
    localStorage.setItem('KEY_USER_LOGIN_TOKEN', t)
    localStorage.setItem('KEY_ZONE', 'cpp')
  }, token)

  // Navigate to contest problem page
  console.log('\n=== Navigating to contest problem page ===')
  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  
  console.log('\n=== Navigating to problem detail ===')
  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}&pid=${pid}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(5000)

  console.log('\n=== Also try direct problem page ===')
  await page.goto(`https://htoj.com.cn/cpp/oj/problem/${pid}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(5000)

  console.log('\n\n=== Summary of all API calls ===')
  apiCalls.forEach(c => {
    console.log(`${c.method} ${c.url.replace('https://api.htoj.com.cn', '')}`)
    if (c.headers_auth) console.log(`  Auth: ${c.headers_auth}...`)
    if (c.headers_zone) console.log(`  Zone: ${c.headers_zone}`)
  })

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
