const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({
    executablePath: '/Users/ethanberk/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell'
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://polymarket-intelligence-nu.vercel.app/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: '/tmp/site_top.png', fullPage: false });
  await page.screenshot({ path: '/tmp/site_full.png', fullPage: true });

  const title = await page.title();
  const headings = await page.locator('h1, h2, h3').allInnerTexts();
  const headerText = await page.locator('header').innerText().catch(() => '');
  const heroText = await page.locator('.hero').innerText().catch(() => '');
  const links = await page.locator('a.market-card').evaluateAll(function(els) {
    return els.slice(0, 5).map(function(el) { return el.getAttribute('href'); });
  });

  console.log('Title:', title);
  console.log('Header:', headerText);
  console.log('Hero:', heroText);
  console.log('Headings:', headings);
  console.log('Sample links:', links);

  await browser.close();
}

run().catch(console.error);
