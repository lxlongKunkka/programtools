/**
 * 手动登录 htoj，保存浏览器状态供自动提交复用
 * 用法: node scripts/htoj_login_setup.cjs
 * 会在本地打开 Chrome 窗口，你手动登录后按回车，状态保存到 server/htoj_state.json
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = path.join(__dirname, '..', 'other/dist/chrome-linux64/chrome');
const STATE_FILE = path.join(__dirname, '..', 'server/htoj_state.json');

(async () => {
  console.log('启动浏览器...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,  // 可见窗口，让你手动操作
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // 导航到 htoj
  await page.goto('https://htoj.com.cn/', { waitUntil: 'load', timeout: 30000 });
  console.log('\n========================================');
  console.log('请在浏览器中完成以下操作：');
  console.log('1. 处理首次弹窗（选择 C++，点确认）');
  console.log('2. 点击登录，输入账号密码登录');
  console.log('3. 确认登录成功（能看到用户名）');
  console.log('========================================');
  console.log('完成后，在这里按 Enter 保存状态...\n');

  // 等待用户输入
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // 保存浏览器状态
  await context.storageState({ path: STATE_FILE });
  console.log(`状态已保存到: ${STATE_FILE}`);

  await browser.close();
  console.log('完成！现在自动提交可以使用这个登录状态了。');
})().catch(e => {
  console.error('失败:', e.message);
  process.exit(1);
});
