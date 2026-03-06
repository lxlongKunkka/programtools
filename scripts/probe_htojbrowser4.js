import { chromium } from 'playwright'
import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'
  // Problem from contest: 瞬移 (A)
  const contestPid = '22663958373760'

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

  // Capture API calls
  const apiCalls = []
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('sensors') && !url.includes('arms-retcode') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.includes('<html') && body.length > 2) {
        const path = url.replace('https://api.htoj.com.cn', '').split('?')[0]
        const query = url.includes('?') ? '?' + url.split('?')[1].slice(0, 100) : ''
        apiCalls.push({ path: path + query, status: resp.status(), body: body.slice(0, 500) })
        console.log(`[${resp.status()}] ${path}`)
        const d = JSON.parse(body)
        if (d.errCode === 0) {
          console.log('DATA:', JSON.stringify(d.data).slice(0, 400))
        } else {
          console.log('ERR:', d.errMsg)
        }
        console.log()
      }
    }
  })

  // Setup auth  
  await page.goto('https://htoj.com.cn', { waitUntil: 'domcontentloaded' })
  await page.evaluate((t) => {
    localStorage.setItem('KEY_USER_LOGIN_TOKEN', t)
    localStorage.setItem('KEY_ZONE', 'cpp')
  }, token)

  // Navigate to contest problem page with specific problem
  console.log('=== Navigating to contest problem detail ===')
  await page.goto(
    `https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}&pid=${contestPid}`,
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(5000)

  // Also navigate to the direct problem solving page
  console.log('\n=== Navigating to standalone problem page ===')
  await page.goto(
    `https://htoj.com.cn/cpp/oj/problem/${contestPid}`,
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(3000)

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message, e.stack?.split('\n')[0]); process.exit(1) })
