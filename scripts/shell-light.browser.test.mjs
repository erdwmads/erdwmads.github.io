// The old site's shell light, restored (second effects pass, owner 2026-11-18: "all of my previous effects"). Each
// moving or answering effect is checked where it runs and where it must not: the header's orbit trace (fine pointer,
// FX on, motion allowed; paused with a hidden page; off with FX off, reduced motion, phones and forced colours), the
// navigation's lit face and 1 px lift (box unchanged), the gate's light sweep, the pressed shadow, the Onward arrow
// nudge, the FX switch's gold dot and the panel glow, and the backdrops: Bennu loads after the page and fades in, the
// graticule lies over it, and forced colours show neither. Both themes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const errors = [];

async function open(theme, { width = 1440, height = 900, fx = true, path = 'research.html', ...options } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, ...options });
  await context.addInitScript(([t, on]) => {
    try {
      sessionStorage.setItem('mads-cosmic-arrival-v1', 'done');
      localStorage.setItem('mads-theme', t);
      localStorage.setItem('madsAmbientFxEnabled', on ? '1' : '0');
    } catch {}
  }, [theme, fx]);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${theme} ${width} ${path}: ${error.message}`));
  await page.goto(`${base}/${path}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready.then(() => true));
  return { context, page };
}

// The running animations on the header's ::after, by name and play state.
const trace = page => page.evaluate(() => document.getAnimations()
  .filter(animation => animation.effect?.target === document.querySelector('.site-header') && animation.effect.pseudoElement === '::after')
  .map(animation => ({ name: animation.animationName, state: animation.playState })));
const box = (page, selector) => page.evaluate(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [r.width, r.height].map(Math.round).join('x'); }, selector);
const style = (page, selector, pseudo, ...props) => page.evaluate(([selector, pseudo, props]) => {
  const cs = getComputedStyle(document.querySelector(selector), pseudo || null);
  return Object.fromEntries(props.map(prop => [prop, cs.getPropertyValue(prop)]));
}, [selector, pseudo, props]);
// Waits (up to 3 s) for a transitioning property to reach its end value, so a busy machine cannot catch it midway.
const settled = (page, selector, prop, value) => page.waitForFunction(([selector, prop, value]) => getComputedStyle(document.querySelector(selector)).getPropertyValue(prop) === value, [selector, prop, value], { timeout: 3000 }).catch(() => {});
const token = (page, name) => page.evaluate(name => {
  const probe = document.createElement('i');
  probe.style.boxShadow = `var(${name})`;
  document.querySelector('main').append(probe);
  const value = getComputedStyle(probe).boxShadow;
  probe.remove();
  return value;
}, name);

try {
  for (const theme of ['space', 'light']) {
    // 1. Desktop, fine pointer, FX on, motion allowed: everything runs.
    {
      const label = `${theme} 1440`;
      const { context, page } = await open(theme, { reducedMotion: 'no-preference' });
      assert.deepEqual(await trace(page), [{ name: 'orbit-trace', state: 'running' }], `${label}: the orbit trace runs`);
      assert.equal((await style(page, '.site-header', '', 'overflow-x'))['overflow-x'], 'clip', `${label}: the header clips the trace sideways`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label}: the trace widens the page`);
      await page.evaluate(() => document.documentElement.classList.add('mads-page-hidden'));
      assert.equal((await trace(page))[0]?.state, 'paused', `${label}: a hidden page pauses the trace`);
      await page.evaluate(() => document.documentElement.classList.remove('mads-page-hidden'));

      // The current link rests on its lit face; another lights and rises 1 px under the pointer, its box unchanged.
      assert.equal((await style(page, '.nav__links a[aria-current="page"]', '::after', 'opacity')).opacity, '1', `${label}: the current link rests on its face`);
      const link = '.nav__links a:not([aria-current]):nth-child(2)';
      const before = await box(page, link);
      await page.hover(link);
      await page.waitForTimeout(450);
      const lit = await style(page, link, '::after', 'opacity');
      assert.equal(lit.opacity, '1', `${label}: a hovered link lights its face`);
      await settled(page, link, 'transform', 'matrix(1, 0, 0, 1, 0, -1)');
      assert.equal((await style(page, link, '', 'transform')).transform, 'matrix(1, 0, 0, 1, 0, -1)', `${label}: a hovered link rises 1 px`);
      assert.equal(await box(page, link), before, `${label}: the lift changes the link's box`);

      // The gate sweeps once on hover, on its own background layer; its ::before stays free for the edge ring.
      await page.hover('.nav-log-gate');
      const sweep = await page.evaluate(() => document.getAnimations().filter(a => a.animationName && a.effect?.target?.matches?.('.nav-log-gate') && !a.effect.pseudoElement).map(a => a.animationName));
      assert.deepEqual(sweep, ['gate-sweep'], `${label}: hovering the gate sends its light sweep`);
      assert.match((await style(page, '.nav-log-gate', '', 'background-image'))['background-image'], /linear-gradient\(100deg/, `${label}: the sweep is a background layer`);

      // Pressing a button sinks it into the pressed shadow without moving it.
      const button = 'main .button';
      if (await page.locator(button).count()) {
        await page.evaluate(selector => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector(selector).scrollIntoView({ block: 'center' }); }, button);
        await page.waitForTimeout(300);
        const rest = await box(page, button);
        await page.hover(button);
        await page.mouse.down();
        await page.waitForTimeout(300);
        assert.equal((await style(page, button, '', 'box-shadow'))['box-shadow'], await token(page, '--obs-control-pressed'), `${label}: a pressed button takes the pressed shadow`);
        assert.equal(await box(page, button), rest, `${label}: pressing moves the button`);
        await page.mouse.up();
      }

      // The Onward arrow nudges up and right; the row stays put.
      await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('.continue-reading a').scrollIntoView({ block: 'center' }); });
      await page.waitForTimeout(300);
      const row = await box(page, '.continue-reading a');
      await page.hover('.continue-reading a');
      await page.waitForTimeout(400);
      await settled(page, '.continue-reading a .continue-reading-arrow', 'transform', 'matrix(1, 0, 0, 1, 3, -3)');
      assert.equal((await style(page, '.continue-reading a .continue-reading-arrow', '', 'transform')).transform, 'matrix(1, 0, 0, 1, 3, -3)', `${label}: the Onward arrow nudges`);
      assert.equal(await box(page, '.continue-reading a'), row, `${label}: the nudge moves the row`);

      // The FX switch glows gold while on; the open panel glows.
      await page.click('.obs-fx-settings');
      const dot = await style(page, '.ambient-fx-toggle.is-on .ambient-fx-toggle__dot', '', 'box-shadow');
      assert.notEqual(dot['box-shadow'], 'none', `${label}: the FX dot glows while on`);
      assert.match((await style(page, '.obs-fx-panel', '', 'box-shadow'))['box-shadow'], /0px 0px 24px/, `${label}: the open panel glows`);

      // Backdrops: Bennu after the load event, faded in; the graticule over it; kickers carry their bead.
      await page.waitForFunction(() => document.documentElement.classList.contains('backdrop-ready'));
      await page.waitForTimeout(700);
      const bennu = await style(page, 'body', '::before', 'background-image', 'opacity');
      assert.match(bennu['background-image'], /asteroid-bennu/, `${label}: Bennu loads once the page has`);
      assert.ok(Number(bennu.opacity) > 0, `${label}: Bennu fades in`);
      const grid = await style(page, 'html', '::after', 'content', 'position', 'background-image');
      assert.ok(grid.content !== 'none' && grid.position === 'fixed' && /linear-gradient/.test(grid['background-image']), `${label}: the graticule is drawn ${JSON.stringify(grid)}`);
      assert.notEqual((await style(page, '.kicker', '::before', 'background-image'))['background-image'], 'none', `${label}: kickers begin with the bead`);
      await context.close();
    }

    // 2. FX off, reduced motion, phones: no trace; reduced motion also keeps the link still.
    for (const [label, options] of [[`${theme} FX off`, { fx: false, reducedMotion: 'no-preference' }], [`${theme} reduced motion`, { reducedMotion: 'reduce' }], [`${theme} 390`, { width: 390, height: 844, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' }]]) {
      const { context, page } = await open(theme, options);
      assert.deepEqual(await trace(page), [], `${label}: the orbit trace runs`);
      if (label.endsWith('reduced motion')) {
        const link = '.nav__links a:not([aria-current]):nth-child(2)';
        await page.hover(link);
        assert.equal((await style(page, link, '', 'transform')).transform, 'none', `${label}: a hovered link moves`);
        await page.hover('.nav-log-gate');
        const sweep = await page.evaluate(() => document.getAnimations().filter(a => a.animationName && a.effect?.target?.matches?.('.nav-log-gate')).map(a => a.effect.getComputedTiming().duration));
        assert.ok(sweep.every(duration => duration === 0), `${label}: the gate sweep takes time (${sweep})`);
      }
      await context.close();
    }

    // 3. Forced colours: no trace, no face, no sweep, no bead, no backdrop.
    {
      const label = `${theme} forced colours`;
      const { context, page } = await open(theme, { forcedColors: 'active', reducedMotion: 'no-preference' });
      assert.deepEqual(await trace(page), [], `${label}: the orbit trace runs`);
      await page.hover('.nav-log-gate');
      assert.equal((await style(page, '.nav-log-gate', '', 'background-image'))['background-image'], 'none', `${label}: the gate draws a sweep or sheen`);
      assert.equal((await style(page, '.kicker', '::before', 'display')).display, 'none', `${label}: the bead shows`);
      assert.equal((await style(page, 'html', '::after', 'display')).display, 'none', `${label}: the graticule shows`);
      await context.close();
    }
  }

  // 4. Without JavaScript, Bennu shows at once.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${base}/research.html`);
    assert.match(await page.evaluate(() => getComputedStyle(document.body, '::before').backgroundImage), /asteroid-bennu/, 'without JavaScript: Bennu is drawn');
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Shell light: orbit trace, lit navigation face and lift, gate sweep, pressed shadow, Onward nudge, FX switch glow, backdrops and graticule, with FX off, reduced motion, phones, forced colours and no-JS passed.');
} finally {
  await browser.close();
}
