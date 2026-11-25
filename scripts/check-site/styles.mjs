// check-site/styles.mjs (owner WP1): the stylesheet bundle, its manifest and the global CSS guards (spec §2.8,
// §6.5). The manifest (stylesheets in src/data/site.ts) lists every file in src/styles/folio in cascade order; the
// build fails if the two disagree, and these checks hold the built bundle and the pages to the same contract. The
// per-file budgets and bans are the CSS lint (scripts/audit-css.mjs).
import fs from "node:fs";
import path from "node:path";
import { bans, stripComments } from "../lib/css-lint.mjs";
import { cssRules } from "../lib/css-rules.mjs";
import { bundleSources } from "../lib/read-bundle-source.mjs";
import { abs, bundleDist, folioStylesDir, readShell, shell } from "../lib/site-paths.mjs";

// The bundle keeps its string contents ASCII (esbuild escapes the rest as \hex), so decode the escapes before
// looking for mojibake in content declarations.
const decodeCssEscapes = (text) => text.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));

export default async function checkStyles({ root, distDir, publicDir, fail, readDistPage, collectFiles }) {
  const relative = (file) => path.relative(root, file).replace(/\\/g, "/");
  const stylesheets = bundleSources().map(({ file }) => file);
  if (!stylesheets.length) fail("site.ts: the stylesheets manifest is empty or unreadable");
  for (const file of stylesheets) {
    if (!file.startsWith(`${folioStylesDir}/`)) fail(`site.ts: ${file} is outside ${folioStylesDir}; every stylesheet lives in the Folio tree`);
    if (!fs.existsSync(abs(file))) fail(`site.ts: ${file} is listed but does not exist`);
  }
  for (const file of collectFiles(abs(folioStylesDir)).filter((name) => name.endsWith(".css")).map(relative)) {
    if (!stylesheets.includes(file)) fail(`${file}: not listed in stylesheets in src/data/site.ts, so no page loads it`);
  }
  // The foundation comes first in its own order and the state files last: the Light override and the contrast,
  // motion and print states redeclare tokens and properties at the same weight and win only by coming later.
  const foundation = ["00-tokens", "01-fonts", "02-reset", "03-base", "04-layout", "05-utilities"].map((name) => `${folioStylesDir}/${name}.css`);
  if (stylesheets.slice(0, foundation.length).join() !== foundation.join()) {
    fail(`site.ts: the stylesheets manifest must start with ${foundation.map((file) => path.basename(file)).join(", ")}, in that order, before any component`);
  }
  const firstState = stylesheets.findIndex((file) => file.startsWith(`${folioStylesDir}/states/`));
  if (firstState < 0 || stylesheets.slice(firstState).some((file) => !file.startsWith(`${folioStylesDir}/states/`))) {
    fail("site.ts: the states/*.css files must close the stylesheets manifest, after every component and page file");
  }
  // CSS is bundled, never fetched one file at a time, so none belongs in public/.
  for (const file of collectFiles(publicDir).filter((name) => name.endsWith(".css"))) {
    fail(`${relative(file)}: stylesheets live in ${folioStylesDir} and reach pages through the bundle, not public/`);
  }

  if (!/<link\s+rel="stylesheet"\s+href=\{`assets\/css\/site\.css\?v=\$\{stylesheetVersion\}`\}>/.test(readShell())) {
    fail(`${shell.name}: pages must link the generated stylesheet bundle`);
  }
  // A CSS import in a component would make Astro emit a second render-blocking /_astro/*.css sheet, and a scoped
  // <style> in a component would reach the page as a sheet or, small enough, inlined into the head; either way it
  // would bypass the manifest and the lint. The shell's first-paint <style is:inline> is the one exception.
  for (const file of collectFiles(path.join(root, "src")).filter((name) => /\.(astro|[cm]?[jt]s)$/.test(name))) {
    const text = fs.readFileSync(file, "utf8");
    if (/^\s*import\s+["'][^"']+\.css["']/m.test(text)) {
      fail(`${relative(file)}: imports a stylesheet; add it to ${folioStylesDir} and the stylesheets manifest so pages keep one stylesheet request`);
    }
    if (file.endsWith(".astro") && /<style\b(?![^>]*\bis:inline\b)/.test(text)) {
      fail(`${relative(file)}: has a component <style>; write the rules in ${folioStylesDir} so they go through the manifest and the lint`);
    }
    if (file.endsWith(".astro") && /<style\b[^>]*\bis:inline\b/.test(text) && path.basename(file) !== path.basename(shell.file)) {
      fail(`${relative(file)}: has an inline <style>; only ${shell.file} carries one, the first-paint style`);
    }
  }
  const astroStylesheets = fs.existsSync(path.join(distDir, "_astro")) ? fs.readdirSync(path.join(distDir, "_astro")).filter((name) => name.endsWith(".css")) : [];
  if (astroStylesheets.length) fail(`_astro: ${astroStylesheets.join(", ")} is a second stylesheet; fold it into the bundle (${folioStylesDir})`);
  for (const file of fs.readdirSync(distDir).filter((name) => name.endsWith(".html") && name !== "sample-cabinet.html")) {
    const html = readDistPage(file);
    const links = html.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) || [];
    if (links.length !== 1 || !/href="assets\/css\/site\.css\?v=[0-9a-f]{10}"/.test(links[0])) {
      fail(`${file}: expected exactly one stylesheet link, the versioned assets/css/site.css (found ${links.length})`);
    }
    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
    if (styles.length !== 1 || !/^\s*html \{ background: #0f1625; color-scheme: dark; \}/.test(styles[0][1])) {
      fail(`${file}: expected one <style> element, the shell's first-paint style (found ${styles.length}); component styles belong in ${folioStylesDir}`);
    }
  }

  const bundlePath = abs(bundleDist);
  if (!fs.existsSync(bundlePath)) {
    fail("Missing generated stylesheet bundle: assets/css/site.css");
    return;
  }
  const bundle = fs.readFileSync(bundlePath, "utf8");
  let lastIndex = -1;
  for (const file of stylesheets) {
    const index = bundle.indexOf(`/*! ${file} */`);
    if (index <= lastIndex) fail(`assets/css/site.css: ${file} is missing or out of cascade order`);
    lastIndex = index;
  }

  const decoded = decodeCssEscapes(bundle);
  const corrupted = [...decoded.matchAll(/\bcontent\s*:\s*("[^"]*"|'[^']*')/g)].filter((match) => /[鬯驛郢繝譎髫]/.test(match[1]));
  if (corrupted.length) fail(`assets/css/site.css: ${corrupted.length} rendered content declarations contain mojibake`);

  // Bans the lint also enforces per source file (scripts/lib/css-lint.mjs), held here on the built bundle: no live
  // blur, cascade layers, imports or off-site addresses (the CSP allows only same-origin fonts and images).
  for (const [pattern, name] of bans.filter(([, name]) => name !== "body#")) {
    if (pattern.test(stripComments(bundle))) fail(`assets/css/site.css: contains ${name}`);
  }

  const rules = cssRules(bundle);
  const ruleWith = (target, test) => rules.some((rule) => !rule.conditions.length && rule.selectors.includes(target) && rule.declarations.some(test));
  if (!ruleWith("[hidden]", ({ property, value, important }) => property === "display" && value === "none" && important)) {
    fail("assets/css/site.css: [hidden] must hide with display: none !important at the top level (hidden gates and locked content stay hidden)");
  }
  if (!rules.some((rule) => rule.selectors.some((selector) => /\.mads-soft-nav-active\b/.test(selector)))) {
    fail("assets/css/site.css: missing soft navigation stability styles (.mads-soft-nav-active)");
  }
  // Text never rests on undimmed imagery: no background image on body or its pseudo-elements, whatever the theme,
  // except the page backdrops of components/backdrop.css (owner, 2026-11-18), each held to its selector, media and
  // images (the band's veil alone while its image waits for the page to load). The body is reached as body, body.x,
  // :where(body) or through its page class (.ui-page-*, which only body carries), with or without a state prefix.
  const onBodyOrPage = (selector) => {
    const subject = selector.split(/\s*[\s>+~]\s*(?![^(]*\))/).pop();
    return /^(?:body\b|\.ui-page-|:where\(\s*(?:body\b|\.ui-page-))/.test(subject) && !/::(?!before\b|after\b)/.test(subject);
  };
  const squeeze = (text) => text.replace(/\s+/g, "").replace(/["']/g, "").toLowerCase();
  const floatMedia = "@media(min-width:761px)and(min-height:600px)and(forced-colors:none)";
  const backdrops = [
    { selector: "body::before", media: "", images: ["url(../img/asteroid-bennu-1280.webp)"] },
    { selector: "body::before", media: "@media(max-width:760px)", images: ["url(../img/asteroid-bennu-800.webp)"] },
    { selector: "body::after", media: floatMedia, images: ["var(--obs-band-veil)", "url(../img/solar_system_true_color-1600.webp)"] },
    // Until html.backdrop-ready (after the load event, observatory-interactions.js) the band shows its veil alone.
    { selector: "html:not(.backdrop-ready) body::after", media: "@media(scripting:enabled)", images: ["var(--obs-band-veil)"] }
  ];
  const imageOf = (value) => squeeze(value).match(/var\(--obs-band-veil\)|url\([^)]*\)|[a-z-]*gradient\(|image-set\(/g) ?? [];
  const seen = new Set();
  for (const rule of rules) {
    const onBody = rule.selectors.some(onBodyOrPage);
    const image = rule.declarations.find(({ property, value }) => (property === "background-image" || property === "background") && /url\(|gradient\(|image-set\(|var\(--obs-band-veil\)/.test(value));
    if (!onBody || !image) continue;
    const media = rule.conditions.map(squeeze).join("");
    const allowed = backdrops.findIndex((entry) => rule.selectors.length === 1 && rule.selectors[0] === entry.selector && media === entry.media && imageOf(image.value).join(" ") === entry.images.join(" "));
    if (allowed < 0) fail(`assets/css/site.css: ${rule.selectors.join(", ")} gives the page a background image (${image.value.slice(0, 60)})`);
    else seen.add(allowed);
  }
  backdrops.forEach((entry, index) => {
    if (!seen.has(index)) fail(`assets/css/site.css: the page backdrop ${entry.selector}${entry.media ? ` in ${entry.media}` : ""} with ${entry.images.join(", ")} is missing or changed (components/backdrop.css)`);
  });
  // Bennu is always dimmed and never takes input, so text never rests on an undimmed image.
  const bennu = rules.filter((rule) => !rule.conditions.length && rule.selectors.includes("body::before"));
  const declares = (property, value) => bennu.some((rule) => rule.declarations.some((have) => have.property === property && squeeze(have.value) === squeeze(value)));
  if (!declares("opacity", "var(--obs-backdrop-opacity)")) fail("assets/css/site.css: body::before (the Bennu backdrop) must declare opacity: var(--obs-backdrop-opacity)");
  if (!declares("pointer-events", "none")) fail("assets/css/site.css: body::before (the Bennu backdrop) must declare pointer-events: none");
}
