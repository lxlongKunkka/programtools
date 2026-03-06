import { chromium } from 'playwright'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  if (!phone || !pwd) { console.error('需要 HTOJ_PHONE 和 HTOJ_PWD'); process.exit(1) }

  const cid = '22666004139776'

  console.log('Launching Chrome...')
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    extraHTTPHeaders: {}
  })

  // Intercept and capture API responses
  const capturedRequests = []
  await context.route('**/api/htoj-biz-gateway/**', async (route, request) => {
    const url = request.url()
    console.log(`Intercept: ${url.replace(/^https:\/\/[^\/]+/, '')}`)
    const response = await route.fetch()
    const body = await response.text()
    capturedRequests.push({ url, status: response.status(), body: body.slice(0, 500) })
    await route.continue()
  })

  const page = await context.newPage()

  // Set JWT token in localStorage before navigation
  // First navigate to htoj.com.cn to set up the context
  await page.goto('https://htoj.com.cn', { waitUntil: 'domcontentloaded', timeout: 15000 })

  // Set the token in localStorage
  const { default: axios } = await import('axios')
  const loginR = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl(phone),
    password: xl(pwd),
    countryCode: '86',
    short: false
  }, {
    headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
  })
  const token = loginR.data.data.token
  console.log('Token obtained:', token.slice(0, 40) + '...')

  // Set token in localStorage (key might be KEY_USER_LOGIN_TOKEN or similar)
  await page.evaluate((t) => {
    localStorage.setItem('KEY_USER_LOGIN_TOKEN', t)
    localStorage.setItem('KEY_ZONE', 'cpp')
  }, token)

  // Navigate to contest page
  console.log('\nNavigating to contest page...')
  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`, {
    waitUntil: 'networkidle',
    timeout: 30000
  })

  // Wait a bit for API calls
  await page.waitForTimeout(3000)

  if (capturedRequests.length > 0) {
    console.log('\n=== Captured API calls ===')
    capturedRequests.forEach(r => {
      console.log(`URL: ${r.url}`)
      console.log(`Status: ${r.status}`)
      console.log(`Body: ${r.body}`)
      console.log('---')
    })
  } else {
    console.log('\nNo API calls captured to /api/htoj-biz-gateway/')
    
    // Get page content to diagnose
    const content = await page.content()
    console.log('Page content (first 1000):', content.slice(0, 1000))
  }

  await browser.close()
}

main().catch(e => {
  console.error('Fatal error:', e.message)
  process.exit(1)
})
