// The owner's late decisions on the old site's light (2026-11-18, stage c5): the headings in main and the site name
// glow (E116), with body text never glowing; the Home keywords (a glint hairline and a pool each since 2026-11-26), the
// 404 card (a pool under a glint hairline since 2026-11-26) and the docked effects panel carry the old glass band and
// glint without blur (E097); CV, Paper Shelf and Home timeline records glow under a hovering pointer and never move
// (E105; on the CV and the Paper Shelf since 2026-11-26 the record's rule lights brass to steel over a glow pool on a
// layer behind the text, easing in over 180 ms); the effects button keeps the shadow its
// browser drew on the old site as a shade pool under its borderless icon (E139, E130); phones run the lite field
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
    // The keywords (no capsules since 2026-11-26): the glint as a hairline above each word, the band as a pool behind it.
    const pill = await style(home.page, '.pill', ['background-image', 'box-shadow', 'backdrop-filter', 'border-top-width', 'border-radius']);
    assert.match(pill['background-image'], /^linear-gradient\(90deg, rgba\(255, 255, 255, 0\), rgba\(255, 255, 255, 0\.4\), rgba\(255, 255, 255, 0\)\), radial-gradient\(/, t(`the keywords carry the glint hairline and the pool: ${pill['background-image']}`));
    assert.equal(pill['box-shadow'], 'none', t('no capsule glint'));
    assert.deepEqual([pill['border-top-width'], pill['border-radius']], ['0px', '0px'], t('and no capsule'));
    assert.equal(pill['backdrop-filter'], 'none', t('without blur'));
    const row = home.page.locator('.home-timeline-list > li').first();
    await row.scrollIntoViewIfNeeded();
    // Reaching the timeline sets it in once (home-path.js, the Home opening of 2026-11-28); measure once it has settled.
    // The set-in starts from an IntersectionObserver callback after the scroll, so let it run first (two frames and
    // 100 ms, as in mission-experience), then wait for the animations it started.
    await row.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 100)))));
    await row.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished)));
    const before = await row.boundingBox();
    await row.hover();
    await home.page.waitForTimeout(250);
    assert.match(await row.evaluate(el => getComputedStyle(el).boxShadow), /0px 4px 14px/, t('a hovered timeline record glows'));
    assert.deepEqual(await row.boundingBox(), before, t('and does not move'));
    // E139, E130: the effects button keeps its browser's old shadow, as a shade pool under the borderless icon (a
    // box-shadow would draw the old disc again): the same offset, reach and alpha.
    const edge = await home.page.evaluate(() => document.documentElement.classList.contains('is-edge-browser'));
    const settings = await style(home.page, '.obs-fx-settings', ['box-shadow', 'border-top-width']);
    assert.deepEqual([settings['box-shadow'], settings['border-top-width']], ['none', '0px'], t(`the effects button is a borderless icon (${JSON.stringify(settings)})`));
    const shade = await style(home.page, '.obs-fx-settings', ['top', 'background-image'], '::after');
    if (edge) {
      assert.equal(shade.top, '-16px', t(`Edge: the shade reaches 16 px (${shade.top})`));
      assert.match(shade['background-image'], /^radial-gradient\(closest-side at 50% calc\(50% \+ 7px\), rgba\(0, 0, 0, 0\.16\)/, t(`Edge: offset 7 px at .16 (${shade['background-image']})`));
    } else {
      assert.equal(shade.top, '-32px', t(`Chromium: the shade reaches 32 px (${shade.top})`));
      assert.match(shade['background-image'], /^radial-gradient\(closest-side at 50% calc\(50% \+ 14px\), rgba\(0, 0, 0, 0\.18\)/, t(`Chromium: offset 14 px at .18 (${shade['background-image']})`));
    }
    // E097: the docked panel's band and glint, on its feathered face (2026-11-28): the glint at its old .4 peak fading
    // out over 30 % at each end, as the hairline under the legend; the band at its old peak, rising from nothing over
    // 56 px, so neither draws the panel's top edge. The panel itself has no corner or box halo.
    await home.page.locator('.obs-fx-settings').click();
    const panel = await style(home.page, '.obs-fx-dock > .obs-fx-panel', ['background-image', 'background-size', 'background-position'], '::before');
    assert.match(panel['background-image'], /^linear-gradient\(90deg, rgba\(255, 255, 255, 0\), rgba\(255, 255, 255, 0\.4\) 30%, rgba\(255, 255, 255, 0\.4\) 70%, rgba\(255, 255, 255, 0\)\)/, t(`the docked panel: glint (${panel['background-image']})`));
    assert.match(panel['background-image'], /linear-gradient\(rgba\(255, 255, 255, 0\), rgba\(255, 255, 255, 0\.1[26]\) 56px/, t(`the docked panel: band rising from nothing (${panel['background-image']})`));
    assert.match(panel['background-size'], /^calc\(100% - 32px\) 1px/, t('the glint stops 16 px from each side'));
    assert.match(panel['background-position'], /^50% 42px/, t('the glint lies under the legend'));
    const frame = await style(home.page, '.obs-fx-dock > .obs-fx-panel', ['box-shadow', 'border-top-left-radius']);
    assert.deepEqual([frame['box-shadow'], frame['border-top-left-radius']], ['none', '0px'], t(`the panel draws no box halo or corner (${JSON.stringify(frame)})`));
    await home.close();

    // E105 on the Paper Shelf and the CV (2026-11-26): on a layer behind the record, its rule (the paper's top rule, the
    // entry's foot rule) lights brass to steel over a glow pool, easing in over 180 ms; no depth shadow, no move, and the
    // text stays above the layer.
    for (const [path, selector, edge] of [['paper-shelf.html', '.paper-card:not([hidden]) ~ .paper-card:not([hidden])', 'top'], ['cv.html', '.cv-edu-card', 'bottom']]) {
      const { page, close } = await open(theme, path);
      const record = page.locator(selector).first();
      await record.scrollIntoViewIfNeeded();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(300);
      const read = () => record.evaluate(el => { const a = getComputedStyle(el, '::after'); return { shadow: getComputedStyle(el).boxShadow, opacity: a.opacity, image: a.backgroundImage, size: a.backgroundSize, position: a.backgroundPosition, z: a.zIndex, transition: a.transition }; });
      const rest = await read();
      const box = await record.boundingBox();
      await record.hover({ position: { x: 40, y: 24 } });
      await page.waitForTimeout(450);
      const lit = await read();
      assert.equal(rest.shadow, 'none', t(`${path}: a record rests flat`));
      assert.equal(rest.opacity, '0', t(`${path}: the glow waits unseen`));
      assert.equal(lit.opacity, '1', t(`${path}: a hovered record takes the glow`));
      assert.equal(lit.shadow, 'none', t(`${path}: and no depth shadow, which would draw a box`));
      assert.match(lit.image, /^linear-gradient\(90deg, rgb.*radial-gradient/, t(`${path}: a brass-to-steel rule over a glow pool (${lit.image.slice(0, 70)})`));
      assert.match(lit.size, /^100% 1px/, t(`${path}: the lit rule is 1 px`));
      assert.match(lit.position, edge === 'top' ? /^0(px|%) 0(px|%),/ : /^0(px|%) 100%,/, t(`${path}: on the record's ${edge} rule (${lit.position})`));
      assert.equal(lit.z, '-1', t(`${path}: behind the text`));
      assert.match(lit.transition, /opacity 0\.18s/, t(`${path}: easing in over 180 ms`));
      const text = await record.locator(edge === 'top' ? '.paper-summary' : '.cv-edu-body > p').first().boundingBox();
      assert.equal(await page.evaluate(([x, y, sel]) => Boolean(document.elementFromPoint(x, y)?.closest(sel)), [text.x + 10, text.y + text.height / 2, selector.split(' ~ ').at(-1)]), true, t(`${path}: the text stays on top`));
      assert.deepEqual(await record.boundingBox(), box, t(`${path}: the record does not move`));
      await close();
    }

    // The 404 card (E097) since 2026-11-26: the glint a head hairline 20 px in from each side, the band a light pool.
    const notFound = await open(theme, '404.html');
    const card = await style(notFound.page, '.archive-index', ['background-image', 'background-size'], '::before');
    assert.match(card['background-image'], /linear-gradient\(90deg.*radial-gradient/, t(`the 404 card: glint and pool (${card['background-image']})`));
    assert.match(card['background-size'], /^calc\(100% - 40px\) 1px/, t('the glint stops 20 px from each side'));
    // Since 2026-11-28 the glint lies on the section's own line (one rule opens the section, none 32 px under it).
    const onRule = await notFound.page.evaluate(() => {
      const list = document.querySelector('.archive-index'), section = list.closest('.folio-section');
      return { glint: list.getBoundingClientRect().top + parseFloat(getComputedStyle(list, '::before').top), rule: section.getBoundingClientRect().top };
    });
    assert.ok(Math.abs(onRule.glint - onRule.rule) <= 1, t(`the 404 glint lies on the section's line (${JSON.stringify(onRule)})`));
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
        assert.equal((await style(page, '.pill', ['background-image']))['background-image'], 'none', t(`${label}: no glint or pool on the keywords`));
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
    assert.deepEqual({ ...sheetPanel, 'background-image': /^linear-gradient\(90deg, (rgba\(0, 0, 0, 0\)|transparent)/.test(sheetPanel['background-image']) }, { position: 'static', 'background-image': true, 'box-shadow': 'none', 'backdrop-filter': 'none' }, t(`phones: a flat block under a fading rule in the sheet (${JSON.stringify(sheetPanel)})`));
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
