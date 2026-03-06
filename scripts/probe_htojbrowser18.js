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
        !url.includes('arms-') && !url.includes('sensors') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      allApiCalls.push({ url, status: resp.status(), body: body.slice(0, 100) })
      if (body) {
        try {
          const d = JSON.parse(body)
          const str = JSON.stringify(d)
          if (str.length > 200 && !url.includes('heart-beat') && !url.includes('message')) {
            console.log(`[${resp.status()}] ${url.replace('https://api.htoj.com.cn','').split('?')[0]}: errCode=${d.errCode}`)
          }
        } catch(e) {}
      }
    }
  })

  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(1500)

  // Inspect Vue app and router
  const vueInfo = await page.evaluate((args) => {
    const { cid, pid, problemId } = args
    
    // Try to access Vue app
    let router = null
    let routes = []
    
    // Various ways to get Vue router
    const app = window.__vue_app__
    if (app) {
      router = app.config?.globalProperties?.$router
    }
    
    if (!router) {
      // Try to find Vue component instances
      const vnode = document.querySelector('[data-v-app]')
      if (vnode?._vei) {
        router = vnode._vei
      }
    }
    
    // Try clicking different elements to see what happens
    const handlers = []
    
    // Check all elements near "瞬移" for click handlers
    const allEls = Array.from(document.querySelectorAll('tr,td,a'))
    for (const el of allEls) {
      const text = el.textContent.slice(0, 30)
      if (text.includes('瞬')) {
        const vei = el._vei
        const hasClickHandler = !!(vei && vei.onClick)
        handlers.push({
          tag: el.tagName,
          text: text.slice(0, 20),
          cls: el.className.slice(0, 40),
          hasVueClick: hasClickHandler
        })
      }
    }
    
    // Get the router from the app
    let routerPushTest = null
    if (app?.config?.globalProperties?.$router) {
      const r = app.config.globalProperties.$router
      // Try to get current route to understand structure
      const current = r.currentRoute?.value
      routerPushTest = {
        path: current?.path,
        name: current?.name,
        params: current?.params,
        query: current?.query,
        fullPath: current?.fullPath
      }
    }
    
    return { handlers, routerPushTest }
  }, { cid, pid, problemId })
  console.log('\nVue element handlers:', JSON.stringify(vueInfo.handlers, null, 2))
  console.log('\nRouter current route:', JSON.stringify(vueInfo.routerPushTest, null, 2))

  const prevCount = allApiCalls.length

  // Try router.push() to navigate to the problem page
  const routerResult = await page.evaluate((args) => {
    const { cid, pid, problemId } = args
    const app = window.__vue_app__
    const router = app?.config?.globalProperties?.$router

    if (!router) return { error: 'no router found', appKeys: Object.keys(app || {}) }

    // Get all routes
    const routes = router.getRoutes?.() || []
    const routeNames = routes.map(r => ({ name: r.name, path: r.path }))
    
    return { routeNames }
  }, { cid, pid, problemId })
  console.log('\nRouter routes:', JSON.stringify(routerResult?.routeNames?.slice(0, 30) || routerResult, null, 2))

  // Now try to navigate via router push with various route guesses
  const navResult = await page.evaluate((args) => {
    const { cid, pid, problemId } = args
    const app = window.__vue_app__
    const router = app?.config?.globalProperties?.$router
    if (!router) return 'no router'
    
    // Look for routes containing "problem"
    const routes = router.getRoutes?.() || []
    const problemRoutes = routes.filter(r => 
      r.path?.includes('problem') || r.name?.includes('problem')
    )
    return problemRoutes.map(r => ({ name: r.name, path: r.path, component: r.component?.toString?.()?.slice(0, 50) }))
  }, { cid, pid, problemId })
  console.log('\nProblem routes:', JSON.stringify(navResult, null, 2))

  // Try router push
  await page.evaluate((args) => {
    const { cid, pid } = args
    const router = window.__vue_app__?.config?.globalProperties?.$router
    if (router) {
      // Try pushing different routes
      try {
        router.push(`/cpp/oj/contest/detail/problem/${pid}?cid=${cid}`)
      } catch(e) {}
    }
  }, { cid, pid })
  
  await page.waitForTimeout(4000)
  
  const newCalls = allApiCalls.slice(prevCount)
  console.log(`\nNew API calls after router push: ${newCalls.length}`)
  newCalls.filter(c => !c.url.includes('heart-beat')).forEach(c => {
    const short = c.url.replace('https://api.htoj.com.cn','').split('?')[0]
    console.log(`  [${c.status}] ${short}: ${c.body.slice(0,100)}`)
  })

  const state = await page.evaluate(() => ({
    url: location.href,
    body: document.body.innerText.slice(0, 500)
  }))
  console.log('\nAfter nav:', state.url)

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
