const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setBypassCSP(true);
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    console.log("Page title:", await page.title());
    console.log("Body HTML:", await page.evaluate(() => document.body.innerHTML.substring(0, 200)));
    const results = await new AxePuppeteer(page).analyze();
    console.log("Step 1 violations:", JSON.stringify(results.violations, null, 2));

    // Click Next Step
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Next Step')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));
    
    const results2 = await new AxePuppeteer(page).analyze();
    console.log("Step 2 violations:", JSON.stringify(results2.violations, null, 2));

    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
