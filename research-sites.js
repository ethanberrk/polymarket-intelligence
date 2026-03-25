const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({
    executablePath: '/Users/ethanberk/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell'
  });

  async function capture(url, name) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.screenshot({ path: `/tmp/${name}_top.png`, fullPage: false });
    await page.screenshot({ path: `/tmp/${name}_full.png`, fullPage: true });

    const fonts = await page.evaluate(() => {
      const els = document.querySelectorAll('h1, h2, h3, p, nav, a');
      const families = new Set();
      els.forEach(el => {
        const ff = getComputedStyle(el).fontFamily;
        families.add(ff);
      });
      return Array.from(families).slice(0, 10);
    });

    const colors = await page.evaluate(() => {
      const els = document.querySelectorAll('header, nav, h1, h2, .article, main');
      const result = {};
      els.forEach(el => {
        const cs = getComputedStyle(el);
        result[el.tagName + '.' + el.className.split(' ')[0]] = {
          bg: cs.backgroundColor,
          color: cs.color,
          fontFamily: cs.fontFamily.split(',')[0],
          fontSize: cs.fontSize,
        };
      });
      return result;
    });

    const navText = await page.locator('nav').first().innerText().catch(() => '');
    const h1 = await page.locator('h1').first().innerText().catch(() => '');

    console.log(`\n=== ${name.toUpperCase()} ===`);
    console.log('H1:', h1);
    console.log('Nav:', navText.split('\n').slice(0, 8).join(' | '));
    console.log('Fonts:', fonts.slice(0, 5).join(', '));
    console.log('Key styles:', JSON.stringify(colors, null, 2));

    await page.close();
  }

  await capture('https://www.thefp.com', 'frepress');
  await capture('https://www.semafor.com', 'semafor');

  await browser.close();
}

run().catch(console.error);
