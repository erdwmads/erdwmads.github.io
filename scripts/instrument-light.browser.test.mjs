// The old site's instrument light, restored (second effects pass, owner 2026-11-18: "all of my previous effects"):
// the FX field's glowing dust, gold specks, shaded pebbles and haloed meteors; the orrery's planet, Sun, Kuiper-belt
// and label glows at the Immersive .9 from 901 px; the steel route light and the Research Log ring; the reading beam
// across the top of the window from 761 px; the cleavage and polarisation glow; the atlas surface; the entrance's
// legibility shadows. Each is checked where it runs and where it must not: FX off, reduced motion, forced colours and
// phones (the lite field only, E103). Both themes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const errors = [];

async function open(theme, { width = 1440, height = 900, fx = true, path = 'research.html', arrival = false, ...options } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, ...options });
  await context.addInitScript(([t, on, entrance]) => {
    try {
      if (!entrance) sessionStorage.setItem('mads-cosmic-arrival-v1', 'done');
      localStorage.setItem('mads-theme', t);
      localStorage.setItem('madsAmbientFxEnabled', on ? '1' : '0');
    } catch {}
  }, [theme, fx, arrival]);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => errors.push(`${theme} ${width} ${path}: ${error.message}`));
  await page.goto(`${base}/${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  return { context, page };
}

// Runs in the page: a custom property resolved through a given property.
const resolve = (page, name, property = 'color') => page.evaluate(([name, property]) => {
  const probe = document.createElement('i');
  probe.style.setProperty(property, `var(${name})`);
  document.body.append(probe);
  const value = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return value;
}, [name, property]);
const style = (page, selector, props, pseudo = null) => page.evaluate(([selector, props, pseudo]) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const cs = getComputedStyle(el, pseudo);
  return Object.fromEntries(props.map(prop => [prop, cs.getPropertyValue(prop)]));
}, [selector, props, pseudo]);

try {
  for (const theme of ['space', 'light']) {
    // The field (E022-E024): every speck glows; Space draws gold specks gold with a halo, Light draws them white.
    const { context, page } = await open(theme);
    await page.waitForFunction(() => document.querySelector('.ambient-meteor.is-flying'), null, { timeout: 15000 });
    const dustGlow = await resolve(page, '--fx-dust-glow', 'box-shadow');
    const dust = await style(page, '.ambient-dust:not(.is-gold-dust)', ['box-shadow', 'background-color']);
    assert.equal(dust['box-shadow'], dustGlow, `${theme}: dust glows`);
    const gold = await style(page, '.ambient-dust.is-gold-dust', ['box-shadow']);
    const halo = await style(page, '.ambient-dust.is-gold-dust', ['content', 'background-image'], '::after');
    if (theme === 'space') {
      assert.equal(gold['box-shadow'].match(/rgba?\(/g).length, 3, `space: gold specks carry three glows: ${gold['box-shadow']}`);
      assert.match(halo['background-image'], /radial-gradient/, 'space: gold specks carry their halo');
    } else {
      assert.equal(gold['box-shadow'], dustGlow, 'light: gold specks glow white');
      assert.equal(halo['background-image'], 'none', 'light: no gold halo');
    }
    const pebble = await style(page, '.ambient-pebble', ['background-image', 'box-shadow']);
    assert.match(pebble['background-image'], /radial-gradient\(circle at 35% 30%/, `${theme}: pebbles are shaded from the upper left`);
    assert.match(pebble['box-shadow'], /inset.*13px/, `${theme}: pebbles carry the inner shade and the glow`);
    const meteor = await style(page, '.ambient-meteor.is-flying', ['filter', 'height', 'opacity']);
    const head = await style(page, '.ambient-meteor.is-flying', ['width', 'box-shadow'], '::after');
    assert.match(meteor.filter, /drop-shadow/, `${theme}: meteors glow`);
    assert.deepEqual([meteor.height, head.width], ['3px', '7px'], `${theme}: the 3 px trail and its 7 px head`);
    assert.match(head['box-shadow'], /10px.*22px|10px.*20px/, `${theme}: the head is haloed`);

    // The orrery (E025, E026): glowing planets, Sun, Kuiper belt and labels, at .9 under Immersive (the default).
    const system = await style(page, '.ui2046-solar-system', ['opacity', 'filter']);
    assert.equal(system.opacity, '0.9', `${theme}: the orrery shows at .9`);
    assert.match(system.filter, /drop-shadow/, `${theme}: the orrery glows`);
    assert.match((await style(page, '.ui2046-system-orbit.giant .ui2046-planet', ['box-shadow']))['box-shadow'], /14px/, `${theme}: Jupiter glows in its colour (5 px x 2.8)`);
    assert.match((await style(page, '.sun-marker', ['box-shadow']))['box-shadow'], /14px.*32px/, `${theme}: the Sun glows`);
    assert.notEqual((await style(page, '.ui2046-kuiper-belt', ['box-shadow']))['box-shadow'], 'none', `${theme}: the Kuiper belt has its halo`);
    assert.match((await style(page, '.ui2046-planet-label', ['text-shadow']))['text-shadow'], /12px/, `${theme}: planet labels glow faintly`);

    // The route light (E027): hovering a header link lights its orbit, planet and label in steel.
    const steel = await resolve(page, '--obs-edge-cool');
    await page.locator('.nav a[href$="paper-shelf.html"]').hover();
    await page.waitForTimeout(400);
    const route = await page.evaluate(() => {
      const orbit = document.querySelector('.ui2046-system-orbit.is-route-active');
      const planet = orbit.querySelector('.ui2046-planet'), label = orbit.querySelector('.ui2046-planet-label');
      return { border: getComputedStyle(orbit).borderTopColor, shadow: getComputedStyle(orbit).boxShadow, planet: getComputedStyle(planet).boxShadow, label: getComputedStyle(label).color };
    });
    assert.equal(route.border, steel, `${theme}: the lit orbit is steel`);
    assert.match(route.shadow, /12px.*inset/, `${theme}: the lit orbit glows inside and out`);
    assert.ok(route.planet.startsWith(steel), `${theme}: its planet glows steel: ${route.planet}`);
    assert.equal(route.label, steel, `${theme}: its label turns steel`);
    await page.mouse.move(10, 700);

    // The reading beam (E029): a 2 px line on a track across the top of the window, above the floating header,
    // scaled from --scroll-progress; the spine tick follows the same value.
    const beamAt = () => page.evaluate(() => {
      const span = document.querySelector('.ui2046-progress > span');
      const beam = getComputedStyle(span, '::before'), track = getComputedStyle(span.parentElement, '::before');
      return { position: beam.position, top: beam.top, left: beam.left, width: beam.width, height: beam.height, transform: beam.transform, track: track.backgroundColor, display: beam.display, progress: Number(span.style.getPropertyValue('--scroll-progress') || 0), shadow: beam.boxShadow, z: getComputedStyle(span.parentElement).zIndex };
    });
    const top = await beamAt();
    assert.deepEqual([top.position, top.top, top.left, top.height], ['fixed', '0px', '0px', '2px'], `${theme}: the beam spans the top of the window: ${JSON.stringify(top)}`);
    assert.equal(top.transform, 'matrix(0, 0, 0, 1, 0, 0)', `${theme}: at the top the beam is empty`);
    assert.notEqual(top.track, 'rgba(0, 0, 0, 0)', `${theme}: the track shows`);
    assert.ok(Number(top.z) > 50, `${theme}: the beam lies above the floating header`);
    assert.equal(top.shadow === 'none', theme === 'light', `${theme}: the beam glows in Space only, as on the old site`);
    await page.evaluate(() => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2));
    await page.waitForTimeout(400);
    const mid = await beamAt();
    const scale = Number(mid.transform.match(/matrix\(([\d.]+)/)[1]);
    assert.ok(Math.abs(scale - mid.progress) < .01 && scale > .4 && scale < .6, `${theme}: halfway down the beam is half full: ${JSON.stringify(mid)}`);

    // The Research Log ring (E028).
    await page.goto(`${base}/research-log.html`, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    const ring = await style(page, '.ui2046-solar-system', ['content', 'border-top-style', 'border-top-color', 'box-shadow'], '::after');
    assert.equal(ring.content, '""', `${theme}: Research Log routes draw the ring`);
    assert.equal(ring['border-top-style'], 'dashed');
    assert.equal(ring['border-top-color'], await resolve(page, '--obs-accent'), `${theme}: the ring is brass`);
    assert.match(ring['box-shadow'], /14px/, `${theme}: the ring glows`);
    await page.goto(`${base}/research.html`, { waitUntil: 'load' });
    await page.waitForTimeout(700);
    assert.equal((await style(page, '.ui2046-solar-system', ['content'], '::after')).content, 'none', `${theme}: other routes have no ring`);

    // Polarisation (E030; no outlines since 2026-11-26): a line under the navigation takes the interference colour with
    // the old 18 px glow, and the page's buttons take it on their beams over a pool of it.
    await page.evaluate(() => { document.documentElement.style.setProperty('--mineral-colour', 'rgb(80, 200, 240)'); document.documentElement.style.setProperty('--mineral-extinction', '1'); document.documentElement.setAttribute('data-polarising', ''); });
    await page.waitForTimeout(400);
    const nav = await style(page, '.header-actions .nav', ['opacity', 'background-color', 'box-shadow', 'height'], '::after');
    assert.deepEqual([nav.opacity, nav['background-color'], nav.height], ['1', 'rgb(80, 200, 240)', '1px'], `${theme}: polarising lights the line under the navigation (${JSON.stringify(nav)})`);
    assert.match(nav['box-shadow'], /0px 0px 18px/, `${theme}: with the old 18 px glow`);
    if (await page.locator('main .button').count()) {
      const beam = await style(page, 'main .button', ['border-bottom-color', 'background-image']);
      assert.equal(beam['border-bottom-color'], 'rgb(80, 200, 240)', `${theme}: the page's buttons take the colour on their beams`);
      assert.match(beam['background-image'], /radial-gradient/, `${theme}: over a pool of it`);
    }
    await page.evaluate(() => document.documentElement.removeAttribute('data-polarising'));
    const cleavage = await style(page, '.mineral-cleavage path', ['stroke-width', 'filter']);
    assert.deepEqual([cleavage['stroke-width'], /drop-shadow/.test(cleavage.filter)], ['1.3px', true], `${theme}: the cleavage glows steel`);

    // The atlas (E031): deep shadow, dark scrim, steel selection.
    await page.locator('[data-public-atlas]').click();
    await page.locator('.evidence-atlas[open]').waitFor();
    await page.locator('.atlas-step[data-group="evidence"]').click();
    const atlas = await page.evaluate(() => {
      const dialog = document.querySelector('.evidence-atlas');
      const step = document.querySelector('.atlas-step[aria-selected="true"]');
      return { shadow: getComputedStyle(dialog).boxShadow, scrim: getComputedStyle(dialog, '::backdrop').backgroundColor, border: getComputedStyle(step).borderLeftColor, wash: getComputedStyle(step).backgroundColor, grid: getComputedStyle(document.querySelector('.atlas-public .atlas-map')).backgroundImage };
    });
    assert.match(atlas.shadow, /24px 100px/, `${theme}: the atlas floats on its deep shadow`);
    assert.equal(atlas.scrim, await resolve(page, '--obs-atlas-scrim'), `${theme}: over the old dark scrim`);
    assert.equal(atlas.border, steel, `${theme}: the selected step is marked in steel`);
    assert.notEqual(atlas.wash, 'rgba(0, 0, 0, 0)', `${theme}: on a steel wash`);
    assert.equal(atlas.grid, 'none', `${theme}: the public steps keep no grid`);
    await page.keyboard.press('Escape');
    await context.close();

    // Standard and the medium widths (E026, E134): from 901 px Immersive keeps .9, Standard .36 then .25 to 1120 px;
    // the spine and the beam show there.
    for (const [width, immersive, standard] of [[1440, '0.9', '0.36'], [1024, '0.9', '0.25']]) {
      const view = await open(theme, { width });
      assert.equal((await style(view.page, '.ui2046-solar-system', ['opacity'])).opacity, immersive, `${theme} ${width}: Immersive`);
      await view.page.evaluate(() => document.documentElement.setAttribute('data-fx-intensity', 'standard'));
      assert.equal((await style(view.page, '.ui2046-solar-system', ['opacity'])).opacity, standard, `${theme} ${width}: Standard`);
      assert.ok(await view.page.locator('.ui2046-rail').isVisible(), `${theme} ${width}: the spine shows`);
      assert.equal((await style(view.page, '.ui2046-progress > span', ['display'], '::before')).display, 'block', `${theme} ${width}: the beam shows`);
      await view.context.close();
    }

    // FX off: no field and no orrery (the reading indicators stay; they are not effects of the field).
    const off = await open(theme, { fx: false });
    assert.equal(await off.page.locator('.ambient-space-layer .ambient-dust').count(), 0, `${theme}: FX off removes the field`);
    assert.equal(await off.page.locator('.ui2046-solar-system').count(), 0, `${theme}: FX off removes the orrery`);
    await off.context.close();

    // Reduced motion: no field, a still orrery and an instant beam.
    const still = await open(theme, { reducedMotion: 'reduce' });
    assert.equal(await still.page.locator('.ambient-dust').count(), 0, `${theme}: reduced motion shows no field`);
    assert.equal(await still.page.locator('.ui2046-orbit-track').evaluateAll(tracks => tracks.reduce((n, track) => n + track.getAnimations().length, 0)), 0, `${theme}: the orbits stand still`);
    assert.equal((await style(still.page, '.ui2046-progress > span', ['transition-duration'], '::before'))['transition-duration'], '0s', `${theme}: the beam moves with no transition`);
    await still.context.close();

    // Forced colours: no field, orrery, beam or track; the spine tick (a border) stays.
    const forced = await open(theme, { forcedColors: 'active' });
    assert.equal((await style(forced.page, '.ambient-space-layer', ['display'])).display, 'none', `${theme}: forced colours hide the field`);
    assert.equal(await forced.page.locator('.ui2046-solar-system').evaluateAll(els => els.every(el => getComputedStyle(el).display === 'none')), true, `${theme}: and the orrery`);
    assert.equal((await style(forced.page, '.ui2046-progress > span', ['display'], '::before')).display, 'none', `${theme}: and the beam`);
    assert.equal((await style(forced.page, '.ui2046-progress', ['display'], '::before')).display, 'none', `${theme}: and its track`);
    assert.equal((await style(forced.page, '.ui2046-progress > span', ['display'], '::after')).display, 'block', `${theme}: the tick stays`);
    await forced.context.close();

    // Phones: no orrery, spine or beam; the field runs only as the lite version, without pebbles (owner decision E103).
    const phone = await open(theme, { width: 390, height: 844, hasTouch: true, isMobile: true });
    assert.equal(await phone.page.locator('.ui2046-layer, .ui2046-progress').count(), 0, `${theme}: phones carry no orrery, spine or beam`);
    await phone.page.waitForSelector('.ambient-space-layer.is-lite > .ambient-dust', { state: 'attached', timeout: 10000 });
    assert.equal(await phone.page.locator('.ambient-space-layer:not(.is-lite), .ambient-pebble').count(), 0, `${theme}: phones run only the lite field`);
    await phone.context.close();

    // The entrance (E032): dark legibility shadows under the title and the sky labels, and Skip's glass face as a pool
    // of the surface at 80 % behind its words (a text control since 2026-11-26), on a layer of its own that reaches past
    // the words and fades to nothing (2026-11-28), so the control's box never clips it. The entrance focuses Skip without
    // the focus ring (owner, 2026-11-28), so before any key it rests: no beam on the control itself, only the pool
    // (its keyboard focus beam is checked by arrival-focus.browser).
    const entrance = await open(theme, { path: 'index.html', arrival: true });
    await entrance.page.locator('.arrival-skip').waitFor();
    const arrival = await entrance.page.evaluate(() => {
      const skip = document.querySelector('.arrival-skip'), layer = getComputedStyle(skip, '::after');
      return {
        title: getComputedStyle(document.querySelector('.arrival-signature')).textShadow,
        label: getComputedStyle(document.querySelector('.celestial-labels span') || document.body).textShadow,
        skip: getComputedStyle(skip).backgroundImage,
        pool: layer.backgroundImage,
        layer: { position: layer.position, top: parseFloat(layer.top), left: parseFloat(layer.left), zIndex: layer.zIndex }
      };
    });
    assert.match(arrival.title, /0px 2px 12px/, `${theme}: the title carries its shadow`);
    assert.match(arrival.label, /0px 1px 5px/, `${theme}: the sky labels carry theirs`);
    const pool = arrival.pool.match(/radial-gradient\(closest-side, ((?:rgba|color)\([^)]*\)) 55%/);
    assert.ok(pool, `${theme}: Skip sits on its glass pool: ${arrival.pool}`);
    assert.ok(Number(pool[1].match(/([\d.]+)\)$/)[1]) >= .8, `${theme}: the pool keeps the old 80 % glass: ${pool[1]}`);
    assert.ok(arrival.layer.position === 'absolute' && arrival.layer.zIndex === '-1' && arrival.layer.top <= -16 && arrival.layer.left <= -40, `${theme}: the pool is a layer behind the words that reaches past them: ${JSON.stringify(arrival.layer)}`);
    assert.equal(arrival.skip, 'none', `${theme}: Skip opens at rest, with no focus or hover beam on the control: ${arrival.skip}`);
    await entrance.context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Instrument light passed: field glows, orrery glows at .9 from 901 px, route light, Research Log ring, reading beam, polarisation and cleavage glow, atlas surface, entrance shadows; FX off, reduced motion, forced colours and phones; both themes.');
} finally {
  await browser.close();
}
