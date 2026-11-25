// The old site's light on the pages and records, restored (second effects pass, owner 2026-11-18: "all of my previous
// effects"): the Mission Log photographs' shadow, Open chip, scan line and 2 px rise; the viewer's veil, glass buttons
// and decoding dim; the Mission Index's glowing current record and brass scrollbar; the photo wall's steel outline and
// glow; the layout switch's brass bar; the presentation's full-screen label; the CV portrait shadow and frosted dates;
// the Home button's arrow chip and keyword pills; the 404 card; the Paper Shelf filter boxes, lit by the edge light
// elsewhere (edge-light.browser), and the brass search ring. Each is checked
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
      assert.equal(lit['box-shadow'], await resolve(page, 'var(--obs-photo-hover-shadow)', 'box-shadow'), t('a hovered photograph casts the old shadow'));
      assert.equal(lit.transform, 'matrix(1, 0, 0, 1, 0, -2)', t('a hovered photograph rises 2 px'));
      const chip = await style(page, fig, ['content', 'opacity', 'transform'], '::before');
      assert.equal(chip.content, '"Open" / ""', t('the chip says Open and stays out of the accessible name'));
      assert.equal(chip.opacity, '1', t('the chip shows under the pointer'));
      const scan = await style(page, fig, ['opacity', 'animation-name', 'animation-duration', 'mix-blend-mode'], '::after');
      assert.deepEqual(scan, { opacity: '0.72', 'animation-name': 'mission-scanline', 'animation-duration': '1.8s', 'mix-blend-mode': 'screen' }, t('the scan line sweeps the hovered photograph'));
      assert.equal(await rect(page, fig), before, t('the rise is a transform, the box stays put'));
      assert.equal(await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.mission-photo-grid figure')), [box.x + box.width / 2, box.y + 3]), true, t('the pointer stays on the photograph it lifted'));
      await page.mouse.move(2, 2);

      // The Mission Index: the current record glows brass with a bead; from 1200 px a thin brass scrollbar.
      const current = '.mission-jump-card[aria-current="true"]';
      assert.equal((await style(page, current, ['box-shadow']))['box-shadow'], await resolve(page, '0 0 16px var(--obs-gold-glow)', 'box-shadow'), t('the current record glows brass'));
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
      assert.notEqual(still['box-shadow'], 'none', t('reduced motion keeps the shadow'));
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
      assert.notEqual((await style(page, '.mission-photo-grid figure', ['box-shadow']))['box-shadow'], 'none', t('FX off keeps the shadow'));
      await context.close();
    }
    {
      const { context, page } = await open(theme, 'research-graduation.html', { forcedColors: 'active' });
      await hover(page, '.mission-photo-grid figure');
      const plain = await style(page, '.mission-photo-grid figure', ['box-shadow', 'transform']);
      assert.deepEqual(plain, { 'box-shadow': 'none', transform: 'none' }, t('forced colours: no shadow, no rise'));
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
      assert.equal((await style(page, '.photo-layout-switch [aria-pressed="true"]', ['box-shadow']))['box-shadow'], `${accent} 0px -2px 0px 0px inset`, t('a brass inner bar marks the chosen layout'));
      assert.equal((await style(page, '.photo-layout-switch [aria-pressed="false"]', ['box-shadow']))['box-shadow'], 'none', t('the other layout has no bar'));
      const tile = '.photo-tile';
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
      assert.equal((await style(page, '.cv-photo .figure__media', ['box-shadow']))['box-shadow'], await resolve(page, 'var(--obs-photo-shadow)', 'box-shadow'), t('the portrait floats on the old shadow'));
      assert.equal((await style(page, '.cv-edu-card > .ledger__key', ['backdrop-filter']))['backdrop-filter'], 'blur(12px) saturate(1.04)', t('the dates sit on frosted glass'));
      await page.emulateMedia({ media: 'print' });
      assert.equal((await style(page, '.cv-photo .figure__media', ['box-shadow']))['box-shadow'], 'none', t('print: no portrait shadow'));
      assert.equal((await style(page, '.cv-edu-card > .ledger__key', ['backdrop-filter']))['backdrop-filter'], 'none', t('print: no blur'));
      await context.close();
    }

    // E053: the Home button's chip; E055: the 404 card; E056: the Paper Shelf. Desktop, phone and forced colours.
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const { context, page } = await open(theme, 'index.html', { width, height });
      const chip = await style(page, '.home-actions .button', ['content', 'width', 'height', 'opacity'], '::after');
      const size = width > 760 ? '24px' : '22px';
      assert.deepEqual(chip, { content: '"→" / ""', width: size, height: size, opacity: '0.78' }, t(`${width}: the Research button carries the arrow chip`));
      const pills = await page.locator('.home-keywords > li.pill').evaluateAll(nodes => nodes.map(el => { const s = getComputedStyle(el); return [el.textContent, s.borderTopLeftRadius, s.backgroundColor, s.fontSize].join('|'); }));
      assert.equal(pills.length, 6, t(`${width}: six keyword pills`));
      const surface = await resolve(page, 'var(--obs-surface)', 'background-color');
      assert.ok(pills.every(pill => pill.endsWith(`|999px|${surface}|12px`)), t(`${width}: the pills are rounded surface chips ${pills.join(', ')}`));
      assert.equal(await page.locator('.home-keywords').getAttribute('aria-label'), 'Keywords', t(`${width}: the pills are a named list`));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, t(`${width}: the chip widens nothing past the window`));
      await page.goto(`${base}/404.html`, { waitUntil: 'load' });
      const card = await style(page, '.archive-index', ['background-image', 'box-shadow', 'top', 'left', 'z-index'], '::before');
      assert.equal(card['background-image'], await resolve(page, 'var(--obs-glass-glint), var(--obs-glass-band), var(--obs-glass-face)', 'background-image'), t(`${width}: the 404 index lies on the glazed card under the glass band and glint (E097)`));
      assert.equal(card.top, width > 760 ? '-24px' : '-18px', t(`${width}: the card reaches beyond the list`));
      const link = await page.locator('.archive-index a').first().boundingBox();
      assert.equal(await page.evaluate(([x, y]) => Boolean(document.elementFromPoint(x, y)?.closest('.archive-index a')), [link.x + link.width / 2, link.y + link.height / 2]), true, t(`${width}: the card lies behind the links`));
      if (width > 760) {
        await hover(page, '.archive-index .ledger__detail');
        assert.equal((await style(page, '.archive-index', ['box-shadow'], '::before'))['box-shadow'], await resolve(page, 'var(--obs-record-depth-hover)', 'box-shadow'), t('the card softens under the pointer'));
      }
      await context.close();
    }
    {
      const { context, page } = await open(theme, 'paper-shelf.html');
      const pressed = '.paper-filter[aria-pressed="true"]';
      const accent = await resolve(page, 'var(--obs-accent)', 'color');
      const face = await style(page, pressed, ['background-color', 'border-top-color', 'border-top-width', 'text-decoration-color']);
      assert.deepEqual(face, { 'background-color': await resolve(page, 'var(--obs-highlight)', 'background-color'), 'border-top-color': accent, 'border-top-width': '1px', 'text-decoration-color': 'rgba(0, 0, 0, 0)' }, t('the pressed filter takes the highlight face behind a brass border'));
      const box = await style(page, '.paper-filter[aria-pressed="false"]', ['background-color', 'border-top-color', 'border-top-width', 'transition-duration']);
      assert.deepEqual(box, { 'background-color': await resolve(page, 'var(--obs-surface)', 'background-color'), 'border-top-color': await resolve(page, 'var(--obs-control-border)', 'color'), 'border-top-width': '1px', 'transition-duration': '0.18s, 0.14s, 0.14s' }, t('the other filters are flat boxes'));
      await hover(page, '.paper-filter[aria-pressed="false"]');
      assert.equal((await style(page, '.paper-filter[aria-pressed="false"]', ['border-top-color']))['border-top-color'], accent, t('a hovered filter edges in brass'));
      await page.mouse.move(2, 2);
      const other = page.locator(`[data-paper-filter="${await page.locator('.paper-filter[aria-pressed="false"]').first().getAttribute('data-paper-filter')}"]`);
      const before = await other.evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height].join(); });
      await other.click();
      assert.equal(await other.evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height].join(); }), before, t('pressing a filter keeps its box'));
      await page.keyboard.press('Shift');
      await page.locator('.paper-search').focus();
      const ring = await style(page, '.paper-search', ['outline-style', 'outline-color', 'outline-offset']);
      assert.deepEqual(ring, { 'outline-style': 'solid', 'outline-color': accent, 'outline-offset': '3px' }, t('the search box rings in brass'));
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
    console.log(`PASS ${theme}: Mission Log photographs, viewer and index; photo wall, layout switch and full-screen label; CV shadow and frost; Home chip; 404 card; Paper Shelf filter and search ring; reduced motion, forced colours, print and phones`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
