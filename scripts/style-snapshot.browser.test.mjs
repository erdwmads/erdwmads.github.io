// Computed-style snapshot: a whole-site safety net for CSS work. It records about 24 layout, typography, colour,
// border and shadow properties for shell and component selectors, in both themes at 1440, 900 and 390 px, and
// compares them with one baseline per area in docs/style-snapshot/<area>.json. The areas follow the Folio 2046 work
// packages (spec §6.6): core (WP1), shell (WP2), research (WP3), features (WP4), collections (WP5), archive (WP6).
// A CSS change that should not change what readers see must pass unchanged; a deliberate visual change is reviewed
// in the printed diff and then recorded by the area's owner with
//   node scripts/style-snapshot.browser.test.mjs --area <area> --write      (or STYLE_SNAPSHOT_AREA / _WRITE=1)
// Without --area every area is checked. docs/style-snapshot/before-2026-11.json is the single-file baseline of the
// site before the rebuild, kept read-only for reference.
// Runs through scripts/run-browser-tests.mjs (SITE_TEST_URL or TEST_BASE_URL, PLAYWRIGHT_MODULE, EDGE_EXECUTABLE), or
// on its own, when it serves dist/ itself. The capture is deterministic: FX off, reduced motion, a fixed clock, fonts
// loaded, the entrance skipped, no pointer over the page and no scrolling. The baselines belong to one browser engine
// (Edge/Chromium); text metrics can differ slightly on another machine, so regenerate them rather than hand-edit them.
import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser } from './lib/browser.mjs';
import { fixtureHtml } from './lib/guard.mjs';
import { root } from './lib/site-paths.mjs';
import { serveDist } from './lib/static-server.mjs';

const baselineDir = path.join(root, 'docs', 'style-snapshot');
const args = process.argv.slice(2);
const write = args.includes('--write') || process.env.STYLE_SNAPSHOT_WRITE === '1';
const requested = [...args.flatMap((arg, index) => (args[index - 1] === '--area' ? arg.split(',') : [])), ...(process.env.STYLE_SNAPSHOT_AREA || '').split(',')].map(area => area.trim()).filter(Boolean);

// The core area's page: not a file but the guard fixture rendered on its own (capture()).
const fixturePage = 'primitives';
// Per area: its owner, the pages it is recorded on, and the selectors. The first element matching each selector is
// recorded; a selector that matches nothing on a page is skipped there. The core area (WP1) is defined here; every
// other area lives in its owner's module, scripts/style-snapshot/<area>.mjs, exporting owner, pages and selectors
// (a frozen interface, like the check-site and style-contract modules), so each package rewrites its own selector
// list for the new primitives (spec §6.3) without editing this file.
const areaModules = ['shell', 'research', 'features', 'collections', 'archive'];
const areas = {
  // WP1's primitives alone: the guard fixture (scripts/lib/guard.mjs) rendered as the only content of a page with the
  // bundle and no page class, so no other package's styles reach it and later packages never change this baseline.
  core: {
    owner: 'WP1',
    pages: [fixturePage],
    selectors: ['html', 'body', '.site-skip-link', 'main', '.masthead', '.masthead .kicker', '.kicker__rule', '.masthead h1', '.masthead__lead', '.masthead__meta', '.folio-section', '.folio-section__number', '.folio-section h2', '.folio-section > p:not([class])', '.folio-section a:not([class])', '.button:not(.secondary):not([disabled])', '.button.secondary', '.button[disabled]', '.icon-button', '.quiet-link', '.chip', '.marker[data-value="in-progress"]', '.marker[data-value="model"]', '.evidence-status', '.evidence-status__tag', '.plate', '.plate__media', '.plate__caption', '.plate__label', '.plate__credit', 'hr', '.ledger', '.ledger li', '.ledger__key', '.data-table', '.data-table th', '.data-table td', 'details', 'summary', 'input[type="search"]']
  }
};
for (const area of areaModules) {
  const { owner, pages, selectors } = await import(`./style-snapshot/${area}.mjs`);
  if (!owner || !Array.isArray(pages) || !Array.isArray(selectors)) throw new Error(`scripts/style-snapshot/${area}.mjs must export owner, pages and selectors`);
  areas[area] = { owner, pages, selectors };
}
const unknown = requested.filter(area => !areas[area]);
if (unknown.length) {
  console.error(`Unknown area ${unknown.join(', ')}; use ${Object.keys(areas).join(', ')}`);
  process.exit(1);
}
const selectedAreas = requested.length ? [...new Set(requested)] : Object.keys(areas);

const themes = ['space', 'light'];
const widths = [1440, 900, 390];
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

async function capture(browser, base, page, selectors, { theme, width }) {
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
  await tab.goto(`${base}/${page === fixturePage ? '404.html' : page}`, { waitUntil: 'load' });
  await tab.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  if (page === fixturePage) {
    await tab.evaluate(html => {
      document.body.className = '';
      document.body.innerHTML = `<a class="site-skip-link" href="#main-content">Skip to content</a><main id="main-content" class="page" tabindex="-1">${html}</main>`;
    }, fixtureHtml);
  }
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
function compress(snapshot, { pages, selectors }) {
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

function diff(expected, actual, { pages, selectors }) {
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

// Each page is loaded once per theme and width, with the selectors of every selected area that records it.
const plan = new Map();
for (const area of selectedAreas) for (const page of areas[area].pages) plan.set(page, [...new Set([...(plan.get(page) || []), ...areas[area].selectors])]);

const external = (process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || '').replace(/\/$/, '');
const server = external ? null : await serveDist();
const base = external || server.url;
const browser = await launchBrowser();
const actual = {};
try {
  for (const [page, selectors] of plan) {
    actual[page] = {};
    for (const combo of combos) actual[page][combo.key] = await capture(browser, base, page, selectors, combo);
  }
} finally {
  await browser.close();
  await server?.close();
}

const baselineFile = area => path.join(baselineDir, `${area}.json`);
let failed = false;
for (const area of selectedAreas) {
  const spec = areas[area];
  const stored = compress(actual, spec);
  const relative = path.relative(root, baselineFile(area)).replace(/\\/g, '/');
  const count = Object.values(stored).reduce((sum, bySelector) => sum + Object.keys(bySelector).length, 0);
  if (write) {
    const document = {
      about: `Computed-style baseline of the ${area} area (owner ${spec.owner}) for scripts/style-snapshot.browser.test.mjs. Per page and selector: full values at space@1440, then only the properties that differ at the other theme@width combinations; omitted properties have the default value listed in the test. Regenerate with: node scripts/style-snapshot.browser.test.mjs --area ${area} --write (against a fresh build).`,
      area,
      owner: spec.owner,
      properties,
      defaults,
      pages: stored
    };
    // One line per page, selector and theme@width, so a reviewed change shows up as a short diff.
    const text = JSON.stringify(document, null, 1).replace(/\{\n\s+([^{}[\]]*?)\n\s*\}/g, (_match, body) => `{${body.replace(/\n\s*/g, ' ')}}`);
    fs.mkdirSync(baselineDir, { recursive: true });
    fs.writeFileSync(baselineFile(area), `${text}\n`);
    console.log(`Wrote ${relative}: ${spec.pages.length} pages x ${combos.length} theme/width combinations, ${count} page selectors`);
    continue;
  }
  if (!fs.existsSync(baselineFile(area))) {
    console.error(`No baseline at ${relative}; create it with --area ${area} --write`);
    failed = true;
    continue;
  }
  const baseline = JSON.parse(fs.readFileSync(baselineFile(area), 'utf8'));
  const changes = [];
  if (JSON.stringify(baseline.properties) !== JSON.stringify(properties)) changes.push(`property list changed: ${baseline.properties.join(', ')}  ->  ${properties.join(', ')}`);
  changes.push(...diff(expand(baseline.pages), expand(stored), spec));
  if (changes.length) {
    console.error(`${area} (${spec.owner}): computed styles differ from ${relative} in ${changes.length} place(s):`);
    for (const line of changes.slice(0, 250)) console.error(`  ${line}`);
    if (changes.length > 250) console.error(`  ... and ${changes.length - 250} more`);
    console.error(`If every change is intended, record it with: node scripts/style-snapshot.browser.test.mjs --area ${area} --write`);
    failed = true;
    continue;
  }
  console.log(`PASS ${area} (${spec.owner}) matches ${relative}: ${spec.pages.length} pages, ${combos.length} theme/width combinations, ${count} page selectors, ${properties.length} properties`);
}
process.exit(failed ? 1 : 0);
