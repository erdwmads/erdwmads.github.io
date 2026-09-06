import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  // Headless normally hides the scrollbar, masking short-page layout shifts.
  ignoreDefaultArgs: ['--hide-scrollbars'],
  ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {})
});
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
const measure = page => page.evaluate(() => {
  const rect = selector => {
    const box = document.querySelector(selector).getBoundingClientRect();
    return { x: box.x, width: box.width };
  };
  return {
    brand: rect('.brand'), nav: rect('.header-actions'), main: rect('main'),
    footer: rect('.footer-inner'),
    overflowing: document.documentElement.scrollWidth > innerWidth
  };
});
try {
  const page = await browser.newPage();
  for (const width of [1920, 1440, 390]) {
    await page.setViewportSize({ width, height: 1200 });
    for (const theme of ['space', 'light']) {
      await page.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
      await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
      await page.reload({ waitUntil: 'networkidle' });
      const before = await measure(page);
      if (width <= 760) await page.locator('[data-nav-toggle]').click();
      await page.locator('.nav a[href="contact.html"]').click();
      await page.waitForURL('**/contact.html');
      await page.waitForTimeout(350);
      const after = await measure(page);
      for (const key of ['brand', 'main', 'footer', ...(width > 760 ? ['nav'] : [])]) {
        assert.deepEqual(after[key], before[key], `${width}/${theme}: ${key} shifts on Contact`);
      }
      assert.equal(after.overflowing, false);
      await page.goBack();
      await page.waitForURL('**/photography.html');
      await page.waitForTimeout(350);
      assert.deepEqual((await measure(page)).main, before.main, 'Back changed the content alignment');
      await page.locator('[data-present-photos]').click();
      await page.locator('.obs-present-close').click();
      assert.deepEqual((await measure(page)).main, before.main, 'viewer close changed the content alignment');
    }
  }
  console.log('Page alignment passed: real scrollbars, Contact navigation/history, viewer close, both themes and desktop/mobile.');
} finally { await browser.close(); }
