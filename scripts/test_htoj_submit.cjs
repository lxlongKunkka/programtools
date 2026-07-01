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
  
  // Login via API
  const r = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl('17753651388'), password: xl('Aa123456@'), countryCode: '86', short: false
  }, {
    headers: {
      'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
      'app_id': 'com.hetao101.oj', 'Content-Type': 'application/json'
    }
  });
  const token = r.data.data.token;
  
  // Visit htoj first
  await page.goto('https://htoj.com.cn/', { waitUntil: 'domcontentloaded' });
  
  // Try multiple storage keys
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('access_token', t);
    localStorage.setItem('htoj_token', t);
    localStorage.setItem('Authorization', t);
  }, token);
  
  // Also set cookie
  await page.evaluate((t) => {
    document.cookie = 'token=' + t + '; path=/; domain=.htoj.com.cn';
    document.cookie = 'Authorization=' + t + '; path=/; domain=.htoj.com.cn';
  }, token);
  
  // Navigate to problem page
  const url = 'https://htoj.com.cn/cpp/oj/problem/detail?pid=22805576546304&cid=22821038482432';
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // Check what's on the page
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Body text (first 500):', bodyText);
  
  // Check for login requirement
  const hasLogin = bodyText.includes('登录') || bodyText.includes('login');
  console.log('Page requires login:', hasLogin);
  
  // Check all elements
  const elements = await page.evaluate(() => {
    const result = {};
    result.monaco = !!document.querySelector('.monaco-editor');
    result.textarea = !!document.querySelector('textarea');
    result.codeMirror = !!document.querySelector('.CodeMirror');
    result.aceEditor = !!document.querySelector('.ace_editor');
    const buttons = [...document.querySelectorAll('button')].map(b => b.textContent.trim().substring(0, 30));
    result.buttons = buttons.slice(0, 10);
    return result;
  });
  console.log('Elements:', JSON.stringify(elements, null, 2));
  
  // Screenshot
  await page.screenshot({ path: '/tmp/htoj_debug2.png' });
  console.log('Screenshot saved');
  
  await browser.close();
})().catch(e => console.error('FAILED:', e.message));
