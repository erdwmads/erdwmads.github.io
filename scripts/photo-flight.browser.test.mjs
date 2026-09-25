import {toggleFx} from './display-settings-helper.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  // The viewer commits its counter only after the photograph has loaded and decoded; a failed load shows Retry instead.
  const shown = () => page.waitForFunction(() => document.querySelector('.obs-presentation-counter').textContent || (!document.querySelector('.obs-present-retry').hidden && 'image failed to load')).then(result => result.jsonValue());
  await page.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  if (await page.locator('html').evaluate(el => el.classList.contains('ambient-fx-disabled'))) await toggleFx(page);
  const tile = page.locator('[data-photo-index="0"]');
  await tile.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  await tile.click();
  assert.equal(await page.locator('.obs-photo-flight').count(), 1, 'opening did not create the tile transition');
  assert.equal(await shown(), '01 / 21');
  await page.waitForFunction(() => !document.querySelector('.obs-photo-flight'));
  assert.equal(await page.locator('.obs-presentation img').evaluate(el => getComputedStyle(el).visibility), 'visible');
  await page.locator('.obs-present-close').click();
  assert.equal(await page.locator('.obs-photo-flight').count(), 1, 'closing did not return to the tile');
  await page.waitForFunction(() => !document.querySelector('.obs-presentation[open]'));
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - y) < 2, 'closing lost scroll position');
  assert.ok(await tile.evaluate(el => el === document.activeElement));
  // Closing before the photograph has loaded closes directly, so no return flight can start from full size.
  const earlyClose = await tile.evaluate(el => {
    el.click();
    const flying = Boolean(document.querySelector('.obs-photo-flight'));
    document.querySelector('.obs-present-close').click();
    return { flying, flight: Boolean(document.querySelector('.obs-photo-flight')), open: document.querySelector('.obs-presentation').open, focused: el === document.activeElement };
  });
  assert.deepEqual(earlyClose, { flying: true, flight: false, open: false, focused: true }, 'closing before the image loaded did not close directly');
  // Once it has loaded, closing during the opening flight returns from the interrupted size. Slowed animations keep the flight running.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: .05 });
  await tile.click();
  assert.equal(await shown(), '01 / 21');
  const rapidClose = await page.evaluate(() => {
    const before = document.querySelector('.obs-photo-flight')?.getBoundingClientRect().width;
    document.querySelector('.obs-present-close').click();
    return { before, after: document.querySelector('.obs-photo-flight')?.getBoundingClientRect().width };
  });
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
  await cdp.detach();
  assert.ok(rapidClose.before && rapidClose.after, 'rapid close did not return from the opening flight');
  assert.ok(rapidClose.after <= rapidClose.before + 2, 'rapid close jumped to full size');
  await page.waitForFunction(() => !document.querySelector('.obs-presentation[open]'));
  await tile.click();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.obs-photo-flight').count(), 0, 'changing image left an old animated photo');
  assert.equal(await shown(), '02 / 21');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.obs-presentation[open]'));
  await tile.click();
  await page.locator('.obs-present-fullscreen').click();
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  assert.equal(await page.locator('.obs-photo-flight').count(), 0, 'fullscreen retained the transition overlay');
  await page.locator('.obs-present-close').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await tile.click();
  assert.equal(await page.locator('.obs-photo-flight').count(), 0, 'reduced motion animated');
  await page.locator('.obs-present-close').click();
  assert.equal(await page.locator('.obs-presentation[open]').count(), 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  if (!(await page.locator('html').evaluate(el => el.classList.contains('ambient-fx-disabled')))) await toggleFx(page);
  await tile.click();
  assert.equal(await page.locator('.obs-photo-flight').count(), 0, 'FX OFF animated');
  await page.locator('.obs-present-close').click();
  console.log('Photo flight: opening/return, cleanup, scroll/focus, image change, fullscreen, reduced motion and FX OFF passed.');
} finally { await browser.close(); }
