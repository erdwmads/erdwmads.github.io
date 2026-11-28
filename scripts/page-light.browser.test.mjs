// The old site's light on the pages and records, restored (second effects pass, owner 2026-11-18: "all of my previous
// effects"): the Mission Log photographs' shadow, Open chip, scan line and 2 px rise; the viewer's veil, glass buttons
// and decoding dim; the Mission Index's glowing current record and brass scrollbar; the photo wall's steel outline and
// glow; the layout switch's brass bar; the presentation's full-screen label; the CV portrait shadow and frosted dates;
// the Home control's arrow (a steel glyph since 2026-11-26) and the keywords (small words); the 404 card; the Paper Shelf
// filters, lit by the edge light elsewhere (edge-light.browser), and the brass search ring. Since 2026-11-26 (the lab
// site's language) these carry the light on their new forms: the layout switch and the filters are text controls whose
// chosen state is a 2 px brass beam on a warm pool, the photographs and the CV portrait mounted prints, the frosted dates
// a frosted pool, the 404 card a light pool under a glint hairline that deepens under the pointer. Each is checked
// where it runs and where it must not: reduced motion, forced colours, print and phones. Both themes. The Mission Log
// uses a synthetic encrypted archive only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const errors = [];

const password = 'synthetic page-light fixture';
const figure = (n, file) => `<figure><img src="assets/img/research-scale/${file}" data-full-src="assets/img/research-scale/${file}" alt="Synthetic figure ${n}"><figcaption><strong>Fig. ${n}</strong> Synthetic caption ${n}.</figcaption></figure>`;
const entries = [1, 2].map(n => ({ id: `log-00${n}`, number: n, label: `LOG 00${n}`, date: `2026/09/0${n}`,
  bodyHtml: `<h3>Synthetic record ${n}</h3><div class="mission-photo-grid">${figure(1, 'bennu-microstructure.jpg')}${figure(2, 'orgueil-smithsonian.jpg')}</div>` }));
const salt = randomBytes(16), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', pbkdf2Sync(password, salt, 600000, 32, 'sha256'), iv);
const payload = { version: 1, kdf: 'PBKDF2-SHA-256', iterations: 600000, cipher: 'AES-256-GCM', salt: salt.toString('base64'), iv: iv.toString('base64'),
  ciphertext: Buffer.concat([cipher.update(JSON.stringify(entries)), cipher.final(), cipher.getAuthTag()]).toString('base64') };

async function open(theme, path, { width = 1440, height = 900, fx = '1', ...options } = {}) {
  const phone = width < 761;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone, ...options });
  await context.addInitScript(([t, f]) => { try { sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', t); localStorage.setItem('madsAmbientFxEnabled', f); } catch {} }, [theme, fx]);
  await context.route('**/assets/data/mission-log.enc.json', route => route.fulfill({ json: payload }));
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(`${theme} ${width} ${path}: ${error.message}`));
  await page.goto(`${base}/${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  if (path === 'research-graduation.html') {
    await page.locator('[data-research-lock-input]').fill(password);
    await page.locator('[data-research-lock-form] button[type="submit"]').click();
    await page.locator('.mission-photo-grid figure').first().waitFor();
    await page.waitForTimeout(400);
  }
  return { context, page };
}
// A custom property resolved through a property, on a probe in body (the page's theme).
const resolve = (page, value, property) => page.evaluate(([value, property]) => {
  const probe = document.createElement('i');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const out = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return out;
}, [value, property]);
const style = (page, selector, props, pseudo = null) => page.evaluate(([selector, props, pseudo]) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const cs = getComputedStyle(el, pseudo);
  return Object.fromEntries(props.map(prop => [prop, cs.getPropertyValue(prop)]));
}, [selector, props, pseudo]);
// The layout box (offsets ignore transforms), so a rise drawn by a transform does not count as moving the box.
const rect = (page, selector) => page.locator(selector).first().evaluate(el => [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight].join(','));
async function hover(page, selector) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(450);
  return box;
}

try {
  for (const theme of ['space', 'light']) {
    const t = (message) => `${theme}: ${message}`;

    // E044 / E045 / E046: the protected Mission Log, desktop.
    {
      const { context, page } = await open(theme, 'research-graduation.html');
      const fig = '.mission-photo-grid figure';
      assert.equal(await page.locator(fig).first().getAttribute('role'), 'button', t('the figure is a viewer button'));
      const rest = await style(page, fig, ['box-shadow', 'transform']);
      assert.deepEqual(rest, { 'box-shadow': 'none', transform: 'none' }, t('a resting photograph casts no shadow and does not rise'));
      assert.equal((await style(page, fig, ['opacity'], '::before')).opacity, '0', t('the Open chip waits unseen'));
      const before = await rect(page, fig);
      const box = await hover(page, fig);
      const lit = await style(page, fig, ['box-shadow', 'transform']);
      // Since 2026-11-28 the old shadow joins the print's own shadow on the photograph, never on the figure (no card
      // around the photograph and its caption).
      assert.equal(lit['box-shadow'], 'none', t('the hovered figure itself casts no box shadow'));
      assert.equal((await style(page, `${fig} img`, ['box-shadow']))['box-shadow'], await resolve(page, 'var(--obs-print-shadow), var(--obs-photo-hover-shadow)', 'box-shadow'), t('a hovered photograph casts the old shadow under its print shadow'));
      assert.equal(lit.transform, 'matrix(1, 0, 0, 1, 0, -2)', t('a hovered photograph rises 2 px'));
      const chip = await style(page, fig, ['content', 'opacity', 'transform'], '::before');
      assert.equal(chip.content, '"Open" / ""', t('the chip says Open and stays out of the accessible name'));
      assert.equal(chip.opacity, '1', t('the chip shows under the pointer'));
      const scan = await style(page, fig, ['opacity', 'animation-name', 'animation-duration', 'mix-blend-mode'], '::after');
      assert.deepEqual(scan, { opacity: '0.72', 'animation-name': 'mission-scanline', 'animation-duration': '1.8s', 'mix-blend-mode': 'screen' }, t('the scan line sweeps the hovered photograph'));
      const cover = await page.locator(fig).first().evaluate((el) => ({ layer: parseFloat(getComputedStyle(el, '::after').height), image: el.querySelector('img').getBoundingClientRect().height }));
      assert.ok(Math.abs(cover.layer - cover.image) <= 1, t(`the scan line covers the image, not the caption: ${JSON.stringify(cover)}`));
      assert.equal(await rect(page, fig), before, t('the rise is a transform, the box stays put'));
      assert.equal(await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.mission-photo-grid figure')), [box.x + box.width / 2, box.y + 3]), true, t('the pointer stays on the photograph it lifted'));
      await page.mouse.move(2, 2);

      // The Mission Index: the current record (its old brass edge and glow, 2026-11-26) reads in brass beside a 2 px brass
      // rule on a warm pool, with a bead; from 1200 px a thin brass scrollbar.
      const current = '.mission-jump-card[aria-current="true"]';
      const record = await style(page, current, ['border-left-color', 'border-left-width', 'color', 'background-image', 'border-top-width']);
      const brass = await resolve(page, 'var(--obs-accent)', 'color');
      assert.deepEqual([record['border-left-color'], record['border-left-width'], record.color, record['border-top-width']], [brass, '2px', brass, '0px'], t(`the current record reads in brass beside its brass rule, no box (${JSON.stringify(record)})`));
      assert.match(record['background-image'], /radial-gradient/, t('on a warm pool'));
      const bead = await style(page, current, ['width', 'height', 'background-color', 'box-shadow'], '::before');
      assert.deepEqual([bead.width, bead.height, bead['background-color']], ['8px', '8px', await resolve(page, 'var(--obs-accent)', 'color')], t('the current record carries a brass bead'));
      assert.equal((await style(page, '.mission-jump-grid', ['scrollbar-color']))['scrollbar-color'], `${await resolve(page, 'var(--obs-accent)', 'color')} ${await resolve(page, 'var(--obs-paper)', 'color')}`, t('the index scrolls on a brass bar'));
      assert.equal((await style(page, '.mission-jump-card:not([aria-current="true"])', ['box-shadow']))['box-shadow'], 'none', t('other records stay quiet'));

      // The viewer: the theme's veil, glass buttons that glow without lifting, the dimmed decoding image.
      await page.locator(fig).first().click();
      await page.locator('.mission-lightbox__img.is-ready').waitFor();
      await page.waitForTimeout(450);
      const veil = (await style(page, '.mission-lightbox', ['background-color']))['background-color'];
      assert.equal(veil, await resolve(page, 'var(--obs-lightbox-veil)', 'background-color'), t('the viewer lies on its veil'));
      const channels = veil.match(/[\d.]+/g).map(Number);
      assert.ok(channels[3] >= .95 && (channels[0] > 128) === (theme === 'light'), t(`the veil is nearly opaque and follows the theme (${veil})`));
      const button = '.mission-lightbox__next';
      const face = await style(page, button, ['background-color', 'background-image', 'box-shadow', 'transform']);
      const token = await resolve(page, 'var(--obs-lightbox-button)', 'background');
      assert.ok(token.includes(face['background-image'] === 'none' ? face['background-color'] : face['background-image']), t(`the buttons wear the old glass face (${face['background-image']} ${face['background-color']})`));
      assert.equal(face['box-shadow'], await resolve(page, 'var(--obs-touch-shadow)', 'box-shadow'), t('the buttons rest on the old soft shadow'));
      await hover(page, button);
      const glow = await style(page, button, ['box-shadow', 'transform']);
      assert.equal(glow['box-shadow'], await resolve(page, 'var(--obs-lightbox-button-glow)', 'box-shadow'), t('a hovered button glows'));
      assert.equal(glow.transform, 'none', t('a hovered button does not lift (Edge rendered none at 2f20d7e)'));
      assert.equal((await style(page, button, ['transition-duration']))['transition-duration'], '0.16s', t('the button glow eases in 160 ms'));
      const dim = await page.evaluate(async () => {
        const img = document.querySelector('.mission-lightbox__img');
        img.classList.replace('is-ready', 'is-decoding');
        await new Promise(resolve => setTimeout(resolve, 400));
        const s = getComputedStyle(img);
        const out = [s.opacity, s.filter];
        img.classList.replace('is-decoding', 'is-ready');
        return out;
      });
      assert.deepEqual(dim, ['0.72', 'saturate(0.9) contrast(0.94)'], t('a decoding image is dimmed'));
      await context.close();
    }
    // Reduced motion: the light stays, nothing rises. Forced colours: none of it.
    {
      const { context, page } = await open(theme, 'research-graduation.html', { reducedMotion: 'reduce' });
      await hover(page, '.mission-photo-grid figure');
      const still = await style(page, '.mission-photo-grid figure', ['box-shadow', 'transform']);
      assert.equal((await style(page, '.mission-photo-grid figure img', ['box-shadow']))['box-shadow'], await resolve(page, 'var(--obs-print-shadow), var(--obs-photo-hover-shadow)', 'box-shadow'), t('reduced motion keeps the shadow (on the print)'));
      assert.equal(still.transform, 'none', t('reduced motion: the photograph does not rise'));
      assert.equal((await style(page, '.mission-photo-grid figure', ['transform'], '::before')).transform, 'none', t('reduced motion: the chip does not slide'));
      assert.equal((await style(page, '.mission-photo-grid figure', ['animation-name'], '::after'))['animation-name'], 'none', t('reduced motion: the scan line does not run'));
      await context.close();
    }
    // FX off: the light stays, the scan line does not run.
    {
      const { context, page } = await open(theme, 'research-graduation.html', { fx: '0' });
      await hover(page, '.mission-photo-grid figure');
      assert.equal((await style(page, '.mission-photo-grid figure', ['animation-name'], '::after'))['animation-name'], 'none', t('FX off: no scan line runs'));
      assert.equal((await style(page, '.mission-photo-grid figure img', ['box-shadow']))['box-shadow'], await resolve(page, 'var(--obs-print-shadow), var(--obs-photo-hover-shadow)', 'box-shadow'), t('FX off keeps the shadow (on the print)'));
      await context.close();
    }
    {
      const { context, page } = await open(theme, 'research-graduation.html', { forcedColors: 'active' });
      await hover(page, '.mission-photo-grid figure');
      const plain = await style(page, '.mission-photo-grid figure', ['box-shadow', 'transform']);
      assert.deepEqual(plain, { 'box-shadow': 'none', transform: 'none' }, t('forced colours: no shadow, no rise'));
      assert.equal((await style(page, '.mission-photo-grid figure img', ['box-shadow']))['box-shadow'], 'none', t('forced colours: no shadow on the print'));
      assert.equal((await style(page, '.mission-photo-grid figure', ['content'], '::before')).content, 'none', t('forced colours: no chip'));
      assert.equal((await style(page, '.mission-photo-grid figure', ['content'], '::after')).content, 'none', t('forced colours: no scan line'));
      assert.equal((await style(page, '.mission-jump-card[aria-current="true"]', ['box-shadow']))['box-shadow'], 'none', t('forced colours: no glow on the index'));
      await context.close();
    }
    // Phones: inline captioned figures, no chip and no viewer.
    {
      const { context, page } = await open(theme, 'research-graduation.html', { width: 390, height: 844 });
      assert.equal(await page.locator('.mission-photo-grid figure').first().getAttribute('role'), null, t('390: figures are not buttons'));
      assert.equal((await style(page, '.mission-photo-grid figure', ['content'], '::before')).content, 'none', t('390: no chip'));
      await context.close();
    }

    // E047 / E048 / E049: Photography.
    {
      const { context, page } = await open(theme, 'photography.html');
      const accent = await resolve(page, 'var(--obs-accent)', 'color');
      // E048 since 2026-11-26: the brass inner bar is the chosen layout's 2 px brass beam (its border and one inset line),
      // in brass words on a warm pool; the switch draws no group box.
      const chosen = await style(page, '.photo-layout-switch [aria-pressed="true"]', ['box-shadow', 'border-bottom-color', 'border-bottom-width', 'color', 'background-image']);
      assert.deepEqual([chosen['box-shadow'], chosen['border-bottom-color'], chosen['border-bottom-width'], chosen.color], [`${accent} 0px -1px 0px 0px inset`, accent, '1px', accent], t('a 2 px brass beam and brass words mark the chosen layout'));
      assert.match(chosen['background-image'], /radial-gradient/, t('the chosen layout lies on a warm pool'));
      const other = await style(page, '.photo-layout-switch [aria-pressed="false"]', ['box-shadow', 'border-bottom-color', 'border-top-color']);
      assert.deepEqual([other['box-shadow'], other['border-bottom-color']], ['none', await resolve(page, 'var(--obs-control-border)', 'color')], t('the other layout rests on its plain beam'));
      assert.equal((await style(page, '.photo-layout-switch', ['border-top-width']))['border-top-width'], '0px', t('the switch draws no box'));
      const tile = '.photo-tile';
      const print = await style(page, tile, ['box-shadow', 'border-top-left-radius']);
      assert.deepEqual([print['box-shadow'], print['border-top-left-radius']], [await resolve(page, 'var(--obs-print-shadow)', 'box-shadow'), '2px'], t('a resting tile is a mounted print'));
      const before = await rect(page, tile);
      await hover(page, tile);
      const lit = await style(page, tile, ['box-shadow', 'outline-style', 'outline-width', 'outline-color', 'outline-offset']);
      assert.equal(lit['box-shadow'], await resolve(page, '0 0 18px var(--obs-glow)', 'box-shadow'), t('a hovered tile glows'));
      assert.deepEqual([lit['outline-style'], lit['outline-width'], lit['outline-color'], lit['outline-offset']], ['solid', '2px', await resolve(page, 'var(--obs-edge-cool)', 'color'), '3px'], t('a hovered tile takes the steel outline'));
      assert.equal(await rect(page, tile), before, t('the tile does not move'));
      await page.mouse.move(2, 2);
      await page.locator('.obs-present-launch').click();
      await page.locator('.obs-presentation[open]').waitFor();
      await page.waitForTimeout(600);
      const label = '.obs-present-fullscreen';
      assert.equal((await style(page, label, ['opacity'], '::after')).opacity, '0', t('the full-screen label waits unseen'));
      await hover(page, label);
      const named = await style(page, label, ['content', 'opacity'], '::after');
      assert.equal(named.content, `"${await page.locator(label).getAttribute('aria-label')}"`, t('the label repeats the button\'s name'));
      assert.equal(named.opacity, '1', t('the label shows under the pointer'));
      await context.close();
    }
    {
      const { context, page } = await open(theme, 'photography.html', { forcedColors: 'active' });
      assert.notEqual((await style(page, '.photo-layout-switch [aria-pressed="true"]', ['text-decoration-color']))['text-decoration-color'], 'rgba(0, 0, 0, 0)', t('forced colours: the chosen layout keeps its underline'));
      await hover(page, '.photo-tile');
      assert.equal((await style(page, '.photo-tile', ['outline-style']))['outline-style'], 'none', t('forced colours: no hover outline'));
      await context.close();
    }

    // E050 / E051: the CV, on screen only.
    {
      const { context, page } = await open(theme, 'cv.html');
      // E050 / E051 since 2026-11-26: the portrait a mounted print (its shadow the print's), the frost masked to a pool.
      const portrait = await style(page, '.cv-photo .figure__media', ['box-shadow', 'border-top-left-radius']);
      assert.deepEqual([portrait['box-shadow'], portrait['border-top-left-radius']], [await resolve(page, 'var(--obs-print-shadow)', 'box-shadow'), '2px'], t('the portrait is a mounted print'));
      const frost = await style(page, '.cv-edu-card > .ledger__key', ['backdrop-filter', 'mask-image']);
      assert.equal(frost['backdrop-filter'], 'blur(12px) saturate(1.04)', t('the dates sit on frosted glass'));
      assert.match(frost['mask-image'], /radial-gradient/, t('the frost feathers out as a pool'));
      const words = await page.locator('.cv-edu-card > .ledger__key').first().evaluate(el => { const r = el.getBoundingClientRect(), range = document.createRange(); range.selectNodeContents(el); const t = range.getBoundingClientRect(); return [t.left - r.left, r.right - t.right]; });
      assert.ok(words.every(gap => gap >= 20), t(`the words stay inside the pool's clear core (${words.map(Math.round)})`));
      await page.emulateMedia({ media: 'print' });
      assert.equal((await style(page, '.cv-photo .figure__media', ['box-shadow']))['box-shadow'], 'none', t('print: no portrait shadow'));
      assert.equal((await style(page, '.cv-edu-card > .ledger__key', ['backdrop-filter']))['backdrop-filter'], 'none', t('print: no blur'));
      await context.close();
    }

    // E053: the Home button's chip; E055: the 404 card; E056: the Paper Shelf. Desktop, phone and forced colours.
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const { context, page } = await open(theme, 'index.html', { width, height });
      // Since 2026-11-26 the chip is a steel arrow glyph and the pills are small words, no capsule.
      const chip = await style(page, '.home-actions .button', ['content', 'color', 'border-top-width', 'background-color'], '::after');
      assert.deepEqual(chip, { content: '"→" / ""', color: await resolve(page, 'var(--obs-edge-cool)', 'color'), 'border-top-width': '0px', 'background-color': 'rgba(0, 0, 0, 0)' }, t(`${width}: the Research control carries the arrow as a steel glyph (${JSON.stringify(chip)})`));
      const pills = await page.locator('.home-keywords > li.pill').evaluateAll(nodes => nodes.map(el => { const s = getComputedStyle(el); return [el.textContent, s.borderTopLeftRadius, s.borderTopWidth, s.backgroundColor, s.fontSize].join('|'); }));
      assert.equal(pills.length, 6, t(`${width}: six keywords`));
      assert.ok(pills.every(pill => pill.endsWith('|0px|0px|rgba(0, 0, 0, 0)|12px')), t(`${width}: the keywords are words at 12 px, no capsule ${pills.join(', ')}`));
      assert.equal(await page.locator('.home-keywords').getAttribute('aria-label'), 'Keywords', t(`${width}: the keywords are a named list`));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, t(`${width}: the chip widens nothing past the window`));
      await page.goto(`${base}/404.html`, { waitUntil: 'load' });
      const card = await style(page, '.archive-index', ['background-image', 'box-shadow', 'border-top-width', 'border-top-left-radius', 'top', 'left', 'z-index'], '::before');
      assert.equal(card['background-image'], await resolve(page, 'var(--obs-glass-glint), radial-gradient(closest-side, var(--obs-pool), transparent)', 'background-image'), t(`${width}: the 404 index lies on a light pool under the glint hairline (E097)`));
      assert.deepEqual([card['box-shadow'], card['border-top-width'], card['border-top-left-radius']], ['none', '0px', '0px'], t(`${width}: no card edge, corner or depth`));
      // Since 2026-11-28 the layer reaches up to the section's line, where the glint lies (one rule opens the section).
      assert.equal(card.top, width > 760 ? '-56px' : '-38px', t(`${width}: the pool reaches beyond the list, its glint on the section's line`));
      assert.equal(card.left, width > 760 ? '-24px' : '-18px', t(`${width}: the pool reaches beyond the list at its sides`));
      const link = await page.locator('.archive-index a').first().boundingBox();
      assert.equal(await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.archive-index a')), [link.x + link.width / 2, link.y + link.height / 2]), true, t(`${width}: the card lies behind the links`));
      if (width > 760) {
        assert.equal((await style(page, '.archive-index', ['opacity'], '::after')).opacity, '0', t('the deeper pool waits unseen'));
        await hover(page, '.archive-index .ledger__detail');
        const deeper = await style(page, '.archive-index', ['opacity', 'transition-duration', 'background-image'], '::after');
        assert.deepEqual([deeper.opacity, deeper['transition-duration']], ['1', '0.18s'], t('under the pointer a deeper pool comes in over 180 ms (E055)'));
        assert.equal(deeper['background-image'], await resolve(page, 'radial-gradient(closest-side, var(--obs-pool-hover), transparent)', 'background-image'), t('the deeper pool is the hover pool'));
      }
      await context.close();
    }
    {
      const { context, page } = await open(theme, 'paper-shelf.html');
      const pressed = '.paper-filter[aria-pressed="true"]';
      const accent = await resolve(page, 'var(--obs-accent)', 'color');
      // E056 since 2026-11-26: the filters are text controls; the old face and brass border are the pressed filter's
      // warm pool, 2 px brass beam and brass words; the old brass edge is the hover's lit beam and gold glow.
      const face = await style(page, pressed, ['background-color', 'background-image', 'border-top-color', 'border-bottom-color', 'border-bottom-width', 'box-shadow', 'color', 'text-decoration-color']);
      assert.deepEqual([face['background-color'], face['border-top-color'], face['border-bottom-color'], face['border-bottom-width'], face['box-shadow'], face.color, face['text-decoration-color']], ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', accent, '1px', `${accent} 0px -1px 0px 0px inset`, accent, 'rgba(0, 0, 0, 0)'], t('the pressed filter: brass words over a 2 px brass beam, no face or box edge'));
      assert.match(face['background-image'], /radial-gradient/, t('the pressed filter lies on a warm pool'));
      const box = await style(page, '.paper-filter[aria-pressed="false"]', ['background-color', 'background-image', 'border-top-color', 'border-bottom-color', 'border-bottom-width', 'border-top-left-radius', 'transition-duration']);
      assert.deepEqual(box, { 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none', 'border-top-color': 'rgba(0, 0, 0, 0)', 'border-bottom-color': await resolve(page, 'var(--obs-control-border)', 'color'), 'border-bottom-width': '1px', 'border-top-left-radius': '0px', 'transition-duration': '0.18s, 0.14s, 0.14s' }, t('the other filters are words over their control-border beam'));
      await hover(page, '.paper-filter[aria-pressed="false"]');
      const lit = await style(page, '.paper-filter[aria-pressed="false"]', ['border-bottom-color', 'background-image', 'box-shadow']);
      assert.equal(lit['border-bottom-color'], 'rgba(0, 0, 0, 0)', t('a hovered filter hands its beam to the lit gradient'));
      assert.match(lit['background-image'], /linear-gradient.*radial-gradient/, t(`a hovered filter's beam lights brass to steel over a warm pool (${lit['background-image'].slice(0, 80)})`));
      assert.equal(lit['box-shadow'], await resolve(page, 'var(--obs-beam-glow)', 'box-shadow'), t('with the gold glow under it'));
      await page.mouse.move(2, 2);
      const other = page.locator(`[data-paper-filter="${await page.locator('.paper-filter[aria-pressed="false"]').first().getAttribute('data-paper-filter')}"]`);
      const before = await other.evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height].join(); });
      await other.click();
      assert.equal(await other.evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height].join(); }), before, t('pressing a filter keeps its box'));
      await page.keyboard.press('Shift');
      await page.locator('.paper-search').focus();
      await page.waitForTimeout(300); // the foot's colour and glow ease in over 140 ms
      const ring = await style(page, '.paper-search', ['outline-style', 'outline-color', 'outline-offset', 'border-bottom-color', 'box-shadow']);
      assert.deepEqual([ring['outline-style'], ring['outline-color'], ring['outline-offset']], ['solid', accent, '3px'], t('the search field rings in brass'));
      assert.equal(ring['border-bottom-color'], accent, t('the search field\'s foot turns brass'));
      assert.ok(ring['box-shadow'].startsWith(`${accent} 0px 1px 0px 0px`), t(`a 2 px brass foot with the gold glow under it (${ring['box-shadow']})`));
      await context.close();
    }
    {
      const { context, page } = await open(theme, 'paper-shelf.html', { forcedColors: 'active' });
      assert.notEqual((await style(page, '.paper-filter[aria-pressed="true"]', ['text-decoration-color']))['text-decoration-color'], 'rgba(0, 0, 0, 0)', t('forced colours: the pressed filter keeps its underline'));
      await page.goto(`${base}/index.html`, { waitUntil: 'load' });
      assert.equal((await style(page, '.home-actions .button', ['content'], '::after')).content, 'none', t('forced colours: no arrow chip'));
      await page.goto(`${base}/404.html`, { waitUntil: 'load' });
      assert.equal((await style(page, '.archive-index', ['content'], '::before')).content, 'none', t('forced colours: no 404 card'));
      await context.close();
    }
    console.log(`PASS ${theme}: Mission Log photographs, viewer and index; photo wall prints, layout switch beam and full-screen label; CV print and frosted pool; Home glyph; 404 pool and glint; Paper Shelf filter beams and search foot; reduced motion, forced colours, print and phones`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
