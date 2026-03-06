import { chromium } from 'playwright'
import axios from 'axios'

function xl(str) {
  return str.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('')
}

async function main() {
  const phone = process.env.HTOJ_PHONE
  const pwd = process.env.HTOJ_PWD
  const cid = '22666004139776'
  const contestPid = '22663958373760'

  const loginR = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl(phone), password: xl(pwd), countryCode: '86', short: false
  }, {
    headers: {'HT_PLATFORM':'htojWeb','HT_SYSTEM':'web','HT_VERSION':'1.0.0','app_id':'com.hetao101.oj','Content-Type':'application/json'}
  })
  const token = loginR.data.data.token

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  for (const pattern of ['**/api/code-community/**', '**/api/htoj-biz-gateway/**']) {
    await page.route(pattern, async (route) => {
      await route.continue({
        headers: { ...route.request().headers(), 'authorization': token, 'hetao-oj-zone': 'cpp', 'ht_platform': 'htojWeb', 'ht_system': 'web', 'ht_version': '1.0.0', 'app_id': 'com.hetao101.oj' }
      })
    })
  }

  // Collect ALL API responses
  const apiResponses = {}
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('arms-retcode') && !url.includes('sensors') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.includes('<html')) {
        const key = url.replace('https://api.htoj.com.cn', '')
        apiResponses[key] = body
        const path = key.split('?')[0]
        try {
          const d = JSON.parse(body)
          console.log(`\n→ [${resp.status()}] ${path}: errCode=${d.errCode}`)
          if (d.errCode === 0 && d.data) {
            const str = JSON.stringify(d.data)
            const isNew = ['inputDesc','outputDesc','sampleCase','answer','problemNote','inputSample','outputSample'].some(k => str.includes(k))
            if (isNew) {
              console.log('  🎯 NEW CONTENT:', str.slice(0, 800))
            }
          }
        } catch(e) {}
      }
    }
  })

  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(2000)

  // Click on "瞬移" using JS
  console.log('\n=== Clicking problem via JS ===')
  const beforeClick = Object.keys(apiResponses).length
  
  const clicked = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a,td,div,span'))
    const el = links.find(el => el.textContent.trim() === '瞬移')
    if (el) { el.click(); return { tag: el.tagName, className: el.className } }
    return null
  })
  console.log('Clicked element:', clicked)
  
  // Wait for any new API calls
  await page.waitForTimeout(5000)
  
  const afterClick = Object.keys(apiResponses).length
  console.log(`API calls before: ${beforeClick}, after: ${afterClick}`)
  
  // Print any new API calls
  const newCalls = Object.keys(apiResponses).filter((k, i) => i >= beforeClick)
  if (newCalls.length > 0) {
    console.log('New API calls:', newCalls)
    newCalls.forEach(k => {
      try {
        const d = JSON.parse(apiResponses[k])
        console.log(k.split('?')[0], ':', JSON.stringify(d).slice(0, 500))
      } catch(e) {}
    })
  }

  // Check what appeared in the DOM
  const domText = await page.evaluate(() => {
    // Look for problem content elements
    const possible = ['题目背景', '题目描述', '题目说明', '输入格式', '输入描述', '样例输入', '输出格式', '输出描述']
    let found = []
    possible.forEach(text => {
      if (document.body.innerText.includes(text)) {
        found.push(text)
      }
    })
    return { url: location.href, contentIndicators: found, bodyText: document.body.innerText.slice(500, 2000) }
  })
  console.log('\nPage state after click:', JSON.stringify(domText))

  // Also try querying the API directly with single pid
  console.log('\n=== Direct API test ===')
  const h = { 'Authorization': token, 'HT_PLATFORM':'htojWeb', 'HT_SYSTEM':'web', 'HT_VERSION':'1.0.0', 'app_id':'com.hetao101.oj', 'Hetao-Oj-Zone':'cpp', 'Origin':'https://htoj.com.cn' }
  const testPaths = [
    `https://api.htoj.com.cn/api/code-community/api/get-contest-problem?cid=${cid}&pid=${contestPid}`,
    `https://api.htoj.com.cn/api/code-community/api/get-contest-problem?cid=${cid}&pid=${contestPid}&detail=1`,
    `https://api.htoj.com.cn/api/code-community/api/get-problem?pid=${contestPid}`,
    `https://api.htoj.com.cn/api/code-community/api/problem?pid=${contestPid}`,
  ]
  for (const url of testPaths) {
    try {
      const r = await axios.get(url, { headers: h, timeout: 6000 })
      const d = r.data
      const str = JSON.stringify(d)
      const hasContent = ['inputDesc','outputDesc','sampleCase','answer','problemNote'].some(k => str.includes(k))
      const path = url.replace('https://api.htoj.com.cn','').split('?')[0]
      console.log(`${hasContent ? '🎯' : '✅'} ${path}: errCode=${d.errCode} ${hasContent ? 'HAS CONTENT' : str.slice(0,150)}`)
    } catch(e) {
      const path = url.replace('https://api.htoj.com.cn','').split('?')[0]
      console.log(`❌ ${path}: ${e.response?.status} ${JSON.stringify(e.response?.data).slice(0,100)}`)
    }
  }

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message.slice(0, 200)); process.exit(1) })
