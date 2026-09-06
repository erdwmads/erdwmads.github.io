import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
  await page.locator('[data-present-photos]').click();
  const fullscreen = page.locator('.obs-present-fullscreen');
  assert.equal(await fullscreen.getAttribute('aria-label'), 'Enter browser full screen');
  assert.equal(await fullscreen.getAttribute('aria-pressed'), 'false');
  const enterIcon = await fullscreen.innerHTML();
  await fullscreen.click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  assert.equal(await fullscreen.getAttribute('aria-label'), 'Exit browser full screen');
  assert.equal(await fullscreen.getAttribute('aria-pressed'), 'true');
  assert.notEqual(await fullscreen.innerHTML(), enterIcon, 'fullscreen icon did not change');
  await fullscreen.click();
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.equal(await fullscreen.getAttribute('aria-label'), 'Enter browser full screen');
  await page.evaluate(() => {
    window.fullscreenSurface = document.querySelector('.obs-presentation-surface');
    window.realRequestFullscreen = window.fullscreenSurface.requestFullscreen;
    window.fullscreenSurface.requestFullscreen = () => Promise.reject(new Error('Denied'));
  });
  await fullscreen.click();
  assert.ok((await page.locator('.obs-fullscreen-status').textContent()).includes('unavailable'));
  assert.ok(await page.locator('.obs-presentation[open]').isVisible());
  await page.evaluate(() => { window.fullscreenSurface.requestFullscreen = window.realRequestFullscreen; });
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window.fullscreenSurface.requestFullscreen = async function () {
      await window.realRequestFullscreen.call(this);
      await new Promise(resolve => { window.finishFullscreenRequest = resolve; });
    };
  });
  await page.locator('[data-present-photos]').click();
  await fullscreen.click();
  await page.waitForFunction(() => typeof window.finishFullscreenRequest === 'function');
  await page.locator('.obs-present-close').click();
  await page.locator('[data-present-photos]').click();
  await page.evaluate(() => window.finishFullscreenRequest());
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.ok(await page.locator('.obs-presentation[open] img').getAttribute('src'), 'late fullscreen completion purged the reopened viewer');
  await page.evaluate(() => { window.fullscreenSurface.requestFullscreen = window.realRequestFullscreen; });
  await page.locator('.obs-present-close').click();
  await page.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false }));
  await page.locator('[data-present-photos]').click();
  assert.ok(await fullscreen.isHidden(), 'unsupported fullscreen button remains visible');
  await page.locator('.obs-present-close').click();
  await page.goto(`${base}/contact.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  assert.ok(await page.locator('.ui2046-progress').evaluate(el => el.hidden), 'short Contact page has a full-width progress stripe');
  assert.equal(await page.locator('.callout').evaluate(el => getComputedStyle(el, '::before').display), 'none', 'Contact retains old callout highlight');
  // Sample Cabinet is explicitly retired and hidden by the existing site policy.
  const routes = ['index', 'research', 'paper-shelf', 'cv', 'photography', 'contact', 'research-log', 'research-graduation'];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['space', 'light']) {
      await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
      for (const route of routes) {
        await page.goto(`${base}/${route}.html`, { waitUntil: 'networkidle' });
        const state = await page.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          main: document.querySelectorAll('main').length,
          heading: document.querySelectorAll('main h1').length,
          header: document.querySelector('.site-header').getBoundingClientRect().bottom,
          content: document.querySelector('main').getBoundingClientRect().top,
          dialogs: document.querySelectorAll('.obs-presentation').length
        }));
        assert.equal(state.theme, theme, `${route}: wrong theme`);
        assert.ok(!state.overflow, `${route}/${width}/${theme}: horizontal overflow`);
        assert.equal(state.main, 1);
        assert.equal(state.heading, 1);
        assert.equal(state.dialogs, 1);
        assert.ok(state.header <= state.content + 1, `${route}: header overlaps main`);
        if (width <= 760) await page.locator('[data-nav-toggle]').click();
        await page.locator('.theme-toggle').click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme === 'space' ? 'light' : 'space');
        await page.locator('.theme-toggle').click();
        if (route === 'research-graduation') assert.equal(await page.locator('.mission-photo-grid img').count(), 0, 'locked images leaked');
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log('Site audit: fullscreen state/error handling, Contact consistency and eight active pages in both themes on desktop/mobile passed.');
} finally { await browser.close(); }
