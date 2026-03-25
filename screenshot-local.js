const { chromium } = require('playwright');
const { exec } = require('child_process');

async function run() {
  // Screenshot the live site (already updated)
  const browser = await chromium.launch({
    executablePath: '/Users/ethanberk/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell'
  });

  // We'll screenshot localhost:3000 after build
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/local_top.png', fullPage: false });
  await page.screenshot({ path: '/tmp/local_full.png', fullPage: true });
  await browser.close();
}

run().catch(console.error);
