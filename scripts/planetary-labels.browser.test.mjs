import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${process.env.SITE_TEST_URL || 'http://127.0.0.1:4322'}/research.html`, { waitUntil: 'networkidle' });
  const root = page.locator('.planetary');
  await root.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.planetary').dataset.renderState === 'ready');
  for (const theme of ['space', 'light']) {
    await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
    for (const scope of ['inner', 'solar']) {
      await root.locator('[data-scope]').selectOption(scope);
      await root.locator('[data-action="reset"]').click();
      await root.locator('[data-stage]').focus();
      const selector = scope === 'inner' ? '[data-object="sun"]' : '[data-object="inner"]';
      const positions = [];
      for (let step = 0; step < 80; step++) {
        await page.keyboard.press(step < 40 ? 'ArrowRight' : 'ArrowUp');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        positions.push(await root.locator(selector).evaluate(el => ({ x: el.offsetLeft, y: el.offsetTop, hidden: el.hidden })));
      }
      assert.ok(positions.every(p => !p.hidden), `${scope}: central label must stay visible`);
      const span = Math.max(...positions.map(p => p.y)) - Math.min(...positions.map(p => p.y));
      assert.ok(span <= 1, `${theme}/${scope}: central label jumped ${span}px while its anchor stayed at the origin`);
    }
  }
  console.log('Planetary labels: central anchors stay stable throughout orbit rotation in both scopes and themes.');
} finally { await browser.close(); }
