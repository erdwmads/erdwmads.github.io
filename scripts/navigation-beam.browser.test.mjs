import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    window.beamFrames = [];
    const start = performance.now();
    function sample() {
      const beam = document.querySelector('.obs-nav-beam');
      const selected = document.querySelector('.nav a[aria-current="page"]');
      if (beam && selected && !beam.hidden && getComputedStyle(beam).visibility !== 'hidden') {
        const line = beam.getBoundingClientRect();
        if (line.width > 0) window.beamFrames.push({ y: line.y, expected: selected.getBoundingClientRect().bottom - 5 });
      }
      if (performance.now() - start < 2400) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  const page = await context.newPage();
  for (const theme of ['space', 'light']) {
    await page.goto(`${base}/index.html`);
    await page.evaluate(theme => localStorage.setItem('mads-theme', theme), theme);
    for (const route of ['research', 'cv']) {
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      assert.ok(await page.evaluate(() => window.beamFrames.every(frame => Math.abs(frame.y - frame.expected) < 3)), `${theme}: initial marker travelled vertically`);
      await page.evaluate(() => {
        window.previousHeader = document.querySelector('.site-header');
        window.previousBeam = document.querySelector('.obs-nav-beam');
        window.beamStartX = window.previousBeam.getBoundingClientRect().x;
        window.beamFrames = [];
        const until = performance.now() + 1500;
        function sample() {
          const beam = document.querySelector('.obs-nav-beam');
          const active = document.querySelector('.nav a[aria-current="page"]');
          const box = beam.getBoundingClientRect();
          window.beamFrames.push({ x: box.x, y: box.y, expected: active.getBoundingClientRect().bottom - 5, active: active.getAttribute('href'), opacity: Number(getComputedStyle(active, '::before').opacity) });
          if (performance.now() < until) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      await page.locator(`main .button[href="${route}.html"]`).click();
      await page.waitForURL(`**/${route}.html`);
      await page.waitForTimeout(800);
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      assert.ok(await page.evaluate(() => window.previousHeader === document.querySelector('.site-header') && window.previousBeam === document.querySelector('.obs-nav-beam')), `${theme}/${route}: navigation rebuilt the header`);
      const frames = await page.evaluate(() => window.beamFrames);
      assert.ok(frames.length > 5, `${theme}/${route}: missing animation frames`);
      const bad = frames.filter(frame => Math.abs(frame.y - frame.expected) > 3);
      assert.equal(bad.length, 0, `${theme}/${route}: underline travelled vertically: ${JSON.stringify(bad.slice(0, 5))}`);
      const startX = await page.evaluate(() => window.beamStartX);
      const endX = frames.at(-1).x;
      assert.ok(Math.abs(endX - startX) > 10, `${theme}/${route}: marker did not move`);
      assert.ok(frames.some(frame => Math.abs(frame.x - startX) > 2 && Math.abs(frame.x - endX) > 2), `${theme}/${route}: marker jumped instead of gliding`);
      assert.ok(frames.some(frame => frame.active === `${route}.html` && frame.opacity > 0 && frame.opacity < 1), `${theme}/${route}: selected background did not crossfade`);
      await page.goBack();
      await page.waitForFunction(() => document.querySelector('.nav a[aria-current="page"]')?.getAttribute('href') === 'index.html');
      await page.goForward();
      await page.waitForFunction(route => document.querySelector('.nav a[aria-current="page"]')?.getAttribute('href') === `${route}.html`, route);
      await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => window.previousHeader === document.querySelector('.site-header')), `${theme}/${route}: history rebuilt the header`);
    }
    const glide = await page.evaluate(async () => {
      const beam = document.querySelector('.obs-nav-beam');
      const target = document.querySelector('.nav a[href="research.html"]');
      const start = beam.getBoundingClientRect().x;
      target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
      const samples = [];
      const until = performance.now() + 350;
      while (performance.now() < until) {
        await new Promise(requestAnimationFrame);
        const box = beam.getBoundingClientRect();
        samples.push({ x: box.x, y: box.y });
      }
      return { start, samples, expectedY: target.getBoundingClientRect().bottom - 5 };
    });
    assert.ok(glide.samples.every(frame => Math.abs(frame.y - glide.expectedY) < 3), `${theme}: hover moved vertically`);
    const end = glide.samples.at(-1).x;
    assert.ok(Math.abs(end - glide.start) > 10, `${theme}: hover did not move`);
    assert.ok(glide.samples.some(frame => Math.abs(frame.x - glide.start) > 2 && Math.abs(frame.x - end) > 2), `${theme}: horizontal glide lost`);
    for (const width of [1100, 760, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(300);
      const placement = await page.evaluate(() => {
        const beam = document.querySelector('.obs-nav-beam');
        const active = document.querySelector('.nav a[aria-current="page"]');
        return { hidden: beam.hidden, y: beam.getBoundingClientRect().y, expected: active.getBoundingClientRect().bottom - 5 };
      });
      if (width <= 760) assert.ok(placement.hidden, `${theme}/${width}: mobile beam visible`);
      else {
        assert.ok(!placement.hidden, `${theme}/${width}: desktop beam missing`);
        assert.ok(Math.abs(placement.y - placement.expected) < 3, `${theme}/${width}: resized beam misplaced`);
      }
    }
  }
  for (const options of [
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }
  ]) {
    const smallContext = await browser.newContext(options);
    const smallPage = await smallContext.newPage();
    await smallPage.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
    await smallPage.evaluate(() => { window.savedHeader = document.querySelector('.site-header'); });
    await smallPage.locator('main .button[href="research.html"]').click();
    await smallPage.waitForURL('**/research.html');
    await smallPage.waitForTimeout(300);
    const state = await smallPage.evaluate(() => ({
      retained: window.savedHeader === document.querySelector('.site-header'),
      overflow: document.documentElement.scrollWidth > innerWidth,
      hidden: document.querySelector('.obs-nav-beam').hidden,
      transition: getComputedStyle(document.querySelector('.obs-nav-beam')).transitionDuration,
      fade: getComputedStyle(document.querySelector('.nav a[aria-current="page"]'), '::before').transitionDuration
    }));
    assert.ok(state.retained && !state.overflow, 'mobile/reduced-motion navigation rebuilt the header or overflowed');
    if (options.isMobile) assert.ok(state.hidden, 'mobile has a travelling marker');
    else {
      assert.equal(state.transition, '0s', 'reduced motion still slides');
      assert.equal(state.fade, '0.1s', 'reduced motion should keep only a brief fade');
    }
    await smallContext.close();
  }
  console.log('Navigation beam: retained header, Research/CV glide, background crossfade, history, responsive placement and reduced motion pass.');
} finally {
  await browser.close();
}
