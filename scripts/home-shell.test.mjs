// Source-level checks for the Home, header and phone-control decisions of October 2026:
// no Home navigation entry, grouped links, a labelled long-term question, phone controls in the sheet and footer,
// and the Home SEO signals. check-site.mjs verifies the built pages; the browser tests verify layout.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const site = read("../src/data/site.ts");
const shell = read("../src/components/LegacyShell.astro");
const navBlock = site.slice(site.indexOf("export const navItems"), site.indexOf("] as const;", site.indexOf("export const navItems")));
const description = (page) => (read(`../src/pages/${page}.astro`).match(/description='([^']*)'/) || [])[1];

test("navigation has no Home entry and groups research pages before personal pages", () => {
  assert.doesNotMatch(navBlock, /label: "Home"/);
  const groups = [...navBlock.matchAll(/group: "(research|personal)"/g)].map((match) => match[1]);
  assert.deepEqual(groups, ["research", "research", "research", "research", "personal", "personal", "personal"]);
  assert.match(shell, /<span class="nav__divider" aria-hidden="true"><\/span>/);
  // The brand is the way home; its accessible name is all of its visible text plus ", home" (no aria-label).
  assert.match(shell, /<a class="brand" href=\{brand\.homeHref\}>\s*<strong>\{brand\.name\}<\/strong>\s*<span set:html=\{brand\.tagline\} \/>\s*<span class="visually-hidden">, home<\/span>\s*<\/a>/);
});

test("the footer labels the overarching question as long-term", () => {
  assert.match(site, /"Long-term question: What was responsible for making diverse planets in the Solar System\?"/);
  assert.match(shell, /footer-question__label/);
});

test("Home metadata: title, short descriptions, root canonical and structured data", () => {
  assert.match(site, /export const homeTitle = "Astromineralogy Research Archive \| I\. Mads Lieu";/);
  assert.match(read("../src/pages/index.astro"), /title=\{homeTitle\}/);
  for (const page of ["index", "cv", "contact"]) {
    const text = description(page);
    assert.ok(text && [...text].length <= 155, `${page}: description is ${text && [...text].length} characters`);
  }
  assert.match(shell, /canonicalPath\.replace\(\/\(\^\|\\\/\)index\\\.html\$\/, "\$1"\)/);
  assert.match(site, /"@type": "ProfilePage"/);
  assert.match(site, /"@type": "WebSite"/);
  assert.match(shell, /JSON\.stringify\(homeStructuredData\)/);
  const sitemap = read("../src/pages/sitemap.xml.ts");
  assert.doesNotMatch(sitemap, /<lastmod>|<changefreq>/);
});

test("Home renders Current Focus as a component and skips Continue exploring", () => {
  const index = read("../src/pages/index.astro");
  assert.match(index, /<CurrentFocus \/>/);
  assert.doesNotMatch(read("../src/legacy/index-main.html"), /current-focus-section/);
  assert.doesNotMatch(read("../src/components/ContinueReading.astro"), /\bhome:\[/);
  assert.match(read("../src/legacy/index-explore.html"), /<ul class="home-explore-list">[\s\S]*href="ryugu-bennu\.html"/);
});

test("phones keep floating controls off the reading column", () => {
  const css = read("../public/assets/css/home-shell.css");
  const phone = css.slice(css.indexOf("@media (max-width: 760px) {\n  html[data-theme] body#academic-site #arrival-replay"));
  assert.match(phone, /#arrival-replay \{ display: none !important; \}/);
  // Only once the header controller is ready; a failed controller keeps the dock, since that sheet cannot close.
  assert.match(phone, /html\[data-nav-ready\]\[data-theme\] body#academic-site \.obs-fx-dock \{ display: none !important; \}/);
  assert.match(read("../public/assets/js/observatory-interactions.js"), /compactDock\.matches && sheet && root\.hasAttribute\('data-nav-ready'\)/);
  assert.match(phone, /\.header-actions > \.obs-fx-panel \{/);
  assert.match(site, /"home-shell\.css"\s*\] as const;/, "home-shell.css is the last public stylesheet (only the src/ component stylesheets follow it)");
  const observatory = read("../public/assets/js/observatory-interactions.js");
  assert.match(observatory, /matchMedia\('\(max-width: 760px\)'\)/);
  assert.match(observatory, /document\.querySelector\('\[data-mobile-nav\]'\)/);
  assert.match(observatory, /sheet\.appendChild\(panel\)/);
  const entry = read("../src/scripts/arrival/entry.js");
  assert.match(entry, /document\.querySelectorAll\('\[data-arrival-replay\]'\)/);
  assert.match(shell, /<button class="footer-replay" type="button" data-arrival-replay hidden>Replay entrance<\/button>/);
});
