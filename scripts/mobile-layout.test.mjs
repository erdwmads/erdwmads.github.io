import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptsDir, "..");
const readCss = (name) => fs.readFileSync(path.join(root, "public", "assets", "css", name), "utf8");

const shellCss = readCss("shell-evolution.css");
const researchCss = readCss("research-log-evolution.css");
const legacyCss = readCss("style.css");
const homeHtml = fs.readFileSync(path.join(root, "src", "legacy", "index-main.html"), "utf8");
const legacyShell = fs.readFileSync(path.join(root, "src", "components", "LegacyShell.astro"), "utf8");
const siteSource = fs.readFileSync(path.join(root, "src", "data", "site.ts"), "utf8");
const ambientScript = fs.readFileSync(path.join(root, "public", "assets", "js", "ambient-space.js"), "utf8");
const themeScript = fs.readFileSync(path.join(root, "public", "assets", "js", "theme.js"), "utf8");
const interfaceScript = fs.readFileSync(path.join(root, "public", "assets", "js", "interface-2046.js"), "utf8");
const legacyNavigationScript = fs.readFileSync(path.join(root, "public", "assets", "js", "legacy-navigation.js"), "utf8");

test("mobile navigation uses one in-flow layout for every pointer type", () => {
  assert.doesNotMatch(shellCss, /\(hover:\s*hover\).*\(pointer:\s*fine\)/);
  assert.doesNotMatch(
    shellCss,
    /html\.mobile-nav-open body \.header-actions\s*\{[^}]*position:\s*absolute/is
  );
  assert.match(
    shellCss,
    /@media \(max-width:\s*760px\)[\s\S]*?html\.mobile-nav-open body \.header-actions\s*\{[^}]*display:\s*grid\s*!important[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/is
  );
});

test("mobile header is a flat visual boundary instead of a decorated card", () => {
  const start = shellCss.lastIndexOf("/* mobile-flat-header */");
  const end = shellCss.lastIndexOf("/* wider-mobile-nav-grid */");
  const flatHeader = shellCss.slice(start, end);

  assert.ok(start >= 0 && end > start, "missing final mobile flat-header ownership block");
  assert.match(flatHeader, /body \.site-header::before\s*\{[^}]*display:\s*none\s*!important/is);
  assert.match(
    flatHeader,
    /html:not\(\[data-theme="space"\]\):not\(\[data-theme-space\]\) body \.site-header\s*\{[^}]*background:\s*#edf3f6\s*!important/is
  );
  assert.match(
    flatHeader,
    /html\[data-theme="space"\] body \.site-header,[\s\S]*?html\[data-theme-space\] body \.site-header\s*\{[^}]*background:\s*#07111d\s*!important/is
  );
  assert.match(
    flatHeader,
    /html\.mobile-nav-open body \.header-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important[^}]*border-radius:\s*0\s*!important[^}]*background:\s*transparent\s*!important[^}]*box-shadow:\s*none\s*!important/is
  );
  assert.match(
    flatHeader,
    /html\.mobile-nav-open body \.header-actions \.nav\s*\{[^}]*border-radius:\s*0\s*!important[^}]*background:\s*transparent\s*!important[^}]*box-shadow:\s*none\s*!important/is
  );
  assert.match(
    flatHeader,
    /html\.mobile-nav-open body \.header-actions \.nav a\[aria-current="page"\]\s*\{[^}]*background:\s*transparent\s*!important[^}]*box-shadow:\s*inset 0 -2px/is
  );
  assert.match(
    flatHeader,
    /html\.mobile-nav-open body \.header-actions > \.nav-log-gate,[\s\S]*?html\.mobile-nav-open body \.header-actions > \.theme-toggle\s*\{[^}]*grid-column:\s*auto\s*!important/is
  );
});

test("compact phones keep readable two-column navigation and wider phones may use three columns", () => {
  assert.match(
    shellCss,
    /@media \(max-width:\s*760px\)[\s\S]*?html\.mobile-nav-open body \.header-actions \.nav\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/is
  );
  assert.match(shellCss, /@media \(min-width:\s*400px\) and \(max-width:\s*760px\)/);
  assert.match(
    shellCss,
    /@media \(min-width:\s*400px\) and \(max-width:\s*760px\)[\s\S]*?\.header-actions \.nav\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*!important/is
  );
});

test("graduation title fits phones without breaking inside words", () => {
  assert.doesNotMatch(
    legacyCss,
    /body\.ui-page-research-graduation[^{}]*h1\s*\{[^}]*overflow-wrap:\s*anywhere/is
  );
  assert.match(
    researchCss,
    /@media \(max-width:\s*760px\)[\s\S]*?research-graduation-page > section:first-child h1\s*\{[^}]*font-size:\s*28px\s*!important[^}]*overflow-wrap:\s*normal\s*!important/is
  );
  assert.match(
    researchCss,
    /@media \(max-width:\s*360px\)[\s\S]*?research-graduation-page > section:first-child h1\s*\{[^}]*font-size:\s*25px\s*!important/is
  );
});

test("light mode lowers mobile background interference behind body copy", () => {
  assert.match(
    shellCss,
    /@media \(max-width:\s*760px\)[\s\S]*?html:not\(\[data-theme="space"\]\):not\(\[data-theme-space\]\) body::before\s*\{[^}]*opacity:\s*\.1[0-4]\s*!important/is
  );
  assert.match(
    shellCss,
    /html:not\(\[data-theme="space"\]\):not\(\[data-theme-space\]\) body :is\(\.lead, \.muted\)\s*\{[^}]*color:\s*#405367\s*!important/is
  );
});

test("home hero becomes a compact responsive information grid on phones", () => {
  const start = shellCss.lastIndexOf("/* mobile-home-compact-grid */");
  const compactHome = shellCss.slice(start);

  assert.ok(start >= 0, "missing mobile home compact-grid ownership block");
  assert.match(
    compactHome,
    /@media \(max-width:\s*760px\)[\s\S]*?body\.ui-page-home \.hero > div:first-child\s*\{[^}]*display:\s*grid\s*!important[^}]*grid-template-columns:\s*1fr\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero :is\(\.lead, \.muted\)\s*\{[^}]*font-size:\s*\.9rem\s*!important[^}]*line-height:\s*1\.5\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero \.pills\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero > \.hero-card\s*\{[^}]*display:\s*grid\s*!important[^}]*grid-template-columns:\s*minmax\(0,\s*240px\) minmax\(116px,\s*1fr\)\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero-card \.avatar\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero-card \.avatar img\s*\{[^}]*object-fit:\s*contain\s*!important[^}]*object-position:\s*center\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero > \.hero-card\s*\{[^}]*width:\s*min\(100%,\s*520px\)\s*!important[^}]*margin:\s*16px auto 0\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero-card \.affiliation-card\s*\{[^}]*justify-content:\s*center\s*!important[^}]*border:\s*0\s*!important[^}]*background:\s*transparent\s*!important[^}]*font-size:\s*\.9rem\s*!important/is
  );
  assert.match(
    compactHome,
    /@media \(min-width:\s*400px\) and \(max-width:\s*760px\)[\s\S]*?body\.ui-page-home \.hero > div:first-child\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero \.lead\s*\{[^}]*grid-column:\s*1\s*!important/is
  );
  assert.match(
    compactHome,
    /body\.ui-page-home \.hero \.muted\s*\{[^}]*grid-column:\s*2\s*!important/is
  );
});

test("home profile uses only the Mineralogy Laboratory logo", () => {
  assert.match(homeHtml, /class="affiliation-emblem"/);
  assert.match(homeHtml, /assets\/img\/affiliation\/mineralogy-laboratory-logo\.png/);
  assert.doesNotMatch(homeHtml, /waseda-mineralogy-emblem/);
  assert.doesNotMatch(homeHtml, /affiliation-lockup__logo/);

  assert.ok(
    fs.existsSync(path.join(root, "public", "assets", "img", "affiliation", "mineralogy-laboratory-logo.png")),
    "missing Mineralogy Laboratory logo asset"
  );

  assert.match(
    shellCss,
    /body\.ui-page-home \.affiliation-emblem\s*\{[^}]*display:\s*grid[^}]*place-items:\s*center/is
  );
  assert.match(
    shellCss,
    /body\.ui-page-home \.affiliation-emblem img\s*\{[^}]*object-fit:\s*contain/is
  );
});

test("small mobile controls avoid compositor-heavy motion that produces white streaks", () => {
  const start = shellCss.lastIndexOf("/* stable-mobile-controls */");
  const stableControls = shellCss.slice(start);

  assert.ok(start >= 0, "missing stable mobile controls block");
  assert.match(stableControls, /@media \(max-width:\s*760px\),\s*\(hover:\s*none\) and \(pointer:\s*coarse\)/i);
  assert.match(stableControls, /body :is\([^)]+\.pill[^)]+\.button[^)]+\)\s*\{[^}]*backdrop-filter:\s*none\s*!important/is);
  assert.match(stableControls, /body :is\([^)]+\.pill[^)]+\.button[^)]+\)\s*\{[^}]*transform:\s*none\s*!important/is);
  assert.match(stableControls, /body\.ui-page-home \.hero \.pills \.pill,[\s\S]*?body\.ui-page-home \.hero \.button-row \.button\s*\{[^}]*backdrop-filter:\s*none\s*!important/is);
  assert.match(stableControls, /body\.ui-page-home \.hero :is\(\.pill, \.button\)::before\s*\{[^}]*display:\s*none\s*!important/is);
  assert.match(stableControls, /body :is\([^)]+\.hero-card[^)]+\.card[^)]+\):hover\s*\{[^}]*transform:\s*none\s*!important/is);
});

test("first visit starts in Space Mode while preserving an explicit saved choice", () => {
  assert.match(legacyShell, /<html lang="en" data-theme="space" data-theme-space>/);
  assert.match(legacyShell, /if \(savedTheme === "light"\)/);
  assert.match(legacyShell, /catch \(error\)\s*\{[\s\S]*?setAttribute\("data-theme", "space"\)/);
  assert.match(themeScript, /function initialTheme\(\)[\s\S]*?if \(saved === "space" \|\| saved === "light"\) return saved;[\s\S]*?return "space";/);
});

test("soft navigation does not reload versioned common scripts", () => {
  assert.ok(legacyNavigationScript.includes('const normalizedSrc = src.split(/[?#]/, 1)[0];'));
  assert.ok(legacyNavigationScript.includes("if (commonScripts.has(normalizedSrc)) return;"));
  assert.match(siteSource, /assets\/js\/legacy-navigation\.js\?v=20260901-theme-toggle/);
});

test("Edge keeps the ambient particle layer mounted across visibility changes", () => {
  const teardownStart = interfaceScript.indexOf("function beginEdgeTeardown");
  const teardownEnd = interfaceScript.indexOf("function restoreEdgeTeardown");
  const edgeTeardown = interfaceScript.slice(teardownStart, teardownEnd);

  assert.ok(teardownStart >= 0 && teardownEnd > teardownStart, "missing Edge teardown functions");
  assert.doesNotMatch(edgeTeardown, /ambient-space-layer/);
  assert.doesNotMatch(interfaceScript, /visibilitychange[\s\S]{0,240}beginEdgeTeardown/);
  assert.doesNotMatch(legacyCss, /html\.is-edge-page-exiting \.ambient-space-layer/);
  assert.match(
    ambientScript,
    /function initAmbientSpace\(\)[\s\S]*?if \(existing && existing\.querySelector\("\.ambient-dust"\)\) \{[\s\S]*?return;[\s\S]*?\}/
  );
  assert.match(
    shellCss,
    /html\.is-edge-browser \.ambient-space-layer\s*\{[^}]*transform:\s*translate3d\(0,\s*0,\s*0\)\s*!important[^}]*backface-visibility:\s*hidden\s*!important/is
  );
});

test("ambient particles keep continuous positions at animation boundaries", () => {
  const dustStart = legacyCss.lastIndexOf("@keyframes ambientDustMove");
  const pebbleStart = legacyCss.lastIndexOf("@keyframes ambientPebbleMove");
  const dustFrames = legacyCss.slice(dustStart, pebbleStart);
  const pebbleFrames = legacyCss.slice(pebbleStart, legacyCss.indexOf("/*", pebbleStart));

  assert.ok(dustStart >= 0 && pebbleStart > dustStart, "missing final ambient keyframes");
  assert.doesNotMatch(ambientScript, /animationiteration/);
  assert.doesNotMatch(dustFrames, /opacity:\s*0\s*;/);
  assert.doesNotMatch(pebbleFrames, /opacity:\s*0\s*;/);
  assert.match(
    legacyCss,
    /\.ambient-dust,\s*\.ambient-pebble\s*\{[^}]*animation-direction:\s*alternate\s*!important/is
  );
  assert.match(legacyShell, /assets\/css\/style\.css\?v=20260901-continuity/);
  assert.match(siteSource, /assets\/js\/ambient-space\.js\?v=20260901-continuity/);
});
