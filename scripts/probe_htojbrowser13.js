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
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  })
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  const page = await context.newPage()

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

  // Capture ALL network requests after page is loaded
  const allRequests = []
  page.on('request', req => {
    const url = req.url()
    allRequests.push({ url, method: req.method() })
  })

  page.on('response', async resp => {
    const url = resp.url()
    if (!url.includes('.js') && !url.includes('.css') && !url.includes('.png') && 
        !url.includes('.woff') && !url.includes('.ico') && !url.includes('arms-ret') &&
        !url.includes('sensors') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.startsWith('<') && !body.startsWith('{u:') && body.length > 10) {
        console.log(`[${resp.status()}] ${url.replace('https://','').slice(0, 120)}`)
        try {
          const d = JSON.parse(body)
          const str = JSON.stringify(d)
          const hasContent = ['inputDesc','outputDesc','sampleCase','content','timeLimit','memLimit'].some(k => str.includes(k))
          if (hasContent) console.log('  🎯 HAS PROBLEM CONTENT:', str.slice(0, 500))
          else if (d.errCode !== undefined) console.log(`  errCode=${d.errCode}`, d.errMsg || '')
        } catch(e) {}
      }
    }
  })

  console.log('\n=== Loading contest page ===')
  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(2000)

  console.log('\n=== Clicking problem - capturing ALL new requests ===')
  const beforeCount = allRequests.length

  // Click the "瞬移" text
  const clicked = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll('*'))
    const el = allEls.find(e => e.children.length === 0 && e.textContent.trim() === '瞬移')
    if (el) {
      // Try clicking both the element and its parents up to 4 levels
      el.click()
      el.parentElement?.click()
      el.parentElement?.parentElement?.click()
      el.parentElement?.parentElement?.parentElement?.click()
      return { tag: el.tagName, cls: el.className, html: el.outerHTML }
    }
    return { notFound: true }
  })
  console.log('Clicked:', clicked)

  await page.waitForTimeout(6000)

  // Report new requests
  const newRequests = allRequests.slice(beforeCount)
  const interestingNew = newRequests.filter(r => 
    !r.url.includes('.js') && !r.url.includes('.css') && !r.url.includes('.png') &&
    !r.url.includes('.woff') && !r.url.includes('arms-') && !r.url.includes('sensors')
  )
  console.log('\nNew non-asset requests:', interestingNew.length)
  interestingNew.forEach(r => console.log(`  ${r.method} ${r.url.replace('https://','').slice(0, 120)}`))

  // Check new JS files loaded
  const newJs = newRequests.filter(r => r.url.includes('.js'))
  console.log('New JS files loaded:', newJs.map(r => r.url.split('/').pop()).join(', '))

  // Check if URL changed
  const currentUrl = page.url()
  console.log('\nCurrent URL:', currentUrl)

  // Check DOM for problem content
  const dom = await page.evaluate(() => {
    return {
      modalVisible: !!document.querySelector('.ant-modal-content,.ant-drawer-content,.modal,.drawer'),
      contentText: document.body.innerText.includes('输入格式') || document.body.innerText.includes('题目描述'),
      bodySnippet: document.body.innerText.slice(700, 2500)
    }
  })
  console.log('Modal visible:', dom.modalVisible)
  console.log('Content found:', dom.contentText)
  if (dom.contentText) {
    console.log('Body text:', dom.bodySnippet)
  }

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
