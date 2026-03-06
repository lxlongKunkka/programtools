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
        !url.includes('arms-') && !url.includes('sensors') && !url.includes('datacenter') && !url.includes('heart-beat') && !url.includes('message')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      allApiCalls.push({ url, status: resp.status(), body: body.slice(0, 5000) })
      if (body) {
        try {
          const d = JSON.parse(body)
          const str = JSON.stringify(d)
          const hasContent = ['inputDesc','outputDesc','sampleCase','timeLimit','memLimit'].filter(k => str.includes(k)).length >= 2
          if (hasContent) {
            console.log(`\n🎯🎯🎯 FOUND PROBLEM CONTENT!`)
            console.log(`URL: ${url.replace('https://api.htoj.com.cn', '')}`)
            console.log('DATA:', str.slice(0, 2000))
          } else if (d.errCode !== undefined && !url.includes('reward') && !url.includes('home-')) {
            const path = url.replace('https://api.htoj.com.cn','').split('?')[0]
            console.log(`[${resp.status()}] ${path}: errCode=${d.errCode}`)
          }
        } catch(e) {}
      }
    }
  })

  // Part 1: Navigate directly to oj_problem_detail
  console.log('\n=== Test 1: Navigate directly to /cpp/oj/problem/detail ===')
  
  const testUrls = [
    `https://htoj.com.cn/cpp/oj/problem/detail?pid=${pid}`,
    `https://htoj.com.cn/cpp/oj/problem/detail?pid=${pid}&cid=${cid}`,
    `https://htoj.com.cn/cpp/oj/problem/detail?problemId=${problemId}`,
    `https://htoj.com.cn/cpp/oj/problem/detail?problemId=${problemId}&cid=${cid}`,
  ]

  for (const url of testUrls) {
    const prevCount = allApiCalls.length
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300))
    const newCalls = allApiCalls.slice(prevCount)

    console.log(`\nLoaded: ${currentUrl}`)
    console.log(`New API calls: ${newCalls.map(c => c.url.replace('https://api.htoj.com.cn','').split('?')[0]).join(', ')}`)
    
    if (bodyText.includes('输入格式') || bodyText.includes('题目描述') || bodyText.includes('样例')) {
      console.log('🎯 CONTENT FOUND IN DOM:', bodyText.slice(0, 500))
      break
    } else {
      console.log('Body:', bodyText.slice(0, 100))
    }
  }

  // Part 2: Navigate via Nuxt router to oj_problem_detail
  console.log('\n=== Test 2: Navigate via Nuxt router push ===')
  await page.goto('https://htoj.com.cn/cpp', { waitUntil: 'networkidle', timeout: 20000 })
  await page.waitForTimeout(2000)
  
  const prevCount = allApiCalls.length
  
  await page.evaluate((args) => {
    const { pid, problemId, cid } = args
    const router = window.useNuxtApp()?.vueApp?.config?.globalProperties?.$router
    if (router) {
      // Navigate to problem detail with various query combinations
      router.push({ name: 'oj_problem_detail', query: { pid, cid } }).catch(e => console.log('push err:', e))
    }
  }, { pid, problemId, cid })
  
  await page.waitForTimeout(4000)
  
  const currentUrl = page.url()
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300))
  const newCalls = allApiCalls.slice(prevCount).filter(c => !c.url.includes('home-'))
  
  console.log('\nAfter router.push URL:', currentUrl)
  console.log('New API calls:', newCalls.map(c => c.url.replace('https://api.htoj.com.cn','').split('?')[0]).join(', '))
  if (bodyText.includes('输入格式') || bodyText.includes('题目描述') || bodyText.includes('样例')) {
    console.log('🎯 CONTENT IN DOM:', bodyText.slice(0, 500))
  } else {
    console.log('Body:', bodyText.slice(0, 200))
  }

  // Part 3: Direct API call of all plausible paths for problem detail
  console.log('\n=== Test 3: Direct API calls ===')
  const h = {
    'Authorization': token,
    'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0', 'app_id': 'com.hetao101.oj',
    'Hetao-Oj-Zone': 'cpp', 'Origin': 'https://htoj.com.cn',
  }
  
  const apiPaths = [
    `https://api.htoj.com.cn/api/code-community/api/get-problem?pid=${pid}`,
    `https://api.htoj.com.cn/api/code-community/api/get-problem?pid=${pid}&cid=${cid}`,
    `https://api.htoj.com.cn/api/code-community/api/get-problem?problemId=${problemId}`,
    `https://api.htoj.com.cn/api/code-community/api/get-problem-detail?pid=${pid}`,
    `https://api.htoj.com.cn/api/code-community/api/get-problem-detail?pid=${pid}&cid=${cid}`,
    `https://api.htoj.com.cn/api/code-community/api/problem-detail?pid=${pid}&cid=${cid}`,
    `https://api.htoj.com.cn/api/code-community/api/problem-detail?problemId=${problemId}&cid=${cid}`,
    `https://api.htoj.com.cn/api/code-community/api/get-problem-detail?pid=${pid}&from=contest`,
    `https://api.htoj.com.cn/api/htoj-biz-gateway/api/problem?pid=${pid}`,
    `https://api.htoj.com.cn/api/htoj-biz-gateway/api/problem-detail?pid=${pid}`,
  ]
  
  for (const url of apiPaths) {
    try {
      const r = await axios.get(url, { headers: h, timeout: 8000 })
      const d = r.data
      const str = JSON.stringify(d)
      const hasContent = ['inputDesc','outputDesc','sampleCase','timeLimit','memLimit'].filter(k => str.includes(k)).length >= 2
      const path = url.replace('https://api.htoj.com.cn','').split('?')[0]
      console.log(`${hasContent ? '🎯' : d.errCode === 0 ? '✅' : '❌'} [${r.status}] ${path}: errCode=${d.errCode}${hasContent ? ' ' + str.slice(0,500) : ''}`)
    } catch(e) {
      const path = url.replace('https://api.htoj.com.cn','').split('?')[0]
      console.log(`❌ [${e.response?.status||'ERR'}] ${path}: ${JSON.stringify(e.response?.data||e.message).slice(0,100)}`)
    }
  }

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
