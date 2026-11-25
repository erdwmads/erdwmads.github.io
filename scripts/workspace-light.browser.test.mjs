// The old site's workspace light, restored (second effects pass, owner 2026-11-18: "all of my previous effects"):
// the planetary explorer's metal faces, steel hover edge and brass-glowing focus; the glazed Planetary CI panel; the
// sample missions' glass controls and brass wash; the Origins study's sliding switch, metal hover, brass track, dark
// sources screen and legible scene hint; the contents bar's filled cells and brass bar; the Analytical Pathway's
// turning chevron; the image inspector's brass accents and gold beam; the phone drop shadows. Each is checked where it
// runs and where it must not: FX off, reduced motion, forced colours and phones. Both themes.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523';
const errors = [];

async function open(theme, { width = 1440, height = 900, fx = true, path = 'ryugu-bennu.html', ...options } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, ...options });
  await context.addInitScript(([t, on]) => {
    try {
      sessionStorage.setItem('mads-cosmic-arrival-v1', 'done');
      localStorage.setItem('mads-theme', t);
      localStorage.setItem('madsAmbientFxEnabled', on ? '1' : '0');
    } catch {}
  }, [theme, fx]);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
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
// In page coordinates, so scrolling a control into view does not count as moving it.
const rect = (page, selector) => page.locator(selector).first().evaluate(el => { const r = el.getBoundingClientRect(); return [r.x + scrollX, r.y + scrollY, r.width, r.height].map(Math.round).join(','); });
async function hover(page, selector) {
  const target = page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
}
const beamTop = page => style(page, '.inspector-regions', ['top', 'transition-duration', 'display', 'opacity'], '::after');

try {
  for (const theme of ['space', 'light']) {
    const accent = await (async () => { const { context, page } = await open(theme, { path: 'research.html' }); const value = await resolve(page, '--obs-accent'); await context.close(); return value; })();

    // Ryugu & Bennu, desktop, effects on.
    const { context, page } = await open(theme);
    const face = await resolve(page, '--obs-control-face', 'background-image');
    const active = await resolve(page, '--obs-control-active-face', 'background-image');
    const glass = await resolve(page, '--obs-glass-face', 'background-image');

    // E033: brushed faces, the darker active face under brass, a steel edge under the pointer, nothing moves.
    const rest = await style(page, '.planetary-materials > [aria-pressed="false"]', ['background-image', 'transition']);
    assert.equal(rest['background-image'], face, `${theme}: material buttons rest on the control face`);
    assert.match(rest.transition, /border-color 0\.18s ease-out, box-shadow 0\.14s ease-out/, `${theme}: borders ease in 180 ms, shadows in 140 ms`);
    const pressed = await style(page, '.planetary-materials > [aria-pressed="true"]', ['background-image', 'border-top-color']);
    assert.deepEqual([pressed['background-image'], pressed['border-top-color']], [active, accent], `${theme}: the chosen material takes the active face under brass`);
    assert.equal((await style(page, '.planetary-tools > .icon-button', ['background-image']))['background-image'], face, `${theme}: the camera tools rest on the control face`);
    const before = await rect(page, '.planetary-materials > [aria-pressed="false"]');
    await hover(page, '.planetary-materials > [aria-pressed="false"]');
    assert.equal((await style(page, '.planetary-materials > [aria-pressed="false"]', ['border-top-color']))['border-top-color'], await resolve(page, '--obs-edge-cool'), `${theme}: a hovered material edges in steel`);
    assert.equal(await rect(page, '.planetary-materials > [aria-pressed="false"]'), before, `${theme}: hover moves nothing`);
    await page.mouse.move(2, 2);

    // E034: with the effects on, the chosen mineral tab glows steel and the chosen label brass.
    assert.equal(await page.locator('.planetary').getAttribute('data-focus-fx'), 'on', `${theme}: focus light is on`);
    const steps = page.locator('.planetary-steps > button');
    for (let i = 0; i < await steps.count(); i++) if (/mineral/i.test(await steps.nth(i).textContent())) await steps.nth(i).click();
    await page.waitForTimeout(500);
    assert.match((await style(page, '.planetary-mineral-tabs > [aria-pressed="true"]', ['box-shadow']))['box-shadow'], /0px 0px 14px/, `${theme}: the chosen mineral tab glows`);
    await steps.first().click();
    await page.waitForFunction(() => document.querySelector('.planetary').dataset.renderState === 'ready', null, { timeout: 30000 });
    const label = page.locator('button.planetary-label:not([hidden])').first();
    await label.waitFor({ state: 'attached' });
    await label.click({ force: true });
    await page.waitForTimeout(300);
    const lit = await style(page, '.planetary-label[aria-pressed="true"]', ['box-shadow', 'border-left-color']);
    assert.match(lit['box-shadow'], /inset.*0px 0px 12px/, `${theme}: the chosen label glows brass: ${lit['box-shadow']}`);
    // The stage is a night plate, so its brass is the Space accent in either theme.
    const plateAccent = await page.locator('.planetary-label[aria-pressed="true"]').evaluate(el => { const probe = document.createElement('i'); probe.style.color = 'var(--obs-accent)'; el.parentElement.append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; });
    assert.equal(lit['border-left-color'], plateAccent, `${theme}: the chosen label's brass edge`);

    // E042: the Planetary CI panel is glazed (its night colours).
    assert.match((await style(page, '.planetary-ci', ['background-image']))['background-image'], /^linear-gradient\(135deg/, `${theme}: the CI panel is glazed`);

    // E035: glass tabs, player and secondary controls; the chosen mission has a brass wash under a brass rule.
    const tab = await style(page, '.mission-selector [aria-selected="true"]', ['background-image']);
    assert.ok(tab['background-image'].startsWith('linear-gradient(115deg') && tab['background-image'].endsWith(glass), `${theme}: the chosen mission's brass wash on glass`);
    assert.equal((await style(page, '.mission-selector [aria-selected="false"]', ['background-image']))['background-image'], glass, `${theme}: the other mission tab on glass`);
    assert.equal((await style(page, '.mission-selector [aria-selected="true"]', ['border-top-color'], '::before'))['border-top-color'], accent, `${theme}: the chosen mission's brass rule`);
    assert.equal((await style(page, '#mission-player', ['background-image']))['background-image'], glass, `${theme}: the player on glass`);
    assert.equal((await style(page, '.mission-transport .icon-button', ['background-image']))['background-image'], glass, `${theme}: the player's step buttons on glass`);
    assert.match((await style(page, '.mission-chapters [aria-current="step"]', ['background-color']))['background-color'], /0\.12\)$/, `${theme}: the current chapter's brass wash`);

    // E041 and E108: brass accents and the sliding gold beam on the region list.
    await page.locator('.inspector-regions').scrollIntoViewIfNeeded();
    await page.locator('.inspector-regions > button').first().waitFor({ state: 'visible' });
    let beam = await beamTop(page);
    assert.deepEqual([beam.top, beam.opacity], ['0px', '1'], `${theme}: the beam stands at Full figure`);
    assert.equal(beam['transition-duration'], '0.24s, 0.24s', `${theme}: the beam slides in 240 ms`);
    await page.locator('.inspector-regions > button').nth(3).click();
    await page.waitForTimeout(90);
    const mid = parseFloat((await beamTop(page)).top);
    assert.ok(mid > 0 && mid < 132, `${theme}: the beam is on its way (${mid} px)`);
    await page.waitForTimeout(450);
    beam = await beamTop(page);
    assert.equal(beam.top, '132px', `${theme}: the beam reaches the fourth region`);
    const chosen = await style(page, '.inspector-regions > button:nth-child(4)', ['color', 'border-left-color', 'box-shadow']);
    assert.equal(chosen.color, accent, `${theme}: the chosen region reads in brass`);
    assert.equal(chosen['border-left-color'], 'rgba(0, 0, 0, 0)', `${theme}: the beam stands in place of the ink rule`);
    assert.match(chosen['box-shadow'], /inset/, `${theme}: a hovered region edges in brass`);
    await page.locator('.inspector-regions > button').first().click();
    await context.close();

    // Origins: the sliding switch, the metal hover, the brass track, the hint shadow, the dark screen.
    const origins = await open(theme, { path: 'origins-study.html' });
    await origins.page.waitForFunction(() => !document.querySelector('#phase-mode').disabled, null, { timeout: 30000 });
    const widths = await origins.page.$$eval('.segmented button', list => list.map(b => Math.round(b.getBoundingClientRect().width)));
    assert.ok(Math.abs(widths[0] - widths[1]) <= 1, `${theme}: the two options are equal, so the block covers one: ${widths}`);
    assert.equal((await style(origins.page, '.segmented', ['transform', 'transition'], '::before')).transform, 'none', `${theme}: the block rests under Material`);
    await origins.page.locator('#phase-mode').click();
    await origins.page.waitForTimeout(80);
    const sliding = (await style(origins.page, '.segmented', ['transform'], '::before')).transform;
    await origins.page.waitForTimeout(400);
    const slid = (await style(origins.page, '.segmented', ['transform'], '::before')).transform;
    assert.match(slid, new RegExp(`matrix\\(1, 0, 0, 1, ${widths[0]}`), `${theme}: the block slides under Process: ${slid}`);
    assert.notEqual(sliding, slid, `${theme}: the block slides rather than jumps`);
    assert.equal((await style(origins.page, '#phase-mode', ['color']))['color'], accent, `${theme}: the chosen option reads in brass`);
    await hover(origins.page, '.camera-tools > .icon-button');
    assert.equal((await style(origins.page, '.camera-tools > .icon-button', ['background-image']))['background-image'], await resolve(origins.page, '--obs-metal', 'background-image'), `${theme}: a hovered icon button takes the metal face`);
    await origins.page.mouse.move(2, 2);
    const track = await style(origins.page, '#progress', ['background-image', 'appearance']);
    assert.ok(track['background-image'].startsWith(`linear-gradient(to right, ${accent}`), `${theme}: the track fills with brass`);
    assert.equal(track.appearance, 'none', `${theme}: the track is drawn`);
    assert.match((await style(origins.page, '#scene-hint', ['text-shadow']))['text-shadow'], /rgb\(0, 0, 0\) 0px 1px 5px/, `${theme}: the scene hint keeps its legibility shadow`);
    await origins.page.locator('#evidence').click();
    await origins.page.waitForTimeout(300);
    assert.equal(await origins.page.evaluate(() => getComputedStyle(document.querySelector('.sources-dialog'), '::backdrop').backgroundColor), 'rgba(3, 6, 15, 0.72)', `${theme}: the sources open over the old dark screen`);
    await origins.context.close();

    // Research: the contents bar's cells and brass bar; the pathway chevron.
    const research = await open(theme, { path: 'research.html' });
    const current = await style(research.page, '.research-guide a[aria-current]', ['color']);
    const fill = await style(research.page, '.research-guide a[aria-current]', ['background-color', 'z-index'], '::before');
    const bar = await style(research.page, '.research-guide a[aria-current]', ['width', 'border-top-color'], '::after');
    assert.equal(current.color, accent, `${theme}: the current section reads in brass`);
    assert.equal(fill['background-color'], await resolve(research.page, '--obs-highlight', 'background-color'), `${theme}: the current cell is filled`);
    assert.deepEqual([bar.width, bar['border-top-color']], ['32px', accent], `${theme}: the short brass bar`);
    await hover(research.page, '.research-guide a:not([aria-current])');
    assert.equal((await style(research.page, '.research-guide a:not([aria-current])', ['background-color'], '::before'))['background-color'], await resolve(research.page, '--obs-surface-hover', 'background-color'), `${theme}: a hovered cell fills softly`);
    await research.page.mouse.move(2, 2);
    const summary = research.page.locator('.pathway-detail > summary').first();
    await summary.scrollIntoViewIfNeeded();
    const closed = await style(research.page, '.pathway-detail > summary', ['content', 'transform', 'transition'], '::after');
    assert.deepEqual([closed.content, closed.transform], ['""', 'matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)'], `${theme}: the chevron points along the row`);
    const box = await rect(research.page, '.pathway-detail > summary');
    await summary.click();
    await research.page.waitForTimeout(400);
    assert.equal((await style(research.page, '.pathway-detail > summary', ['transform'], '::after')).transform, 'matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, -2)', `${theme}: open, it turns down with its 2 px nudge`);
    assert.equal(await rect(research.page, '.pathway-detail > summary'), box, `${theme}: the chevron moves nothing`);
    await research.context.close();

    // FX off: the beam stands still, the focus light is off.
    const off = await open(theme, { fx: false });
    assert.equal(await off.page.locator('.planetary').getAttribute('data-focus-fx'), 'off', `${theme}: FX off turns the focus light off`);
    assert.equal((await beamTop(off.page))['transition-duration'], '0s', `${theme}: FX off, the beam does not slide`);
    await off.context.close();

    // Reduced motion: nothing slides or turns.
    const still = await open(theme, { reducedMotion: 'reduce', path: 'origins-study.html' });
    assert.equal((await style(still.page, '.segmented', ['transition-duration'], '::before'))['transition-duration'], '0s', `${theme}: reduced motion, the block does not slide`);
    await still.context.close();
    const stillScale = await open(theme, { reducedMotion: 'reduce' });
    assert.equal((await beamTop(stillScale.page))['transition-duration'], '0s', `${theme}: reduced motion, the beam does not slide`);
    assert.equal((await stillScale.page.evaluate(() => document.querySelector('.planetary').dataset.focusFx)), 'off', `${theme}: reduced motion turns the focus light off`);
    await stillScale.context.close();

    // Forced colours: no face, block, beam, cell fill or hint shadow; the chevron stays, as the disclosure's mark.
    const forced = await open(theme, { forcedColors: 'active' });
    assert.equal((await style(forced.page, '.planetary-materials > .button', ['background-image']))['background-image'], 'none', `${theme}: forced colours, no metal face`);
    assert.equal((await style(forced.page, '.mission-selector [aria-selected="true"]', ['background-image']))['background-image'], 'none', `${theme}: forced colours, no glass`);
    assert.equal((await beamTop(forced.page)).display, 'none', `${theme}: forced colours, no beam`);
    await forced.context.close();
    const forcedOrigins = await open(theme, { forcedColors: 'active', path: 'origins-study.html' });
    assert.equal((await style(forcedOrigins.page, '.segmented', ['display'], '::before')).display, 'none', `${theme}: forced colours, no sliding block`);
    assert.equal((await style(forcedOrigins.page, '#scene-hint', ['text-shadow']))['text-shadow'], 'none', `${theme}: forced colours, no hint shadow`);
    assert.equal((await style(forcedOrigins.page, '#progress', ['appearance']))['appearance'], 'auto', `${theme}: forced colours, the native slider`);
    await forcedOrigins.context.close();
    const forcedResearch = await open(theme, { forcedColors: 'active', path: 'research.html' });
    assert.equal((await style(forcedResearch.page, '.research-guide a[aria-current]', ['display'], '::before')).display, 'none', `${theme}: forced colours, no cell fill`);
    assert.equal((await style(forcedResearch.page, '.pathway-detail > summary', ['content'], '::after')).content, '""', `${theme}: forced colours keep the chevron`);
    await forcedResearch.context.close();

    // Phones: the contents toggle and Explore sit on the old soft drop shadow; no focus light.
    const phone = await open(theme, { width: 390, height: 844, isMobile: true, hasTouch: true, path: 'research.html' });
    const touch = await resolve(phone.page, '--obs-touch-shadow', 'box-shadow');
    assert.equal((await style(phone.page, '[data-research-guide-toggle]', ['box-shadow']))['box-shadow'], touch, `${theme}: the phone contents toggle's shadow`);
    await phone.context.close();
    const phoneOrigins = await open(theme, { width: 390, height: 844, isMobile: true, hasTouch: true, path: 'origins-study.html' });
    assert.equal((await style(phoneOrigins.page, '#explore', ['box-shadow']))['box-shadow'], touch, `${theme}: Explore's shadow on phones`);
    await phoneOrigins.context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Workspace light passed: planetary metal faces, steel hover, focus glow and glazed CI panel; sample-mission glass and brass wash; Origins sliding switch, metal hover, brass track, hint shadow and dark screen; contents bar cells and brass bar; pathway chevron; inspector accents and gold beam; FX off, reduced motion, forced colours and phones; both themes.');
} finally {
  await browser.close();
}
