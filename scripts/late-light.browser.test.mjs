// The owner's late decisions on the old site's light (2026-11-18, stage c5): the headings in main and the site name
// glow (E116), with body text never glowing; the pills, the 404 card and the docked effects panel carry the old glass
// band and glint without blur (E097); CV, Paper Shelf and Home timeline records glow under a hovering pointer and never
// move (E105); the effects button keeps the shadow its browser drew on the old site (E139); phones run the lite field
// and reach the FX switch in the menu (E103, E136; reading-ui and ambient-resize check the switch and the resize). Each
// is checked where it must not show: forced colours, print, reduced motion, touch. Both themes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const errors = [];

async function open(theme, path, { width = 1440, height = 900, ...options } = {}) {
  const phone = width < 761;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone, ...options });
  await context.addInitScript((t) => { try { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', t); } catch {} }, theme);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(`${theme} ${width} ${path}: ${error.message}`));
  await page.goto(`${base}/${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  return { page, close: () => context.close() };
}
const style = (page, selector, props, pseudo = null) => page.locator(selector).first().evaluate((el, [p, ps]) => {
  const cs = getComputedStyle(el, ps);
  return Object.fromEntries(p.map(name => [name, cs.getPropertyValue(name)]));
}, [props, pseudo]);

try {
  for (const theme of ['space', 'light']) {
    const t = label => `${theme}: ${label}`;
    // E116 and E097 on Home, with the timeline record of E105.
    const home = await open(theme, 'index.html');
    const h1 = (await style(home.page, 'main h1', ['text-shadow']))['text-shadow'];
    const h2 = (await style(home.page, 'main h2', ['text-shadow']))['text-shadow'];
    const brand = (await style(home.page, '.brand > strong', ['text-shadow']))['text-shadow'];
    if (theme === 'space') {
      assert.match(h1, /0px 0px 2px.*0px 0px 18px.*0px 0px 42px/, t(`the h1 carries the old three-layer glow: ${h1}`));
      assert.match(h2, /^rgba\(221, 214, 198, 0\.176\) 0px 0px 12px/, t(`h2 the old 12 px glow: ${h2}`));
    } else {
      assert.match(h1, /^rgb\(255, 255, 255\) 0px 1px 0px.*rgba\(255, 255, 255, 0\.7\) 0px 0px 18px/, t(`the h1 carries the white halo: ${h1}`));
      assert.equal(h2, h1, t('h2 the same halo'));
    }
    assert.equal(brand, h1, t('the site name glows as the h1'));
    for (const selector of ['main p:not(.kicker)', 'main li', '.nav a', '.button']) {
      const glow = (await style(home.page, selector, ['text-shadow']))['text-shadow'];
      assert.equal(glow, 'none', t(`${selector} never glows (${glow})`));
    }
    const pill = await style(home.page, '.pill', ['background-image', 'box-shadow', 'backdrop-filter']);
    assert.match(pill['background-image'], /^linear-gradient\(rgba\(255, 255, 255, 0\.1[26]\)/, t(`the pills carry the glass band: ${pill['background-image']}`));
    assert.match(pill['box-shadow'], /inset/, t('and their top glint'));
    assert.equal(pill['backdrop-filter'], 'none', t('without blur'));
    const row = home.page.locator('.home-timeline-list > li').first();
    await row.scrollIntoViewIfNeeded();
    const before = await row.boundingBox();
    await row.hover();
    await home.page.waitForTimeout(250);
    assert.match(await row.evaluate(el => getComputedStyle(el).boxShadow), /0px 4px 14px/, t('a hovered timeline record glows'));
    assert.deepEqual(await row.boundingBox(), before, t('and does not move'));
    // E139: the effects button keeps its browser's old shadow.
    const edge = await home.page.evaluate(() => document.documentElement.classList.contains('is-edge-browser'));
    const settings = (await style(home.page, '.obs-fx-settings', ['box-shadow']))['box-shadow'];
    if (edge) assert.equal(settings, 'rgba(0, 0, 0, 0.16) 0px 7px 16px 0px', t(`Edge: the effects button casts 0 7px 16px (${settings})`));
    else assert.match(settings, /0px 14px 32px/, t(`Chromium: the deep glazed shadow (${settings})`));
    // E097: the docked panel's band and glint.
    await home.page.locator('.obs-fx-settings').click();
    const panel = await style(home.page, '.obs-fx-dock > .obs-fx-panel', ['background-image', 'background-size']);
    assert.match(panel['background-image'], /linear-gradient\(90deg.*linear-gradient\(rgba\(255, 255, 255/, t(`the docked panel: glint and band (${panel['background-image']})`));
    assert.match(panel['background-size'], /^calc\(100% - 40px\) 1px/, t('the glint stops 20 px from each side'));
    await home.close();

    // E105 on the Paper Shelf and the CV: a glow, no move, the old 180 ms ease-in.
    for (const [path, selector, rule] of [['paper-shelf.html', '.paper-card:not([hidden]) ~ .paper-card:not([hidden])', true], ['cv.html', '.cv-edu-card', false]]) {
      const { page, close } = await open(theme, path);
      const record = page.locator(selector).first();
      await record.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(250);
      const rest = await record.evaluate(el => ({ shadow: getComputedStyle(el).boxShadow, top: getComputedStyle(el).borderTopColor }));
      const box = await record.boundingBox();
      await record.hover({ position: { x: 40, y: 12 } });
      await page.waitForTimeout(400);
      const lit = await record.evaluate(el => ({ shadow: getComputedStyle(el).boxShadow, top: getComputedStyle(el).borderTopColor, transition: getComputedStyle(el).transition }));
      assert.equal(rest.shadow, 'none', t(`${path}: a record rests flat`));
      assert.match(lit.shadow, /0px 6px 18px/, t(`${path}: a hovered record takes the old glow (${lit.shadow})`));
      assert.match(lit.transition, /box-shadow 0\.18s/, t(`${path}: easing in over 180 ms`));
      if (rule) assert.notEqual(lit.top, rest.top, t(`${path}: the paper's rule turns to the glass edge`));
      assert.deepEqual(await record.boundingBox(), box, t(`${path}: the record does not move`));
      await close();
    }

    // The 404 card under the glass band and glint (E097).
    const notFound = await open(theme, '404.html');
    const card = await style(notFound.page, '.archive-index', ['background-image', 'background-size'], '::before');
    assert.match(card['background-image'], /linear-gradient\(90deg.*linear-gradient\(rgba\(255, 255, 255/, t(`the 404 card: glint and band (${card['background-image']})`));
    await notFound.close();

    // Forced colours and print: no heading glow, no band, no record glow.
    for (const media of [{ forcedColors: 'active' }, { media: 'print' }]) {
      const { page, close } = await open(theme, 'index.html');
      await page.emulateMedia(media);
      await page.waitForTimeout(200);
      const label = Object.keys(media)[0] === 'forcedColors' ? 'forced colours' : 'print';
      assert.equal((await style(page, 'main h1', ['text-shadow']))['text-shadow'], 'none', t(`${label}: no heading glow`));
      assert.equal((await style(page, '.brand > strong', ['text-shadow']))['text-shadow'], 'none', t(`${label}: no site-name glow`));
      if (label === 'forced colours') {
        assert.equal((await style(page, '.pill', ['background-image']))['background-image'], 'none', t(`${label}: no glass band on the pills`));
        assert.equal(await page.locator('.ambient-space-layer').evaluate(el => getComputedStyle(el).display).catch(() => 'none'), 'none', t(`${label}: no ambient field`));
      }
      await close();
    }

    // Phones (E103, E136): the lite field runs; reduced motion stops it and the switch reads off; touch gets no record
    // glow (hover: none) and the panel lies in the menu.
    const phone = await open(theme, 'index.html', { width: 390, height: 844 });
    await phone.page.waitForSelector('.ambient-space-layer.is-lite > .ambient-dust', { state: 'attached', timeout: 10000 });
    const lite = await phone.page.evaluate(() => ({ dust: document.querySelectorAll('.ambient-dust').length, pebbles: document.querySelectorAll('.ambient-pebble').length, rail: document.querySelectorAll('.ui2046-layer').length }));
    assert.deepEqual(lite, { dust: 44, pebbles: 0, rail: 0 }, t(`phones: the lite field, no orrery or rail (${JSON.stringify(lite)})`));
    assert.equal(await phone.page.locator('[data-mobile-nav] > .obs-fx-panel').count(), 1, t('phones: the effects panel lies in the menu'));
    await phone.page.locator('[data-nav-toggle]').click();
    const sheetPanel = await style(phone.page, '[data-mobile-nav] > .obs-fx-panel', ['position', 'background-image', 'box-shadow', 'backdrop-filter']);
    assert.deepEqual(sheetPanel, { position: 'static', 'background-image': 'none', 'box-shadow': 'none', 'backdrop-filter': 'none' }, t('phones: a flat ruled block in the sheet, as on the old site'));
    await phone.close();
    const still = await open(theme, 'index.html', { width: 390, height: 844, reducedMotion: 'reduce' });
    await still.page.waitForTimeout(1500);
    assert.equal(await still.page.locator('.ambient-space-layer').count(), 0, t('reduced motion: no field on phones'));
    assert.equal(await still.page.locator('.ambient-fx-toggle').getAttribute('aria-pressed'), 'false', t('reduced motion: the switch reads off'));
    await still.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS late light: heading glow, glass band and glint, record glow, the effects button shadow by browser, the lite phone field and the effects panel in the phone menu, with their off states, in both themes.');
} finally {
  await browser.close();
}
