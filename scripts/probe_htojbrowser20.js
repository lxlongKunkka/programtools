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
      allApiCalls.push({ url, status: resp.status(), body: body.slice(0, 3000) })
      if (body) {
        try {
          const d = JSON.parse(body)
          const str = JSON.stringify(d)
          const hasContent = ['inputDesc','outputDesc','sampleCase','timeLimit','memLimit'].filter(k => str.includes(k)).length >= 2
          if (hasContent) {
            console.log(`\n🎯 CONTENT FOUND! ${url.replace('https://api.htoj.com.cn','').split('?')[0]}`)
            console.log(str.slice(0, 1500))
          }
        } catch(e) {}
      }
    }
  })

  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(2000)

  // Get routes from Nuxt
  const routes = await page.evaluate(() => {
    try {
      const app = window.useNuxtApp()
      const router = app.vueApp.config.globalProperties.$router
      const routes = router.getRoutes()
      return routes.map(r => ({ name: r.name, path: r.path }))
    } catch(e) {
      return { error: e.message }
    }
  })
  console.log('\n=== All Nuxt routes (', routes.length, 'routes) ===')
  if (Array.isArray(routes)) {
    routes.forEach(r => console.log(`  ${r.name || '?'}: ${r.path}`))
  } else {
    console.log(routes)
  }

  // Now navigate to the problem using the router
  const prevCount = allApiCalls.length

  // Try using router.push with the actual vue router
  console.log('\n=== Trying router.push to problem page ===')
  const navResult = await page.evaluate((args) => {
    const { cid, pid, problemId } = args
    const app = window.useNuxtApp()
    const router = app.vueApp.config.globalProperties.$router
    const routes = router.getRoutes()
    
    // Find problem page routes
    const probRoutes = routes.filter(r => 
      r.path?.toLowerCase().includes('problem') || 
      r.name?.toLowerCase?.()?.includes('problem')
    )
    
    return probRoutes.map(r => ({ name: r.name, path: r.path }))
  }, { cid, pid, problemId })
  console.log('Problem routes:', JSON.stringify(navResult, null, 2))

  // Try to navigate to problem page by name
  console.log('\n=== Trying navigateTo with problem routes ===')
  for (const route of (navResult || []).slice(0, 10)) {
    const newPath = route.path.replace(':id', pid).replace(':cid', cid).replace(':pid', pid).replace(':problemId', problemId)
    console.log(`Trying ${route.name}: ${newPath}`)
    const apisBefore = allApiCalls.length
    
    await page.evaluate((args) => {
      const { path, name, cid, pid, problemId } = args
      const app = window.useNuxtApp()
      const router = app.vueApp.config.globalProperties.$router
      router.push({ name, params: { pid, cid, problemId }, query: { cid, pid } }).catch(e => {})
    }, { path: newPath, name: route.name, cid, pid, problemId })
    
    await page.waitForTimeout(3000)
    
    const newCalls = allApiCalls.slice(apisBefore)
    const url = page.url()
    const body = await page.evaluate(() => document.body.innerText.slice(0, 200))
    
    if (newCalls.length > 0 || !body.includes('404')) {
      console.log('  URL:', url)
      console.log('  New API calls:', newCalls.map(c => c.url.replace('https://api.htoj.com.cn','').split('?')[0]).join(', '))
      console.log('  Body:', body.slice(0, 100))
    }
  }

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
