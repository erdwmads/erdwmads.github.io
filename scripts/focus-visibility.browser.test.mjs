// Focus visibility (spec §5 rows 11 and 13, §6.5, WCAG 2.4.7 and 2.4.11): tabbing through each page, the first stop
// is the skip link, shown in the viewport above every layer; every focused element is rendered, scrolled into the
// viewport and not hidden under a sticky or fixed bar (at least one of five sample points inside it reaches it); it
// draws a solid outline of at least 2 px; and no ancestor that clips its overflow (a plate's media box, an opening
// disclosure, a scroll box) cuts that outline off. An obscured element is a finding for the owner of what covers it,
// a cut-off outline for the owner of what clips it. The first 40 stops of each page are checked, with reduced motion
// so the browser scrolls to each stop at once, then 20 stops backward (Shift+Tab) from the end of the page. Where the
// header floats (R1), a focused element outside it whose top lies under the header's bottom is a finding for WP2. Then
// WP1's stand-in fixture is inserted with a focusable link at the edge of an open disclosure and inside a plate's
// media, and every stop in it is checked the same way. Widths 1440, 1024 (the two-row floating header) and 390.
// Filters and the per-page report: scripts/lib/guard.mjs.
import { gotoGuardPage, insertFixture, runGuard } from './lib/guard.mjs';

const stops = 40;
const backStops = 20;

// Focusable content at the clipping edges WP1's primitives create, appended to the fixture for this guard only.
const edgeProbes = `
<details open><summary>Open disclosure</summary><p><a href="#guard-fixture-title">A link at the edge of a disclosure</a></p></details>
<figure class="plate" data-ground="specimen"><div class="plate__media"><a href="#guard-fixture-title"><svg viewBox="0 0 16 9" width="100%" role="img" aria-label="Linked plate"><rect width="16" height="9" fill="currentColor" opacity=".08"/></svg></a></div><figcaption class="plate__caption"><span class="plate__title"><span class="plate__label">Plate 1</span> A linked plate</span> <span class="plate__credit">Image: guard fixture</span></figcaption></figure>
<figure class="figure"><div class="figure__media"><a href="#guard-fixture-title"><svg viewBox="0 0 16 9" width="100%" role="img" aria-label="Linked figure"><rect width="16" height="9" fill="currentColor" opacity=".08"/></svg></a></div></figure>`;

// Runs in the page for the focused element: the findings for this stop.
function inspectStop(first) {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return { done: true };
  const key = el.dataset.guardStop ||= String(Math.random());
  const name = `${window.__guardName(el)} "${(el.textContent.trim() || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').slice(0, 30)}"`;
  const out = [];
  const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
  if (first && !el.matches('.site-skip-link')) out.push({ owner: 'WP1', message: `the first stop is ${name}, not the skip link` });
  const left = Math.max(rect.left, 0), right = Math.min(rect.right, innerWidth), top = Math.max(rect.top, 0), bottom = Math.min(rect.bottom, innerHeight);
  if (rect.width < 1 || rect.height < 1 || style.visibility === 'hidden' || right <= left || bottom <= top) {
    out.push({ owner: window.__guardOwner(el), message: `${name} is focused but not visible in the viewport (${Math.round(rect.width)} x ${Math.round(rect.height)} at ${Math.round(rect.top)})` });
  } else {
    const points = [[.5, .5], [.25, .25], [.75, .25], [.25, .75], [.75, .75]].map(([x, y]) => [left + (right - left) * x, top + (bottom - top) * y]);
    let cover = null;
    const reached = points.some(([x, y]) => {
      const stack = document.elementsFromPoint(x, y);
      const at = stack.findIndex(node => node === el || el.contains(node));
      if (at === 0 || (at < 0 && stack[0]?.contains(el))) return true;
      cover ||= stack[0];
      return false;
    });
    if (!reached) out.push({ owner: cover ? window.__guardOwner(cover) : window.__guardOwner(el), message: `${name} is hidden under ${cover ? window.__guardName(cover) : 'another element'}` });
    // The floating header covers the top of the window: a stop must land below it (html's scroll-padding-top).
    const header = document.querySelector('.site-header');
    if (header && getComputedStyle(header).position === 'sticky' && !header.contains(el) && !el.matches('.site-skip-link')) {
      const headerBottom = header.getBoundingClientRect().bottom;
      if (rect.top < headerBottom - 1) out.push({ owner: 'WP2', message: `${name} is under the floating header (top ${Math.round(rect.top)} above its bottom ${Math.round(headerBottom)})` });
    }
  }
  if (style.outlineStyle === 'none' || parseFloat(style.outlineWidth) < 2) {
    out.push({ owner: window.__guardOwner(el), message: `${name} shows no 2 px focus outline (${style.outlineStyle} ${style.outlineWidth})` });
    return { key, out };
  }
  // The outline's outer edge, against the clip box of every ancestor that clips (html and body excepted: the viewport
  // check above covers them). A disclosure clips through its ::details-content, below its summary.
  const grow = parseFloat(style.outlineOffset) + parseFloat(style.outlineWidth);
  const ring = { left: rect.left - grow, top: rect.top - grow, right: rect.right + grow, bottom: rect.bottom + grow };
  const cut = (box, clipX, clipY) => [
    clipX && ring.left < box.left - 1 && 'left', clipY && ring.top < box.top - 1 && 'top',
    clipX && ring.right > box.right + 1 && 'right', clipY && ring.bottom > box.bottom + 1 && 'bottom'
  ].filter(Boolean);
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const s = getComputedStyle(node), r = node.getBoundingClientRect();
    const margin = s.overflowX === 'clip' || s.overflowY === 'clip' ? parseFloat(s.overflowClipMargin) || 0 : 0;
    const padding = { left: r.left + parseFloat(s.borderLeftWidth) - margin, top: r.top + parseFloat(s.borderTopWidth) - margin, right: r.right - parseFloat(s.borderRightWidth) + margin, bottom: r.bottom - parseFloat(s.borderBottomWidth) + margin };
    let sides = cut(padding, s.overflowX !== 'visible', s.overflowY !== 'visible');
    if (!sides.length && node.matches('details') && !el.closest('summary')) {
      const content = getComputedStyle(node, '::details-content');
      const summary = node.querySelector(':scope > summary');
      if (content.overflowX !== 'visible' || content.overflowY !== 'visible') sides = cut({ ...padding, top: summary ? summary.getBoundingClientRect().bottom : padding.top }, content.overflowX !== 'visible', content.overflowY !== 'visible');
    }
    if (sides.length) {
      out.push({ owner: window.__guardOwner(node), message: `${name}: its focus outline is cut off on the ${sides.join(', ')} by ${window.__guardName(node)}${node.matches('details') && s.overflowX === 'visible' ? '::details-content' : ''} (overflow ${s.overflow})` });
      break;
    }
  }
  return { key, out };
}

await runGuard('focus-visibility', async (page, { entry, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 400 });
  const findings = [];
  const seen = new Set();
  for (let index = 0; index < stops; index++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(inspectStop, index === 0);
    if (stop.done || seen.has(stop.key)) break;
    seen.add(stop.key);
    findings.push(...stop.out);
  }
  if (!seen.size) findings.push({ owner: 'WP1', message: 'Tab reaches nothing on the page' });
  // Backward from the end of the page: the focus starting point moves to the end of body, then Shift+Tab.
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, document.documentElement.scrollHeight); getSelection().collapse(document.body, document.body.childNodes.length); });
  const seenBack = new Set();
  for (let index = 0; index < backStops; index++) {
    await page.keyboard.press('Shift+Tab');
    const stop = await page.evaluate(inspectStop, false);
    if (stop.done || seenBack.has(stop.key)) break;
    seenBack.add(stop.key);
    findings.push(...stop.out);
  }
  // WP1's primitives: every stop in the fixture, from its first focusable element on.
  await insertFixture(page);
  const expected = await page.evaluate(html => {
    const fixture = document.querySelector('[data-guard-fixture]');
    fixture.querySelector('section').insertAdjacentHTML('beforeend', html);
    fixture.tabIndex = -1;
    fixture.focus();
    return fixture.querySelectorAll('a[href], button:not([disabled]), input, summary').length;
  }, edgeProbes);
  const fixtureStops = new Set();
  for (let index = 0; index < 30; index++) {
    await page.keyboard.press('Tab');
    if (!await page.evaluate(() => Boolean(document.activeElement?.closest('[data-guard-fixture]')))) break;
    const stop = await page.evaluate(inspectStop, false);
    if (stop.done || fixtureStops.has(stop.key)) break;
    fixtureStops.add(stop.key);
    findings.push(...stop.out);
  }
  if (fixtureStops.size !== expected) findings.push({ owner: 'WP1', message: `Tab reached ${fixtureStops.size} of the ${expected} focusable elements in the stand-in fixture` });
  return findings;
}, { widths: [1440, 1024, 390], contextOptions: { reducedMotion: 'reduce' } });
