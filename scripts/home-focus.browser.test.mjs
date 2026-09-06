import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage();
  for (const theme of ['space', 'light']) {
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
      await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1600);
      await page.locator('.focus-list').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      for (const hover of [false, true]) {
        if (hover) await page.locator('.focus-list > div').first().hover();
        const rows = await page.locator('.focus-list > div').evaluateAll(elements => elements.map(el => {
          const css = getComputedStyle(el);
          const row = el.getBoundingClientRect();
          const text = el.querySelector('strong').getBoundingClientRect();
          return { backdrop: css.backdropFilter, webkitBackdrop: css.getPropertyValue('-webkit-backdrop-filter'), background: css.backgroundImage, fits: text.left >= row.left - 1 && text.right <= row.right + 1 };
        }));
        assert.equal(rows.length, 4);
        for (const row of rows) {
          assert.equal(row.backdrop, 'none', `${theme}/${width}/hover=${hover}: residual glass blur`);
          assert.ok(!row.webkitBackdrop || row.webkitBackdrop === 'none', 'prefixed blur remains');
          assert.equal(row.background, 'none', 'rectangular background remains');
          assert.ok(row.fits, 'text overflows its row');
        }
      }
    }
  }
  console.log('Home Current Focus: no residual glass panels, text fits; both themes and desktop/mobile hover states pass.');
} finally { await browser.close(); }
