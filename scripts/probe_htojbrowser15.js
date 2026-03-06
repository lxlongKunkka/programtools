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
  const userInfo = JSON.stringify(loginR.data.data.userInfo || {})
  console.log('Login OK, token:', token.slice(0, 30) + '...')

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  })
  const context = await browser.newContext({ ignoreHTTPSErrors: true })

  // Set localStorage BEFORE the page loads
  await context.addInitScript((args) => {
    const { token, userInfo } = args
    try {
      localStorage.setItem('KEY_ZONE', '"cpp"')   // JSON.stringify("cpp") = '"cpp"'
      localStorage.setItem('KEY_ZONE_GUIDE', '"shown"')
      localStorage.setItem('KEY_USER_LOGIN_TOKEN', `"${token}"`)
      localStorage.setItem('KEY_USER_INFO', userInfo)
    } catch(e) {}
  }, { token, userInfo })

  const page = await context.newPage()

  // Inject auth headers
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

  // Capture ALL API responses
  const allApiCalls = []
  page.on('response', async resp => {
    const url = resp.url()
    if ((url.includes('api.htoj.com.cn') || url.includes('api.hetao101.com')) && 
        !url.includes('arms-') && !url.includes('sensors') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.startsWith('<')) {
        const shortUrl = url.replace('https://api.htoj.com.cn','').replace('https://api.hetao101.com','')
        allApiCalls.push({ url: shortUrl, status: resp.status(), body })
        
        try {
          const d = JSON.parse(body)
          const str = JSON.stringify(d)
          const hasContent = ['inputDesc','outputDesc','sampleCase','content','timeLimit','memLimit'].some(k => str.includes(k))
          if (hasContent) {
            console.log(`\n🎯🎯🎯 FOUND PROBLEM CONTENT!`)
            console.log(`URL: ${shortUrl}`)
            console.log(str.slice(0, 1000))
          } else if (d.errCode !== undefined && !shortUrl.includes('arms')) {
            console.log(`[${resp.status()}] ${shortUrl.split('?')[0]}: errCode=${d.errCode}`)
          }
        } catch(e) {}
      }
    }
  })

  console.log('\n=== Loading contest page (with localStorage pre-set) ===')
  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(2000)

  // Check if zone modal still appears
  const zoneModal = await page.evaluate(() => {
    const m = document.querySelector('.ant-modal-content')
    return m ? m.innerText.slice(0, 100) : 'No modal'
  })
  console.log('Zone modal after load:', zoneModal)

  const beforeCount = allApiCalls.length
  console.log(`\n=== Clicking problem link ===`)

  // Click the problem
  const clicked = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'))
    const el = all.find(e => e.children.length === 0 && e.textContent.trim() === '瞬移')
    if (el) {
      el.click()
      return { tag: el.tagName, cls: el.className, parent: el.parentElement?.tagName, gramp: el.parentElement?.parentElement?.tagName }
    }
    return { notFound: true }
  })
  console.log('Clicked:', clicked)

  // Wait for any new requests
  await page.waitForTimeout(8000)

  const newCalls = allApiCalls.slice(beforeCount)
  console.log(`\nNew API calls after click: ${newCalls.length}`)
  newCalls.forEach(c => {
    try {
      const d = JSON.parse(c.body)
      const str = JSON.stringify(d)
      const has = ['inputDesc','outputDesc','sampleCase','content','timeLimit'].some(k => str.includes(k))
      console.log(`  ${has ? '🎯' : d.errCode === 0 ? '✅' : '❌'} [${c.status}] ${c.url.split('?')[0].slice(0, 100)}: errCode=${d.errCode}`)
      if (has) console.log('    CONTENT:', str.slice(0, 2000))
    } catch(e) {
      console.log(`  [${c.status}] ${c.url.split('?')[0].slice(0, 100)}: ${c.body.slice(0, 100)}`)
    }
  })

  // Check the URL + DOM
  const state = await page.evaluate(() => {
    const modal = document.querySelector('.ant-modal-content,.ant-drawer-content')
    const contentFound = ['输入格式','输出格式','题目描述','时间限制'].some(t => document.body.innerText.includes(t))
    return {
      url: location.href,
      modalText: modal ? modal.innerText.slice(0, 200) : 'No modal',
      contentFound,
      bodyText: document.body.innerText.slice(0, 2000)
    }
  })
  console.log('\nCurrent URL:', state.url)
  console.log('Content found:', state.contentFound)
  console.log('Modal text:', state.modalText)
  if (state.contentFound) {
    console.log('BODY TEXT:', state.bodyText)
  }

  // Screenshot
  await page.screenshot({ path: 'scripts/htoj_after_click.png' })
  console.log('\nScreenshot: scripts/htoj_after_click.png')

  // Print ALL API calls
  console.log('\n=== All API calls summary ===')
  allApiCalls.forEach(c => {
    try {
      const d = JSON.parse(c.body)
      console.log(`  [${c.status}] ${c.url.split('?')[0].slice(0, 80)}: errCode=${d.errCode}`)
    } catch(e) {
      console.log(`  [${c.status}] ${c.url.split('?')[0].slice(0, 80)}`)
    }
  })

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
