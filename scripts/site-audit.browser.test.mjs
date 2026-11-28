import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/photography.html`, { waitUntil: 'networkidle' });
  await page.locator('[data-present-photos]').click();
  const fullscreen = page.locator('.obs-present-fullscreen');
  assert.equal(await fullscreen.getAttribute('aria-label'), 'Enter browser full screen');
  assert.equal(await fullscreen.getAttribute('aria-pressed'), 'false');
  const enterIcon = await fullscreen.innerHTML();
  await fullscreen.click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  assert.equal(await fullscreen.getAttribute('aria-label'), 'Exit browser full screen');
  assert.equal(await fullscreen.getAttribute('aria-pressed'), 'true');
  assert.notEqual(await fullscreen.innerHTML(), enterIcon, 'fullscreen icon did not change');
  await fullscreen.click();
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.equal(await fullscreen.getAttribute('aria-label'), 'Enter browser full screen');
  await page.evaluate(() => {
    window.fullscreenSurface = document.querySelector('.obs-presentation-surface');
    window.realRequestFullscreen = window.fullscreenSurface.requestFullscreen;
    window.fullscreenSurface.requestFullscreen = () => Promise.reject(new Error('Denied'));
  });
  await fullscreen.click();
  assert.ok((await page.locator('.obs-fullscreen-status').textContent()).includes('unavailable'));
  assert.ok(await page.locator('.obs-presentation[open]').isVisible());
  await page.evaluate(() => { window.fullscreenSurface.requestFullscreen = window.realRequestFullscreen; });
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    window.fullscreenSurface.requestFullscreen = async function () {
      await window.realRequestFullscreen.call(this);
      await new Promise(resolve => { window.finishFullscreenRequest = resolve; });
    };
  });
  await page.locator('[data-present-photos]').click();
  await fullscreen.click();
  await page.waitForFunction(() => typeof window.finishFullscreenRequest === 'function');
  await page.locator('.obs-present-close').click();
  await page.locator('[data-present-photos]').click();
  await page.evaluate(() => window.finishFullscreenRequest());
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.ok(await page.locator('.obs-presentation[open] img').getAttribute('src'), 'late fullscreen completion purged the reopened viewer');
  await page.evaluate(() => { window.fullscreenSurface.requestFullscreen = window.realRequestFullscreen; });
  await page.locator('.obs-present-close').click();
  await page.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false }));
  await page.locator('[data-present-photos]').click();
  assert.ok(await fullscreen.isHidden(), 'unsupported fullscreen button remains visible');
  await page.locator('.obs-present-close').click();
  await page.goto(`${base}/contact.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  // The spine's position tick shows only while the page can scroll; fit the viewport to the page to make it short.
  const progress = page.locator('.ui2046-progress');
  assert.equal(await progress.evaluate(el => el.hidden), await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 2), 'the position tick must follow whether Contact can scroll');
  await page.setViewportSize({ width: 1440, height: await page.evaluate(() => document.documentElement.scrollHeight + 40) });
  await page.waitForTimeout(300);
  assert.ok(await progress.evaluate(el => el.hidden), 'a page that cannot scroll shows no position tick');
  // The spine (spec §4.0): a vertical running head "INTERFACE 2046 · {route}" beside a 1 px track at the right edge,
  // and a 24 x 2 px ink tick (the span's ::after, a border, so forced colours keep it; not brass, which content may
  // already use up) that travels the track from top to bottom with the scroll; from 901 px, where the old site's
  // rail showed (E134).
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
  const spineAt = () => page.evaluate(() => {
    const track = document.querySelector('.ui2046-rail-line').getBoundingClientRect();
    // The tick is a pseudo-element: its box is the span's, moved by the ::after translate.
    const tick = document.querySelector('.ui2046-progress > span');
    const span = tick.getBoundingClientRect(), after = getComputedStyle(tick, '::after');
    const shift = Number.parseFloat(after.translate.split(' ')[1] || '0');
    const box = { top: span.top + shift, bottom: span.top + shift + Number.parseFloat(after.height), left: span.left, width: Number.parseFloat(after.borderLeftWidth), height: Number.parseFloat(after.height) };
    const probe = document.createElement('i');
    probe.style.color = 'var(--obs-rule)';
    document.body.append(probe);
    const ink = getComputedStyle(probe).color;
    probe.remove();
    // The running head reads downwards: the imprint, a middot (::before), then the route.
    const rail = document.querySelector('.ui2046-rail'), imprint = rail.querySelector('span'), route = rail.querySelector('[data-ui2046-route]');
    const head = imprint.getBoundingClientRect().bottom <= route.getBoundingClientRect().top
      ? `${imprint.innerText} ${getComputedStyle(route, '::before').content.replace(/"/g, '')} ${route.innerText}` : `${route.innerText} / ${imprint.innerText}`;
    return { track: [track.top, track.bottom, track.left + track.width / 2], tick: [box.top, box.bottom, box.left + box.width / 2, box.width, box.height], colour: after.borderLeftColor, ink, opacity: Number(after.opacity) * Number(getComputedStyle(tick).opacity), head, vertical: getComputedStyle(rail).writingMode };
  });
  const top = await spineAt();
  assert.deepEqual([top.tick[3], top.tick[4]], [2, 24], 'the tick is 2 x 24 px');
  assert.equal(top.colour, top.ink, 'the tick is ink (--obs-rule), drawn as its left border');
  assert.ok(Math.abs(top.tick[2] - top.track[2]) <= 1, `the tick sits on the track: ${JSON.stringify(top)}`);
  // Calmer chrome (2026-11-26): the spine and its tick come in over the first 160 px of scroll, so at the very top the
  // tick rests at the start of the track unseen, and is fully shown from 160 px.
  assert.ok(Math.abs(top.tick[0] - top.track[0]) <= 1 && top.opacity === 0, `at the top the tick rests, unseen, at the start of the track: ${JSON.stringify(top)}`);
  await page.evaluate(() => scrollTo(0, 200));
  await page.waitForTimeout(200);
  assert.equal((await spineAt()).opacity, 1, 'past the first 160 px of scroll the tick shows');
  assert.match(top.head, /^INTERFACE 2046\s*·\s*RESEARCH$/i, `running head: ${top.head}`);
  assert.equal(top.vertical, 'vertical-rl');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
  const end = await spineAt();
  assert.ok(Math.abs(end.tick[1] - end.track[1]) <= 1 && end.opacity === 1, `at the end the tick reaches the foot of the track: ${JSON.stringify(end)}`);
  // The spine shows from 901 px and the reading beam from 761 px, as on the old site (E134, E029).
  const shown = () => page.evaluate(() => ({ rail: !!document.querySelector('.ui2046-rail')?.getClientRects().length,
    tick: getComputedStyle(document.querySelector('.ui2046-progress > span'), '::after').display !== 'none',
    beam: getComputedStyle(document.querySelector('.ui2046-progress > span'), '::before').display !== 'none' }));
  for (const [width, want] of [[1199, { rail: true, tick: true, beam: true }], [1024, { rail: true, tick: true, beam: true }], [901, { rail: true, tick: true, beam: true }], [900, { rail: false, tick: false, beam: true }], [761, { rail: false, tick: false, beam: true }]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    assert.deepEqual(await shown(), want, `${width}px: spine from 901 px, reading beam from 761 px`);
  }
  // Sample Cabinet is explicitly retired and hidden by the existing site policy. Ryugu & Bennu holds material split from Research.
  const routes = ['index', 'research', 'ryugu-bennu', 'paper-shelf', 'cv', 'photography', 'contact', 'research-log', 'research-graduation'];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['space', 'light']) {
      await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
      for (const route of routes) {
        await page.goto(`${base}/${route}.html`, { waitUntil: 'networkidle' });
        const state = await page.evaluate(() => ({
          theme: document.documentElement.dataset.theme,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          main: document.querySelectorAll('main').length,
          heading: document.querySelectorAll('main h1').length,
          header: document.querySelector('.site-header').getBoundingClientRect().bottom,
          content: document.querySelector('main').getBoundingClientRect().top,
          dialogs: document.querySelectorAll('.obs-presentation').length
        }));
        assert.equal(state.theme, theme, `${route}: wrong theme`);
        assert.ok(!state.overflow, `${route}/${width}/${theme}: horizontal overflow`);
        assert.equal(state.main, 1);
        assert.equal(state.heading, 1);
        assert.equal(state.dialogs, 1);
        assert.ok(state.header <= state.content + 1, `${route}: header overlaps main`);
        if (width <= 760) await page.locator('[data-nav-toggle]').click();
        await page.locator('.theme-toggle').click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme === 'space' ? 'light' : 'space');
        await page.locator('.theme-toggle').click();
        if (route === 'research-graduation') assert.equal(await page.locator('.mission-photo-grid img').count(), 0, 'locked images leaked');
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log('Site audit: fullscreen state/error handling, Contact consistency and nine active pages in both themes on desktop/mobile passed.');
} finally { await browser.close(); }
