import { chromium } from 'playwright'
import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'
  const contestPid = '22663958373760' // 瞬移 (A)

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

  // Intercept API requests and inject auth headers
  await page.route('**/api/code-community/**', async (route, request) => {
    const headers = {
      ...request.headers(),
      'authorization': token,
      'hetao-oj-zone': 'cpp',
      'ht_platform': 'htojWeb',
      'ht_system': 'web',
      'ht_version': '1.0.0',
      'app_id': 'com.hetao101.oj',
    }
    await route.continue({ headers })
  })

  // Capture responses
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('sensors') && !url.includes('arms-retcode') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.includes('<html') && body.length > 2) {
        const path = url.replace('https://api.htoj.com.cn', '').split('?')[0]
        try {
          const d = JSON.parse(body)
          if (d.errCode === 0) {
            console.log(`\n✅ [${resp.status()}] ${path}`)
            console.log('DATA (first 600):', JSON.stringify(d.data).slice(0, 600))
          } else if (d.errCode !== undefined) {
            console.log(`\n⚠️ [${resp.status()}] ${path} errCode=${d.errCode}: ${d.errMsg}`)
          }
        } catch(e) {}
      }
    }
  })

  // Navigate directly to contest problem detail
  console.log('\n=== Navigating to contest problem detail ===')
  await page.goto(
    `https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}&pid=${contestPid}`,
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(5000)

  console.log('\n=== Navigating to standalone problem page ===')
  await page.goto(
    `https://htoj.com.cn/cpp/oj/problem/${contestPid}`,
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(3000)

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
