import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('button[data-polarisation]').count(), 1, 'missing accessible logo controller');
  if (await page.locator('html').evaluate(el => el.classList.contains('ambient-fx-disabled'))) await page.locator('.ambient-fx-toggle').click();
  await page.locator('[data-polarisation]').focus();
  await page.keyboard.down('ArrowRight');
  assert.equal(await page.locator('html').getAttribute('data-polarising'), '');
  assert.notEqual(await page.locator('html').evaluate(el => el.style.getPropertyValue('--mineral-angle')), '0deg');
  await page.keyboard.up('ArrowRight');
  assert.equal(await page.locator('html').getAttribute('data-polarising'), null);
  await page.evaluate(() => {
    window.traceRan = false;
    const observer = new MutationObserver(() => {
      if (document.querySelector('.mineral-cleavage')?.getAnimations({ subtree: true }).length) window.traceRan = true;
    });
    observer.observe(document.documentElement, { attributes: true, subtree: true });
  });
  await page.locator('main .button[href="research.html"]').click();
  await page.waitForURL('**/research.html');
  await page.waitForTimeout(700);
  assert.ok(await page.evaluate(() => window.traceRan), 'cleavage did not run with FX on');
  assert.equal(await page.locator('.mineral-cleavage').evaluate(el => el.getAnimations({ subtree: true }).length), 0, 'cleavage animation kept running');
  await page.locator('[data-public-atlas]').click();
  await page.locator('.evidence-atlas[open]').waitFor();
  assert.ok(await page.locator('.ambient-space-layer').evaluate(el => el.classList.contains('ambient-paused')), 'background particles did not pause behind atlas');
  assert.equal(await page.locator('.atlas-node').count(), 5);
  assert.ok(await page.locator('.atlas-core').evaluate(node => {
    const box = node.getBoundingClientRect(), map = node.parentElement.getBoundingClientRect();
    return Math.abs(box.x + box.width / 2 - map.x - map.width / 2) < 2;
  }), 'graph nodes do not align with their connections');
  await page.locator('.atlas-node[data-group="literature"]').click();
  assert.ok(await page.locator('.atlas-detail a[href^="paper-shelf.html#paper-"]').count() > 0, 'no real paper links');
  assert.equal(await page.locator('.evidence-atlas img[src*="mission-log"]').count(), 0, 'public atlas contains protected images');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.evidence-atlas[open]').count(), 0);
  assert.ok(await page.locator('.ambient-space-layer').evaluate(el => !el.classList.contains('ambient-paused')), 'background particles did not resume after atlas');
  assert.ok(await page.locator('[data-public-atlas]').evaluate(el => el === document.activeElement));
  await page.locator('.ambient-fx-toggle').click();
  await page.evaluate(() => { window.traceRan = false; });
  await page.locator('.nav a[href="cv.html"]').click();
  await page.waitForURL('**/cv.html');
  await page.waitForTimeout(650);
  assert.equal(await page.evaluate(() => window.traceRan), false, 'cleavage ran with FX off');
  assert.equal(await page.locator('.mineral-cleavage').count(), 1);
  assert.equal(await page.locator('.evidence-atlas').count(), 1);
  await page.goto(`${base}/research-graduation.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-private-atlas]').count(), 0, 'private atlas exists before unlocking');
  if (process.env.MISSION_TEST_PASSWORD) {
    await page.locator('[data-research-lock-input]').fill(process.env.MISSION_TEST_PASSWORD);
    await page.locator('[data-research-lock-form]').evaluate(form => form.requestSubmit());
    await page.locator('[data-private-atlas]').waitFor();
    const figureCount = await page.locator('.mission-log-entry .mission-photo-grid figure').count();
    await page.locator('[data-private-atlas]').click();
    await page.locator('[data-group="images"]').click();
    assert.equal(await page.locator('.atlas-image-source').count(), figureCount);
    await page.locator('.atlas-image-source img').first().evaluate(img => img.decode());
    await page.locator('.atlas-image-source').first().click();
    assert.equal(await page.locator('.evidence-atlas[open]').count(), 0);
    await page.locator('.mission-lightbox.is-open').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('[data-private-atlas]').click();
    await page.locator('[data-group="tables"]').click();
    assert.equal(await page.locator('.atlas-detail table').count(), await page.locator('.mission-log-entry table').count());
    await page.locator('.atlas-source-button').first().click();
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'TABLE', 'table return did not transfer focus');
    await page.locator('[data-private-atlas]').click();
    await page.locator('[data-group="record"]').click();
    await page.locator('.atlas-source-button').click();
    assert.ok(await page.evaluate(() => document.activeElement.classList.contains('mission-log-entry')), 'record return did not transfer focus');
    await page.locator('[data-private-atlas]').click();
    await page.locator('[data-group="images"]').click();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    assert.equal(await page.locator('.evidence-atlas[open]').count(), 0);
    assert.equal(await page.locator('.evidence-atlas .atlas-source, .evidence-atlas img').count(), 0, 'private sources survive relock');
    assert.equal(await page.locator('[data-private-atlas]').count(), 0);
  }
  for (const theme of ['space', 'light']) {
    await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
    await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-public-atlas]').click();
    await page.locator('[data-group="literature"]').click();
    const href = await page.locator('.atlas-detail a').first().getAttribute('href');
    await page.locator('.atlas-detail a').first().click();
    await page.waitForURL(`**/${href}`);
    assert.equal(await page.locator(new URL(page.url()).hash).count(), 1, 'source anchor is missing');
  }
  for (const width of [320, 390, 760, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
    await page.locator('[data-public-atlas]').click();
    await page.locator('[data-group="literature"]').click();
    assert.ok(await page.locator('.evidence-atlas').evaluate(el => el.scrollWidth <= el.clientWidth), `${width}: atlas overflow`);
    assert.ok(await page.locator('.atlas-close').isVisible());
    await page.keyboard.press('Escape');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('[data-polarisation]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('html').getAttribute('data-polarising'), null, 'reduced motion enables polarisation');
  assert.deepEqual(errors, []);
  console.log('Mineral interactions: FX gating, finite animation, public sources, source anchors, responsive atlas and reduced motion pass.' + (process.env.MISSION_TEST_PASSWORD ? ' Private figures, tables, image viewer and relock purge pass.' : ' Private unlock tests skipped: no test password.'));
} finally { await browser.close(); }
