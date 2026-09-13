import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:52523';
try {
  for (const width of [320, 390, 760]) {
    for (const mode of ['no-js', 'blocked-header']) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== 'no-js', reducedMotion: 'reduce' });
      if (mode === 'blocked-header') await page.route('**/site-header.js*', route => route.abort());
      await page.goto(base + '/contact.html');
      assert.equal(await page.locator('html').getAttribute('data-nav-ready'), null);
      assert.equal(await page.locator('[data-nav-toggle]').isVisible(), false);
      for (const link of await page.locator('[data-mobile-nav] a').all()) assert.equal(await link.isVisible(), true, `${width}px ${mode}: ${await link.textContent()}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${width}px ${mode}: horizontal overflow`);
      const brand = await page.locator('.brand').evaluate(element => {
        const box = element.getBoundingClientRect();
        const title = element.querySelector('strong');
        const tagline = element.querySelector('span');
        const lineCount = text => Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight));
        return { width: box.width, titleLines: lineCount(title), taglineLines: lineCount(tagline), headerHeight: element.closest('.site-header').getBoundingClientRect().height };
      });
      assert.ok(brand.width >= 200, `${width}px ${mode}: brand must retain readable width: ${JSON.stringify(brand)}`);
      assert.ok(brand.titleLines <= 2 && brand.taglineLines <= 3, `${width}px ${mode}: brand must not collapse to a character column: ${JSON.stringify(brand)}`);
      assert.ok(brand.headerHeight < 450, `${width}px ${mode}: fallback header should not consume the viewport: ${JSON.stringify(brand)}`);
      await page.close();
    }
    for (const theme of ['space', 'light']) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(theme => localStorage.setItem('mads-theme', theme), theme);
      await page.goto(base + '/contact.html');
      await page.waitForSelector('html[data-nav-ready]');
      await page.locator('[data-nav-toggle]').click();
      for (const control of await page.locator('.site-header a, .site-header button').all()) {
        if (await control.isVisible()) assert.ok((await control.boundingBox()).height >= 44, `${width}px ${theme}: header controls need a 44px touch target`);
      }
      await page.locator('.nav-log-gate__copy > *').evaluateAll(elements => elements.forEach(element => element.style.setProperty('font-size', `${parseFloat(getComputedStyle(element).fontSize) * 2}px`, 'important')));
      const gate = await page.locator('.nav-log-gate').evaluate(element => {
        const box = element.getBoundingClientRect();
        const copy = element.querySelector('.nav-log-gate__copy').getBoundingClientRect();
        return { height: box.height, top: box.top, bottom: box.bottom, copyTop: copy.top, copyBottom: copy.bottom };
      });
      assert.ok(gate.height >= 44 && gate.copyTop >= gate.top && gate.copyBottom <= gate.bottom, `${width}px ${theme}: doubled text must fit inside its control: ${JSON.stringify(gate)}`);
      await page.close();
    }
  }
  console.log('Mobile header fallback and 200% gate text: passed');
} finally {
  await browser.close();
}
