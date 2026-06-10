import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");
const assetsDir = path.join(publicDir, "assets");

const pages = [
  "index.html",
  "research.html",
  "research-log.html",
  "research-graduation.html",
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

const mission = readDistPage("research-graduation.html");
if ((mission.match(/class="research-note-card mission-log-entry"/g) || []).length !== 6) {
  fail("research-graduation.html: expected 6 mission log entries");
}
if ((mission.match(/class="mission-jump-card compact-jump-card"/g) || []).length !== 6) {
  fail("research-graduation.html: expected 6 mission jump cards");
}
const missionIds = new Set([...mission.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
const missionJumpTargets = [...mission.matchAll(/<a\b[^>]*class="[^"]*\bmission-jump-card\b[^"]*"[^>]*href="#([^"]*)"/g)];
for (const [index, match] of missionJumpTargets.entries()) {
  const targetId = match[1];
  if (!targetId) {
    fail(`research-graduation.html: mission jump card ${index + 1} has an empty anchor target`);
    continue;
  }
  if (!missionIds.has(targetId)) {
    fail(`research-graduation.html: mission jump card ${index + 1} points to missing target ${targetId}`);
  }
}
const missionIndexScript = fs.readFileSync(path.join(assetsDir, "js", "mission-index.js"), "utf8");
if (!missionIndexScript.includes("scrollIntoView") || !missionIndexScript.includes("history.pushState")) {
  fail("mission-index.js: missing explicit Mission Log navigator scroll handling");
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

console.log(`Site check passed: ${pages.length} pages, local assets, SEO metadata, Paper Shelf, and Mission Log.`);
