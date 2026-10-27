import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:52523';
try {
  {
    // The controller is inlined after </header>, so the compact header is final before the content below it is parsed.
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    const external = [];
    page.on('request', request => { if (/\/site-header\.js(?:[?#]|$)/.test(request.url())) external.push(request.url()); });
    await page.addInitScript(() => {
      new MutationObserver((records, observer) => {
        if (!document.getElementById('main-content')) return;
        window.__navReadyWhenMainParsed = document.documentElement.hasAttribute('data-nav-ready');
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(base + '/contact.html');
    assert.equal(await page.evaluate(() => window.__navReadyWhenMainParsed), true, 'navigation must be ready before the page content is parsed');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('script[data-site-header]')].map(script => [script.previousElementSibling?.matches('header.site-header'), script.nextElementSibling?.id])), [[true, 'main-content']], 'one inline header controller directly after the header');
    assert.deepEqual(external, [], 'site-header.js must not also load as an external script');
    await page.evaluate(() => { window.__softNavProbe = true; window.__firstHeaderController = window.__madsSiteHeaderAbort; });
    await page.locator('[data-nav-toggle]').click();
    await page.locator('[data-mobile-nav] a[href="cv.html"]').click();
    await page.waitForFunction(() => location.pathname.endsWith('/cv.html') && !document.documentElement.classList.contains('mads-soft-nav-active'));
    assert.equal(await page.evaluate(() => window.__softNavProbe), true, 'the Contact to CV link must use soft navigation');
    assert.equal(await page.evaluate(() => window.__madsSiteHeaderAbort === window.__firstHeaderController && !window.__madsSiteHeaderAbort.signal.aborted), true, 'soft navigation must not re-run the header controller');
    assert.equal(await page.locator('html').getAttribute('data-nav-ready'), '');
    assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'), 'false');
    await page.locator('[data-nav-toggle]').click();
    assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'), 'true', 'the toggle still works after soft navigation');
    await page.close();
  }
  for (const width of [320, 390, 760]) {
    for (const mode of ['no-js', 'failed-header']) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, javaScriptEnabled: mode !== 'no-js', reducedMotion: 'reduce' });
      let failedHeader = false;
      // A header controller that throws must leave the no-JS fallback in place.
      if (mode === 'failed-header') await page.route('**/contact.html', async route => {
        const response = await route.fetch();
        const html = await response.text();
        const body = html.replace(/<script data-site-header>[\s\S]*?<\/script>/, '<script data-site-header>throw new Error("site header failed")</script>');
        failedHeader = body !== html;
        await route.fulfill({ response, body });
      });
      await page.goto(base + '/contact.html');
      if (mode === 'failed-header') assert.equal(failedHeader, true, 'inline header controller not found in contact.html');
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
  console.log('Inline header controller before content, single run across soft navigation, mobile header fallback and 200% gate text: passed');
} finally {
  await browser.close();
}
