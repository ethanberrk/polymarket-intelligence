const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({
    executablePath: '/Users/ethanberk/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell'
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://www.semafor.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/semafor_top.png', fullPage: false });
  await page.screenshot({ path: '/tmp/semafor_full.png', fullPage: true });

  const fonts = await page.evaluate(() => {
    const els = document.querySelectorAll('h1, h2, h3, p, nav');
    const families = new Set();
    els.forEach(el => families.add(getComputedStyle(el).fontFamily.split(',')[0].trim()));
    return Array.from(families).slice(0, 8);
  });

  const h1s = await page.locator('h1, h2').allInnerTexts();
  const navText = await page.locator('nav').first().innerText().catch(() => '');

  console.log('Nav:', navText.split('\n').slice(0, 10).join(' | '));
  console.log('Fonts:', fonts.join(', '));
  console.log('Headlines:', h1s.slice(0, 6));

  await browser.close();
}

run().catch(console.error);
