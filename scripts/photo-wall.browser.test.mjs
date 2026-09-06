import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 760, 390, 320]) {
    for (const theme of ['space', 'light']) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
      await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('.photo-wall img').count(), 21);
      assert.equal(await page.locator('.slideshow-stage, .filmstrip, .photo-marquee').count(), 0);
      assert.equal(await page.locator('.photo-wall').evaluate(el => getComputedStyle(el).columnCount), width <= 760 ? '2' : '3');
      assert.equal(await page.locator('.photo-tile').first().evaluate(el => getComputedStyle(el).marginBottom), width <= 760 ? '10px' : '16px');
      const panorama = await page.locator('.photo-tile--wide').evaluate(el => ({ width: el.getBoundingClientRect().width, wall: el.parentElement.getBoundingClientRect().width }));
      assert.ok(Math.abs(panorama.width - panorama.wall) < 1, 'panorama does not span the wall');
      const bounds = await page.locator('.photo-wall img').evaluateAll(images => images.map(img => {
        const r = img.getBoundingClientRect();
        const tile = img.closest('a').getBoundingClientRect();
        return { width: r.width, height: r.height, ratio: img.width / img.height, original: Number(img.getAttribute('width')) / Number(img.getAttribute('height')), tileWidth: tile.width, tileHeight: tile.height };
      }));
      for (const box of bounds) {
        assert.ok(Math.abs(box.width / box.height - box.original) < .015, 'photo ratio changed');
        assert.ok(Math.abs(box.tileWidth - box.width) < 1 && Math.abs(box.tileHeight - box.height) < 1, 'photo has a padded frame');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const tile = page.locator('[data-photo-index="3"]');
      await tile.click();
      assert.equal(await page.locator('.obs-presentation-counter').textContent(), '04 / 21');
      assert.ok((await page.locator('.obs-presentation img').getAttribute('src')).includes('%284%29'));
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('.obs-presentation-counter').textContent(), '05 / 21');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.obs-presentation[open]'));
      assert.ok(await page.locator('[data-photo-index="4"]').evaluate(el => document.activeElement === el));
      await tile.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.obs-presentation-counter').textContent(), '04 / 21');
      await page.locator('.obs-present-close').click();
      await page.waitForFunction(() => !document.querySelector('.obs-presentation[open]'));
    }
  }
  assert.deepEqual(errors, []);
  console.log('Photo wall: 21 unique uncropped tiles, responsive columns, no frames/overflow, selected image, keyboard and focus passed.');
} finally { await browser.close(); }
