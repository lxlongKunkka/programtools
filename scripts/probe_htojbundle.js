import { chromium } from 'playwright'

// Fetch JS bundle files and search for problem content API endpoint names
async function main() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox']
  })
  const context = await browser.newContext()
  const page = await context.newPage()

  // Get the list of JS files from the page
  const jsFiles = []
  page.on('response', async resp => {
    const url = resp.url()
    if (url.endsWith('.js') && url.includes('htoj.com.cn')) {
      jsFiles.push(url)
    }
  })

  await page.goto('https://htoj.com.cn/cpp/oj/contest/detail/problem?cid=22666004139776', { 
    waitUntil: 'networkidle', timeout: 30000 
  })

  console.log('JS files:', jsFiles)
  await browser.close()

  // Now fetch the JS files and search for API endpoint names
  const { default: axios } = await import('axios')
  const keywords = ['inputDesc', 'outputDesc', 'sampleCase', 'contest-problem', 'contestProblem', 
    'problem-content', 'problemContent', 'get-problem', 'getProblem', 'problem/detail',
    'inputSample', 'outputSample', 'statement', 'problemStatement']
 
  for (const jsUrl of jsFiles) {
    try {
      const r = await axios.get(jsUrl, { timeout: 15000 })
      const code = r.data
      const found = keywords.filter(kw => code.includes(kw))
      if (found.length > 0) {
        console.log(`\n=== ${jsUrl.split('/').pop()} ===`)
        console.log('Found keywords:', found)
        // Extract context around each keyword
        for (const kw of found.slice(0, 3)) {
          const idx = code.indexOf(kw)
          if (idx > 0) {
            console.log(`\n  [${kw}] context:`)
            console.log('  ' + code.slice(Math.max(0, idx - 150), idx + 300).replace(/\n/g, ' ').slice(0, 400))
          }
        }
      }
    } catch(e) {
      console.log(`Error fetching ${jsUrl}: ${e.message.slice(0, 60)}`)
    }
  }
}

main().catch(e => console.error('Error:', e.message))
