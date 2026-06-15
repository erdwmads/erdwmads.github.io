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
const researchLog = readDistPage("research-log.html");
for (const [pageName, html] of [["research-log.html", researchLog], ["research-graduation.html", mission]]) {
  if (!html.includes("assets/js/research-lock.js") || !html.includes("data-research-lock-content")) {
    fail(`${pageName}: missing Research Log password gate`);
  }
}
if ((mission.match(/class="research-note-card mission-log-entry"/g) || []).length !== 1) {
  fail("research-graduation.html: expected exactly 1 initial mission log entry for lazy rendering");
}
if ((mission.match(/class="mission-jump-card compact-jump-card"/g) || []).length !== 8) {
  fail("research-graduation.html: expected 8 mission jump cards");
}
const missionDataMatch = mission.match(/<script\b[^>]*id="mission-log-data"[^>]*>([\s\S]*?)<\/script>/);
let missionData = [];
if (!missionDataMatch) {
  fail("research-graduation.html: missing Mission Log JSON data");
} else {
  try {
    missionData = JSON.parse(missionDataMatch[1]);
  } catch (error) {
    fail(`research-graduation.html: Mission Log JSON data is not parseable: ${error.message}`);
  }
}
if (missionData.length !== 8) {
  fail("research-graduation.html: expected 8 Mission Log data entries");
}
const missionIds = new Set(missionData.map((entry) => entry.id));
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
if (!missionIndexScript.includes("mission-log-data") || !missionIndexScript.includes("renderMissionEntry")) {
  fail("mission-index.js: missing lazy Mission Log rendering from JSON data");
}
const missionLightboxScript = fs.readFileSync(path.join(assetsDir, "js", "mission-lightbox.js"), "utf8");
if (missionLightboxScript.includes("const items = figures.map")) {
  fail("mission-lightbox.js: must not build one global image set across all Mission Logs");
}
if (!missionLightboxScript.includes("figure.closest('.mission-log-entry')") || !missionLightboxScript.includes("thumbsEl.replaceChildren") || !missionLightboxScript.includes("MadsMissionLightbox")) {
  fail("mission-lightbox.js: missing dynamic per-log image grouping for the lightbox");
}
if (missionLightboxScript.includes('>x</button>') || !missionLightboxScript.includes('mission-lightbox__close-icon')) {
  fail("mission-lightbox.js: close button must use a styled icon, not a raw x character");
}
if (!missionLightboxScript.includes("thumbImg.loading = 'eager'") || !missionLightboxScript.includes("thumbImg.src = item.thumb || item.src")) {
  fail("mission-lightbox.js: thumbnail strip must eagerly assign real src values on open");
}
const log008Data = missionData.find((entry) => entry.id === "log-008");
if (!log008Data) fail("research-graduation.html: missing Mission Log 008 data");
const log008Html = log008Data?.bodyHtml || "";
if ((log008Html.match(/<figure>/g) || []).length !== 9) {
  fail("research-graduation.html: Mission Log 008 should contain 9 figures");
}
for (let index = 1; index <= 9; index += 1) {
  const imageName = `grad-log-20260615-${String(index).padStart(2, "0")}.jpg`;
  if (!fs.existsSync(path.join(publicDir, "assets", "img", imageName))) {
    fail(`research-graduation.html: missing Mission Log 008 image ${imageName}`);
  }
  if (!log008Html.includes(`Fig. ${index}`)) {
    fail(`research-graduation.html: Mission Log 008 missing Fig. ${index} caption`);
  }
}
const log007Data = missionData.find((entry) => entry.id === "log-007");
if (!log007Data) fail("research-graduation.html: missing Mission Log 007 data");
const log007Html = log007Data?.bodyHtml || "";
if ((log007Html.match(/<figure>/g) || []).length !== 13) {
  fail("research-graduation.html: Mission Log 007 should contain 13 figures");
}
for (let index = 1; index <= 13; index += 1) {
  const imageName = `grad-log-20260610-${String(index).padStart(2, "0")}.jpg`;
  if (!fs.existsSync(path.join(publicDir, "assets", "img", imageName))) {
    fail(`research-graduation.html: missing Mission Log 007 image ${imageName}`);
  }
  if (!log007Html.includes(`Fig. ${index}`)) {
    fail(`research-graduation.html: Mission Log 007 missing Fig. ${index} caption`);
  }
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
if (!styleCss.includes("research-lock-gate") || !styleCss.includes("mission-log-lazy-render")) {
  fail("style.css: missing Research Log gate or Mission Log lazy render styles");
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
if (!styleCss.includes("mobile-mission-log-static-tap") || !styleCss.includes("-webkit-tap-highlight-color: transparent")) {
  fail("style.css: missing mobile Mission Log tap highlight suppression");
}
if (!styleCss.includes("mobile-research-title-no-overflow") || !styleCss.includes("body.ui-page-research-graduation main > section h1") || !styleCss.includes("overflow-wrap: anywhere")) {
  fail("style.css: missing mobile research title overflow protection");
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
