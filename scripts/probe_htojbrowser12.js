import { chromium } from 'playwright'
import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'
  const pid = '22663958373760'
  const problemId = 'P11715'

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

  // Inject auth headers
  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (url.includes('api.htoj.com.cn')) {
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

  // Capture ALL API calls with full response
  const apiCalls = []
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('arms-') && !url.includes('sensors') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.startsWith('<')) {
        const shortUrl = url.replace('https://api.htoj.com.cn/api/code-community/api', '').replace('https://api.htoj.com.cn', '')
        apiCalls.push({ url: shortUrl, status: resp.status(), body })
      }
    }
  })

  // Test 1: Navigate to problem page using short problemId
  console.log('\n=== Test 1: /cpp/oj/problem/P11715 ===')
  try {
    await page.goto(`https://htoj.com.cn/cpp/oj/problem/P11715`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(4000)
    const title = await page.title()
    const url = page.url()
    console.log('URL:', url, 'Title:', title)
    const text = await page.evaluate(() => document.body.innerText.slice(0, 200))
    console.log('Text:', text)
  } catch(e) { console.log('Test1 err:', e.message.slice(0,100)) }

  // Test 2: Navigate to contest page and simulate clicking on problem via keyboard/mouse
  console.log('\n=== Test 2: Contest page - click problem row ===')
  const beforeLen = apiCalls.length
  try {
    await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Try to click the first problem row (not just the <a> link but the whole row)
    const clicked = await page.evaluate(() => {
      // Look for table row containing "瞬移"
      const allEls = Array.from(document.querySelectorAll('tr,li,.problem-item,.problem-row'))
      const el = allEls.find(e => e.textContent.includes('瞬移'))
      if (el) {
        console.log('Found:', el.tagName, el.className)
        el.click()
        return { found: true, tag: el.tagName, cls: el.className }
      }
      // Fallback: find any element with "瞬移"
      const anyEl = Array.from(document.querySelectorAll('*')).find(e => e.children.length === 0 && e.textContent.trim() === '瞬移')
      if (anyEl) {
        const parent = anyEl.closest('tr,li,div.problem') || anyEl.parentElement
        parent?.click()
        anyEl.click()
        return { found: true, tag: anyEl.tagName, cls: anyEl.className, parent: parent?.tagName }
      }
      return { found: false }
    })
    console.log('Click result:', clicked)
    
    // Wait for API calls
    await page.waitForTimeout(5000)

    const newCalls = apiCalls.slice(beforeLen)
    console.log(`New API calls (${newCalls.length}):`)
    newCalls.forEach(c => {
      let hasContent = false
      try {
        const d = JSON.parse(c.body)
        const str = JSON.stringify(d)
        hasContent = ['inputDesc','outputDesc','sampleCase','content','timeLimit','memLimit'].some(k => str.includes(k))
        console.log(`  ${hasContent ? '🎯' : d.errCode === 0 ? '✅' : '❌'} [${c.status}] ${c.url.split('?')[0]}: errCode=${d.errCode}`)
        if (hasContent) {
          console.log('  FULL:', str.slice(0, 1000))
        } else if (d.errCode === 0 && d.data) {
          console.log('  Data keys:', Object.keys(d.data))
        }
      } catch(e) {
        console.log(`  [${c.status}] ${c.url.split('?')[0]}: ${c.body.slice(0,100)}`)
      }
    })
    
    // Check if modal/panel appeared with problem content
    const pageState = await page.evaluate(() => {
      const indicators = ['输入格式','输出格式','样例','题目描述','题目背景']
      const found = indicators.filter(i => document.body.innerText.includes(i))
      return { url: location.href, contentFound: found, innerTextSnippet: document.body.innerText.slice(0, 3000) }
    })
    console.log('\nContent indicators after click:', pageState.contentFound)
    if (pageState.contentFound.length > 0) {
      console.log('TEXT SNIPPET:', pageState.innerTextSnippet.slice(0, 1000))
    }
  } catch(e) { console.log('Test2 err:', e.message.slice(0,100)) }

  // Print ALL API calls summary
  console.log('\n=== ALL API CALLS SUMMARY ===')
  apiCalls.forEach(c => {
    let errCode = '?'
    try { errCode = JSON.parse(c.body).errCode } catch(e) {}
    const path = c.url.split('?')[0]
    console.log(`  [${c.status}] ${path}: errCode=${errCode}`)
  })

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
