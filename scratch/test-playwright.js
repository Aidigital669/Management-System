const { chromium } = require('d:/AiDigitals_Projects/RealityTruedeal/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE_ERROR] ${err.message}`));
  
  try {
    console.log('Navigating to https://aidigitalworkspace.com/dashboard/admin ...');
    const res = await page.goto('https://aidigitalworkspace.com/dashboard/admin', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('HTTP Status:', res ? res.status() : 'none');
    console.log('Final URL:', page.url());
    console.log('Title:', await page.title());
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body snippet:\n', bodyText.slice(0, 500));
  } catch (err) {
    console.error('Error navigating:', err);
  }

  console.log('\n--- Console Logs ---');
  consoleLogs.forEach(l => console.log(l));

  await browser.close();
})();
