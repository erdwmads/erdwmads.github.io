// Controls (spec §6.3, formerly prism-controls): buttons are at least 44 px. Since 2026-11-26 (the lab site's language,
// owner: "the bubbly AI feel is too strong") every button and icon button, plain or secondary, is a text control: no
// box (a transparent edge, square corners), its boundary a 1 px beam in the control-border token along its foot (3:1,
// contrast.browser), no resting shadow; under a hovering pointer the beam lights (the border slot turns to the lit
// gradient) with the soft gold glow below it (--obs-beam-glow, the old hover glow, E062), the same for the gate and the
// theme toggle; a current, chosen or pressed control (the chosen sample mission included) keeps its 2 px brass beam (an
// inner line over its brass border) and its own state under the pointer, and since 2026-11-28 a pressed or chosen
// toggle still answers the pointer: its brass beam takes the soft gold glow below it and its pool deepens, so state and
// hover both read (a current page's control keeps its state alone); the effects button is a borderless icon on a lens, casting no box shadow; on phones
// and touch screens Origins' Explore, a control over the moving scene, keeps the old --obs-touch-shadow (E043); the
// Paper Shelf filters and the photo layout options are text controls too (d3, 2026-11-26), held to the same beam, hover
// light and 2 px brass state (the chosen layout's old inset brass bar, E048, is that beam now); every other control
// casts no shadow. Hover changes the beam
// and the pool, never the text colour, and neither hover nor press moves or resizes anything; disabled controls are
// dimmed below .7 with a not-allowed cursor; keyboard focus draws a 2 px solid outline 3 px out in the focus colour;
// under reduced motion transitions take no time. WP1's primitives are checked on every page through the stand-in
// fixture (scripts/lib/guard.mjs), next to the first page controls and the shell toggles, which belong to their own
// packages. The theme toggle sits in the header row, whose height WP2 sets, so it is exempt from the 44 px rule here.
// The page runs with reduced motion, so every hover state is final at once and the transition check needs no second
// pass.
import { gotoGuardPage, insertFixture, runGuard } from './lib/guard.mjs';

const pageControls = 4;

// Runs in the page: the state of every tagged control, or of one (index).
function readControls(index) {
  const probe = document.createElement('i');
  document.querySelector('main').append(probe);
  const token = name => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
  const controlBorder = token('--obs-control-border'), focus = token('--obs-focus');
  probe.remove();
  // The shadows as the control's own theme computes them: a probe beside it, removed before anything paints.
  const shadows = el => {
    const probe = document.createElement('i');
    el.parentElement.append(probe);
    const resolve = value => { probe.style.boxShadow = value; return getComputedStyle(probe).boxShadow; };
    const glowShadow = resolve('var(--obs-beam-glow)');
    const touchShadow = resolve('var(--obs-touch-shadow)');
    const stateShadow = resolve('inset 0 -1px var(--obs-accent)');
    probe.remove();
    const touched = el.matches('.scene-explore') && matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)').matches;
    const chosen = el.matches('[aria-pressed="true"], [aria-current]:not([aria-current="false"]), [aria-selected="true"], [aria-expanded="true"].nav-toggle');
    const beamed = el.matches('.button, .icon-button, .nav-log-gate, .theme-toggle, .paper-filter, .photo-layout-switch button');
    const restShadow = touched ? touchShadow : chosen && (beamed || el.matches('.nav-toggle, .mission-selector button')) ? stateShadow : 'none';
    const toggled = el.matches('[aria-pressed="true"], [aria-selected="true"]') && (beamed || el.matches('.mission-selector button'));
    return { restShadow, glowShadow, touched, chosen, toggled, beamed, hoverable: matchMedia('(hover: hover)').matches };
  };
  const all = [...document.querySelectorAll('[data-guard-control]')];
  return (index === undefined ? all : [all[index]]).map(el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return {
      owner: window.__guardOwner(el), name: `${window.__guardName(el)} "${(el.textContent.trim() || el.getAttribute('aria-label') || '').slice(0, 30)}"`,
      primitive: el.matches('.button, .icon-button'), sized: !el.matches('.theme-toggle'),
      disabled: el.matches(':disabled, [aria-disabled="true"]'), fx: el.matches('.obs-fx-settings'),
      box: [r.x + scrollX, r.y + scrollY, r.width, r.height], radius: s.borderTopLeftRadius,
      top: [s.borderTopWidth, s.borderTopStyle, s.borderTopColor], bottom: [s.borderBottomWidth, s.borderBottomStyle, s.borderBottomColor],
      background: s.backgroundImage + ' ' + s.backgroundColor, color: s.color, shadow: s.boxShadow, transform: s.transform, opacity: Number(s.opacity), cursor: s.cursor,
      transitions: s.transitionDuration, controlBorder, focus, ...shadows(el)
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
    const shell = [...document.querySelectorAll('.theme-toggle, .nav-toggle, .nav-log-gate, .obs-fx-settings')].filter(visible);
    [...fixture, ...pageItems, ...shell].forEach((el, index) => el.setAttribute('data-guard-control', index));
  }, pageControls);
  const findings = [];
  const boxes = async () => (await page.evaluate(readControls)).map(control => control.box);
  const moved = (a, b) => a.some((box, i) => box.some((value, k) => Math.abs(value - b[i][k]) > .5));
  const transparent = colour => /rgba\(\d+, \d+, \d+, 0\)|transparent/.test(colour);
  const rest = await page.evaluate(readControls);
  for (const [index, control] of rest.entries()) {
    const add = message => findings.push({ owner: control.owner, message: `${control.name}: ${message}` });
    if (control.sized && (control.box[3] < 44 || ((control.primitive || control.fx) && control.box[2] < 44))) add(`${Math.round(control.box[2])} x ${Math.round(control.box[3])} px, under the 44 px target`);
    if (control.shadow !== control.restShadow) add(`rests on the shadow ${control.shadow}, expected ${control.restShadow}`);
    if (control.transitions.split(',').some(value => parseFloat(value) > 0)) add(`transitions run under reduced motion (${control.transitions})`);
    if (control.beamed) {
      // A text control: no box, and its beam along the foot.
      if (!transparent(control.top[2]) && !control.touched) add(`draws a box edge (top border ${control.top.join(' ')})`);
      if (control.radius !== '0px' && !control.touched) add(`has rounded corners (${control.radius})`);
      if (control.bottom[0] !== '1px' || control.bottom[1] !== 'solid') add(`beam ${control.bottom.slice(0, 2).join(' ')}, expected 1px solid`);
      else if (!control.chosen && control.bottom[2] !== control.controlBorder && !control.disabled) add(`beam ${control.bottom[2]} is not the control-border token ${control.controlBorder}`);
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
    // The page runs with reduced motion, so the pointer edge light (R2) must stay off; a lit ring is WP2's finding.
    if (await page.evaluate(() => Boolean(document.querySelector('[data-edge-active]')))) findings.push({ owner: 'WP2', message: `${control.name}: the edge light shows under reduced motion` });
    if (moved(before, await boxes())) add('hover moves or resizes a control');
    const lit = control.beamed && control.hoverable && !control.chosen;
    const toggledLit = control.toggled && control.hoverable;
    const hoverShadow = lit ? control.glowShadow : toggledLit ? `${control.restShadow}, ${control.glowShadow}` : control.restShadow;
    if (hover.shadow !== hoverShadow) add(`hover casts the shadow ${hover.shadow}, expected ${lit ? '--obs-beam-glow' : toggledLit ? 'its brass beam with --obs-beam-glow below it' : 'its resting shadow'} (${hoverShadow})`);
    if (toggledLit && hover.background === control.background) add('a pressed or chosen toggle leaves its pool unchanged under the pointer');
    if (hover.transform !== control.transform) add(`hover adds a transform (${hover.transform})`);
    if (control.primitive && hover.color !== control.color) add(`hover changes the text colour ${control.color} -> ${hover.color}`);
    if (lit && hover.background === control.background && hover.bottom[2] === control.bottom[2]) add('hover leaves the beam and the pool unchanged');
    await page.mouse.down();
    await page.waitForTimeout(40);
    if (moved(before, await boxes())) add('press moves or resizes a control');
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
