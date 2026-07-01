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
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // API login
  const r = await axios.post('https://api.hetao101.com/login/v2/account/oauth/password', {
    phoneNumber: xl('17753651388'), password: xl('Aa123456@'), countryCode: '86', short: false
  }, {
    headers: {
      'HT_PLATFORM': 'htojWeb', 'HT_SYSTEM': 'web', 'HT_VERSION': '1.0.0',
      'app_id': 'com.hetao101.oj', 'Content-Type': 'application/json'
    }
  });
  const token = r.data.data.token;
  console.log('API token obtained');

  // Approach: set cookie then navigate
  await context.addCookies([
    { name: 'token', value: token, domain: '.htoj.com.cn', path: '/', httpOnly: false, secure: true, sameSite: 'Lax' }
  ]);

  const url = 'https://htoj.com.cn/cpp/oj/problem/detail?pid=22805576546304&cid=22821038482432';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Handle setup dialog
  let dialog = await page.$('button:has-text("确认选择")');
  if (dialog) {
    console.log('Setup dialog detected');
    // Find and click C++ option
    const cppLabels = await page.$$('text="C++"');
    for (const label of cppLabels) {
      const parent = await label.evaluateHandle(el => el.closest('div, label, li'));
      if (parent) {
        await parent.click();
        console.log('Clicked C++ option');
        break;
      }
    }
    await page.waitForTimeout(500);
    await page.click('button:has-text("确认选择")');
    console.log('Setup confirmed');
    await page.waitForTimeout(3000);
  }

  // Check login state
  let body = await page.evaluate(() => document.body.innerText.substring(0, 600));
  console.log('Body:', body);

  // If login needed, try UI login
  if (body.includes('登 录') || body.includes('登录')) {
    console.log('Login needed, attempting UI login...');
    
    // Click login
    const loginBtns = await page.$$('button');
    for (const btn of loginBtns) {
      const text = await btn.textContent();
      if (text.includes('登 录') || text.includes('登录')) {
        await btn.click();
        console.log('Clicked login button');
        break;
      }
    }
    await page.waitForTimeout(3000);
    
    // Check what login form appears
    body = await page.evaluate(() => document.body.innerText.substring(0, 600));
    console.log('Login form:', body);
    
    // Try password login
    const tabBtns = await page.$$('button, div[role="tab"], .tab-item');
    for (const btn of tabBtns) {
      const text = await btn.textContent();
      if (text.includes('密码') || text.includes('账号')) {
        await btn.click();
        console.log('Switched to password login');
        await page.waitForTimeout(500);
        break;
      }
    }
    
    // Fill phone
    try {
      await page.fill('input[type="text"], input[placeholder*="手机"]', '17753651388');
      console.log('Phone filled');
    } catch (e) {
      console.log('Phone input not found');
    }
    
    // Fill password
    try {
      await page.fill('input[type="password"]', 'Aa123456@');
      console.log('Password filled');
    } catch (e) {
      console.log('Password input not found');
    }
    
    // Submit login
    await page.waitForTimeout(500);
    const submitBtns = await page.$$('button');
    for (const btn of submitBtns) {
      const text = await btn.textContent();
      if (text.includes('登 录') || text.includes('登录')) {
        await btn.click();
        console.log('Login submitted');
        break;
      }
    }
    await page.waitForTimeout(5000);
  }

  // Reload problem page
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  body = await page.evaluate(() => document.body.innerText.substring(0, 600));
  console.log('Final body:', body);

  // Check for editor
  const editors = await page.evaluate(() => ({
    monaco: !!document.querySelector('.monaco-editor'),
    textarea: !!document.querySelector('textarea'),
    codemirror: !!document.querySelector('.CodeMirror'),
  }));
  console.log('Editors:', JSON.stringify(editors));

  const buttons = await page.evaluate(() => 
    [...document.querySelectorAll('button')].map(b => b.textContent.trim().substring(0, 25))
  );
  console.log('Buttons:', JSON.stringify(buttons.slice(0, 15)));

  await page.screenshot({ path: '/tmp/htoj_final.png' });
  await browser.close();
  console.log('Done - screenshot at /tmp/htoj_final.png');
})().catch(e => console.error('FAILED:', e.message));
