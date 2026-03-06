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
  console.log('Login OK')

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  })
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()

  // Capture ALL responses (even errors and 403s)
  const allResponses = []
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') || url.includes('api.hetao101.com')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      allResponses.push({
        url: url.replace('https://api.htoj.com.cn','').replace('https://api.hetao101.com',''),
        status: resp.status(),
        body: body.slice(0, 500)
      })
    }
  })

  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (url.includes('api.htoj.com.cn') || url.includes('api.hetao101.com')) {
      await route.continue({
        headers: {
          ...route.request().headers(),
          'authorization': token,
          'hetao-oj-zone': 'cpp',
          'ht_platform': 'htojWeb',
          'ht_system': 'web',
          'ht_version': '1.0.0',
          'app_id': 'com.hetao101.oj'
        }
      })
    } else {
      await route.continue()
    }
  })

  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(1500)

  const prevApiCount = allResponses.length
  console.log(`APIs loaded: ${prevApiCount}`)

  // Click the problem link
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'))
    const el = all.find(e => e.children.length === 0 && e.textContent.trim() === '瞬移')
    el?.click()
    el?.parentElement?.click()
    el?.parentElement?.parentElement?.click()
    el?.parentElement?.parentElement?.parentElement?.click()
  })

  // Wait longer for modal to fully load
  await page.waitForTimeout(8000)

  console.log(`APIs after click: ${allResponses.length}`)
  if (allResponses.length > prevApiCount) {
    allResponses.slice(prevApiCount).forEach(r => console.log(`  [${r.status}] ${r.url.split('?')[0]}: ${r.body.slice(0, 200)}`))
  }

  // Get the FULL modal HTML
  const modalInfo = await page.evaluate(() => {
    const modal = document.querySelector('.ant-modal-content,.ant-drawer-content')
    if (!modal) {
      // Try to find any visible overlay
      const overlays = Array.from(document.querySelectorAll('[class*=modal],[class*=drawer],[class*=dialog],[class*=panel],[class*=overlay]'))
      const visible = overlays.filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
      if (visible.length > 0) {
        return { type: 'other', html: visible[0].outerHTML.slice(0, 2000), text: visible[0].innerText.slice(0, 500) }
      }
      return { notFound: true, url: location.href }
    }
    return {
      type: 'antd-modal',
      html: modal.outerHTML.slice(0, 3000),
      text: modal.innerText.slice(0, 1000)
    }
  })
  console.log('\nModal info:', JSON.stringify(modalInfo, null, 2))

  // Also check body scrollable content
  const bodyText = await page.evaluate(() => document.body.innerText)
  const bodySnippet = bodyText.slice(0, 5000)
  console.log('\nFull page text snippet:', bodySnippet)

  // Take screenshot
  await page.screenshot({ path: 'scripts/htoj_modal.png', fullPage: false })
  console.log('\nScreenshot saved: scripts/htoj_modal.png')

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
