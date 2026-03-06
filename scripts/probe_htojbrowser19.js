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
        !url.includes('arms-') && !url.includes('sensors') && !url.includes('datacenter') && !url.includes('heart-beat')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      allApiCalls.push({ url, status: resp.status(), body: body.slice(0, 2000) })
      if (body) {
        try {
          const d = JSON.parse(body)
          const str = JSON.stringify(d)
          const hasContent = ['inputDesc','outputDesc','sampleCase','timeLimit','memLimit'].filter(k => str.includes(k)).length >= 2
          console.log(`[${resp.status()}] ${url.replace('https://api.htoj.com.cn','').split('?')[0]}: errCode=${d.errCode}${hasContent ? ' 🎯HAS_CONTENT' : ''}`)
          if (hasContent) console.log('CONTENT:', str.slice(0, 1000))
        } catch(e) {}
      }
    }
  })

  // Load the main page first (ensure SPA is loaded)
  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(2000)
  const prevCount = allApiCalls.length
  console.log(`Initial API calls: ${prevCount}`)

  // Try SPA navigation using history.pushState then click
  // Method 1: Check what Nuxt uses for navigation
  const nuxtInfo = await page.evaluate(() => {
    // Check for Nuxt 3 app context
    const nuxtApp = window.__NUXT_APP__ || window.nuxtApp || window.$nuxt
    const composables = ['useRouter', 'useNuxtApp', 'navigateTo']
    const available = composables.filter(c => typeof window[c] !== 'undefined')
    
    // Check window.useNuxtApp
    let router = null
    try {
      if (typeof window.useNuxtApp === 'function') {
        const nuxt = window.useNuxtApp()
        router = nuxt?.vueApp?.config?.globalProperties?.$router
      }
    } catch(e) {}
    
    return { available, hasNuxtApp: !!nuxtApp, hasRouter: !!router }
  })
  console.log('\nNuxt info:', nuxtInfo)

  // Method 2: navigate to multiple possible problem URLs via history.pushState
  const testUrls = [
    `/cpp/oj/problem/${problemId}`,
    `/cpp/oj/contest/detail/problem/${pid}?cid=${cid}`,
    `/cpp/oj/contest/${cid}/problem/${pid}`,
    `/cpp/oj/contest/problem?cid=${cid}&pid=${pid}`,
    `/cpp/oj/contest/detail/problem?cid=${cid}&problemId=${problemId}`,
  ]

  for (const path of testUrls) {
    console.log(`\n--- Navigating to ${path} ---`)
    const apisBefore = allApiCalls.length
    
    // Navigate using history.pushState
    await page.evaluate((newPath) => {
      window.history.pushState({}, '', newPath)
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
    }, path)
    
    await page.waitForTimeout(4000)
    
    const newCalls = allApiCalls.slice(apisBefore)
    const currentUrl = page.url()
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300))
    
    console.log(`URL: ${currentUrl}`)
    console.log(`New API calls: ${newCalls.length}`)
    newCalls.forEach(c => {
      const short = c.url.replace('https://api.htoj.com.cn','').split('?')[0]
      try {
        const d = JSON.parse(c.body)
        console.log(`  [${c.status}] ${short}: errCode=${d.errCode}`)
      } catch(e) { console.log(`  [${c.status}] ${short}`) }
    })
    console.log('Body (first 200):', bodyText.slice(0, 200))
    
    if (bodyText.includes('输入格式') || bodyText.includes('题目描述') || bodyText.includes('样例')) {
      console.log('\n🎯 FOUND PROBLEM CONTENT IN DOM!')
      break
    }
  }

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
