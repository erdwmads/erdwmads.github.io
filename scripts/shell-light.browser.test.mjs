// The old site's shell light, restored (second effects pass, owner 2026-11-18: "all of my previous effects"). Each
// moving or answering effect is checked where it runs and where it must not: the header's orbit trace (fine pointer,
// FX on, motion allowed; paused with a hidden page; off with FX off, reduced motion, phones and forced colours), the
// navigation's lit pool and 1 px lift (box unchanged), the gate's light sweep across its words, the pressed beam and
// pool (the old inner shadow, on the text controls of 2026-11-26), the Onward arrow nudge, the FX switch's gold dot
// and the panel glow, and the backdrops: the page's picture (Bennu on Research) loads after the page and fades in, the
// graticule lies over it, and forced colours show neither; without JavaScript every page draws its own picture at once
// (one per page since 2026-11-28). Both themes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.EDGE_EXECUTABLE });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const errors = [];
// Each page's own picture (components/backdrop.css, one per page since 2026-11-28): the file stem by page.
const pictures = { 'index': 'comet-west', 'research': 'asteroid-bennu', 'ryugu-bennu': 'asteroid-ryugu', 'origins-study': 'cosmic-cliffs', 'research-log': 'comet-neowise', 'paper-shelf': 'trouvelot-orion-nebula', 'cv': 'trouvelot-milky-way', 'photography': 'milky-way-panorama', 'contact': 'comet-pons-brooks', '404': 'dark-cloud-b68', 'research-graduation': 'trouvelot-november-meteors' };
const pictureFile = (path, tier) => pictures[path] === 'asteroid-bennu' ? `asteroid-bennu-${tier === 1600 ? 1280 : 800}.webp` : `${pictures[path]}-mask-${tier}.webp`;

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

      // The current link rests on its lit pool; another lights and rises 1 px under the pointer, its box unchanged.
      assert.equal((await style(page, '.nav__links a[aria-current="page"]', '::after', 'opacity')).opacity, '1', `${label}: the current link rests on its pool`);
      assert.match((await style(page, '.nav__links a[aria-current="page"]', '::after', 'background-image'))['background-image'], /^radial-gradient/, `${label}: the lit face is a light pool`);
      const link = '.nav__links a:not([aria-current]):nth-child(2)';
      const before = await box(page, link);
      await page.hover(link);
      await page.waitForTimeout(450);
      const lit = await style(page, link, '::after', 'opacity');
      assert.equal(lit.opacity, '1', `${label}: a hovered link lights its face`);
      await settled(page, link, 'transform', 'matrix(1, 0, 0, 1, 0, -1)');
      assert.equal((await style(page, link, '', 'transform')).transform, 'matrix(1, 0, 0, 1, 0, -1)', `${label}: a hovered link rises 1 px`);
      assert.equal(await box(page, link), before, `${label}: the lift changes the link's box`);

      // The gate sweeps once on hover across its words (a layer clipped to the letters); its ::before stays free for the
      // edge ring.
      await page.hover('.nav-log-gate');
      const words = '.nav-log-gate__copy > strong';
      const sweep = await page.evaluate(words => document.getAnimations().filter(a => a.animationName && a.effect?.target?.matches?.(words) && !a.effect.pseudoElement).map(a => a.animationName), words);
      assert.deepEqual(sweep, ['gate-sweep'], `${label}: hovering the gate sends its light sweep across its words`);
      const clipped = await style(page, words, '', 'background-image', 'background-clip');
      assert.match(clipped['background-image'], /linear-gradient\(100deg/, `${label}: the sweep is a background layer`);
      assert.equal(clipped['background-clip'], 'text', `${label}: clipped to the letters`);

      // Pressing a button holds its 2 px brass beam over the press pool without moving it.
      const button = 'main .button';
      if (await page.locator(button).count()) {
        await page.evaluate(selector => { document.documentElement.style.scrollBehavior = 'auto'; document.querySelector(selector).scrollIntoView({ block: 'center' }); }, button);
        await page.waitForTimeout(300);
        const rest = await box(page, button);
        await page.hover(button);
        await page.mouse.down();
        await page.waitForTimeout(300);
        const pressed = await style(page, button, '', 'box-shadow', 'background-image', 'border-bottom-color');
        const accent = await page.evaluate(() => { const probe = document.createElement('i'); probe.style.color = 'var(--obs-accent)'; document.querySelector('main').append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; });
        assert.equal(pressed['box-shadow'], `${accent} 0px -1px 0px 0px inset`, `${label}: a pressed button holds the inner line of its 2 px beam (${pressed['box-shadow']})`);
        assert.equal(pressed['border-bottom-color'], accent, `${label}: over its brass border`);
        assert.match(pressed['background-image'], /^radial-gradient/, `${label}: on the press pool`);
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
      // E010 since 2026-11-28: the open panel's glow is an oval light pool reaching 24 px past it (no box halo).
      const glow = await style(page, '.obs-fx-dock > .obs-fx-panel', '::after', 'background-image', 'top', 'left');
      assert.match(glow['background-image'], /^radial-gradient\(closest-side, rgba\(\d+, \d+, \d+, 0\.\d+\) 70%, rgba\(0, 0, 0, 0\)\)$/, `${label}: the open panel glows: ${glow['background-image']}`);
      assert.deepEqual([glow.top, glow.left], ['-24px', '-24px'], `${label}: the glow reaches 24 px past the panel`);
      assert.equal((await style(page, '.obs-fx-panel', '', 'box-shadow'))['box-shadow'], 'none', `${label}: no box halo around the panel`);

      // Backdrops: the page's own picture (a mask since 2026-11-28) after the load event, faded in; the graticule over
      // it; kickers carry their bead. The steps above may have moved to another page by soft navigation, which swaps
      // the picture with the body's page class: the picture must be the one of the page now shown.
      await page.waitForFunction(() => document.documentElement.classList.contains('backdrop-ready'));
      await page.waitForTimeout(700);
      const shown = new URL(page.url()).pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';
      const picture = await style(page, 'body', '::before', 'mask-image', 'opacity');
      assert.ok(picture['mask-image'].includes(pictureFile(shown, 1600)), `${label}: ${shown}'s own picture loads once the page has (${picture['mask-image']})`);
      assert.ok(Number(picture.opacity) > 0, `${label}: the picture fades in`);
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
        const sweep = await page.evaluate(() => document.getAnimations().filter(a => a.animationName && a.effect?.target?.matches?.('.nav-log-gate__copy > strong')).map(a => a.effect.getComputedTiming().duration));
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
      assert.equal((await style(page, '.nav-log-gate', '', 'background-image'))['background-image'], 'none', `${label}: the gate draws a pool`);
      assert.equal((await style(page, '.nav-log-gate__copy > strong', '', 'background-image'))['background-image'], 'none', `${label}: the gate draws a sweep`);
      assert.equal((await style(page, '.kicker', '::before', 'display')).display, 'none', `${label}: the bead shows`);
      assert.equal((await style(page, 'html', '::after', 'display')).display, 'none', `${label}: the graticule shows`);
      await context.close();
    }
  }

  // 4. Without JavaScript, each page draws its own picture at once (2026-11-28), on phones its upright tier.
  for (const [width, height, tier] of [[1440, 900, 1600], [390, 844, 800]]) {
    const context = await browser.newContext({ viewport: { width, height }, javaScriptEnabled: false });
    const page = await context.newPage();
    for (const path of Object.keys(pictures)) {
      await page.goto(`${base}/${path}.html`);
      const drawn = await page.evaluate(() => { const s = getComputedStyle(document.body, '::before'); return { mask: s.maskImage, opacity: Number(s.opacity) }; });
      const file = pictureFile(path, tier);
      assert.ok(drawn.mask.includes(file), `without JavaScript, ${path} at ${width}: its picture ${file} is drawn (${drawn.mask})`);
      assert.ok(drawn.opacity > 0 && drawn.opacity <= 0.7, `without JavaScript, ${path} at ${width}: the picture is dimmed (${drawn.opacity})`);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Shell light: orbit trace, lit navigation pool and lift, gate sweep across its words, pressed beam and pool, Onward nudge, FX switch glow, backdrops and graticule, with FX off, reduced motion, phones, forced colours and no-JS (every page with its own picture) passed.');
} finally {
  await browser.close();
}
