// Contrast (spec §6.5, WCAG 1.4.3 and 1.4.11): on every page and theme, sampled text meets 4.5:1 against what it
// sits on (3:1 for large text: 24 px, or 18.66 px bold), and the border or face of every bordered control meets 3:1
// against the ground around it. The background is composed from the element's ancestors (colours, and the colour
// stops of gradients such as the light pools, taking the worst case; a gradient drawn 2 px or less in one direction is
// a hairline beside the text, not its ground); text over an image or a canvas cannot be
// measured this way and is skipped, as are dimmed controls (opacity below 1: disabled, which WCAG exempts) and
// visually hidden text. WP1's primitives are measured on every page through the stand-in fixture, with a line of
// plain text added to its night plate: text inside .on-night that sets no colour of its own must still read on the
// night ground in the Light theme. Filters and the per-page report: scripts/lib/guard.mjs.
import { gotoGuardPage, insertFixture, runGuard } from './lib/guard.mjs';

const perOwner = 6;

await runGuard('contrast', async (page, { entry, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 400 });
  await insertFixture(page);
  await page.evaluate(() => document.querySelector('[data-guard-fixture] .on-night').insertAdjacentHTML('beforeend', '<span>Text on the night ground</span>'));
  // Since 2026-11-28 the FX switch, a text control in the docked effects panel, is measured too: the panel opens first.
  const settings = page.locator('.obs-fx-dock .obs-fx-settings');
  if (await settings.count() && await settings.isVisible()) {
    await settings.click();
    await page.waitForTimeout(150);
  }
  const found = await page.evaluate(() => {
    const parse = value => {
      const numbers = value.match(/[\d.]+/g)?.map(Number) || [];
      if (/^color\(srgb/.test(value)) return [numbers[0] * 255, numbers[1] * 255, numbers[2] * 255, numbers[3] ?? 1];
      return numbers.length >= 3 ? [numbers[0], numbers[1], numbers[2], numbers[3] ?? 1] : [0, 0, 0, 0];
    };
    const blend = (top, bottom) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + bottom[i] * (1 - a)).concat(1); };
    const luminance = ([r, g, b]) => [r, g, b].map(c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => { const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (high + 0.05) / (low + 0.05); };
    // A comma list split at its top level (gradients nest commas inside parentheses).
    const layers = value => {
      const out = [];
      let depth = 0, start = 0;
      for (let i = 0; i < value.length; i++) {
        if (value[i] === '(') depth++;
        else if (value[i] === ')') depth--;
        else if (value[i] === ',' && depth === 0) { out.push(value.slice(start, i).trim()); start = i + 1; }
      }
      out.push(value.slice(start).trim());
      return out;
    };
    // The colour stops of the gradient layers that can lie under text. A layer sized 2 px or less in one direction is a
    // hairline drawn as a background (the fading rules and beams of 2026-11-26), a rule beside the text rather than its
    // ground, so its stops are not grounds.
    const groundStops = style => {
      const images = layers(style.backgroundImage), sizes = layers(style.backgroundSize);
      return images.flatMap((image, i) => {
        if (!/gradient\(/.test(image)) return [];
        const size = sizes[i % sizes.length].split(/\s+/).map(part => /px$/.test(part) ? parseFloat(part) : Infinity);
        if (size.some(length => length <= 2)) return [];
        return (image.match(/(rgba?|color)\([^)]*\)/g) || []).map(parse);
      });
    };
    // Candidate grounds under an element, from the root down; null when an image or canvas is in the way.
    const grounds = el => {
      const chain = [];
      for (let node = el; node; node = node.parentElement) chain.unshift(node);
      let candidates = [[255, 255, 255, 1]];
      for (const node of chain) {
        const style = getComputedStyle(node);
        if (node !== el && node.matches('canvas, video, img')) return null;
        if (/url\(/.test(style.backgroundImage)) return null;
        const stops = groundStops(style);
        const colour = parse(style.backgroundColor);
        candidates = candidates.map(c => blend(colour, c));
        if (stops.length) candidates = candidates.flatMap(c => stops.map(stop => blend(stop, c)));
        candidates.sort((a, b) => luminance(a) - luminance(b));
        candidates = [candidates[0], candidates.at(-1)];
      }
      return candidates;
    };
    const dimmed = el => { for (let node = el; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) < 1) return true; return false; };
    const out = [];
    const scope = [...document.querySelectorAll('.site-header, main, .site-footer, .obs-fx-dock')];
    const texts = scope.flatMap(root => [root, ...root.querySelectorAll('*')]).filter(el => [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim()));
    for (const el of texts) {
      const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
      if (rect.width <= 1 || rect.height <= 1 || style.visibility === 'hidden' || !el.getClientRects().length || el.closest('svg, canvas, [hidden]') || dimmed(el)) continue;
      const under = grounds(el);
      if (!under) continue;
      const color = parse(style.color);
      const size = parseFloat(style.fontSize), weight = Number(style.fontWeight) || 400;
      const needed = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
      const worst = Math.min(...under.map(ground => ratio(blend(color, ground), ground)));
      if (worst < needed) out.push({ owner: window.__guardOwner(el), message: `text ${window.__guardName(el)} "${el.textContent.trim().slice(0, 30)}" ${style.color} is ${worst.toFixed(2)}:1, needs ${needed}:1` });
    }
    const controls = scope.flatMap(root => [...root.querySelectorAll('button, input, select, textarea, .button, .icon-button, .chip, .pathway-chip, .nav-log-gate, .theme-toggle')]);
    for (const el of new Set(controls)) {
      const style = getComputedStyle(el);
      if (!el.getClientRects().length || style.visibility === 'hidden' || dimmed(el) || el.getBoundingClientRect().width <= 1) continue;
      // A boxed control draws its boundary on every side; a text control or an underline field (2026-11-26) only its
      // beam, the bottom border, which is then its boundary. (A list row's bottom rule is not a control boundary.) The
      // Paper Shelf filters and the photo layout options became text controls in d3, so their beams are checked too.
      const beamed = el.matches('.button, .icon-button, .nav-log-gate, .theme-toggle, .nav-toggle, .arrival-skip, .paper-filter, .photo-layout-switch button, .ambient-fx-toggle, input, select, textarea');
      const side = (beamed ? ['Top', 'Bottom'] : ['Top']).find(edge => parseFloat(style[`border${edge}Width`]) >= 1 && !/none|hidden/.test(style[`border${edge}Style`]) && parse(style[`border${edge}Color`])[3] > 0);
      if (!side) continue;
      const outside = grounds(el.parentElement);
      if (!outside) continue;
      const face = parse(style.backgroundColor);
      const edgeColour = style[`border${side}Color`];
      const worst = Math.min(...outside.map(ground => Math.max(ratio(blend(parse(edgeColour), ground), ground), face[3] === 1 ? ratio(face, ground) : 0)));
      if (worst < 3) out.push({ owner: window.__guardOwner(el), message: `control ${window.__guardName(el)} "${(el.textContent.trim() || el.getAttribute('aria-label') || '').slice(0, 30)}" ${side.toLowerCase()} border ${edgeColour} is ${worst.toFixed(2)}:1 against its ground, needs 3:1` });
    }
    return out;
  });
  // Many repeats of one rule add nothing: keep a few per owner and count the rest.
  const findings = [];
  for (const owner of [...new Set(found.map(finding => finding.owner))]) {
    const list = found.filter(finding => finding.owner === owner);
    findings.push(...list.slice(0, perOwner));
    if (list.length > perOwner) findings.push({ owner, message: `and ${list.length - perOwner} more contrast findings` });
  }
  return findings;
});
