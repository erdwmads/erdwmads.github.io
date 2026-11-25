// Forced colours and more contrast (spec §2.1 states/contrast.css, §6.5): under forced-colors: active the calibration
// markers keep their own painting in the system text colour (outline, fill or corner brackets visible against the
// page, at 3:1 or more, so no marker keeps a theme colour such as the brass "In progress"), the header does not float,
// neither page backdrop is drawn, buttons and the theme toggle lose their sheen and draw no edge light, chips, buttons and fields
// keep a visible border, section rules and hairlines stay drawn, and keyboard focus
// draws a solid outline in a system colour, and pressed or current states stay distinct from their siblings; under prefers-contrast: more the decorative hairline token becomes 60%
// of the text colour. Markers, chips and rules on the page are checked where a page has them (pathway chips, evidence
// tags) and on WP1's stand-in fixture everywhere (scripts/lib/guard.mjs). Filters and the per-page report as there.
import { gotoGuardPage, insertFixture, runGuard } from './lib/guard.mjs';

const inspect = () => {
  const out = [];
  const parse = value => (value.match(/[\d.]+/g) || []).map(Number);
  const canvas = getComputedStyle(document.body).backgroundColor;
  const visibleColour = value => value !== canvas && (parse(value)[3] ?? 1) > 0;
  const luminance = value => parse(value).slice(0, 3).map(c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (high + 0.05) / (low + 0.05); };
  const shown = el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const name = (el, pseudo) => `${window.__guardName(el)}${pseudo || ''}`;
  // Markers: the marker span or the ::before of an evidence tag or pathway chip.
  const markers = [
    ...[...document.querySelectorAll('.marker')].map(el => [el, null]),
    ...[...document.querySelectorAll('.evidence-status__tag, .pathway-chip')].map(el => [el, '::before'])
  ];
  for (const [el, pseudo] of markers) {
    if (!shown(el)) continue;
    const style = getComputedStyle(el, pseudo);
    if (pseudo && style.content === 'none') { out.push({ owner: window.__guardOwner(el), message: `${name(el, pseudo)} draws no marker` }); continue; }
    const outlined = parseFloat(style.borderTopWidth) >= 1 && style.borderTopStyle !== 'none' && visibleColour(style.borderTopColor);
    const painted = style.backgroundImage !== 'none' || visibleColour(style.backgroundColor);
    if (!outlined && !painted) out.push({ owner: window.__guardOwner(el), message: `${name(el, pseudo)} is invisible under forced colours (border ${style.borderTopStyle} ${style.borderTopColor}, background ${style.backgroundColor})` });
    // Every marker paints with currentColor (border, fill or bracket gradient), so its colour is what shows.
    else if (ratio(style.color, canvas) < 3) out.push({ owner: window.__guardOwner(el), message: `${name(el, pseudo)} paints in ${style.color}, ${ratio(style.color, canvas).toFixed(2)}:1 against the system canvas ${canvas}, needs 3:1` });
    if (style.forcedColorAdjust !== 'none') out.push({ owner: window.__guardOwner(el), message: `${name(el, pseudo)} lets the browser drop its painting (forced-color-adjust ${style.forcedColorAdjust})` });
  }
  // Bordered controls and chips keep their border; rules keep their line.
  for (const el of document.querySelectorAll('.chip, .pathway-chip, .button, .icon-button, main input[type="search"], main input[type="text"], main select')) {
    if (!shown(el)) continue;
    const style = getComputedStyle(el);
    if (!(parseFloat(style.borderTopWidth) >= 1 && style.borderTopStyle !== 'none' && visibleColour(style.borderTopColor))) out.push({ owner: window.__guardOwner(el), message: `${name(el)} has no visible border under forced colours (${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor})` });
  }
  for (const el of document.querySelectorAll('.folio-section, main hr')) {
    if (!shown(el)) continue;
    const style = getComputedStyle(el);
    if (!(parseFloat(style.borderTopWidth) >= 1 && style.borderTopStyle !== 'none' && visibleColour(style.borderTopColor))) out.push({ owner: window.__guardOwner(el), message: `${name(el)} loses its rule under forced colours` });
  }
  // Pressed and current states keep a mark of their own that forced colours do not flatten: a pressed filter or
  // layout switch differs from its unpressed siblings in its underline or rule, and the current Origins chapter in
  // the weight of its rule (review finding, integration fix stage).
  const mark = (el, pseudo) => { const s = getComputedStyle(el, pseudo); return `${s.textDecorationLine} ${s.borderTopWidth} ${s.borderTopStyle}`; };
  for (const group of document.querySelectorAll('.paper-filter-row, .photo-layout-switch, .segmented')) {
    const buttons = [...group.querySelectorAll('button[aria-pressed]')].filter(shown);
    const pressed = new Set(buttons.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => mark(b)));
    for (const button of buttons) if (button.getAttribute('aria-pressed') !== 'true' && pressed.has(mark(button))) out.push({ owner: window.__guardOwner(button), message: `${name(button)} looks pressed under forced colours (${mark(button)})` });
  }
  // The effects step aside (owner, 2026-11-18): the header stays in the flow and neither backdrop is drawn.
  const header = document.querySelector('.site-header');
  if (header && getComputedStyle(header).position === 'sticky') out.push({ owner: 'WP2', message: 'the header floats under forced colours' });
  const before = getComputedStyle(document.body, '::before'), after = getComputedStyle(document.body, '::after');
  if (before.content !== 'none' && before.display !== 'none') out.push({ owner: 'WP2', message: `the Bennu backdrop (body::before) is drawn under forced colours (display ${before.display})` });
  if (after.content !== 'none' && after.display !== 'none') out.push({ owner: 'WP2', message: `the header band (body::after) is drawn under forced colours (display ${after.display})` });
  for (const el of document.querySelectorAll('.button, .theme-toggle')) {
    if (shown(el) && getComputedStyle(el).backgroundImage !== 'none') out.push({ owner: 'WP2', message: `${name(el)} keeps its sheen under forced colours (${getComputedStyle(el).backgroundImage.slice(0, 60)})` });
  }
  const current = document.querySelector('.chapters [aria-current]');
  if (current && shown(current)) for (const other of current.closest('.chapters').querySelectorAll('button:not([aria-current])')) {
    if (mark(other, '::before') === mark(current, '::before')) out.push({ owner: window.__guardOwner(current), message: `${name(current)} has the same rule as ${name(other)} under forced colours` });
  }
  return out;
};

await runGuard('forced-colors', async (page, { entry, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 300 });
  await insertFixture(page);
  await page.emulateMedia({ forcedColors: 'active' });
  const findings = await page.evaluate(inspect);
  // The pointer edge light draws no ring under forced colours, even where the script lights the control.
  const lit = page.locator('[data-guard-fixture] .button:not(:disabled)').first();
  await lit.scrollIntoViewIfNeeded();
  const litBox = await lit.boundingBox();
  if (litBox) {
    await page.mouse.move(litBox.x + 6, litBox.y + 6);
    await page.mouse.move(litBox.x + litBox.width - 6, litBox.y + litBox.height - 6, { steps: 3 });
    await page.waitForTimeout(80);
    const ring = await lit.evaluate(el => { const s = getComputedStyle(el, '::before'); return s.content !== 'none' && s.display !== 'none'; });
    if (ring) findings.push({ owner: 'WP2', message: 'the edge light draws its ring under forced colours' });
    await page.mouse.move(1, 1);
  }
  // Focus under forced colours: a solid outline in a system colour that differs from the page.
  const target = page.locator('[data-guard-fixture] .button').first();
  await page.keyboard.press('Tab');
  await target.focus();
  const ring = await target.evaluate(el => { const s = getComputedStyle(el); return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor, canvas: getComputedStyle(document.body).backgroundColor }; });
  if (ring.style !== 'solid' || ring.width < 2 || ring.color === ring.canvas) findings.push({ owner: 'WP1', message: `focus under forced colours: ${ring.style} ${ring.width}px ${ring.color} on ${ring.canvas}` });
  await page.emulateMedia({ forcedColors: 'none', contrast: 'more' });
  // More contrast: the hairline token is the text colour at 60% (alpha .6), in the page and on night plates.
  const hairlines = await page.evaluate(() => [document.querySelector('main'), document.querySelector('.on-night')].filter(Boolean).map(scope => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--obs-hairline)';
    scope.append(probe);
    const hairline = getComputedStyle(probe).color;
    probe.style.color = 'var(--obs-text)';
    const text = getComputedStyle(probe).color;
    probe.remove();
    return { scope: window.__guardName(scope), hairline, text };
  }));
  for (const { scope, hairline, text } of hairlines) {
    const [r, g, b, a = 1] = (hairline.match(/[\d.]+/g) || []).map(Number);
    const [tr, tg, tb] = (text.match(/[\d.]+/g) || []).map(Number);
    const same = /^color\(srgb/.test(hairline) ? Math.abs(r * 255 - tr) < 2 && Math.abs(g * 255 - tg) < 2 && Math.abs(b * 255 - tb) < 2 : r === tr && g === tg && b === tb;
    if (!same || Math.abs(a - .6) > .02) findings.push({ owner: 'WP1', message: `more contrast: --obs-hairline in ${scope} is ${hairline}, expected the text colour ${text} at 60%` });
  }
  await page.emulateMedia({ contrast: 'no-preference' });
  return findings;
});
