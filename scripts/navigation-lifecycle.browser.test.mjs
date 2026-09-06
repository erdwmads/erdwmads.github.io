import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  for (const route of ['research', 'cv', 'research', 'cv']) {
    await page.locator(`.nav a[href="${route}.html"]`).click();
    await page.waitForURL(`**/${route}.html`);
    await page.waitForTimeout(250);
  }
  const publications = await page.evaluate(() => {
    let count = 0;
    const listener = () => count++;
    window.addEventListener('mads:power-state', listener);
    document.dispatchEvent(new Event('visibilitychange'));
    window.removeEventListener('mads:power-state', listener);
    return count;
  });
  assert.equal(publications, 1, 'soft navigation duplicated power-manager listeners');
  let rejectRequest;
  const release = new Promise(resolve => { rejectRequest = resolve; });
  let intercepted;
  const interceptReady = new Promise(resolve => { intercepted = resolve; });
  await page.route('**/research.html', async route => {
    if (route.request().isNavigationRequest()) return route.continue();
    intercepted();
    await release;
    await route.abort('failed');
  });
  await page.locator('.nav a[href="research.html"]').click();
  await interceptReady;
  await page.locator('.nav a[href="contact.html"]').click();
  await page.waitForURL('**/contact.html');
  rejectRequest();
  await page.waitForTimeout(600);
  assert.ok(page.url().endsWith('/contact.html'), 'superseded failed request replaced the current route');
  await page.unroute('**/research.html');
  if (process.env.MISSION_TEST_PASSWORD) {
    await page.goto(`${base}/research-graduation.html`, { waitUntil: 'networkidle' });
    await page.locator('[data-research-lock-input]').fill(process.env.MISSION_TEST_PASSWORD);
    await page.locator('[data-research-lock-form]').evaluate(form => form.requestSubmit());
    await page.locator('[data-mission-target="log-009"]').click();
    await page.locator('[data-mission-target="log-010"]').click();
    await page.goBack();
    await page.waitForTimeout(500);
    assert.ok(await page.locator('html').evaluate(el => el.classList.contains('research-unlocked')), 'same-document Back relocked the archive');
    assert.equal(await page.locator('.mission-log-entry').getAttribute('id'), 'log-009');
    await page.goForward();
    await page.waitForTimeout(400);
    assert.equal(await page.locator('.mission-log-entry').getAttribute('id'), 'log-010');
    await page.locator('.nav a[href="contact.html"]').click();
    await page.waitForURL('**/contact.html');
    assert.equal(await page.evaluate(() => Boolean(window.MadsProtectedArchive)), false, 'leaving the archive failed to relock');
  }
  console.log('Navigation lifecycle: singleton power listeners, superseded failure and optional archive history checks passed.');
} finally { await browser.close(); }
