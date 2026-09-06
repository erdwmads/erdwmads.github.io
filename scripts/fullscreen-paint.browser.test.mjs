import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('astro/package.json'))('sharp');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const theme of ['space', 'light']) {
    await page.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
    await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-photo-index="0"]').click();
    await page.locator('.obs-presentation-stage img').evaluate(img => img.decode());
    await page.waitForFunction(() => !document.querySelector('.obs-photo-flight'));
    await page.waitForTimeout(250);
    const pixels = async () => sharp(await page.screenshot())
      .extract({ left: 0, top: 80, width: 1440, height: 900 }).resize(240, 150).removeAlpha().raw().toBuffer();
    const before = await pixels();
    await page.locator('.obs-present-fullscreen').click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await page.waitForTimeout(250);
    const after = await pixels();
    let changed = 0;
    for (let i = 0; i < before.length; i++) if (Math.abs(before[i] - after[i]) > 24) changed++;
    assert.ok(changed / before.length < .025, `${theme}: fullscreen painted the page instead of the viewer (${Math.round(100 * changed / before.length)}% changed)`);
    await page.locator('.obs-present-next').click();
    assert.equal(await page.locator('.obs-presentation-counter').textContent(), '02 / 21');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('.obs-presentation-counter').textContent(), '01 / 21');
    await page.locator('.obs-present-fullscreen').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.ok(await page.locator('.obs-presentation[open]').isVisible());
    await page.locator('.obs-present-fullscreen').click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await page.locator('.obs-present-close').click();
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await page.locator('.obs-presentation[open]').count(), 0);
    await page.locator('[data-photo-index="3"]').click();
    await page.locator('.obs-present-fullscreen').click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await page.locator('.obs-presentation[open]').count(), 0);
    assert.ok(await page.locator('[data-photo-index="3"]').evaluate(el => el === document.activeElement));
  }
  console.log('Fullscreen paint passed: actual screenshots, both themes, pointer/keyboard navigation, exit, close and reopen.');
} finally { await browser.close(); }
