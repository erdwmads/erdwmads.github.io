// Source-level checks for the Home, header and phone-control decisions of October 2026 and the Folio 2046 shell:
// no Home navigation entry, grouped links, the Menu button (R5), a labelled long-term question, phone controls in
// the footer rather than floating (R3), and the Home SEO signals. check-site.mjs verifies the built pages; the
// browser tests verify layout, and scripts/style-contract/shell.mjs the stylesheet rules.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { exists, readShell } from "./lib/site-paths.mjs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const site = read("../src/data/site.ts");
// The shell with its header and footer parts in place (SiteShell, SiteHeader, SiteFooter).
const shell = readShell().replace(/\r\n/g, "\n");
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

test("the phone menu button shows the word Menu and names its action (R5)", () => {
  assert.match(shell, /<button\s+class="nav-toggle"[^>]*aria-label="Open menu"[^>]*>\s*<span class="nav-toggle__icon" aria-hidden="true"><\/span>\s*<span class="nav-toggle__label">Menu<\/span>/);
  const controller = read("../public/assets/js/site-header.js");
  assert.match(controller, /open \? "Close menu" : "Open menu"/);
  assert.doesNotMatch(controller, /(Open|Close) navigation/);
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
  // With its caption number (the Home opening of 2026-11-28 numbers the four kickers 01 to 04).
  assert.match(index, /<CurrentFocus number="02" \/>/);
  assert.doesNotMatch(index, /current-focus-section/);
  assert.doesNotMatch(read("../src/components/ContinueReading.astro"), /\bhome:\[/);
  assert.match(index, /class="ledger home-explore-list"/);
  assert.match(read("../src/data/home.ts"), /href: "ryugu-bennu\.html"/);
});

// Moved from mobile-layout.test.mjs.
test("home profile uses only the Mineralogy Laboratory logo", () => {
  const homeMarkup = read("../src/pages/index.astro");
  assert.match(homeMarkup, /class="affiliation-emblem"/);
  assert.match(homeMarkup, /assets\/img\/affiliation\/mineralogy-laboratory-logo\.png/);
  assert.doesNotMatch(homeMarkup, /waseda-mineralogy-emblem/);
  assert.doesNotMatch(homeMarkup, /affiliation-lockup__logo/);
  assert.ok(exists("public/assets/img/affiliation/mineralogy-laboratory-logo.png"), "missing Mineralogy Laboratory logo asset");
});

// Replay entrance moves to the footer on phones, where the fixed button and the effects dock are hidden
// (style-contract/shell.mjs, arrival-focus, reading-ui); the one effects panel moves into the sheet after the theme
// toggle, as on the old site (R3 amended, owner decision E136), and never into a copy.
test("phones keep floating controls off the reading column", () => {
  assert.match(shell, /<button class="footer-replay" type="button" data-arrival-replay hidden>Replay entrance<\/button>/);
  assert.match(read("../src/scripts/arrival/entry.js"), /document\.querySelectorAll\('\[data-arrival-replay\]'\)/);
  const observatory = read("../public/assets/js/observatory-interactions.js");
  assert.match(observatory, /<fieldset id="obs-fx-panel" class="obs-fx-panel" hidden>/);
  assert.match(observatory, /const sheet = document\.querySelector\('\[data-mobile-nav\]'\);/);
  assert.match(observatory, /themeToggle \? themeToggle\.after\(panel\) : sheet\.appendChild\(panel\)/);
  assert.match(observatory, /root\.hasAttribute\('data-nav-ready'\)/, "a page without the header controller keeps the dock");
  assert.doesNotMatch(observatory, /cloneNode/, "never a second panel");
});
