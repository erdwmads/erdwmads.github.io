// Controls (spec §6.3, formerly prism-controls): buttons are at least 44 px; a primary button's border is its own
// face and a secondary or icon button rests on the control-border token; no control casts a shadow; hover changes
// only the fill, and neither hover nor press moves or resizes anything; disabled controls are dimmed below .7 with a
// not-allowed cursor; keyboard focus draws a 2 px solid outline 3 px out in the focus colour; under reduced motion
// transitions take no time. WP1's primitives are checked on every page through the stand-in fixture
// (scripts/lib/guard.mjs), next to the first page controls and the shell toggles, which belong to their own packages.
// The theme toggle sits in the header row, whose height WP2 sets, so it is exempt from the 44 px rule here. The page
// runs with reduced motion, so every hover state is final at once and the transition check needs no second pass.
import { gotoGuardPage, insertFixture, runGuard } from './lib/guard.mjs';

const pageControls = 4;

// Runs in the page: the state of every tagged control, or of one (index).
function readControls(index) {
  const probe = document.createElement('i');
  document.querySelector('main').append(probe);
  const token = name => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
  const controlBorder = token('--obs-control-border'), focus = token('--obs-focus');
  probe.remove();
  const all = [...document.querySelectorAll('[data-guard-control]')];
  return (index === undefined ? all : [all[index]]).map(el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return {
      owner: window.__guardOwner(el), name: `${window.__guardName(el)} "${(el.textContent.trim() || el.getAttribute('aria-label') || '').slice(0, 30)}"`,
      primitive: el.matches('.button, .icon-button'), sized: !el.matches('.theme-toggle'), primary: el.matches('.button:not(.secondary)'),
      disabled: el.matches(':disabled, [aria-disabled="true"]'), edge: Boolean(el.querySelector('.obs-edge-light')),
      box: [r.x + scrollX, r.y + scrollY, r.width, r.height], border: [s.borderTopWidth, s.borderTopStyle, s.borderTopColor],
      background: s.backgroundColor, color: s.color, shadow: s.boxShadow, transform: s.transform, opacity: Number(s.opacity), cursor: s.cursor,
      transitions: s.transitionDuration, controlBorder, focus
    };
  });
}

await runGuard('controls', async (page, { entry, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 300 });
  await insertFixture(page);
  await page.evaluate(limit => {
    const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
    const fixture = [...document.querySelectorAll('[data-guard-fixture] :is(.button, .icon-button, .quiet-link)')];
    const pageItems = [...document.querySelectorAll('main :is(.button, .icon-button, button, [role="button"], input[type="search"], input[type="text"], input[type="password"], select)')].filter(el => !el.closest('[data-guard-fixture]') && visible(el)).slice(0, limit);
    const shell = [...document.querySelectorAll('.theme-toggle, .nav-toggle')].filter(visible);
    [...fixture, ...pageItems, ...shell].forEach((el, index) => el.setAttribute('data-guard-control', index));
  }, pageControls);
  const findings = [];
  const boxes = async () => (await page.evaluate(readControls)).map(control => control.box);
  const moved = (a, b) => a.some((box, i) => box.some((value, k) => Math.abs(value - b[i][k]) > .5));
  const rest = await page.evaluate(readControls);
  for (const [index, control] of rest.entries()) {
    const add = message => findings.push({ owner: control.owner, message: `${control.name}: ${message}` });
    if (control.sized && (control.box[3] < 44 || (control.primitive && control.box[2] < 44))) add(`${Math.round(control.box[2])} x ${Math.round(control.box[3])} px, under the 44 px target`);
    if (control.shadow !== 'none') add(`casts a shadow at rest (${control.shadow})`);
    if (control.transitions.split(',').some(value => parseFloat(value) > 0)) add(`transitions run under reduced motion (${control.transitions})`);
    if (control.primitive) {
      if (control.border[0] !== '1px' || control.border[1] !== 'solid') add(`border ${control.border.slice(0, 2).join(' ')}, expected 1px solid`);
      if (control.primary && control.border[2] !== control.background) add(`primary border ${control.border[2]} differs from its face ${control.background}`);
      if (!control.primary && control.border[2] !== control.controlBorder) add(`border ${control.border[2]} is not the control-border token ${control.controlBorder}`);
    }
    if (control.disabled) {
      if (!(control.opacity < .7)) add(`disabled but opacity ${control.opacity}`);
      if (control.cursor !== 'not-allowed') add(`disabled but cursor ${control.cursor}`);
      continue;
    }
    // Hover and press: the pointer rests on the control's centre, then presses there and leaves before release.
    const target = await page.evaluate(i => {
      const el = document.querySelectorAll('[data-guard-control]')[i];
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, index);
    await page.mouse.move(1, 1);
    await page.waitForTimeout(40);
    const before = await boxes();
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(60);
    const [hover] = await page.evaluate(readControls, index);
    // R2 retired the pointer edge light; should its hover span (span.obs-edge-light) come back, it is WP2's finding.
    const addMove = message => (hover.edge ? findings.push({ owner: 'WP2', message: `${control.name}: ${message}: hover inserts span.obs-edge-light, which R2 retires` }) : add(message));
    if (moved(before, await boxes())) addMove('hover moves or resizes a control');
    if (hover.shadow !== 'none' || hover.transform !== control.transform) add(`hover adds ${hover.shadow !== 'none' ? `a shadow (${hover.shadow})` : `a transform (${hover.transform})`}`);
    if (control.primitive && hover.color !== control.color) add(`hover changes the text colour ${control.color} -> ${hover.color}`);
    if (control.primitive && hover.background === control.background && hover.border[2] === control.border[2]) add('hover leaves the fill unchanged');
    await page.mouse.down();
    await page.waitForTimeout(40);
    if (moved(before, await boxes())) addMove('press moves or resizes a control');
    await page.mouse.move(1, 1);
    await page.mouse.up();
  }
  // Keyboard focus: after a key press the browser shows focus rings for focus() too, until the next pointer input.
  await page.keyboard.press('Tab');
  const rings = await page.evaluate(() => [...document.querySelectorAll('[data-guard-control]')].map(el => {
    el.focus({ preventScroll: true });
    // A control that cannot take focus here (inert, or inside a closed panel) has no ring to check.
    if (document.activeElement !== el) return null;
    const s = getComputedStyle(el);
    const ring = [s.outlineStyle, s.outlineWidth, s.outlineOffset, s.outlineColor];
    el.blur();
    return ring;
  }));
  rings.forEach((ring, index) => {
    const control = rest[index];
    if (control.disabled || !ring) return;
    const add = message => findings.push({ owner: control.owner, message: `${control.name}: ${message}` });
    if (ring[0] !== 'solid' || ring[1] !== '2px' || ring[2] !== '3px') add(`focus ring ${ring.slice(0, 3).join(' ')}, expected solid 2px with a 3px offset`);
    else if (control.primitive && ring[3] !== control.focus) add(`focus ring colour ${ring[3]} is not the focus token ${control.focus}`);
  });
  findings.push(...await page.evaluate(() => window.__guardOverflow()));
  return findings;
}, { contextOptions: { reducedMotion: 'reduce' } });
