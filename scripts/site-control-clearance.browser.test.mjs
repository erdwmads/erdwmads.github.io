import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:52523';
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });

async function clearTargets(locator) {
  return locator.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return { label: element.getAttribute('aria-label') || element.textContent.trim(), clear: Boolean(hit && (hit === element || element.contains(hit))), width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom };
  }));
}

try {
  for (const width of [768, 1024, 1100, 1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await page.addInitScript(() => sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'));
    for (const theme of ['space', 'light']) {
      await page.goto(`${base}/research-log.html`, { waitUntil: 'networkidle' });
      await page.evaluate(theme => { if (document.documentElement.dataset.theme !== theme) document.querySelector('.theme-toggle').click(); }, theme);
      await page.evaluate(() => document.fonts.ready);
      if (width <= 760) await page.locator('[data-nav-toggle]').click();
      const links = await clearTargets(page.locator('.nav a'));
      assert.equal(links.length, 7);
      assert(links.every(link => link.clear), `${width} ${theme}: obscured navigation ${JSON.stringify(links)}`);
      if (width > 760) assert(Math.max(...links.map(link => link.top)) - Math.min(...links.map(link => link.top)) < 1, `${width}: navigation labels unexpectedly wrap`);
      const actions = await clearTargets(page.locator('.nav-log-gate, .theme-toggle'));
      assert(actions.every(action => action.clear), `${width} ${theme}: obscured header action`);
      if (width <= 760) await page.locator('[data-nav-toggle]').click();
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const footer = await clearTargets(page.locator('.site-footer a, .obs-fx-settings'));
      assert(footer.every(action => action.clear), `${width} ${theme}: footer action obscured ${JSON.stringify(footer)}`);
      const overlap = await page.evaluate(() => {
        const a = document.querySelector('.site-footer a').getBoundingClientRect();
        const b = document.querySelector('.obs-fx-settings').getBoundingClientRect();
        return Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);
      });
      assert.equal(overlap, false, `${width} ${theme}: footer and settings overlap`);
      await page.goto(`${base}/paper-shelf.html`, { waitUntil: 'networkidle' });
      const targets = await page.locator('.paper-source').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
      assert.equal(targets.length, 11);
      assert(targets.every(height => height >= 44), `${width}: source target heights ${targets}`);
      await page.locator('[data-paper-search]').fill('qzxnomatch');
      assert(await page.locator('[data-paper-empty]').isVisible());
      await page.locator('[data-paper-reset]').click();
      assert.equal(await page.locator('[data-paper-card]:visible').count(), 11);
    }
    await page.close();
    console.log(`PASS ${width}px: navigation hit targets, header labels, footer clearance, paper source targets and reset`);
  }
} finally {
  await browser.close();
}
