const { chromium } = require('d:/AiDigitals_Projects/RealityTruedeal/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE_ERROR] ${err.message}\n${err.stack}`));

  try {
    console.log('Navigating to login page...');
    await page.goto('https://aidigitalworkspace.com/', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('Filling in credentials...');
    // Locate email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');
    
    await emailInput.fill('admin@workforce.com');
    await passwordInput.fill('admin123');

    console.log('Submitting form...');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    console.log('Waiting for redirect to role dashboard...');
    await page.waitForURL('**/dashboard/**', { timeout: 15000 });
    console.log('Navigated to:', page.url());

    // Wait until URL settles on /dashboard/admin or whatever role dashboard
    await page.waitForTimeout(6000);
    console.log('Current URL after wait:', page.url());
    console.log('Page Title:', await page.title());
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body snippet:\n', bodyText.slice(0, 1000));

    await page.screenshot({ path: 'd:/AiDigitals_Projects/Management-System/scratch/after-login.png' });
  } catch (err) {
    console.error('Error during test:', err);
  }

  console.log('\n--- Console Logs ---');
  consoleLogs.forEach(l => console.log(l));

  await browser.close();
})();
