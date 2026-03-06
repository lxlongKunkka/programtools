import { chromium } from 'playwright'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'

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
  console.log('Token:', token.slice(0, 40) + '...')

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false, // Show browser window for debugging
    args: ['--no-sandbox']
  })

  const context = await browser.newContext()
  const page = await context.newPage()

  // Intercept ALL requests to hetao domains
  const captured = []
  page.on('request', req => {
    const url = req.url()
    if (url.includes('htoj') || url.includes('hetao')) {
      if (!url.includes('fedmarketing') && !url.includes('.jpg') && !url.includes('.png') && !url.includes('.css') && !url.includes('.js')) {
        console.log(`REQ: ${req.method()} ${url}`)
      }
    }
  })
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('htoj') || url.includes('hetao')) {
      if (!url.includes('fedmarketing') && !url.includes('.jpg') && !url.includes('.png') && !url.includes('.css') && !url.includes('.js')) {
        let body = ''
        try { body = await resp.text() } catch(e) {}
        if (body && body.length > 0 && !body.includes('<html')) {
          captured.push({ url, status: resp.status(), body: body.slice(0, 500) })
          console.log(`RESP[${resp.status()}]: ${url} → ${body.slice(0, 200)}`)
        }
      }
    }
  })

  // Navigate and set up auth
  await page.goto('https://htoj.com.cn', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  
  // Check what localStorage keys exist
  const localStorageKeys = await page.evaluate(() => Object.keys(localStorage))
  console.log('\nExisting localStorage keys:', localStorageKeys)
  
  // Set token - try different key names
  await page.evaluate((t) => {
    localStorage.setItem('KEY_USER_LOGIN_TOKEN', t)
    localStorage.setItem('userToken', t) 
    localStorage.setItem('token', t)
    localStorage.setItem('KEY_ZONE', 'cpp')
    window.__DEBUG_TOKEN__ = t
  }, token)
  
  console.log('\nNavigating to contest page...')
  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail?cid=${cid}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(5000)
  
  // Check localStorage after full page load
  const afterKeys = await page.evaluate(() => {
    const result = {}
    Object.keys(localStorage).forEach(k => {
      const v = localStorage.getItem(k)
      result[k] = v ? v.slice(0, 50) : null
    })
    return result
  })
  console.log('\nLocalStorage after page load:', JSON.stringify(afterKeys, null, 2))
  
  if (captured.length > 0) {
    console.log('\n=== All captured API responses ===')
    captured.forEach(r => {
      console.log(`[${r.status}] ${r.url}`)
      console.log(r.body)
      console.log('---')
    })
  } else {
    console.log('\nNo API calls captured!')
    // Check page title and content
    const title = await page.title()
    console.log('Page title:', title)
  }

  await page.waitForTimeout(3000) // Give time to observe
  await browser.close()
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
