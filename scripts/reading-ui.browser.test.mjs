import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true,
  ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  // Phones: no fixed dock over the reading column. Visual effects sits in the navigation sheet after the theme toggle.
  const menu = page.locator('[data-nav-toggle]');
  const sheetPanel = page.locator('[data-mobile-nav] > .theme-toggle + .obs-fx-panel');
  assert.equal(await page.locator('.obs-fx-dock').isVisible(), false, 'Phones have no fixed display-settings dock');
  assert.equal(await sheetPanel.count(), 1, 'Visual effects joins the navigation sheet after the theme toggle');
  await menu.click();
  assert.ok(await sheetPanel.isVisible(), 'Mobile must have an accessible Visual effects entry');
  for (const label of await sheetPanel.locator('label').all()) assert.ok((await label.boundingBox()).height >= 44, 'Touch target must be at least 44px');
  assert.equal(await page.locator('.ambient-fx-toggle').isVisible(), false, 'Do not expose a particle toggle that mobile protection disables');
  assert.equal(await page.locator('.ambient-space-layer').count(), 0);
  await page.getByLabel('Standard', { exact: true }).check();
  assert.equal(await page.locator('html').getAttribute('data-fx-intensity'), 'standard');
  await page.getByLabel('Immersive', { exact: true }).check();
  assert.equal(await page.locator('html').getAttribute('data-fx-intensity'), 'immersive');
  assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'Choosing an effect keeps the sheet open');
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
      const panel = await sheetPanel.boundingBox();
      assert.ok(panel.x >= 0 && panel.x + panel.width <= width && panel.y >= 0);
      await page.keyboard.press('Escape');
    }
  }
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await desktop.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  assert.equal(await desktop.locator('.obs-fx-dock > button:visible').count(),1);
  assert.equal(await desktop.locator('.ambient-fx-toggle').isVisible(),false);
  await desktop.locator('.obs-fx-settings').click();
  await desktop.setViewportSize({ width: 390, height: 844 });
  // The panel moves on the media-query change event; wait for it instead of reading the DOM in the same tick.
  await desktop.waitForFunction(() => document.querySelector('.obs-fx-panel')?.parentElement?.matches('[data-mobile-nav]'), null, { timeout: 3000 }).catch(() => {});
  assert.equal(await desktop.locator('.obs-fx-dock > button:visible').count(), 0, 'Narrowing to a phone removes the fixed dock');
  assert.equal(await desktop.locator('[data-mobile-nav] > .obs-fx-panel').count(), 1, 'and moves the panel into the navigation sheet');
  await desktop.setViewportSize({ width: 1440, height: 1000 });
  await desktop.waitForFunction(() => document.querySelector('.obs-fx-panel')?.parentElement?.matches('.obs-fx-dock'), null, { timeout: 3000 }).catch(() => {});
  assert.equal(await desktop.locator('.obs-fx-dock > button:visible').count(),1);
  assert.equal(await desktop.locator('.obs-fx-dock > .obs-fx-panel').count(), 1, 'Widening returns the panel to the dock');
  assert.equal(await desktop.locator('.ambient-fx-toggle').isVisible(),false);
  assert.equal(await desktop.locator('.obs-fx-settings').getAttribute('aria-expanded'), 'false');
  assert.equal(await desktop.locator('.ambient-fx-toggle').count(), 1);
  await desktop.locator('.obs-fx-settings').click();
  await desktop.locator('.nav a[href="research.html"]').focus();
  await desktop.keyboard.press('Enter');
  await desktop.waitForURL('**/research.html');
  assert.equal(await desktop.locator('.obs-fx-settings').count(), 1, 'Soft navigation must retain one settings entry');
  assert.equal(await desktop.locator('.obs-fx-settings').getAttribute('aria-expanded'), 'false', 'Keyboard navigation must dismiss the settings panel');
  const beams = await desktop.locator('.obs-nav-beam, .research-scale__beam').evaluateAll(elements => elements.map(el => ({ color: getComputedStyle(el).backgroundColor, image: getComputedStyle(el).backgroundImage })));
  assert.ok(beams.length >= 1, 'Navigation selection marker is present');
  assert.ok(beams.every(beam => beam.color === beams[0].color && beam.image === 'none'), 'All selection markers must share the gold status colour');
  const surfaceBefore = await desktop.locator('main').evaluate(el => getComputedStyle(el).backgroundImage);
  await desktop.evaluate(() => window.scrollTo(0, 650));
  assert.equal(await desktop.locator('main').evaluate(el => getComputedStyle(el).backgroundImage), surfaceBefore, 'Reading paint must not change on scroll');
  assert.deepEqual(errors, []);
  console.log('Reading UI passed: mobile single entry, particle protection, intensity, dismissal, responsive controls, static reading surface and both themes.');
} finally {
  await browser.close();
}
