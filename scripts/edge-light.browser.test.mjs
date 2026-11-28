// The pointer edge light (R2, owner 2026-11-18; effects spec §6, §10.3): under a mouse at 761 px and wider the control
// beneath the pointer gets [data-edge-active] and --edge-angle, the pointer's direction from its centre, and its
// ::before draws the old 1 px ring, masked since 2026-11-26 to the line just above the control's beam (a text control
// has no box to ring), which takes no input and moves no box. The handler reads the control's box once, on
// entry, and writes the angle at most once per frame. It stays off with FX off, reduced motion, phones, coarse
// pointers, disabled controls and while the atlas (like the lightbox, entrance and presentation) is open, and it is
// cleared by scrolling, by the pointer leaving the window and by a soft navigation. Both themes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { insertFixture } from './lib/guard.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const errors = [];

async function open(theme, { width = 1440, height = 900, fx = '1', counters = false, ...options } = {}, path = 'research.html') {
  const context = await browser.newContext({ viewport: { width, height }, ...options });
  await context.addInitScript(([t, f]) => {
    try {
      sessionStorage.setItem('mads-entry-gate-v1', 'done');
      sessionStorage.setItem('mads-cosmic-arrival-v1', 'done');
      localStorage.setItem('mads-theme', t);
      localStorage.setItem('madsAmbientFxEnabled', f);
    } catch {}
  }, [theme, fx]);
  if (counters) {
    // Box reads of the watched control, --edge-angle writes, and animation frames, counted from the first script on.
    await context.addInitScript(() => {
      window.__count = { rects: 0, writes: 0, frames: 0 };
      const rect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () { if (this === window.__watched) window.__count.rects += 1; return rect.call(this); };
      const set = CSSStyleDeclaration.prototype.setProperty;
      CSSStyleDeclaration.prototype.setProperty = function (name, ...rest) { if (name === '--edge-angle') window.__count.writes += 1; return set.call(this, name, ...rest); };
      const tick = () => { window.__count.frames += 1; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${theme} ${width}x${height} ${path}: ${error.message}`));
  await page.goto(`${base}/${path}`);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(300);
  return { context, page };
}

// The state of a control: lit, its angle, its ring and its box.
const state = locator => locator.evaluate(el => {
  const ring = getComputedStyle(el, '::before'), r = el.getBoundingClientRect();
  return {
    lit: el.hasAttribute('data-edge-active'), angle: el.style.getPropertyValue('--edge-angle'),
    ring: { content: ring.content, display: ring.display, position: ring.position, events: ring.pointerEvents, mask: ring.maskImage || ring.webkitMaskImage, maskSize: ring.maskSize || ring.webkitMaskSize, maskPosition: ring.maskPosition || ring.webkitMaskPosition },
    box: [r.x, r.y, r.width, r.height]
  };
});
const anyLit = page => page.evaluate(() => [...document.querySelectorAll('[data-edge-active]')].map(el => el.className || el.tagName));
const drawn = ring => ring.content !== 'none' && ring.display !== 'none';
const expectedAngle = (box, x, y) => Math.atan2(y - (box.y + box.height / 2), x - (box.x + box.width / 2)) * 180 / Math.PI + 90;
const near = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180) <= 3;

// Hovers a control near its top-left and its bottom-right corner, and checks the ring and its angle at each.
async function lights(page, locator, label) {
  await locator.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await page.waitForTimeout(60);
  const box = await locator.boundingBox();
  const rest = await state(locator);
  for (const [x, y] of [[box.x + 5, box.y + 4], [box.x + box.width - 5, box.y + box.height - 4]]) {
    await page.mouse.move(x, y, { steps: 2 });
    await page.waitForTimeout(80);
    const s = await state(locator);
    assert.ok(s.lit, `${label}: the control is not lit under the pointer`);
    assert.ok(near(parseFloat(s.angle), expectedAngle(box, x, y)), `${label}: --edge-angle ${s.angle}, expected ${expectedAngle(box, x, y).toFixed(1)}deg`);
    assert.equal(s.ring.content, '""', `${label}: no ring is generated`);
    assert.equal(s.ring.position, 'absolute', `${label}: the ring is not absolutely placed`);
    assert.equal(s.ring.events, 'none', `${label}: the ring takes input`);
    assert.match(s.ring.mask, /linear-gradient/, `${label}: the ring is not masked (${s.ring.mask})`);
    assert.equal(s.ring.maskSize, '100% 1px', `${label}: the ring lights more than the 1 px line above the beam (${s.ring.maskSize})`);
    assert.match(s.ring.maskPosition, /^(50%|center|0%|left) (100%|bottom)$/, `${label}: the lit line is not at the foot (${s.ring.maskPosition})`);
    assert.ok(s.box.every((value, i) => Math.abs(value - rest.box[i]) <= 0.5), `${label}: the lit control moved ${rest.box} -> ${s.box}`);
  }
  await page.mouse.move(1, 1);
}

// Moves over a control and checks that nothing lights.
async function staysOff(page, locator, label) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + 5, box.y + 4);
  await page.mouse.move(box.x + box.width - 5, box.y + box.height - 4, { steps: 4 });
  await page.waitForTimeout(100);
  assert.deepEqual(await anyLit(page), [], `${label}: a control is lit`);
  assert.ok(!drawn((await state(locator)).ring), `${label}: a ring is drawn`);
  await page.mouse.move(1, 1);
}

try {
  for (const theme of ['space', 'light']) {
    // 1. Research's first button lights toward the pointer, with a ring that moves nothing.
    {
      const { context, page } = await open(theme);
      await lights(page, page.locator('main .button').first(), `${theme} 1440 Research button`);
      await context.close();
    }
    // The Paper Shelf filters have their old boxes again (E056) and light as on the old site (E021).
    {
      const { context, page } = await open(theme, {}, 'paper-shelf.html');
      await lights(page, page.locator('.paper-filter').nth(1), `${theme} 1440 Paper Shelf filter`);
      await context.close();
    }

    // 2. One box read on entry, and no more angle writes than frames.
    {
      const { context, page } = await open(theme, { counters: true });
      const control = page.locator('main .button').first();
      await control.scrollIntoViewIfNeeded();
      await page.mouse.move(1, 1);
      await page.waitForTimeout(100);
      await control.evaluate(el => { window.__watched = el; });
      const box = await control.boundingBox();
      const start = await page.evaluate(() => ({ ...window.__count }));
      await page.mouse.move(box.x + 4, box.y + box.height / 2);
      await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 30 });
      await page.waitForTimeout(100);
      const end = await page.evaluate(() => ({ ...window.__count }));
      const rects = end.rects - start.rects, writes = end.writes - start.writes, frames = end.frames - start.frames;
      assert.ok(rects >= 1 && rects <= 2, `${theme}: ${rects} box reads of the control over 31 moves (expected the one entry read)`);
      assert.ok(writes >= 1 && writes <= frames, `${theme}: ${writes} --edge-angle writes in ${frames} frames`);
      await context.close();
    }

    // 3. Off: FX off, reduced motion, phone, coarse pointer, a disabled control, the atlas open.
    for (const [label, options, prepare] of [
      ['FX off', { fx: '0' }],
      ['reduced motion', { reducedMotion: 'reduce' }],
      ['390 phone', { width: 390, height: 844, isMobile: true, hasTouch: true }],
      ['1024 coarse pointer', { width: 1024, height: 768, hasTouch: true }],
      ['disabled control', {}, async page => { await insertFixture(page); return page.locator('[data-guard-fixture] button.button[disabled]'); }],
      ['atlas open', {}, async page => { await page.evaluate(() => document.documentElement.classList.add('mineral-atlas-open')); }]
    ]) {
      const { context, page } = await open(theme, options);
      if (label === '1024 coarse pointer') assert.ok(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), `${theme}: the touch context does not report a coarse pointer`);
      const target = (await prepare?.(page)) || page.locator('main .button').first();
      await staysOff(page, target, `${theme} ${label}`);
      await context.close();
    }

    // 4. Cleared by a scroll, by the pointer leaving the window and by a soft navigation.
    {
      const { context, page } = await open(theme);
      const control = page.locator('main .button').first();
      const lightUp = async () => {
        await control.scrollIntoViewIfNeeded();
        const box = await control.boundingBox();
        await page.mouse.move(box.x + 6, box.y + 6);
        await page.mouse.move(box.x + 12, box.y + 8, { steps: 2 });
        await page.waitForTimeout(80);
        assert.ok((await state(control)).lit, `${theme}: the control does not light before the clearing check`);
      };
      const cleared = async label => {
        const left = await page.evaluate(() => [...document.querySelectorAll('[data-edge-active], [style*="--edge-angle"]')].map(el => el.className || el.tagName));
        assert.deepEqual(left, [], `${theme} ${label}: the edge light is not cleared`);
      };
      await lightUp();
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(150);
      await cleared('after a wheel scroll');
      await lightUp();
      await page.mouse.move(-20, 400);
      await page.waitForTimeout(100);
      await cleared('after the pointer left the window');
      await lightUp();
      await control.evaluate(el => { window.__lit = el; });
      await page.evaluate(() => new Promise(resolve => {
        window.addEventListener('mads:soft-nav-ready', () => resolve(), { once: true });
        document.querySelector('.nav a[href="paper-shelf.html"]').click();
      }));
      await page.waitForTimeout(100);
      await cleared('after a soft navigation');
      assert.ok(!(await page.evaluate(() => window.__lit.hasAttribute('data-edge-active') || window.__lit.style.getPropertyValue('--edge-angle'))), `${theme}: the control left behind keeps its light`);
      await context.close();
    }

    // 5. The header's gate and theme toggle light the same way.
    for (const [width, height] of [[1440, 900], [1024, 768]]) {
      const { context, page } = await open(theme, { width, height });
      await lights(page, page.locator('.nav-log-gate').first(), `${theme} ${width} gate`);
      await lights(page, page.locator('.theme-toggle').first(), `${theme} ${width} theme toggle`);
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log('Edge light: follows the pointer on buttons, the gate and the toggle, one box read per control, at most one write per frame, no box change; off with FX off, reduced motion, phones, coarse pointers, disabled controls and the atlas; cleared by scroll, leaving and soft navigation.');
} finally {
  await browser.close();
}
