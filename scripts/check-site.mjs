import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");
const assetsDir = path.join(publicDir, "assets");
const publicMissionSource = path.join(root, "src", "data", "missionLog.ts");

const pages = [
  "index.html",
  "research.html",
  "research-log.html",
  "paper-shelf.html",
  "cv.html",
  "photography.html",
  "contact.html",
  "sample-cabinet.html"
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function readDistPage(file) {
  const pagePath = path.join(distDir, file);
  if (!fs.existsSync(pagePath)) {
    fail(`Missing generated page: ${file}`);
    return "";
  }
  return fs.readFileSync(pagePath, "utf8");
}

if (fs.existsSync(publicMissionSource)) {
  fail("src/data/missionLog.ts must stay local-only under _local/mission-source/");
}

function isLocalAsset(value) {
  return (
    value &&
    !value.startsWith("http://") &&
    !value.startsWith("https://") &&
    !value.startsWith("mailto:") &&
    !value.startsWith("#") &&
    !value.startsWith("data:") &&
    !value.startsWith("javascript:")
  );
}

function localAssetPath(value) {
  const raw = value.split("#")[0].split("?")[0].replace(/^\.\//, "");
  const clean = decodeURIComponent(raw);
  if (!clean || clean.endsWith(".html")) return null;
  return path.join(distDir, clean);
}

for (const page of pages) {
  const html = readDistPage(page);
  if (!html) continue;

  if (!html.includes("assets/js/power-manager.js")) fail(`${page}: missing power-manager.js`);
  if (!html.includes("assets/js/legacy-navigation.js")) fail(`${page}: missing legacy-navigation.js`);
  if (html.includes("Planetary Sciences ??") || html.includes("Mineralogy ??")) fail(`${page}: header contains mojibake question marks`);
  if (!html.includes('rel="canonical"')) fail(`${page}: missing canonical link`);
  if (!html.includes('property="og:title"')) fail(`${page}: missing Open Graph metadata`);
  if (html.includes('research-graduation.html')) fail(`${page}: public page must not link to the local-only Mission Log`);
  if (html.includes('mission-log-data')) fail(`${page}: public page must not embed Mission Log data`);

  const attrPattern = /\b(?:src|href)="([^"]+)"/g;
  for (const match of html.matchAll(attrPattern)) {
    const value = match[1];
    if (!isLocalAsset(value)) continue;
    const assetPath = localAssetPath(value);
    if (assetPath && !fs.existsSync(assetPath)) {
      fail(`${page}: missing local asset ${value}`);
    }
  }
}

if (fs.existsSync(path.join(distDir, "research-graduation.html"))) {
  fail("dist: research-graduation.html must not be generated for the public website");
}
const publicMissionImages = fs.existsSync(path.join(distDir, "assets", "img"))
  ? fs.readdirSync(path.join(distDir, "assets", "img")).filter((name) => /^grad-log-.*\.jpg$/i.test(name))
  : [];
if (publicMissionImages.length) {
  fail(`dist: Mission Log images must not be published (${publicMissionImages.length} grad-log files found)`);
}

const paperShelf = readDistPage("paper-shelf.html");
if ((paperShelf.match(/class="paper-card"/g) || []).length !== 11) {
  fail("paper-shelf.html: expected 11 paper cards");
}
if (!paperShelf.includes("data-paper-search") || !paperShelf.includes("assets/js/paper-shelf.js")) {
  fail("paper-shelf.html: missing filter controls or script");
}
const expectedPaperFilters = ["dolomite", "ci-orgueil", "ryugu-bennu", "methods", "chronology"];
for (const filter of expectedPaperFilters) {
  if (!paperShelf.includes(`data-paper-filter="${filter}"`)) {
    fail(`paper-shelf.html: missing stable filter button ${filter}`);
  }
}
const paperCardMatches = [...paperShelf.matchAll(/<article\b[^>]*class="paper-card"[^>]*>/g)];
const usedPaperFilters = new Set();
for (const [index, match] of paperCardMatches.entries()) {
  if (!match[0].includes("data-paper-filters=")) {
    fail(`paper-shelf.html: paper card ${index + 1} missing data-paper-filters`);
    continue;
  }
  const attr = match[0].match(/data-paper-filters="([^"]*)"/);
  const filters = (attr?.[1] || "").split(/\s+/).filter(Boolean);
  if (!filters.length) {
    fail(`paper-shelf.html: paper card ${index + 1} has empty data-paper-filters`);
  }
  for (const filter of filters) {
    if (!expectedPaperFilters.includes(filter)) {
      fail(`paper-shelf.html: paper card ${index + 1} has unknown filter ${filter}`);
    }
    usedPaperFilters.add(filter);
  }
}
for (const filter of expectedPaperFilters) {
  if (!usedPaperFilters.has(filter)) {
    fail(`paper-shelf.html: no paper cards mapped to ${filter}`);
  }
}

const researchLog = readDistPage("research-log.html");
if (!researchLog.includes("assets/js/research-lock.js") || !researchLog.includes("data-research-lock-content")) {
  fail("research-log.html: missing Research Log password gate");
}
if (/<a\b[^>]*class="[^"]*\bproject-link-card\b/i.test(researchLog)) {
  fail("research-log.html: project cards must not be clickable links");
}

for (const required of ["robots.txt", "sitemap.xml"]) {
  if (!fs.existsSync(path.join(distDir, required)) && !fs.existsSync(path.join(publicDir, required))) {
    fail(`Missing SEO file: ${required}`);
  }
}

const legacyNavigation = fs.readFileSync(path.join(assetsDir, "js", "legacy-navigation.js"), "utf8");
if (!legacyNavigation.includes("mads-soft-nav-active") || !legacyNavigation.includes("mads:soft-nav-ready")) {
  fail("legacy-navigation.js: missing soft navigation stability lifecycle");
}

const interface2046 = fs.readFileSync(path.join(assetsDir, "js", "interface-2046.js"), "utf8");
if (!interface2046.includes("data-ui2046-route") || !interface2046.includes("mads:soft-nav-ready")) {
  fail("interface-2046.js: missing soft navigation route refresh");
}

const styleCss = fs.readFileSync(path.join(assetsDir, "css", "style.css"), "utf8");
if (!styleCss.includes("mads-soft-nav-active")) {
  fail("style.css: missing soft navigation stability styles");
}
if (!styleCss.includes("research-lock-gate")) {
  fail("style.css: missing Research Log gate styles");
}
if (!styleCss.includes("research-lock-password-high-contrast") || !styleCss.includes("-webkit-text-fill-color: rgba(246, 250, 255, .96)")) {
  fail("style.css: missing high-contrast password dot color for the Research Log gate");
}
if (!styleCss.includes("mission-lightbox-unified-theme") || !styleCss.includes("html:not([data-theme=\"space\"]) .mission-lightbox__thumbs")) {
  fail("style.css: missing unified Mission Log lightbox theme styles");
}
const researchLockPath = path.join(assetsDir, "js", "research-lock.js");
const researchLock = fs.existsSync(researchLockPath) ? fs.readFileSync(researchLockPath, "utf8") : "";
if (!researchLock) {
  fail("research-lock.js: missing Research Log password gate script");
} else if (!researchLock.includes("crypto.subtle.digest") || !researchLock.includes("sessionStorage") || !researchLock.includes("data-research-lock-content")) {
  fail("research-lock.js: missing password hashing, session unlock, or content gate handling");
} else if (!researchLock.includes("c70de696ba32206485f4f0d2b3ceba1ba1fec7328e9ebca874ae29b7c3b295b5") || researchLock.includes("eb76e3ad8d3d50abc9035601b1387e5c426d6b22534fa7691647d1e0bfacd053")) {
  fail("research-lock.js: password hash was not updated to the new Research Log password");
}
const powerManager = fs.readFileSync(path.join(assetsDir, "js", "power-manager.js"), "utf8");
const lowPowerBlock = powerManager.match(/const LOW_POWER_MEDIA = \[([\s\S]*?)\];/)?.[1] || "";
if (lowPowerBlock.includes("max-width") || lowPowerBlock.includes("pointer: coarse")) {
  fail("power-manager.js: mobile viewports must not be classified as low power");
}
if (!powerManager.includes("const MOBILE_MEDIA")) {
  fail("power-manager.js: missing separate mobile media state");
}

if (failures.length) {
  console.error("Site check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Site check passed: ${pages.length} public pages, local assets, SEO metadata, Paper Shelf, and private Mission Log separation.`);
