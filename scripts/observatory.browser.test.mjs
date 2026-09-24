import {toggleFx} from './display-settings-helper.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {})
});
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.locator('.obs-fx-settings').click({ timeout: 3000 });
  await page.getByLabel('Immersive', { exact: true }).check();
  assert.equal(await page.locator('html').getAttribute('data-fx-intensity'), 'immersive');
  await page.keyboard.press('Escape');
  await toggleFx(page);
  const researchButton = page.locator('main .button').first();
  await researchButton.hover();
  await page.waitForTimeout(100);
  assert.equal(await researchButton.getAttribute('data-edge-active'), '');
  await toggleFx(page);
  assert.equal(await page.locator('[data-edge-active]').count(), 0);
  await toggleFx(page);
  await page.locator('.nav a[href="photography.html"]').hover();
  assert.equal(await page.locator('body').getAttribute('data-orbit-route'), 'photography');
  assert.equal(await page.locator('.ui2046-system-orbit.is-route-active').count(), 1);
  await page.locator('.nav a[href="photography.html"]').click();
  await page.waitForURL('**/photography.html');
  await page.locator('[data-present-photos]').click();
  await page.locator('.obs-presentation[open]').waitFor();
  assert.equal(await page.locator('.obs-presentation-counter').textContent(), '01 / 21');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.obs-presentation-counter').textContent(), '02 / 21');
  await page.locator('.obs-present-fullscreen').click();
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), true);
  await page.locator('.obs-present-close').click();
  assert.equal(await page.locator('.obs-presentation[open]').count(), 0);
  assert.equal(await page.locator('.obs-presentation img').getAttribute('src'), null);
  await page.goto(`${base}/research-graduation.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-present-mission]').count(), 0);
  assert.equal(await page.locator('.mission-jump-stage').count(), 0);
  if (process.env.MISSION_TEST_PASSWORD) {
    await page.locator('[data-research-lock-input]').fill(process.env.MISSION_TEST_PASSWORD);
    await page.locator('[data-research-lock-form] button[type="submit"]').click();
    await page.locator('[data-present-mission]').waitFor();
    assert.ok(await page.locator('.mission-jump-stage').count() > 1);
    assert.equal(await page.locator('[data-mission-index-list]').evaluate(el => getComputedStyle(el).flexWrap), 'nowrap');
    await page.locator('.compact-jump-card').first().click();
    assert.equal(await page.locator('.mission-log-entry').count(), 1);
    await page.locator('.compact-jump-card').last().click();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'unlocked mobile timeline overflow');
    await page.locator('[data-present-mission]').click();
    const bounds = await page.locator('.obs-presentation').evaluate(el => ({ image: el.querySelector('img').getBoundingClientRect().bottom, caption: el.querySelector('figcaption').getBoundingClientRect().top }));
    assert.ok(bounds.image <= bounds.caption);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    assert.equal(await page.locator('.obs-presentation[open]').count(), 0);
    assert.equal(await page.locator('.obs-presentation img').getAttribute('src'), null);
    assert.equal(await page.locator('.mission-jump-stage').count(), 0);
  }
  for (const width of [320, 390, 760, 900, 1150, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}`);
    if (width <= 760) {
      await page.locator('[data-nav-toggle]').click();
      assert.ok(await page.evaluate(() => document.querySelector('.site-header').getBoundingClientRect().bottom <= document.querySelector('main').getBoundingClientRect().top + 1));
    }
    await page.locator('.theme-toggle').click();
    if (width <= 760) await page.locator('[data-nav-toggle]').click();
  }
  assert.deepEqual(errors, []);
  console.log('Observatory interactions passed: intensity, orbit navigation, presentation, locked state, responsive layout and themes.');
} finally {
  await browser.close();
}
