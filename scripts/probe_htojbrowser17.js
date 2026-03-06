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
  const userInfo = JSON.stringify(loginR.data.data.userInfo || {})
  console.log('Login OK')

  // ===== Part 1: Test htoj-biz-gateway APIs directly =====
  const h = {
    'Authorization': token,
    'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0', 'app_id': 'com.hetao101.oj',
    'Hetao-Oj-Zone': 'cpp',
    'Origin': 'https://htoj.com.cn', 'Referer': 'https://htoj.com.cn/',
  }

  console.log('\n=== Test htoj-biz-gateway problem APIs ===')
  const gwBase = 'https://api.htoj.com.cn/api/htoj-biz-gateway'
  const gwPaths = [
    `${gwBase}/oj/problem/info?pid=${pid}`,
    `${gwBase}/oj/problem?pid=${pid}`,
    `${gwBase}/oj/problem/detail?pid=${pid}`,
    `${gwBase}/oj/problem/${pid}`,
    `${gwBase}/oj/contest/problem?cid=${cid}&pid=${pid}`,
    `${gwBase}/oj/problem/info?problemId=${problemId}`,
    `${gwBase}/api/oj/problem/info?pid=${pid}`,
    `${gwBase}/api/oj/problem/detail?pid=${pid}`,
    // Try with auth user-info (we know this works)
    `${gwBase}/api/get-user-info`,
    // Try user's problem submission endpoint
    `${gwBase}/oj/problem-status?pid=${pid}`,
  ]

  for (const url of gwPaths) {
    try {
      const r = await axios.get(url, { headers: h, timeout: 8000 })
      const d = r.data
      const str = JSON.stringify(d)
      const hasContent = ['inputDesc','outputDesc','sampleCase','content','timeLimit','memLimit','title'].filter(k => str.includes(k)).length > 2
      const short = url.replace('https://api.htoj.com.cn', '')
      console.log(`${hasContent ? '🎯' : d.errCode === 0 ? '✅' : '❌'} [${r.status}] ${short.split('?')[0]}: errCode=${d.errCode}${hasContent ? '\n  DATA: ' + str.slice(0, 500) : ''}`)
    } catch(e) {
      const short = url.replace('https://api.htoj.com.cn', '').split('?')[0]
      console.log(`❌ [${e.response?.status||'ERR'}] ${short}: ${JSON.stringify(e.response?.data||e.message).slice(0,100)}`)
    }
  }

  // ===== Part 2: Playwright - use page.locator().click() =====
  console.log('\n=== Test Playwright real user click ===')
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true, args: ['--no-sandbox']
  })
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  await context.addInitScript((args) => {
    localStorage.setItem('KEY_ZONE', '"cpp"')
    localStorage.setItem('KEY_ZONE_GUIDE', '"shown"')
    localStorage.setItem('KEY_USER_LOGIN_TOKEN', `"${args.token}"`)
    localStorage.setItem('KEY_USER_INFO', args.userInfo)
  }, { token, userInfo })

  const page = await context.newPage()
  await page.route('**/*', async (route) => {
    const url = route.request().url()
    if (url.includes('api.htoj.com.cn') || url.includes('api.hetao101.com')) {
      await route.continue({
        headers: { ...route.request().headers(), 'authorization': token, 'hetao-oj-zone': 'cpp', 'ht_platform': 'htojWeb', 'ht_system': 'web', 'ht_version': '1.0.0', 'app_id': 'com.hetao101.oj' }
      })
    } else { await route.continue() }
  })

  const allApiCalls = []
  page.on('response', async resp => {
    const url = resp.url()
    if ((url.includes('api.htoj.com.cn') || url.includes('api.hetao101.com')) && 
        !url.includes('arms-') && !url.includes('sensors') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      allApiCalls.push({ url, status: resp.status(), body: body.slice(0, 500) })
      if (body && !body.startsWith('<')) {
        try {
          const d = JSON.parse(body)
          const str = JSON.stringify(d)
          const hasContent = ['inputDesc','outputDesc','sampleCase','timeLimit'].filter(k => str.includes(k)).length >= 2
          if (hasContent) {
            console.log('\n🎯 BROWSER CAPTURED CONTENT:', url.replace('https://api.htoj.com.cn','').split('?')[0])
            console.log(str.slice(0, 800))
          }
        } catch(e) {}
      }
    }
  })

  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(1500)
  const prevCount = allApiCalls.length

  // Use Playwright real click (not evaluate)
  try {
    // Find the problem title link "瞬移" in table context
    const el = await page.locator('td:has(a:text("瞬移")) a:text("瞬移")').first()
    const isVisible = await el.isVisible()
    console.log('Table problem link visible:', isVisible)
    if (isVisible) {
      await el.click()
      console.log('Clicked!')
    } else {
      // Try clicking by coordinates
      await page.locator('text=瞬移').first().click()
    }
  } catch(e) {
    console.log('Click error:', e.message.slice(0, 100))
    // Fallback: find and click
    await page.locator('text=瞬移').first().click({ force: true })
  }

  await page.waitForTimeout(6000)

  const newCalls = allApiCalls.slice(prevCount)
  console.log(`\nNew API calls: ${newCalls.length}`)
  newCalls.forEach(c => {
    const short = c.url.replace('https://api.htoj.com.cn','').replace('https://api.hetao101.com','').split('?')[0]
    try {
      const d = JSON.parse(c.body)
      console.log(`  [${c.status}] ${short}: errCode=${d.errCode}`)
    } catch(e) { console.log(`  [${c.status}] ${short}: ${c.body.slice(0,80)}`) }
  })

  const state = await page.evaluate(() => {
    return {
      url: location.href,
      contentFound: ['输入格式','输出格式','题目描述','时间限制'].some(k => document.body.innerText.includes(k)),
      modal: (() => {
        const m = document.querySelector('.ant-modal-content,.ant-drawer-content,.ant-drawer-body')
        return m ? m.innerText.slice(0, 300) : 'none'
      })()
    }
  })
  console.log('\nURL:', state.url)
  console.log('Content found:', state.contentFound)
  console.log('Modal/Drawer:', state.modal.slice(0, 150))

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
