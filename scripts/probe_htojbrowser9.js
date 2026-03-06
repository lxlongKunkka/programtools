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

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Inject auth
  for (const pattern of ['**/api/code-community/**', '**/api/htoj-biz-gateway/**']) {
    await page.route(pattern, async (route) => {
      await route.continue({
        headers: { ...route.request().headers(), 'authorization': token, 'hetao-oj-zone': 'cpp', 'ht_platform': 'htojWeb', 'ht_system': 'web', 'ht_version': '1.0.0', 'app_id': 'com.hetao101.oj' }
      })
    })
  }

  // Capture responses 
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('arms-retcode') && !url.includes('sensors')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.includes('<html') && body.length > 5) {
        try {
          const d = JSON.parse(body)
          const path = url.replace('https://api.htoj.com.cn', '').split('?')[0]
          const qs = url.includes('?') ? '?' + url.split('?')[1].slice(0,80) : ''
          if (d.errCode === 0 && d.data) {
            const dataStr = JSON.stringify(d.data)
            const hasContent = ['inputDesc', 'outputDesc', 'content', 'inputSample', 'outputSample', 'problemDesc', 'sampleCase'].some(k => dataStr.includes(k))
            console.log(`\n${hasContent ? '🎯' : '✅'} [${resp.status()}] ${path}${qs}`)
            if (hasContent) {
              console.log('PROBLEM CONTENT:', dataStr.slice(0, 1000))
            } else {
              console.log(dataStr.slice(0, 200))
            }
          } else if (d.errCode !== 0) {
            console.log(`\n❌ [${resp.status()}] ${path}: errCode=${d.errCode} ${d.errMsg || ''}`)
          }
        } catch(e) {}
      }
    }
  })

  // Navigate to contest problems page
  await page.goto(
    `https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`,
    { waitUntil: 'networkidle', timeout: 30000 }
  )
  await page.waitForTimeout(2000)

  // Close any modal by pressing Escape
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  // Or click elsewhere to dismiss
  await page.click('body', {position: {x: 640, y: 300}}).catch(() => {})
  await page.waitForTimeout(500)

  // Find all links that might be problem links and their hrefs
  const allLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      href: a.href,
      text: a.textContent.trim().slice(0, 60),
      dataAttrs: Array.from(a.attributes).map(attr => `${attr.name}=${attr.value}`).filter(s => s.includes('data-') || s.includes('pid') || s.includes('cid')).join(' ')
    })).filter(l => l.text.length > 0 || l.href.length > 0)
  })
  
  console.log('\n=== All links ===')
  allLinks.forEach(l => {
    if (l.href && !l.href.includes('fedmarketing') && !l.href.includes('.hetaoimg') && !l.href.includes('javascript'))
      console.log(`${l.href} | "${l.text}" | ${l.dataAttrs}`)
  })

  // Try to click on problem using JavaScript (bypassing pointer events interception)
  console.log('\n=== Force clicking 瞬移 via JS ===')
  const problemHref = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    const problemLink = links.find(a => a.textContent.trim() === '瞬移')
    if (problemLink) {
      problemLink.click()
      return problemLink.href
    }
    return null
  })
  console.log('Problem link href:', problemHref)
  await page.waitForTimeout(3000)

  const urlAfterClick = page.url()
  console.log('URL after click:', urlAfterClick)

  const textAfterClick = await page.evaluate(() => document.body.innerText.slice(0, 800))
  console.log('Text after click:', textAfterClick)

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
