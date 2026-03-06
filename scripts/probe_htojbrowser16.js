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
    if ((url.includes('api.htoj.com.cn') || url.includes('api.hetao101.com')) && !url.includes('arms-') && !url.includes('sensors')) {
      let body = ''
      try { body = await resp.text() } catch(e) {}
      if (body && !body.startsWith('<')) {
        const shortUrl = url.replace('https://api.htoj.com.cn','').replace('https://api.hetao101.com','')
        allApiCalls.push({ url: shortUrl, status: resp.status(), body })
        try {
          const d = JSON.parse(body)
          const str = JSON.stringify(d)
          const has = ['inputDesc','outputDesc','sampleCase','content','timeLimit','memLimit','title'].filter(k => str.includes(k)).length > 2
          if (has && shortUrl.includes('problem')) {
            console.log('\n🎯 POSSIBLE CONTENT:', shortUrl.split('?')[0], str.slice(0, 800))
          }
        } catch(e) {}
      }
    }
  })

  await page.goto(`https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=${cid}`, {
    waitUntil: 'networkidle', timeout: 30000
  })
  await page.waitForTimeout(2000)

  // Inspect the DOM - find all links with text "瞬移" in the table context
  const links = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    return links.map(a => ({
      text: a.textContent.trim().slice(0, 50),
      href: a.href,
      parent: a.parentElement?.tagName,
      gramp: a.parentElement?.parentElement?.tagName,
      ggp: a.parentElement?.parentElement?.parentElement?.tagName,
      cls: a.className,
      id: a.id
    })).filter(l => l.text.length > 0)
  })
  console.log('\nAll links:', JSON.stringify(links, null, 2))

  // Find links in TD context
  const tableCellLinks = await page.evaluate(() => {
    const tds = Array.from(document.querySelectorAll('td'))
    return tds.map(td => ({
      tdText: td.innerText.slice(0, 30),
      links: Array.from(td.querySelectorAll('a,span,div[data-v],[class*=problem],[class*=title]')).map(e => ({
        tag: e.tagName,
        text: e.textContent.trim().slice(0, 40),
        href: e.getAttribute('href'),
        cls: e.className.slice(0, 50)
      }))
    })).filter(td => td.tdText.length > 0)
  })
  console.log('\nTable cells:', JSON.stringify(tableCellLinks.slice(0, 20), null, 2))

  const beforeCount = allApiCalls.length

  // Click on the TR containing "瞬移" (in the table context)
  const clickResult = await page.evaluate(() => {
    const tds = Array.from(document.querySelectorAll('td'))
    const td = tds.find(t => t.textContent.includes('瞬移') && !t.textContent.includes('//'))
    if (td) {
      const a = td.querySelector('a')
      const clickableEl = a || td
      clickableEl.click()
      td.click()
      td.parentElement?.click()
      return { tdText: td.innerText.slice(0, 50), aHref: a?.href, aHtml: a?.outerHTML }
    }
    return { notFound: true }
  })
  console.log('\nTable click result:', clickResult)

  await page.waitForTimeout(8000)

  // Check new API calls
  const newCalls = allApiCalls.slice(beforeCount)
  console.log(`\nNew calls after click: ${newCalls.length}`)
  newCalls.forEach(c => {
    try {
      const d = JSON.parse(c.body)
      console.log(`  [${c.status}] ${c.url.split('?')[0].slice(0, 100)}: errCode=${d.errCode}`)
    } catch(e) {
      console.log(`  [${c.status}] ${c.url.split('?')[0].slice(0, 100)}: ${c.body.slice(0,100)}`)
    }
  })

  // DOM state after click
  const dom = await page.evaluate(() => {
    const modal = document.querySelector('.ant-modal-content,.ant-drawer-content')
    return {
      url: location.href,
      modal: modal ? { text: modal.innerText.slice(0, 500), html: modal.outerHTML.slice(0, 500) } : null,
      contentKeywords: ['输入格式','输出格式','题目描述','时间限制','样例输入'].filter(k => document.body.innerText.includes(k)),
      bodyText: document.body.innerText.slice(0, 3000)
    }
  })
  console.log('\nAfter click URL:', dom.url)
  console.log('Content keywords:', dom.contentKeywords)
  if (dom.modal) console.log('Modal:', dom.modal.text)
  if (dom.contentKeywords.length > 0) console.log('BODY:', dom.bodyText)

  await page.screenshot({ path: 'scripts/htoj_table_click.png' })
  console.log('Screenshot: scripts/htoj_table_click.png')

  await browser.close()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
