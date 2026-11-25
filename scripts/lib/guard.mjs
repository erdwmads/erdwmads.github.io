// Shared harness for the site guards (spec §6.5): typography, controls, theme-geometry, interaction-stability,
// evidence-status, layout-shift, first-paint, contrast, reduced-motion, focus-visibility, accessible-names,
// forced-colors, backdrop-contrast and (for its browser only) legibility-gate. It holds the page registry with each page's owner, the page, area, width and theme filters, the
// attribution of every finding to the package that owns the element, and a report per page.
//
// Filters (arguments when a guard runs on its own, environment variables through run-browser-tests.mjs):
//   --pages index,cv      GUARD_PAGES    only these pages (keys as in guardPages)
//   --area research       GUARD_AREA     the pages of these areas (research, features, collections, archive);
//                                        core and shell keep every page. An area also makes its owner strict.
//   --widths 1440,390     GUARD_WIDTHS   --themes light   GUARD_THEMES
//   --owner WP3           FOLIO_OWNER    owners whose findings fail the run now (besides WP1 and the areas' owners)
//   GUARD_REPORT=<file or directory>     also write the per-page results as JSON (in a directory: <guard>.json)
// A finding is attributed to the nearest owner of the element (ownerScript below). Findings of WP1, of a requested
// area and of --owner fail the run; the others are printed as pending for their owner while that owner is still
// rebuilding, the way check-site reports pending entries (scripts/lib/pending.mjs). FOLIO_STRICT=1 fails on every
// finding, as the integration pass does. A guard that stops on a page (the page did not load, or the guard's own
// code threw) fails whoever owns the page, and so does a run that checked no page at all: a guard that measured
// nothing has not passed.
import fs from "node:fs";
import { launchBrowser } from "./browser.mjs";
import { strict, tolerated } from "./pending.mjs";
import { serveDist } from "./static-server.mjs";

// The pages the shell renders, each with the package that rebuilds it (spec §7.2) and its style-snapshot area.
export const guardPages = [
  { page: "index", owner: "WP3", area: "research" },
  { page: "research", owner: "WP3", area: "research" },
  { page: "research-log", owner: "WP3", area: "research" },
  { page: "ryugu-bennu", owner: "WP4", area: "features" },
  { page: "origins-study", owner: "WP4", area: "features" },
  { page: "paper-shelf", owner: "WP5", area: "collections" },
  { page: "photography", owner: "WP5", area: "collections" },
  { page: "cv", owner: "WP5", area: "collections" },
  { page: "contact", owner: "WP5", area: "collections" },
  { page: "404", owner: "WP5", area: "collections" },
  { page: "research-graduation", owner: "WP6", area: "archive" }
];
export const areaOwners = { core: "WP1", shell: "WP2", research: "WP3", features: "WP4", collections: "WP5", archive: "WP6" };

const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : undefined; };
const list = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

export function guardOptions({ widths = [1440, 390], themes = ["space", "light"], pages: defaultPages } = {}) {
  const wanted = list(option("pages") ?? process.env.GUARD_PAGES).map((page) => page.replace(/\.html$/, ""));
  const areas = list(option("area") ?? process.env.GUARD_AREA);
  const unknown = [...areas.filter((area) => !areaOwners[area]), ...wanted.filter((page) => !guardPages.some((entry) => entry.page === page))];
  if (unknown.length) throw new Error(`guard: unknown area or page ${unknown.join(", ")}; areas ${Object.keys(areaOwners).join(", ")}; pages ${guardPages.map((entry) => entry.page).join(", ")}`);
  let pages = defaultPages ? guardPages.filter((entry) => defaultPages.includes(entry.page)) : guardPages;
  if (wanted.length) pages = guardPages.filter((entry) => wanted.includes(entry.page));
  const pageAreas = areas.filter((area) => area !== "core" && area !== "shell");
  if (pageAreas.length) pages = pages.filter((entry) => pageAreas.includes(entry.area));
  const wantedWidths = list(option("widths") ?? process.env.GUARD_WIDTHS).map(Number).filter(Boolean);
  const wantedThemes = list(option("themes") ?? process.env.GUARD_THEMES);
  return {
    pages,
    widths: wantedWidths.length ? wantedWidths : widths,
    themes: wantedThemes.length ? wantedThemes : themes,
    owners: new Set(["WP1", ...areas.map((area) => areaOwners[area]), ...list(option("owner") ?? process.env.FOLIO_OWNER)]),
    // An area this guard has no page in leaves nothing to check; that is a skip, not a pass (finish()).
    areaFiltered: pageAreas.length > 0 && !wanted.length
  };
}

// Runs in the page (installed by newGuardContext): window.__guardOwner(element) names the package that owns the
// element. The nearest match wins, walking up from the element: the skip link is WP1's shell markup; WP1's primitives
// and stand-in fixtures; components with an owner other than their page's (the contents bar and pathway are WP3's
// wherever they appear, the scenes WP4's, the shelf and photographs WP5's, the archive WP6's); the shell (header,
// footer, entrance, FX layers, dock, spine and the onward links) is WP2's. Anything else belongs to the page's owner.
export function ownerScript() {
  const rules = [
    [".site-skip-link", "WP1"],
    [".button, .icon-button, .quiet-link, .evidence-status, .marker, .chip, .pathway-chip, .kicker, .masthead, .folio-section, .plate, .figure, .ledger, .data-table, [data-guard-fixture]", "WP1"],
    [".research-guide, [data-research-guide], .analytical-pathway, [data-analytical-pathway], .pathway-item, .comparison-table", "WP3"],
    ["[data-planetary-explorer], .sample-missions, .origins-study, .image-inspector, [data-image-inspector], .research-scale", "WP4"],
    [".paper-shelf, [data-paper-shelf], .paper-card, .paper-filter, .photo-wall, .obs-presentation", "WP5"],
    [".mission-lightbox, .evidence-atlas, [data-research-lock-gate], .research-notes-section, .mission-index-section, .archive-edition", "WP6"],
    [".site-header, .site-footer, #cosmic-arrival, #arrival-replay, .obs-fx-dock, .obs-fx-panel, .ui2046-layer, .ui2046-rail, .ui2046-progress, .ambient-space-layer, .continue-reading, .research-coordinates", "WP2"]
  ];
  window.__guardOwner = (element) => {
    for (let node = element?.nodeType === 1 ? element : element?.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      for (const [selector, owner] of rules) if (node.matches(selector)) return owner;
    }
    return window.__guardPageOwner || "WP1";
  };
  // A short readable name for an element in messages: tag, id and first two classes.
  window.__guardName = (element) => {
    if (element?.nodeType === 3) return `${window.__guardName(element.parentElement)} text`;
    if (!element || element.nodeType !== 1) return String(element);
    const classes = [...element.classList].slice(0, 2).map((name) => `.${name}`).join("");
    return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${classes}`;
  };
  // Sideways overflow as findings: the outermost visible elements that reach past the viewport, each for its owner.
  window.__guardOverflow = () => {
    const width = document.documentElement.scrollWidth;
    if (width <= innerWidth + 1) return [];
    const wide = new Set([...document.querySelectorAll("body *")].filter((el) => el.getClientRects().length && el.getBoundingClientRect().right > innerWidth + 1));
    const outer = [...wide].filter((el) => !wide.has(el.parentElement)).slice(0, 3);
    return (outer.length ? outer : [document.body]).map((el) => ({ owner: window.__guardOwner(el), message: `page overflows sideways (${width} > ${innerWidth}): ${window.__guardName(el)} reaches ${Math.round(el.getBoundingClientRect().right)} px` }));
  };
}

// The browser and the site under test: SITE_TEST_URL / TEST_BASE_URL from run-browser-tests.mjs, or dist/ served
// here when the guard runs on its own.
export async function openGuardBrowser() {
  const server = process.env.SITE_TEST_URL || process.env.TEST_BASE_URL ? null : await serveDist();
  const base = (process.env.SITE_TEST_URL || process.env.TEST_BASE_URL || server.url).replace(/\/$/, "");
  const browser = await launchBrowser();
  return { browser, base, close: async () => { await browser.close(); if (server) await server.close(); } };
}

// A context for one width and theme: a phone (touch, mobile) at 760 px and below, the entrance skipped, the theme
// stored as theme.js reads it. init is a further init script (a function) that runs before the page's own scripts.
// Extra Playwright context options pass through (reducedMotion, forcedColors, contrast).
export async function newGuardContext(browser, { width, theme, height, init, ...options }) {
  const phone = width <= 760;
  const context = await browser.newContext({ viewport: { width, height: height || (phone ? 844 : 900) }, isMobile: phone, hasTouch: phone, ...options });
  await context.addInitScript((theme) => {
    try {
      sessionStorage.setItem("mads-entry-gate-v1", "done");
      sessionStorage.setItem("mads-cosmic-arrival-v1", "done");
      if (theme) localStorage.setItem("mads-theme", theme);
    } catch {}
  }, theme);
  await context.addInitScript(ownerScript);
  if (init) await context.addInitScript(init);
  // A control an unstyled area leaves unusable fails in seconds, not after Playwright's 30 s default.
  context.setDefaultTimeout(10000);
  context.setDefaultNavigationTimeout(30000);
  return context;
}

// Loads one registry page (suffix: a hash or query to append), records its owner for window.__guardOwner(), waits for
// its fonts and then settle milliseconds for the scripts that run after load.
export async function gotoGuardPage(page, base, entry, { waitUntil = "load", settle = 300, suffix = "" } = {}) {
  await page.goto(`${base}/${entry.page}.html${suffix}`, { waitUntil });
  await page.evaluate((owner) => { window.__guardPageOwner = owner; return document.fonts.ready.then(() => true); }, entry.owner);
  if (settle) await page.waitForTimeout(settle);
}

// Stand-in markup for WP1's primitives (Masthead, Section, buttons, chips and markers, EvidenceStatus, a night model
// Plate, a rule, Ledger, data table, disclosure and a field), as the components render them, so the guards test
// their styles on every page before any page adopts them (the old prism-controls test used the same approach).
// insertFixture() puts it at the top of main; the core style snapshot renders it alone.
export const fixtureHtml = `
<div data-guard-fixture>
<header class="masthead folio">
  <p class="kicker"><span class="kicker__rule" aria-hidden="true"></span>Guard fixture</p>
  <h1 id="guard-fixture-heading">Stand-in masthead</h1>
  <p class="masthead__lead">A lead sentence set in the serif, as on every masthead.</p>
  <p class="masthead__meta tabular">Status as of <time datetime="2026-11-05">2026-11-05</time></p>
</header>
<section class="folio-section folio" aria-labelledby="guard-fixture-title">
  <span class="folio-section__number in-margin">00</span>
  <p class="kicker">Guard fixture</p>
  <h2 id="guard-fixture-title">Stand-in primitives</h2>
  <p>Body text with <a href="#guard-fixture-title">a link</a> and <time datetime="2026-11-05">2026-11-05</time>.</p>
  <p class="cluster">
    <a class="button" href="#guard-fixture-title">Primary action</a>
    <button class="button secondary" type="button">Secondary action</button>
    <button class="button" type="button" disabled>Unavailable</button>
    <button class="icon-button" type="button" aria-label="Copy"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h12v12H4z" fill="none" stroke="currentColor"/></svg></button>
    <a class="quiet-link" href="#guard-fixture-title">Quiet action →</a>
  </p>
  <p class="cluster">
    <span class="chip"><span class="marker" data-marker="status" data-value="in-progress" aria-hidden="true"></span>In progress</span>
    <span class="chip"><span class="marker" data-marker="status" data-value="next" aria-hidden="true"></span>Next</span>
    <span class="chip"><span class="marker" data-marker="status" data-value="planned" aria-hidden="true"></span>Planned</span>
    <span class="chip"><span class="marker" data-marker="status" data-value="interpretation" aria-hidden="true"></span>Interpretation</span>
    <span class="chip"><span class="marker" data-marker="evidence" data-value="model" aria-hidden="true"></span>Illustrative model</span>
  </p>
  <p class="evidence-status" data-evidence-status="literature"><span class="evidence-status__tag">Literature<span class="visually-hidden">:</span></span> <span class="evidence-status__text">Published measurements, not the owner's own.</span></p>
  <figure class="plate" data-ground="night" data-model="">
    <div class="plate__media on-night"><svg viewBox="0 0 16 9" width="100%" role="img" aria-label="Stand-in scene"><rect width="16" height="9" fill="currentColor" opacity=".08"/></svg></div>
    <figcaption class="plate__caption"><span class="plate__title"><span class="plate__label">Plate 0</span> Stand-in scene</span> <span class="plate__credit">Image: guard fixture</span> <p class="evidence-status" data-evidence-status="model"><span class="evidence-status__tag">Illustrative model<span class="visually-hidden">:</span></span> <span class="evidence-status__text">A conceptual figure.</span></p></figcaption>
  </figure>
  <hr>
  <ol class="ledger"><li><span class="ledger__key tabular">01</span> <a href="#guard-fixture-title">Ledger row</a></li><li><span class="ledger__key tabular">02</span> <span>Second row</span></li></ol>
  <table class="data-table"><caption>Stand-in table</caption><thead><tr><th scope="col">Phase</th><th scope="col">Status</th></tr></thead><tbody><tr><td>Dolomite</td><td>Candidate</td></tr></tbody></table>
  <details><summary>Disclosure</summary><p>Disclosure content.</p></details>
  <p><label for="guard-fixture-input">Search</label> <input id="guard-fixture-input" type="search" value="Orgueil"></p>
</section>
</div>`;

export async function insertFixture(page) {
  await page.evaluate((html) => {
    document.querySelector("[data-guard-fixture]")?.remove();
    document.querySelector("main").insertAdjacentHTML("afterbegin", html);
  }, fixtureHtml);
}

// The report: record() per page, width and theme with its findings ({ owner, message }) and, for a guard that measures
// something on every page, its numbers and notes; finish() prints the per-page table and the summary (last, so
// run-browser-tests.mjs keeps it in its report) and sets the exit code. metrics ({ key: label }) names those numbers
// (layout-shift: non-font CLS and font-swap CLS): the table shows each page's largest, and the JSON report holds them
// per row, with settings (the guard's thresholds) at the top.
export function createReport(guard, { owners, areaFiltered = false, metrics = {}, settings }) {
  const rows = [];
  const isFailure = (owner, message) => owners.has(owner) || !tolerated(owner) || /^stopped: /.test(message);
  const format = (value) => (typeof value === "number" ? value.toFixed(4) : String(value));
  const measured = (values = {}) => Object.entries(metrics).filter(([key]) => key in values).map(([key, label]) => `${label} ${format(values[key])}`).join(", ");
  const largest = (list, key) => {
    const values = list.map((row) => row.metrics?.[key]).filter((value) => typeof value === "number");
    return values.length ? Math.max(...values) : undefined;
  };
  const largestText = (list) => Object.entries(metrics).filter(([key]) => largest(list, key) !== undefined).map(([key, label]) => `${label} max ${format(largest(list, key))}`).join(", ");
  return {
    record(entry, width, theme, findings = [], { metrics: values, notes = [] } = {}) {
      const unique = [...new Map(findings.map((finding) => [`${finding.owner} ${finding.message}`, finding])).values()];
      const row = { page: entry.page, pageOwner: entry.owner, width, theme, ...(values ? { metrics: values } : {}), ...(notes.length ? { notes } : {}), findings: unique.map((finding) => ({ ...finding, status: isFailure(finding.owner, finding.message) ? "fail" : "pending" })) };
      rows.push(row);
      const where = `${entry.page} ${width} ${theme}`;
      const numbers = measured(values);
      if (!row.findings.length) console.log(`PASS ${where}${numbers ? ` (${numbers})` : ""}`);
      for (const finding of row.findings) console.log(`${finding.status === "fail" ? "FAIL" : "PENDING"} ${where} [${finding.owner}] ${finding.message}`);
      for (const note of notes) console.log(`NOTE ${where} ${note}`);
    },
    finish() {
      if (!rows.length) {
        console.log(areaFiltered ? `${guard}: SKIPPED, none of this guard's pages is in the selected area` : `${guard}: FAIL, no page was checked (check the --pages, --widths and --themes filters)`);
        if (!areaFiltered) process.exitCode = 1;
        return;
      }
      const all = rows.flatMap((row) => row.findings);
      const failed = all.filter((finding) => finding.status === "fail");
      const pendingCount = {};
      for (const finding of all.filter((item) => item.status === "pending")) pendingCount[finding.owner] = (pendingCount[finding.owner] || 0) + 1;
      console.log(`\n${guard} by page:`);
      for (const pageName of [...new Set(rows.map((row) => row.page))]) {
        const pageRows = rows.filter((row) => row.page === pageName);
        const owners = [...new Set(pageRows.flatMap((row) => row.findings.map((finding) => `${finding.owner}${finding.status === "fail" ? " FAIL" : ""}`)))];
        const clean = pageRows.filter((row) => !row.findings.length).length;
        const numbers = largestText(pageRows);
        console.log(`  ${pageName.padEnd(20)} ${pageRows[0].pageOwner}  ${clean}/${pageRows.length} clean${numbers ? `; ${numbers}` : ""}${owners.length ? `; findings: ${owners.join(", ")}` : ""}`);
      }
      const target = process.env.GUARD_REPORT;
      if (target) fs.writeFileSync(fs.existsSync(target) && fs.statSync(target).isDirectory() ? `${target}/${guard}.json` : target, `${JSON.stringify({ guard, strict, owners: [...owners], ...(settings ? { settings } : {}), ...(Object.keys(metrics).length ? { metrics } : {}), rows }, null, 2)}\n`);
      const pendingText = Object.entries(pendingCount).map(([owner, count]) => `${owner} ${count}`).join(", ");
      const numbers = largestText(rows);
      console.log(`${guard}: ${rows.length} page checks, ${rows.filter((row) => !row.findings.length).length} clean, ${failed.length} failing finding(s)${failed.length ? ` (${[...new Set(failed.map((finding) => finding.owner))].join(", ")})` : ""}, ${all.length - failed.length} pending${pendingText ? ` (${pendingText})` : ""}${numbers ? `; ${numbers}` : ""}`);
      if (failed.length) process.exitCode = 1;
    }
  };
}

// Runs check(page, { entry, width, theme, base, context }) for every selected page, width and theme, each width and
// theme in one context (or a fresh context per page with freshContext), and records the findings it returns: an
// array, or { findings, metrics, notes } from a guard that measures numbers on every page (metrics and settings as in
// createReport). A thrown error is a "stopped:" finding, named for the page's owner and failing the run whoever that
// is (the guard could not measure the page). skip(entry, width, theme) leaves a combination out of the run.
export async function runGuard(guard, check, { widths, themes, pages, contextOptions = {}, freshContext = false, skip = () => false, metrics, settings } = {}) {
  const options = guardOptions({ widths, themes, pages });
  const report = createReport(guard, { ...options, metrics, settings });
  const { browser, base, close } = await openGuardBrowser();
  try {
    for (const width of options.widths) for (const theme of options.themes) {
      let context = freshContext ? null : await newGuardContext(browser, { width, theme, ...contextOptions });
      let page = context && await context.newPage();
      for (const entry of options.pages) {
        if (skip(entry, width, theme)) continue;
        if (freshContext) { context = await newGuardContext(browser, { width, theme, ...contextOptions }); page = await context.newPage(); }
        const errors = [];
        const onError = (error) => errors.push(error.message);
        page.on("pageerror", onError);
        let findings, measured = {};
        try {
          const result = await check(page, { entry, width, theme, base, context });
          if (Array.isArray(result)) findings = result;
          else ({ findings = [], ...measured } = result || {});
        } catch (error) {
          findings = [{ owner: entry.owner, message: `stopped: ${error.message.split("\n")[0]}` }];
        }
        page.off("pageerror", onError);
        for (const message of errors) findings.push({ owner: entry.owner, message: `page error: ${message}` });
        report.record(entry, width, theme, findings, measured);
        if (freshContext) await context.close();
      }
      if (!freshContext) await context.close();
    }
  } finally {
    await close();
  }
  report.finish();
}
