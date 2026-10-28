// Computed-style snapshot: a whole-site safety net for CSS refactors (moving rules between owner files,
// consolidating layers, pruning). It records about 24 layout, typography, colour, border and shadow properties
// for about 45 shell and component selectors on 6 representative pages, in both themes at 1440, 900 and 390 px,
// and compares them with docs/style-snapshot.json. A CSS change that should not change what readers see must
// pass unchanged; a deliberate visual change is reviewed in the printed diff and then recorded with
//   node scripts/style-snapshot.browser.test.mjs --write      (or STYLE_SNAPSHOT_WRITE=1)
// Runs through scripts/run-browser-tests.mjs (SITE_TEST_URL or TEST_BASE_URL, PLAYWRIGHT_MODULE, EDGE_EXECUTABLE).
// The capture is deterministic: FX off, reduced motion, a fixed clock, fonts loaded, the entrance skipped, no
// pointer over the page and no scrolling. The baseline belongs to one browser engine (Edge/Chromium); text
// metrics can differ slightly on another machine, so regenerate it rather than hand-edit it.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(root, 'docs', 'style-snapshot.json');
const base = (process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || 'http://127.0.0.1:52523').replace(/\/$/, '');
const write = process.argv.includes('--write') || process.env.STYLE_SNAPSHOT_WRITE === '1';

const pages = ['index.html', 'research.html', 'research-log.html', 'paper-shelf.html', 'photography.html', 'ryugu-bennu.html'];
const themes = ['space', 'light'];
const widths = [1440, 900, 390];
// The first element matching each selector is recorded; a selector that matches nothing on a page is skipped there.
const selectors = [
  // Shell
  'html', 'body', '.site-skip-link', '.site-header', '.header-inner', '.brand', '.nav', '.nav__links a', '.nav a[aria-current="page"]',
  '.nav-log-gate', '.theme-toggle', '.nav-toggle', 'main', 'main h1', 'main h2', 'main h3', 'main .lead', 'main .eyebrow',
  'main .button:not(.secondary)', 'main .button.secondary', '.continue-reading', '.site-footer', '.footer-inner', '.footer-question',
  '.orcid-link',
  // Home
  '.hero-card', '.focus-card', '.pill', '.mini-timeline-item', '.affiliation-card',
  // Research and Research Log
  '.research-question', '.pathway-item', '.pathway-chip', '.comparison-card', '.research-dashboard', '.status-badge', '.research-log-archive',
  // Paper Shelf
  '.paper-filter', '.paper-group-title', '.paper-card', '.paper-copy',
  // Photography
  '.photo-wall', '.photo-tile',
  // Ryugu & Bennu
  '.research-guide', '.evidence-status', '.mission-workspace', '.planetary-toolbar', '.research-scale__figure'
];
// 'size' is the rounded border-box width x height; html and body record width only (their height is the page length).
const properties = [
  'display', 'position', 'z-index', 'size', 'margin', 'padding', 'gap', 'grid-template-columns',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform',
  'color', 'background-color', 'background-image', 'border-width', 'border-style', 'border-color',
  'border-radius', 'box-shadow', 'opacity', 'backdrop-filter'
];
// Values left out of the baseline to keep it small; a missing property means this value.
const defaults = {
  position: 'static', 'z-index': 'auto', margin: '0px', padding: '0px', gap: 'normal', 'grid-template-columns': 'none',
  'letter-spacing': 'normal', 'text-transform': 'none', 'background-color': 'rgba(0, 0, 0, 0)', 'background-image': 'none',
  'border-width': '0px', 'border-style': 'none', 'border-radius': '0px', 'box-shadow': 'none', opacity: '1', 'backdrop-filter': 'none'
};
const comboKey = (theme, width) => `${theme}@${width}`;
const combos = themes.flatMap(theme => widths.map(width => ({ theme, width, key: comboKey(theme, width) })));

async function capture(browser, page, { theme, width }) {
  const mobile = width < 700;
  const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  await context.clock.setFixedTime(new Date('2026-10-01T12:00:00Z'));
  await context.addInitScript(theme => {
    try {
      sessionStorage.setItem('mads-cosmic-arrival-v1', 'done');
      localStorage.setItem('mads-theme', theme);
      localStorage.setItem('madsAmbientFxEnabled', '0');
    } catch {}
  }, theme);
  const tab = await context.newPage();
  await tab.goto(`${base}/${page}`, { waitUntil: 'load' });
  await tab.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Load every declared face up front: a face that starts loading only when its text is laid out would otherwise
  // swap in after document.fonts.ready and move the layout.
  await tab.evaluate(async () => { await Promise.all([...document.fonts].map(face => face.load().catch(() => {}))); await document.fonts.ready; });
  await tab.mouse.move(0, 0);
  // Wait until the recorded boxes stop moving (late scripts such as the photo row layout), for up to 10 s.
  await tab.evaluate(async selectors => {
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const signature = () => selectors.map(selector => { const rect = document.querySelector(selector)?.getBoundingClientRect(); return rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : '-'; }).join();
    let last = '', stable = 0;
    for (let round = 0; stable < 3 && round < 36; round++) {
      await frame();
      await new Promise(resolve => setTimeout(resolve, 250));
      const now = signature();
      stable = now === last ? stable + 1 : 0;
      last = now;
    }
  }, selectors);
  const result = await tab.evaluate(({ selectors, properties, defaults }) => {
    const out = {};
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const style = getComputedStyle(element);
      const values = {};
      for (const property of properties) {
        let value;
        if (property === 'size') {
          const rect = element.getBoundingClientRect();
          value = element === document.documentElement || element === document.body ? `${Math.round(rect.width)}` : `${Math.round(rect.width)}x${Math.round(rect.height)}`;
        } else value = style.getPropertyValue(property);
        if (defaults[property] === value) continue;
        // The colour of an absent border says nothing.
        if (property === 'border-color' && (style.getPropertyValue('border-style') === 'none' || style.getPropertyValue('border-width') === '0px')) continue;
        values[property] = value;
      }
      out[selector] = values;
    }
    return out;
  }, { selectors, properties, defaults });
  await context.close();
  return result;
}

// Baseline layout: per page and selector, the full values at the first combination (space@1440) and only the
// properties that differ for every other combination.
function compress(snapshot) {
  const out = {};
  for (const page of pages) {
    out[page] = {};
    const present = [...new Set(combos.flatMap(({ key }) => Object.keys(snapshot[page][key] || {})))];
    for (const selector of selectors.filter(item => present.includes(item))) {
      const entry = {};
      const first = snapshot[page][combos[0].key][selector];
      entry[combos[0].key] = first ?? null;
      for (const { key } of combos.slice(1)) {
        const values = snapshot[page][key][selector];
        if (!values || !first) { entry[key] = values ?? null; continue; }
        const changed = {};
        for (const property of new Set([...Object.keys(first), ...Object.keys(values)])) {
          if (first[property] !== values[property]) changed[property] = values[property] ?? defaults[property] ?? '';
        }
        if (Object.keys(changed).length) entry[key] = changed;
      }
      out[page][selector] = entry;
    }
  }
  return out;
}

function expand(stored) {
  const out = {};
  for (const [page, bySelector] of Object.entries(stored)) {
    out[page] = Object.fromEntries(combos.map(({ key }) => [key, {}]));
    for (const [selector, entry] of Object.entries(bySelector)) {
      const first = entry[combos[0].key];
      if (first) out[page][combos[0].key][selector] = first;
      for (const { key } of combos.slice(1)) {
        if (entry[key] === null) continue;
        if (!first) { if (entry[key]) out[page][key][selector] = entry[key]; continue; }
        const values = { ...first, ...(entry[key] || {}) };
        for (const [property, value] of Object.entries(values)) if (value === '' || defaults[property] === value) delete values[property];
        out[page][key][selector] = values;
      }
    }
  }
  return out;
}

function diff(expected, actual) {
  const lines = [];
  for (const page of pages) for (const { key } of combos) {
    const want = expected[page]?.[key] || {}, got = actual[page]?.[key] || {};
    for (const selector of selectors) {
      const a = want[selector], b = got[selector];
      if (!a && !b) continue;
      const where = `${page} ${key} ${selector}`;
      if (!b) { lines.push(`${where}: element no longer found`); continue; }
      if (!a) { lines.push(`${where}: new element (not in the baseline)`); continue; }
      for (const property of properties) {
        const before = a[property] ?? defaults[property] ?? '(none)';
        const after = b[property] ?? defaults[property] ?? '(none)';
        if (property === 'border-color' && (a[property] === undefined || b[property] === undefined)) continue;
        if (before !== after) lines.push(`${where}: ${property}: ${before}  ->  ${after}`);
      }
    }
  }
  return lines;
}

const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const actual = {};
try {
  for (const page of pages) {
    actual[page] = {};
    for (const combo of combos) actual[page][combo.key] = await capture(browser, page, combo);
  }
} finally {
  await browser.close();
}

const stored = compress(actual);
if (write) {
  const document = {
    about: 'Computed-style baseline for scripts/style-snapshot.browser.test.mjs. Per page and selector: full values at space@1440, then only the properties that differ at the other theme@width combinations; omitted properties have the default value listed in the test. Regenerate with: node scripts/style-snapshot.browser.test.mjs --write (against a fresh build).',
    properties,
    defaults,
    pages: stored
  };
  // One line per page, selector and theme@width, so a reviewed change shows up as a short diff.
  const text = JSON.stringify(document, null, 1).replace(/\{\n\s+([^{}[\]]*?)\n\s*\}/g, (_match, body) => `{${body.replace(/\n\s*/g, ' ')}}`);
  fs.writeFileSync(baselinePath, `${text}\n`);
  const count = Object.values(stored).reduce((sum, bySelector) => sum + Object.keys(bySelector).length, 0);
  console.log(`Wrote ${path.relative(root, baselinePath)}: ${pages.length} pages x ${combos.length} theme/width combinations, ${count} page selectors`);
  process.exit(0);
}
if (!fs.existsSync(baselinePath)) {
  console.error(`No baseline at ${path.relative(root, baselinePath)}; create it with --write`);
  process.exit(1);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const changes = [];
if (JSON.stringify(baseline.properties) !== JSON.stringify(properties)) changes.push(`property list changed: ${baseline.properties.join(', ')}  ->  ${properties.join(', ')}`);
changes.push(...diff(expand(baseline.pages), expand(stored)));
if (changes.length) {
  console.error(`Computed styles differ from docs/style-snapshot.json in ${changes.length} place(s):`);
  for (const line of changes.slice(0, 250)) console.error(`  ${line}`);
  if (changes.length > 250) console.error(`  ... and ${changes.length - 250} more`);
  console.error('If every change is intended, record it with: node scripts/style-snapshot.browser.test.mjs --write');
  process.exit(1);
}
const checked = Object.values(stored).reduce((sum, bySelector) => sum + Object.keys(bySelector).length, 0);
console.log(`PASS computed styles match docs/style-snapshot.json: ${pages.length} pages, ${combos.length} theme/width combinations, ${checked} page selectors, ${properties.length} properties`);
