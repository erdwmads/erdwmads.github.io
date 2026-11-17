// Reading UI (spec §6.3): on phones the navigation sheet holds the links, the Research Log gate, the theme toggle and
// the tagline in 56 px rows, and no effects panel (FX is off there, decision R3), with no fixed dock and no ambient
// layer; Escape closes it and returns focus to Menu. The reading veil is a static gradient without blur in both themes.
// Wider windows keep one settings dock whose panel never leaves it; narrowing to a phone, Escape and keyboard
// navigation dismiss it without losing focus, and every selection marker is drawn in the brass token.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
// Runs in the page: a custom property resolved to a colour.
const token = name => { const probe = document.createElement('i'); probe.style.color = `var(${name})`; document.body.append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; };
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  const menu = page.locator('[data-nav-toggle]');
  const sheet = page.locator('[data-mobile-nav]');
  assert.equal(await page.locator('.obs-fx-dock').isVisible(), false, 'Phones have no fixed display-settings dock');
  assert.equal(await sheet.locator('.obs-fx-panel').count(), 0, 'The effects panel stays out of the sheet (R3)');
  assert.equal(await page.locator('.ambient-fx-toggle').isVisible(), false, 'Do not expose a particle toggle that mobile protection disables');
  assert.equal(await page.locator('.ambient-space-layer').count(), 0);
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  assert.equal(await sheet.locator('.nav a').count(), 7, 'The sheet holds the seven links');
  for (const part of ['.nav-log-gate', '.theme-toggle', '.header-actions__tagline']) assert.ok(await sheet.locator(part).isVisible(), `The sheet shows ${part}`);
  for (const link of await sheet.locator('.nav a').all()) assert.ok(Math.abs((await link.boundingBox()).height - 56) < 1.5, 'Navigation rows are 56 px');
  for (const control of await sheet.locator('a, button').all()) assert.ok((await control.boundingBox()).height >= 44, 'Touch targets are at least 44 px');
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.ok(await menu.evaluate(el => el === document.activeElement), 'Escape returns focus to the menu button');
  for (const theme of ['space', 'light']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    for (const width of [320, 390, 760]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme} overflow at ${width}`);
      const paint = await page.locator('main').evaluate(el => ({ background: getComputedStyle(el).backgroundImage, filter: getComputedStyle(el).backdropFilter }));
      assert.match(paint.background, /linear-gradient/, 'Reading surface must be present');
      assert.equal(paint.filter, 'none', 'No live backdrop blur on the reading surface');
      await menu.click();
      const box = await sheet.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width && box.y >= 0, `${theme} ${width}: the sheet stays in the viewport`);
      assert.equal(await page.locator('.obs-fx-dock').isVisible(), false, `${theme} ${width}: no dock beside the open sheet`);
      await page.keyboard.press('Escape');
    }
  }
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  assert.equal(await desktop.locator('.obs-fx-dock > button:visible').count(), 1);
  assert.equal(await desktop.locator('.ambient-fx-toggle').isVisible(), false);
  await desktop.locator('.obs-fx-settings').click();
  await desktop.getByLabel('Standard', { exact: true }).check();
  assert.equal(await desktop.locator('html').getAttribute('data-fx-intensity'), 'standard');
  await desktop.getByLabel('Immersive', { exact: true }).check();
  assert.equal(await desktop.locator('html').getAttribute('data-fx-intensity'), 'immersive');
  assert.equal(await desktop.locator('.obs-fx-settings').getAttribute('aria-expanded'), 'true', 'Choosing an intensity keeps the panel open');
  assert.ok(await desktop.locator('.obs-fx-panel input[value="immersive"]').evaluate(el => el === document.activeElement), 'The checked radio holds focus');
  // Narrowing to a phone hides the dock: the panel closes and the focus it held moves to Menu, not to the body.
  await desktop.setViewportSize({ width: 390, height: 844 });
  await desktop.waitForTimeout(200);
  assert.equal(await desktop.locator('.obs-fx-dock > button:visible').count(), 0, 'Narrowing to a phone hides the fixed dock');
  assert.equal(await desktop.locator('.obs-fx-dock > .obs-fx-panel').count(), 1, 'and the panel stays in it');
  assert.equal(await desktop.locator('[data-mobile-nav] .obs-fx-panel').count(), 0);
  const narrowed = await desktop.evaluate(() => ({ hidden: document.querySelector('.obs-fx-panel').hidden, expanded: document.querySelector('.obs-fx-settings').getAttribute('aria-expanded'), focus: document.activeElement.matches('[data-nav-toggle]') }));
  assert.deepEqual(narrowed, { hidden: true, expanded: 'false', focus: true }, `Narrowing closes the panel and moves its focus to Menu: ${JSON.stringify(narrowed)}`);
  await desktop.setViewportSize({ width: 1440, height: 1000 });
  await desktop.waitForTimeout(200);
  assert.equal(await desktop.locator('.obs-fx-dock > button:visible').count(), 1, 'Widening shows the dock again');
  assert.equal(await desktop.locator('.obs-fx-settings').getAttribute('aria-expanded'), 'false', 'and the panel stays closed');
  await desktop.locator('.obs-fx-settings').click();
  await desktop.keyboard.press('Escape');
  assert.equal(await desktop.locator('.obs-fx-settings').getAttribute('aria-expanded'), 'false', 'Escape closes the panel');
  assert.ok(await desktop.locator('.obs-fx-settings').evaluate(el => el === document.activeElement), 'and returns focus to the settings button');
  assert.equal(await desktop.locator('.ambient-fx-toggle').count(), 1);
  await desktop.locator('.obs-fx-settings').click();
  await desktop.locator('.nav a[href="research.html"]').focus();
  await desktop.keyboard.press('Enter');
  await desktop.waitForURL('**/research.html');
  assert.equal(await desktop.locator('.obs-fx-settings').count(), 1, 'Soft navigation must retain one settings entry');
  assert.equal(await desktop.locator('.obs-fx-settings').getAttribute('aria-expanded'), 'false', 'Keyboard navigation must dismiss the settings panel');
  const accent = await desktop.evaluate(token, '--obs-accent');
  // The navigation marker and the resting rule are 2 px top borders (forced colours keep them); a research-scale beam
  // (WP4), where a page has one, is a filled bar.
  const markers = await desktop.evaluate(() => [
    { color: getComputedStyle(document.querySelector('.obs-nav-beam')).borderTopColor, image: getComputedStyle(document.querySelector('.obs-nav-beam')).backgroundImage },
    { color: getComputedStyle(document.querySelector('.nav a[aria-current="page"]'), '::before').borderTopColor, image: 'none' },
    ...[...document.querySelectorAll('.research-scale__beam')].map(el => ({ color: getComputedStyle(el).backgroundColor, image: getComputedStyle(el).backgroundImage }))
  ]);
  assert.ok(markers.length >= 2, 'Navigation marker and resting rule are present');
  assert.ok(markers.every(marker => marker.color === accent && marker.image === 'none'), `Selection markers are drawn in the brass token ${accent}: ${JSON.stringify(markers)}`);
  const surfaceBefore = await desktop.locator('main').evaluate(el => getComputedStyle(el).backgroundImage);
  await desktop.evaluate(() => window.scrollTo(0, 650));
  assert.equal(await desktop.locator('main').evaluate(el => getComputedStyle(el).backgroundImage), surfaceBefore, 'Reading paint must not change on scroll');
  assert.deepEqual(errors, []);
  console.log('Reading UI passed: phone sheet without effects panel, particle protection, dismissal, responsive sheet, one dock on wider windows, brass markers, static reading surface and both themes.');
} finally {
  await browser.close();
}
