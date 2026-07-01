const { chromium } = require('playwright');
const path = require('path');
const axios = require('axios');

const CHROME_PATH = path.join(process.cwd(), 'other/dist/chrome-linux64/chrome');

function xl(s) {
  return s.split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 101)).join('');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  
  // Login via API and inject token
  await page.goto('https://htoj.com.cn/', { waitUntil: 'domcontentloaded' });
  
  const r = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl('17753651388'), password: xl('Aa123456@'), countryCode: '86', short: false
  }, {
    headers: {
      'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
      'app_id': 'com.hetao101.oj', 'Content-Type': 'application/json'
    }
  });
  const token = r.data.data.token;
  
  await page.evaluate((t) => { localStorage.setItem('token', t); }, token);
  
  // Navigate to a problem
  const url = 'https://htoj.com.cn/cpp/oj/problem/detail?pid=22805576546304&cid=22821038482432';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Try to find the editor
  const hasMonaco = await page.$('.monaco-editor');
  const hasTextarea = await page.$('textarea');
  console.log('Monaco editor found:', !!hasMonaco);
  console.log('Textarea found:', !!hasTextarea);
  console.log('Title:', await page.title());
  
  // Check for submit button
  const submitBtn = await page.$('button:has-text("提交")');
  console.log('Submit button found:', !!submitBtn);
  
  // Check for language selector
  const langSelect = await page.$('select');
  console.log('Select found:', !!langSelect);
  
  // Screenshot for debugging
  await page.screenshot({ path: '/tmp/htoj_debug.png' });
  console.log('Screenshot saved to /tmp/htoj_debug.png');
  
  await browser.close();
  console.log('DONE');
})().catch(e => console.error('FAILED:', e.message));
