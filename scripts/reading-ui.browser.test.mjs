// Reading UI (spec §6.3): on phones the navigation sheet holds the links, the Research Log gate, the theme toggle, the
// one Visual effects panel right after it (FX switch, intensity and coordinates; R3 amended, owner decision E136), with
// no fixed dock, its links two by two in version 1's 48 px rows while the tagline stays under the name in the bar; the lite ambient field (E103) follows the switch there. Escape closes the sheet and
// returns focus to Menu. The reading sheet (main's own
// background below its rise since 2026-11-26) is a static gradient without blur in both themes. Wider windows keep one
// settings dock; narrowing to a phone moves its panel into the sheet and its focus to Menu, widening moves it back
// closed; Escape and keyboard navigation dismiss it without losing focus, and every selection marker is brass.
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
  assert.equal(await page.locator('.obs-fx-panel').count(), 1, 'One effects panel, never a copy');
  assert.equal(await sheet.locator('.obs-fx-panel').count(), 1, 'The effects panel lies in the sheet (E136)');
  assert.ok(await page.evaluate(() => document.querySelector('.theme-toggle').nextElementSibling === document.querySelector('.obs-fx-panel')), 'right after the theme toggle, as on the old site');
  assert.equal(await page.locator('.ambient-fx-toggle').isVisible(), false, 'The FX switch shows only with the sheet open');
  await page.waitForSelector('.ambient-space-layer.is-lite > .ambient-dust', { state: 'attached', timeout: 10000 });
  assert.equal(await page.locator('.ambient-space-layer').count(), 1, 'Phones run one lite field (E103)');
  assert.equal(await page.locator('.ambient-pebble').count(), 0, 'without pebbles');
  await menu.click();
  assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  assert.equal(await sheet.locator('.nav a').count(), 7, 'The sheet holds the seven links');
  for (const part of ['.nav-log-gate', '.theme-toggle', '.obs-fx-panel', '.ambient-fx-toggle', '.research-coordinates']) assert.ok(await sheet.locator(part).isVisible(), `The sheet shows ${part}`);
  assert.ok(await page.locator('.brand > strong + span').isVisible() && !(await sheet.locator('.header-actions__tagline').isVisible()), 'The tagline stays under the name, never twice');
  for (const label of await sheet.locator('.obs-fx-panel label').all()) assert.ok((await label.boundingBox()).height >= 44, 'Intensity choices are at least 44 px');
  // The switch works on a phone: off removes the field, on brings the lite field back.
  await sheet.locator('.ambient-fx-toggle').click();
  assert.equal(await page.locator('.ambient-space-layer').count(), 0, 'FX off removes the phone field');
  assert.equal(await sheet.locator('.ambient-fx-toggle').getAttribute('aria-pressed'), 'false');
  await sheet.locator('.ambient-fx-toggle').click();
  await page.waitForSelector('.ambient-space-layer.is-lite > .ambient-dust', { state: 'attached', timeout: 5000 });
  assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'Using the switch keeps the sheet open');
  for (const link of await sheet.locator('.nav a').all()) assert.ok(Math.abs((await link.boundingBox()).height - 48) < 1.5, 'Navigation rows are 48 px');
  for (const control of await sheet.locator('a, button').all()) assert.ok((await control.boundingBox()).height >= 44, 'Touch targets are at least 44 px');
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  assert.ok(await menu.evaluate(el => el === document.activeElement), 'Escape returns focus to the menu button');
  for (const theme of ['space', 'light']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    for (const width of [320, 390, 760]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme} overflow at ${width}`);
      // On Home the sheet's middle lies on .page::before, so the opening's sky stays under it (the Home opening of
      // 2026-11-28); elsewhere it is main's own background. Neither main nor the sheet may blur what lies behind.
      const paint = await page.locator('main').evaluate(el => {
        const sheet = document.body.classList.contains('ui-page-home') ? getComputedStyle(el.querySelector('.page'), '::before') : getComputedStyle(el);
        return { background: sheet.backgroundImage, filter: getComputedStyle(el).backdropFilter, sheetFilter: sheet.backdropFilter };
      });
      assert.match(paint.background, /linear-gradient/, 'Reading surface must be present');
      assert.equal(paint.filter, 'none', 'No live backdrop blur on the reading surface');
      assert.equal(paint.sheetFilter, 'none', 'No live backdrop blur on the sheet');
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
  // Narrowing to a phone hides the dock and moves the panel into the sheet (E136); the focus it held moves to Menu, not
  // to the body.
  await desktop.setViewportSize({ width: 390, height: 844 });
  await desktop.waitForTimeout(200);
  assert.equal(await desktop.locator('.obs-fx-dock > button:visible').count(), 0, 'Narrowing to a phone hides the fixed dock');
  assert.equal(await desktop.locator('.obs-fx-dock > .obs-fx-panel').count(), 0, 'and the panel leaves it');
  assert.equal(await desktop.locator('[data-mobile-nav] .obs-fx-panel').count(), 1, 'for the sheet');
  const narrowed = await desktop.evaluate(() => ({ hidden: document.querySelector('.obs-fx-panel').hidden, expanded: document.querySelector('.obs-fx-settings').getAttribute('aria-expanded'), focus: document.activeElement.matches('[data-nav-toggle]') }));
  assert.deepEqual(narrowed, { hidden: false, expanded: 'false', focus: true }, `Narrowing moves the panel into the sheet and its focus to Menu: ${JSON.stringify(narrowed)}`);
  await desktop.setViewportSize({ width: 1440, height: 1000 });
  await desktop.waitForTimeout(200);
  assert.equal(await desktop.locator('.obs-fx-dock > button:visible').count(), 1, 'Widening shows the dock again');
  assert.equal(await desktop.locator('.obs-fx-dock > .obs-fx-panel').count(), 1, 'with the panel back in it');
  assert.equal(await desktop.locator('.obs-fx-settings').getAttribute('aria-expanded'), 'false', 'and the panel stays closed');
  assert.ok(await desktop.locator('.obs-fx-panel').isHidden(), 'closed');
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
  // Scrolling repaints nothing but the reading indicators: the spine tick and the old site's reading beam across the
  // top of the window (E029), both drawn from --scroll-progress, and, since 2026-11-26 (calmer chrome), the opacity of
  // the spine itself, which comes in over the first 160 px of scroll. Every other fixed layer and the reading surface
  // keep their paint.
  const paintOf = () => desktop.evaluate(() => {
    const out = {};
    const nodes = [document.querySelector('main'), ...[...document.querySelectorAll('body *')].filter(el => getComputedStyle(el).position === 'fixed'), ...document.querySelectorAll('.ui2046-progress > span')];
    nodes.forEach((el, index) => { for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      const name = el.matches('.ui2046-progress > span') ? 'reading-indicator' : `${el.tagName}.${el.classList[0] || ''}`;
      out[`${index}:${name}${pseudo || ''}`] = [cs.backgroundImage, cs.backgroundColor, cs.boxShadow, cs.opacity, cs.filter, cs.transform, cs.translate].join(' | ');
    } });
    return out;
  });
  // The soft navigation's fade of main and its backdrop cross-fade (legacy-navigation.js, 2026-11-28: the old page's
  // picture dissolves on a layer of its own for 760 ms) settle first, so only the scroll can change what follows.
  await desktop.waitForFunction(() => getComputedStyle(document.querySelector('main')).opacity === '1');
  await desktop.waitForFunction(() => !document.querySelector('.backdrop-fade') && !document.documentElement.dataset.backdropFade, null, { timeout: 5000 });
  await desktop.waitForTimeout(300);
  const paintBefore = await paintOf();
  await desktop.evaluate(() => window.scrollTo(0, 650));
  await desktop.waitForTimeout(300);
  const paintAfter = await paintOf();
  const changed = Object.keys(paintBefore).filter(key => paintBefore[key] !== paintAfter[key]);
  // The spine may change its opacity (field 3) and nothing else.
  const spineFade = key => /:ASIDE\.ui2046-rail$/.test(key) && paintBefore[key].split(' | ').every((value, i) => i === 3 || value === paintAfter[key].split(' | ')[i]);
  assert.ok(changed.every(key => /:reading-indicator::(before|after)$/.test(key) || spineFade(key)),`Only the reading indicators may change on scroll: ${JSON.stringify(changed.map(key => [key, paintBefore[key], paintAfter[key]]))}`);
  const beam = await desktop.locator('.ui2046-progress > span').evaluate(el => getComputedStyle(el, '::before').transform);
  assert.notEqual(beam, 'matrix(0, 0, 0, 1, 0, 0)', 'The reading beam grows with the scroll (E029)');
  assert.ok(!changed.some(key => key.includes('MAIN')), 'Reading paint must not change on scroll');
  assert.deepEqual(errors, []);
  console.log('Reading UI passed: phone sheet with the one effects panel and a working FX switch over the lite field, dismissal, responsive sheet, one dock on wider windows, brass markers, static reading surface and both themes.');
} finally {
  await browser.close();
}
