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
    // Home has no navigation entry (the brand links home), so no marker shows there.
    await page.reload({ waitUntil: 'networkidle' });
    assert.ok(await page.evaluate(() => document.querySelector('.obs-nav-beam').hidden && !document.querySelector('.nav a[aria-current]')), `${theme}: Home shows no navigation marker`);
    // Glide from Research to a page reached through an in-page link, so the pointer never previews the target.
    for (const route of ['ryugu-bennu', 'paper-shelf']) {
      await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      assert.ok(await page.evaluate(() => window.beamFrames.every(frame => Math.abs(frame.y - frame.expected) < 3)), `${theme}: initial marker travelled vertically`);
      // The marker and the current link's resting rule are brass: the --obs-accent token of the theme.
      const colours = await page.evaluate(() => {
        const probe = document.createElement('i');
        probe.style.color = 'var(--obs-accent)';
        document.body.append(probe);
        const accent = getComputedStyle(probe).color;
        probe.remove();
        // Both are drawn as a 2 px top border, which forced colours keep.
        return { accent, beam: getComputedStyle(document.querySelector('.obs-nav-beam')).borderTopColor, rule: getComputedStyle(document.querySelector('.nav a[aria-current="page"]'), '::before').borderTopColor };
      });
      assert.deepEqual([colours.beam, colours.rule], [colours.accent, colours.accent], `${theme}: the marker is drawn in --obs-accent`);
      await page.evaluate(() => {
        window.previousHeader = document.querySelector('.site-header');
        window.previousBeam = document.querySelector('.obs-nav-beam');
        window.beamStartX = window.previousBeam.getBoundingClientRect().x;
        window.beamFrames = [];
        window.beamSampling = true;
        // Sample until the test stops it, 800 ms after the new page settles, so a slow soft navigation on a busy
        // machine cannot end the window before the marker has moved (6 s at most).
        const until = performance.now() + 6000;
        function sample() {
          const beam = document.querySelector('.obs-nav-beam');
          const active = document.querySelector('.nav a[aria-current="page"]');
          const box = beam.getBoundingClientRect();
          window.beamFrames.push({ x: box.x, y: box.y, expected: active.getBoundingClientRect().bottom - 5, active: active.getAttribute('href'), opacity: Number(getComputedStyle(active, '::before').opacity) });
          if (window.beamSampling && performance.now() < until) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      await page.locator(`main .continue-reading a[href="${route}.html"]`).click();
      await page.waitForURL(`**/${route}.html`);
      await page.waitForFunction(() => !document.documentElement.classList.contains('mads-soft-nav-active'));
      await page.waitForTimeout(800);
      await page.evaluate(() => { window.beamSampling = false; });
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
      await page.waitForFunction(() => document.querySelector('.nav a[aria-current="page"]')?.getAttribute('href') === 'research.html');
      await page.goForward();
      await page.waitForFunction(route => document.querySelector('.nav a[aria-current="page"]')?.getAttribute('href') === `${route}.html`, route);
      await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => window.previousHeader === document.querySelector('.site-header')), `${theme}/${route}: history rebuilt the header`);
    }
    const glide = await page.evaluate(async () => {
      const beam = document.querySelector('.obs-nav-beam');
      const target = document.querySelector('.nav a[href="contact.html"]');
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
    // Keyboard preview: Tab onto another link moves the marker there, and the current page's resting rule steps aside
    // as it does for the pointer, so one brass underline shows at a time; leaving the header restores both.
    await page.locator('.nav a[href="research.html"]').focus();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
    const keyed = await page.evaluate(() => {
      const focused = document.activeElement, beam = document.querySelector('.obs-nav-beam').getBoundingClientRect();
      const current = document.querySelector('.nav a[aria-current="page"]');
      return { focused: focused.getAttribute('href'), focusVisible: focused.matches(':focus-visible'), current: current.getAttribute('href'), beamX: beam.x, linkX: focused.getBoundingClientRect().x + 10, rule: Number(getComputedStyle(current, '::before').opacity) };
    });
    assert.ok(keyed.focused === 'ryugu-bennu.html' && keyed.focusVisible && keyed.current !== keyed.focused, `${theme}: keyboard focus left the current link: ${JSON.stringify(keyed)}`);
    assert.ok(Math.abs(keyed.beamX - keyed.linkX) < 2 && keyed.rule === 0, `${theme}: keyboard preview shows two underlines: ${JSON.stringify(keyed)}`);
    await page.locator('main').focus();
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => Number(getComputedStyle(document.querySelector('.nav a[aria-current="page"]'), '::before').opacity)), 1, `${theme}: the resting rule returns once focus leaves the header`);
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
  console.log('Navigation beam: no marker on Home, retained header, Research to Ryugu & Bennu / Paper Shelf glide, background crossfade, history, responsive placement and reduced motion pass.');
} finally {
  await browser.close();
}
