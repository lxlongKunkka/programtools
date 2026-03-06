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

  for (const pattern of ['**/api/code-community/**', '**/api/htoj-biz-gateway/**']) {
    await page.route(pattern, async (route) => {
      await route.continue({
        headers: { ...route.request().headers(), 'authorization': token, 'hetao-oj-zone': 'cpp', 'ht_platform': 'htojWeb', 'ht_system': 'web', 'ht_version': '1.0.0', 'app_id': 'com.hetao101.oj' }
      })
    })
  }

  const allApiCalls = []
  page.on('response', async resp => {
    const url = resp.url()
    if (url.includes('api.htoj.com.cn') && !url.includes('arms-retcode') && !url.includes('sensors') && !url.includes('datacenter')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.includes('<html')) {
        try {
          const d = JSON.parse(body)
          const path = url.replace('https://api.htoj.com.cn', '')
          allApiCalls.push({path, errCode: d.errCode, data: d.data})
          const dataStr = JSON.stringify(d.data||{})
          const hasContent = ['inputDesc','outputDesc','content','inputSample','outputSample','problemDesc','sampleCase','answer','note'].some(k => dataStr.includes(k))
          if (hasContent && d.errCode === 0) {
            console.log(`\n🎯 PROBLEM CONTENT: ${path.split('?')[0]}`)
            console.log(dataStr.slice(0, 1500))
          }
        } catch(e) {}
      }
    }
  })

  // Get the problem link href from the HTML
  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  // Get ALL hrefs from the page to find what contest problem links look like
  const allHrefs = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('[href],[data-href],[data-pid],[data-id]'))
    return links.map(el => ({
      tag: el.tagName,
      href: el.getAttribute('href') || el.href || '',
      dataPid: el.getAttribute('data-pid') || '',
      text: el.textContent.trim().slice(0, 30),
    })).filter(l => l.href || l.dataPid)
  })
  
  console.log('\n=== Page links ===')
  const uniquePatterns = new Set()
  allHrefs.forEach(l => {
    const pattern = l.href.replace(/\d{10,}/g, '{ID}')
    if (!uniquePatterns.has(pattern) && !l.href.includes('fedmarketing') && !l.href.includes('hetaoimg')) {
      uniquePatterns.add(pattern)
      console.log(`${l.tag} href="${l.href}" text="${l.text}" pid="${l.dataPid}"`)
    }
  })

  // Find the actual problem href
  const problemHref = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    const l = links.find(a => a.textContent.trim() === '瞬移')
    return l ? { href: l.href, outerHTML: l.outerHTML.slice(0, 200) } : null
  })
  console.log('\nProblem link:', JSON.stringify(problemHref))

  if (problemHref?.href && problemHref.href !== window?.location?.href) {
    console.log('\nNavigating to problem href:', problemHref.href)
    // Navigate using the page.goto instead of click
    await Promise.race([
      page.goto(problemHref.href, { waitUntil: 'networkidle', timeout: 20000 }),
      new Promise(resolve => setTimeout(resolve, 8000))
    ])
    await page.waitForTimeout(3000)
    console.log('URL after nav:', page.url())
    const txt = await page.evaluate(() => document.body.innerText.slice(0, 1000))
    console.log('Text:', txt)
  } else {
    // Maybe it's a SPA - navigate to likely URLs
    const candidates = [
      `https://htoj.com.cn/cpp/oj/contest/problem?cid=${cid}&pid=22663958373760`,
      `https://htoj.com.cn/cpp/oj/contest/problem/22663958373760?cid=${cid}`,
      `https://htoj.com.cn/cpp/oj/problem/22663958373760`,
    ]
    for (const url of candidates) {
      console.log('\nTrying:', url)
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
        await page.waitForTimeout(3000)
        const txt = await page.evaluate(() => document.body.innerText.slice(0, 300))
        const apiCall = allApiCalls.find(c => c.path.includes('problem') && c.errCode === 0)
        console.log('Text:', txt.slice(0, 200), '| New API calls:', allApiCalls.slice(-3).map(c=>c.path.split('?')[0]).join(', '))
      } catch(e) {
        console.log('Error:', e.message.slice(0, 100))
      }
    }
  }

  // Print all captured API calls at the end
  console.log('\n=== All API calls made ===')
  allApiCalls.forEach(c => console.log(c.path.split('?')[0], 'errCode:', c.errCode))

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message.slice(0, 200)); process.exit(1) })
