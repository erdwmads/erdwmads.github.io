// Layout shift (spec §5 row 39, §6.5): no layout shift on any page at 1440 and 390 px in both themes, except the web-font
// swap, which has a budget. Each page loads cold in its own context over a modest network (40 ms round trip, 4 Mbit/s),
// fonts and images loading normally, and the guard waits for the scripts that reveal controls after load.
// - The font swap (director's decision, 2026-11-06: font-display: swap stays). A shift is the swap when the browser
//   reported it in a frame that first drew a newly loaded web face (from the requestAnimationFrame callback that first
//   sees the face loaded to the next callback: the browser reports a frame's shifts after that frame's callbacks), and
//   the swap accounts for every node it moved. To check that, once the page has settled, the face is replaced again by
//   a stand-in with the source and metrics of the face its stack falls back to during the swap (the metric-matched
//   fallbacks in 01-fonts.css), with the faces that loaded later replaced too, and each moved node must move back by the
//   distance the browser reported: x and y for an element, y for text (the browser reports a text node's line box).
//   Font-swap shifts are WP1's (the fallback metrics). Their total in one load (one page at one width and theme) is
//   tolerated up to FONT_SWAP_BUDGET, 0.02 (GUARD_FONT_SWAP_BUDGET overrides it), and printed as a NOTE; above the
//   budget they fail as a WP1 finding.
// - Every other shift fails at any CLS above 0 (spec §5 row 39), and every owner whose elements moved is named. Each
//   shift is attributed to the owner of the elements that moved: the shell's elements, or main moving as a whole
//   (something above it changed size), to WP2; otherwise the first element that belongs to a package other than WP1
//   (WP1's primitives usually move because of what is around them); otherwise WP1. A shift in a font-swap frame that
//   the swap does not account for (something else changed in the same frame) is one of these, marked as such.
// The per-page table and the JSON report (GUARD_REPORT) give both numbers for every load: non-font CLS (the largest
// session window of the other shifts) and font-swap CLS (the sum of the swap's shifts).
// On this network the font preloads usually arrive before the first paint; --font-hold <ms> (GUARD_FONT_HOLD) holds the
// web fonts back that much longer, so they always swap in after it: a diagnostic of the fallback metrics, with the same
// budget. scripts/lib/perf-probe.mjs measures loading under heavier throttling. Filters and the per-page report:
// scripts/lib/guard.mjs.
import { runGuard } from './lib/guard.mjs';

const network = { offline: false, latency: 40, downloadThroughput: 500000, uploadThroughput: 250000 };
const threshold = 0;
const FONT_SWAP_BUDGET = 0.02;
const fontSwapBudget = Number(process.env.GUARD_FONT_SWAP_BUDGET || FONT_SWAP_BUDGET);
if (!(fontSwapBudget >= 0)) throw new Error(`layout-shift: GUARD_FONT_SWAP_BUDGET must be a number of 0 or more, not "${process.env.GUARD_FONT_SWAP_BUDGET}"`);
const holdIndex = process.argv.indexOf('--font-hold');
const fontHold = Number(holdIndex >= 0 ? process.argv[holdIndex + 1] : process.env.GUARD_FONT_HOLD || 0);

// Init script: every layout shift with the nodes it moved, and the frames that first drew a newly loaded web face.
function recordShifts() {
  window.__guardShifts = [];
  window.__guardFontFrames = [];
  // Only the real faces: the local fallback faces load too.
  const real = face => !/Fallback/.test(face.family);
  const seen = new WeakSet();
  let open = null;
  const tick = () => {
    const now = performance.now();
    if (open) open.end = now;
    open = null;
    const fresh = [];
    document.fonts.forEach(face => { if (face.status === 'loaded' && real(face) && !seen.has(face)) { seen.add(face); fresh.push(face); } });
    if (fresh.length) window.__guardFontFrames.push(open = { start: now, end: Infinity, faces: fresh });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      const sources = entry.sources.filter(source => source.node).map(({ node, previousRect, currentRect }) => ({ node, previous: previousRect, current: currentRect }));
      window.__guardShifts.push({ value: entry.value, startTime: entry.startTime, sources });
    }
  }).observe({ type: 'layout-shift', buffered: true });
}

// In the page, once it has settled: each shift with its owner and whether it is the font swap (see the header).
async function classifyShifts() {
  const frames = window.__guardFontFrames;
  const shifts = window.__guardShifts.map(shift => ({ ...shift, frame: frames.findIndex(frame => shift.startTime >= frame.start && shift.startTime < frame.end), fontSwap: false }));
  const suspects = shifts.filter(shift => shift.frame >= 0);
  if (suspects.length) {
    const unquote = name => name.trim().replace(/^["']|["']$/g, '');
    const rules = [];
    const collect = list => { for (const rule of list) { if (rule instanceof CSSFontFaceRule) rules.push(rule); else if (rule.cssRules) collect(rule.cssRules); } };
    for (const sheet of document.styleSheets) { try { collect(sheet.cssRules); } catch {} }
    // The families that follow each swapped family in a font-family stack: what the swap period shows.
    const families = new Set(frames.flatMap(frame => frame.faces.map(face => unquote(face.family))));
    const after = new Map();
    for (const element of document.querySelectorAll('*')) {
      if (after.size === families.size) break;
      const stack = getComputedStyle(element).fontFamily.split(',').map(unquote);
      for (const family of families) if (!after.has(family) && stack.includes(family)) after.set(family, stack.slice(stack.indexOf(family) + 1));
    }
    // A stand-in for a face: its family, style, weights and unicode range, with the source and metric overrides of the
    // first family after it that loads (an @font-face rule of that family, in the face's style if it has one, else the
    // local font of that name). A face whose family no element uses needs none (undefined); null means none loaded.
    const overrides = [['sizeAdjust', 'size-adjust'], ['ascentOverride', 'ascent-override'], ['descentOverride', 'descent-override'], ['lineGapOverride', 'line-gap-override']];
    const standIn = async face => {
      if (!after.has(unquote(face.family))) return undefined;
      for (const name of after.get(unquote(face.family))) {
        if (/^(serif|sans-serif|monospace|cursive|fantasy|math|emoji|fangsong|system-ui|ui-[a-z-]+)$/.test(name)) break;
        const family = rules.filter(rule => unquote(rule.style.getPropertyValue('font-family')) === name);
        const rule = family.find(rule => (rule.style.getPropertyValue('font-style') || 'normal') === face.style) || family[0];
        const descriptors = { style: face.style, weight: face.weight, stretch: face.stretch, unicodeRange: face.unicodeRange };
        for (const [key, property] of overrides) if (rule?.style.getPropertyValue(property)) descriptors[key] = rule.style.getPropertyValue(property);
        try {
          const font = new FontFace(face.family, rule ? rule.style.getPropertyValue('src') : `local("${name}")`, descriptors);
          await font.load();
          return font;
        } catch {}
      }
      return null;
    };
    const standIns = new Map();
    for (const frame of frames) for (const face of frame.faces) standIns.set(face, await standIn(face));
    // Text is measured by its first line, as the browser reports it; both rects are clipped to the viewport's top and
    // left edges, as the browser clips the ones it reports.
    const live = suspects.flatMap(shift => shift.sources).filter(source => source.node.isConnected);
    const position = node => {
      if (node.nodeType === 1) return node.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getBoundingClientRect();
    };
    const measure = () => new Map(live.map(source => { const rect = position(source.node); return [source, { x: Math.max(0, rect.x), y: Math.max(0, rect.y) }]; }));
    // From the settled page back to the first frame: before frame k, the faces of frame k and of every later frame are
    // their stand-ins. A stand-in added to document.fonts takes precedence over the page's face at once.
    const states = [];
    const added = [];
    let current = measure(), exact = true;
    for (let k = frames.length - 1; k >= 0; k--) {
      for (const face of frames[k].faces) {
        const font = standIns.get(face);
        if (font) { document.fonts.add(font); added.push(font); } else if (font === null) exact = false;
      }
      const before = measure();
      states[k] = { before, after: current, exact };
      current = before;
    }
    for (const font of added) document.fonts.delete(font);
    const close = (reported, replayed) => Math.abs(reported - replayed) <= Math.max(2, Math.abs(reported) / 10);
    const visible = rect => rect.width > 0 || rect.height > 0;
    for (const shift of suspects) {
      const { before, after, exact } = states[shift.frame];
      const compared = shift.sources.filter(source => after.has(source) && visible(source.previous) && visible(source.current));
      shift.fontSwap = exact && compared.length > 0 && compared.every(source => {
        const was = before.get(source), is = after.get(source);
        return close(source.current.y - source.previous.y, is.y - was.y) && (source.node.nodeType !== 1 || close(source.current.x - source.previous.x, is.x - was.x));
      });
    }
  }
  return shifts.map(({ value, startTime, sources, frame, fontSwap }) => {
    const nodes = sources.map(source => source.node);
    // main moving as a whole means something above it (the shell: header, entrance, Replay) changed size.
    const wholeMain = nodes.some(node => node.nodeType === 1 && node.matches('main'));
    const owners = nodes.map(node => (node.nodeType === 1 && node.matches('main') ? 'WP2' : window.__guardOwner(node)));
    return {
      value, startTime: Math.round(startTime), fontSwap,
      owner: fontSwap ? 'WP1' : owners.includes('WP2') ? 'WP2' : owners.find(owner => owner !== 'WP1') || (owners.length ? 'WP1' : window.__guardPageOwner),
      cause: fontSwap ? 'font swap' : [wholeMain && 'main moved as a whole', frame >= 0 && 'in a font-swap frame, not the swap'].filter(Boolean).join('; '),
      nodes: nodes.slice(0, 3).map(node => window.__guardName(node))
    };
  });
}

async function load(page, url, owner) {
  if (fontHold) {
    await page.route('**/*.woff2', async route => {
      await new Promise(resolve => setTimeout(resolve, fontHold));
      return route.continue();
    });
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', network);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(owner => { window.__guardPageOwner = owner; return document.fonts.ready; }, owner);
  await page.waitForTimeout(1500);
  return page.evaluate(classifyShifts);
}

// The largest session window (shifts less than 1 s apart, at most 5 s long), as the browser's CLS.
function sessionCls(shifts) {
  let best = 0, current = 0, start = 0, last = -Infinity;
  for (const { value, startTime } of shifts) {
    if (startTime - last > 1000 || startTime - start > 5000) { current = 0; start = startTime; }
    current += value; last = startTime; best = Math.max(best, current);
  }
  return best;
}

const describe = list => list.map(shift => `${shift.value.toFixed(4)} at ${shift.startTime} ms${shift.cause ? ` (${shift.cause})` : ''} [${shift.nodes.join(', ')}]`).join('; ');

await runGuard('layout-shift', async (page, { entry, base }) => {
  const shifts = await load(page, `${base}/${entry.page}.html`, entry.owner);
  const swap = shifts.filter(shift => shift.fontSwap);
  const other = shifts.filter(shift => !shift.fontSwap);
  const nonFontCls = sessionCls(other);
  const fontSwapCls = swap.reduce((sum, shift) => sum + shift.value, 0);
  const findings = [];
  if (nonFontCls > threshold) {
    const byOwner = {};
    for (const shift of other) (byOwner[shift.owner] ||= []).push(shift);
    for (const [owner, list] of Object.entries(byOwner)) findings.push({ owner, message: `non-font CLS ${nonFontCls.toFixed(4)}; ${owner}'s shifts: ${describe(list)}` });
  }
  const budget = `the font-swap budget of ${fontSwapBudget}`;
  if (fontSwapCls > fontSwapBudget) findings.push({ owner: 'WP1', message: `font-swap CLS ${fontSwapCls.toFixed(4)}, over ${budget}; shifts: ${describe(swap)}` });
  const notes = swap.length && fontSwapCls <= fontSwapBudget ? [`font-swap CLS ${fontSwapCls.toFixed(4)}, within ${budget}: ${describe(swap)}`] : [];
  return { findings, metrics: { nonFontCls, fontSwapCls }, notes };
}, {
  freshContext: true,
  contextOptions: { init: recordShifts },
  metrics: { nonFontCls: 'non-font CLS', fontSwapCls: 'font-swap CLS' },
  settings: { threshold, fontSwapBudget, fontHold }
});
