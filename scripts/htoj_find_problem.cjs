const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'other/dist/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.goto('https://htoj.com.cn/', { waitUntil: 'load', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.setItem('KEY_USER_LOGIN_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODU1NDA2NDgsImlkIjo1MDU1ODk5NX0.-LxE2QJj5shAX48Xk0M0Vb0JPF-iWb65mF0F5_zzzPY');
    localStorage.setItem('KEY_USER_INFO', JSON.stringify({uid:'5af35ba36e214ff3861956eaae82648c',userId:50558995,nickname:'kunkka',username:'kunkka'}));
    localStorage.setItem('KEY_ZONE', 'cpp');
  });
  await page.reload({ waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Find problems from contest list API directly
  const contests = await page.evaluate(async () => {
    // Try calling the API directly
    const resp = await fetch('https://api.htoj.com.cn/api/code-community/api/get-contest-list?currentPage=1&limit=30', {
      headers: { 'Hetao-Oj-Zone': 'cpp', 'Authorization': localStorage.getItem('KEY_USER_LOGIN_TOKEN') }
    });
    const data = await resp.json();
    return (data.data?.records || []).slice(0, 15).map(c => ({ id: c.id, title: c.title, status: c.statusDesc?.name }));
  });
  console.log('Contests:', JSON.stringify(contests, null, 2));

  // For each contest, try to get problems
  for (const c of contests.slice(0, 5)) {
    console.log(`\n--- Contest ${c.id}: ${c.title} ---`);
    const problems = await page.evaluate(async (cid) => {
      const resp = await fetch(`https://api.htoj.com.cn/api/code-community/api/get-contest-problem?cid=${cid}&currentPage=1&limit=5`, {
        headers: { 'Hetao-Oj-Zone': 'cpp', 'Authorization': localStorage.getItem('KEY_USER_LOGIN_TOKEN') }
      });
      const data = await resp.json();
      return (data.data?.records || []).map(p => ({ pid: p.pid, title: p.displayTitle }));
    }, c.id);
    
    if (problems.length > 0) {
      console.log('  Problems:', JSON.stringify(problems));
      // Try first problem
      const pid = problems[0].pid;
      const url = `https://htoj.com.cn/cpp/oj/problem/detail?pid=${pid}&cid=${c.id}`;
      console.log(`  Navigating to: ${url}`);
      await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      await page.waitForTimeout(5000);
      
      const info = await page.evaluate(() => ({
        buttons: [...document.querySelectorAll('button')].map(b => b.textContent.trim()),
        monaco: !!document.querySelector('.monaco-editor'),
        textarea: !!document.querySelector('textarea'),
        body: (document.body?.innerText || '').substring(0, 300)
      }));
      console.log('  Info:', JSON.stringify(info, null, 2));
    }
  }

  await browser.close();
})().catch(e => console.error('FAILED:', e.message));
