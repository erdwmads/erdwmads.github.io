// The floating header (R1, owner 2026-11-18; effects spec §5, §10.3): from 761 x 600 px the header sticks to the top
// of the window on the solar-system band (body::after), at exactly --header-clearance (109 px from 1200 px, 120 px
// below); phones, short windows, forced colours and print keep it in the flow with no band. Nothing it floats over is
// hidden: the contents bar sticks flush under it, anchor targets land below it, the lightbox-style overlays (atlas,
// presentation) and the Interface 2046 spine stay clear of it, and neither backdrop becomes the LCP element. Both
// themes; a theme switch changes none of the geometry.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const errors = [];

async function open(theme, { width, height, ...options }, path = 'research.html') {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', ...options });
  await context.addInitScript(t => {
    try {
      sessionStorage.setItem('mads-entry-gate-v1', 'done');
      sessionStorage.setItem('mads-cosmic-arrival-v1', 'done');
      localStorage.setItem('mads-theme', t);
    } catch {}
  }, theme);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${theme} ${width}x${height} ${path}: ${error.message}`));
  await page.goto(`${base}/${path}`);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  // The backdrop images wait for the load event (html.backdrop-ready, observatory-interactions.js); the band keeps its
  // veil meanwhile.
  await page.waitForFunction(() => document.documentElement.classList.contains('backdrop-ready'));
  return { context, page };
}

// The header, the band and the clearance token, read in the page.
const shell = page => page.evaluate(() => {
  const header = document.querySelector('.site-header'), style = getComputedStyle(header), rect = header.getBoundingClientRect();
  const band = getComputedStyle(document.body, '::after'), bennu = getComputedStyle(document.body, '::before');
  return {
    position: style.position, display: style.display, zIndex: style.zIndex, background: style.backgroundColor,
    top: rect.top, bottom: rect.bottom, height: rect.height,
    clearance: getComputedStyle(document.documentElement).getPropertyValue('--header-clearance').trim(),
    band: { content: band.content, display: band.display, position: band.position, top: band.top, height: band.height, image: band.backgroundImage, zIndex: band.zIndex },
    bennu: { content: bennu.content, display: bennu.display }
  };
});
const scrollTo = (page, y) => page.evaluate(y => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, y); }, y);
const guide = page => page.evaluate(() => {
  const bar = document.querySelector('[data-research-guide]').getBoundingClientRect();
  return { top: bar.top, bottom: bar.bottom, height: bar.height, header: document.querySelector('.site-header').getBoundingClientRect().bottom, sticky: getComputedStyle(document.querySelector('[data-research-guide]')).top };
});

try {
  for (const theme of ['space', 'light']) {
    // 1. Where the header floats: sticky at the token's height, on the band, transparent itself, above the band.
    for (const [width, height] of [[1440, 900], [1360, 900], [1200, 900], [1199, 900], [1024, 768], [761, 1024]]) {
      const label = `${theme} ${width}x${height}`, expected = width >= 1200 ? 109 : 120;
      const { context, page } = await open(theme, { width, height });
      let s = await shell(page);
      assert.equal(s.position, 'sticky', `${label}: the header floats`);
      assert.equal(s.clearance, `${expected}px`, `${label}: --header-clearance`);
      assert.ok(Math.abs(s.height - expected) <= 0.5, `${label}: the header is ${s.height} px, not the ${expected} px --header-clearance names`);
      await scrollTo(page, 1500);
      s = await shell(page);
      assert.ok(Math.abs(s.top) <= 0.5 && Math.abs(s.bottom - expected) <= 0.5, `${label}: after scrolling the header is at ${s.top}-${s.bottom}`);
      assert.equal(s.band.position, 'fixed', `${label}: the band is fixed`);
      assert.equal(s.band.top, '0px', `${label}: the band starts at the top`);
      assert.equal(s.band.height, `${expected}px`, `${label}: the band is as tall as the header`);
      assert.match(s.band.image, /Solar_System_true_color-1600\.webp/, `${label}: the band shows the solar-system strip`);
      assert.equal(s.background, 'rgba(0, 0, 0, 0)', `${label}: the floating header lets the band be its ground`);
      assert.ok(Number(s.zIndex) > Number(s.band.zIndex), `${label}: the header (${s.zIndex}) lies above its band (${s.band.zIndex})`);
      await context.close();
    }

    // 2. Where it does not: phones and short windows keep it in the flow, with no band and no clearance.
    for (const [width, height, options] of [[1024, 560, {}], [844, 390, { hasTouch: true }], [390, 844, { isMobile: true, hasTouch: true }]]) {
      const label = `${theme} ${width}x${height}`;
      const { context, page } = await open(theme, { width, height, ...options });
      await scrollTo(page, 1500);
      const s = await shell(page);
      assert.equal(s.position, 'relative', `${label}: the header stays in the flow`);
      assert.ok(s.bottom < 0, `${label}: the header scrolls away (bottom ${s.bottom})`);
      assert.equal(s.clearance, '0px', `${label}: --header-clearance`);
      assert.equal(s.band.content, 'none', `${label}: no band is generated`);
      await context.close();
    }

    for (const [width, height] of [[1440, 900], [1024, 768]]) {
      const label = `${theme} ${width}x${height}`;
      // 3. The contents bar sticks flush under the header, and the chosen section opens below the bar.
      {
        const { context, page } = await open(theme, { width, height });
        await page.locator('[data-research-guide][data-ready]').waitFor();
        await page.locator('[data-research-guide] a[href="#research-methods-title"]').click();
        await page.waitForFunction(() => document.querySelector('[data-research-guide] a[aria-current="location"]')?.hash === '#research-methods-title', null, { timeout: 1000 });
        const g = await guide(page);
        assert.ok(Math.abs(g.top - g.header) <= 1, `${label}: the contents bar (${g.top}) is not flush under the header (${g.header})`);
        const opening = await page.evaluate(() => {
          const section = document.getElementById('research-methods-title').closest('section');
          return Math.min(section.getBoundingClientRect().top, section.querySelector('.kicker').getBoundingClientRect().top, section.querySelector('.folio-section__number').getBoundingClientRect().top);
        });
        assert.ok(opening >= g.bottom - 0.5, `${label}: the section's rule, number or kicker (${opening}) lies under the bar (${g.bottom})`);
        // 9. A theme switch changes neither the header's height nor the bar's sticky top.
        const before = { header: (await shell(page)).height, sticky: g.sticky };
        await page.locator('.theme-toggle').click();
        await page.waitForFunction(t => document.documentElement.dataset.theme !== t, theme);
        const after = { header: (await shell(page)).height, sticky: (await guide(page)).sticky };
        assert.deepEqual(after, before, `${label}: a theme switch moves the header or the bar`);
        await context.close();
      }
      // 4. Direct anchor loads land below the header (and the bar on Research).
      {
        const { context, page } = await open(theme, { width, height }, 'research.html#research-methods-title');
        await page.locator('[data-research-guide][data-ready]').waitFor();
        await page.waitForTimeout(300);
        const target = await page.evaluate(() => document.getElementById('research-methods-title').getBoundingClientRect().top);
        const g = await guide(page);
        assert.ok(target >= g.bottom - 1, `${label}: research.html#research-methods-title lands at ${target}, under the header and bar (${g.bottom})`);
        await context.close();
      }
      {
        const probe = await open(theme, { width, height }, 'paper-shelf.html');
        const id = await probe.page.evaluate(() => document.querySelectorAll('.paper-card')[1].id);
        await probe.context.close();
        const { context, page } = await open(theme, { width, height }, `paper-shelf.html#${id}`);
        await page.waitForTimeout(300);
        const { top, header } = await page.evaluate(id => ({ top: document.getElementById(id).getBoundingClientRect().top, header: document.querySelector('.site-header').getBoundingClientRect().bottom }), id);
        assert.ok(top >= header - 1, `${label}: paper-shelf.html#${id} lands at ${top}, under the header (${header})`);
        await context.close();
      }
    }

    // 5. Overlays lie over the header and its band; 6. the Interface 2046 spine starts below the header.
    {
      const label = `${theme} 1440`;
      const onTop = page => page.evaluate(() => Boolean(document.elementsFromPoint(innerWidth / 2, 20)[0]?.closest('dialog[open]')));
      let { context, page } = await open(theme, { width: 1440, height: 900 }, 'photography.html');
      await page.locator('[data-present-photos]').click();
      await page.locator('dialog[open]').waitFor();
      assert.equal(await onTop(page), true, `${label}: the presentation lies under the header or its band`);
      await page.keyboard.press('Escape');
      await context.close();
      ({ context, page } = await open(theme, { width: 1440, height: 900 }));
      await page.locator('.atlas-launch').click();
      await page.locator('dialog[open]').waitFor();
      assert.equal(await onTop(page), true, `${label}: the atlas lies under the header or its band`);
      await page.keyboard.press('Escape');
      await page.locator('dialog[open]').waitFor({ state: 'detached' }).catch(() => {});
      await page.locator('.ui2046-rail').waitFor({ state: 'attached' });
      const rail = await page.evaluate(() => ({ top: document.querySelector('.ui2046-rail').getBoundingClientRect().top, header: document.querySelector('.site-header').getBoundingClientRect().bottom }));
      assert.ok(rail.top >= rail.header, `${label}: the Interface 2046 spine (${rail.top}) starts under the header (${rail.header})`);
      await context.close();
    }

    // 7. Neither backdrop is ever the Largest Contentful Paint.
    for (const path of ['index.html', 'research.html']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await context.addInitScript(t => {
        try { sessionStorage.setItem('mads-entry-gate-v1', 'done'); sessionStorage.setItem('mads-cosmic-arrival-v1', 'done'); localStorage.setItem('mads-theme', t); } catch {}
        window.__lcp = [];
        new PerformanceObserver(list => window.__lcp.push(...list.getEntries().map(entry => entry.url || entry.element?.tagName || ''))).observe({ type: 'largest-contentful-paint', buffered: true });
      }, theme);
      const page = await context.newPage();
      await page.goto(`${base}/${path}`, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const last = await page.evaluate(() => window.__lcp.at(-1) || '');
      assert.doesNotMatch(last, /asteroid-bennu|Solar_System_true_color/, `${theme} ${path}: a backdrop is the LCP element (${last})`);
      await context.close();
    }

    // 8. Print and forced colours: no float, no backdrop; without JavaScript the header still floats on its band.
    {
      const label = `${theme} 1440`;
      const { context, page } = await open(theme, { width: 1440, height: 900 });
      await page.emulateMedia({ media: 'print' });
      let s = await shell(page);
      assert.equal(s.display, 'none', `${label} print: the header prints`);
      assert.ok(s.bennu.display === 'none' && (s.band.content === 'none' || s.band.display === 'none'), `${label} print: a backdrop prints ${JSON.stringify([s.bennu, s.band])}`);
      await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
      s = await shell(page);
      assert.notEqual(s.position, 'sticky', `${label} forced colours: the header floats`);
      assert.equal(s.clearance, '0px', `${label} forced colours: --header-clearance`);
      assert.ok((s.bennu.content === 'none' || s.bennu.display === 'none') && (s.band.content === 'none' || s.band.display === 'none'), `${label} forced colours: a backdrop is drawn ${JSON.stringify([s.bennu, s.band])}`);
      await context.close();
      const nojs = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
      const plain = await nojs.newPage();
      await plain.goto(`${base}/research.html`);
      s = await shell(plain);
      assert.equal(s.position, 'sticky', `${label} without JavaScript: the header floats`);
      assert.match(s.band.image, /Solar_System_true_color-1600\.webp/, `${label} without JavaScript: the band is drawn`);
      await nojs.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log('Floating header: sticky at --header-clearance from 761 x 600 px on its band, in the flow elsewhere; contents bar, anchors, overlays and spine clear of it; no backdrop LCP; print, forced colours and no-JS passed.');
} finally {
  await browser.close();
}
