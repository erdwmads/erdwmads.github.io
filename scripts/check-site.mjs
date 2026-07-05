import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");
const assetsDir = path.join(publicDir, "assets");
const publicMissionSource = path.join(root, "src", "data", "missionLog.ts");
const missionDataPath = path.join(distDir, "assets", "data", "mission-log.json");

const pages = [
  "index.html",
  "research.html",
  "research-graduation.html",
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

function collectFiles(targetPath) {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  if (!stat.isDirectory()) return [];
  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const childPath = path.join(targetPath, entry.name);
    return entry.isDirectory() ? collectFiles(childPath) : [childPath];
  });
}

if (!fs.existsSync(publicMissionSource)) {
  fail("src/data/missionLog.ts: missing public Mission Log data source");
}

const removedLocalMissionPaths = [
  "_local",
  "src-local",
  "astro.local-mission.config.mjs",
  "scripts/build-local-mission-log.mjs",
  "scripts/check-local-mission-log.mjs",
  "src/components/MissionLog.astro"
];

for (const relativePath of removedLocalMissionPaths) {
  if (fs.existsSync(path.join(root, relativePath))) {
    fail(`${relativePath}: local Mission Log files should not exist`);
  }
}

const staleLocalMissionNeedles = [
  "_local/",
  "src-local",
  "check:local",
  "build:mission-log-local",
  "check-local-mission",
  "local-mission"
];

for (const relativePath of ["README.md", "package.json", "docs", "src"]) {
  const targetPath = path.join(root, relativePath);
  for (const filePath of collectFiles(targetPath)) {
    const text = fs.readFileSync(filePath, "utf8");
    for (const needle of staleLocalMissionNeedles) {
      if (text.includes(needle)) {
        fail(`${path.relative(root, filePath)}: stale local Mission Log reference ${needle}`);
      }
    }
  }
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


const homePage = readDistPage("index.html");
const homeNavMatch = homePage.match(/<nav\b[^>]*class="[^"]*\bnav\b[^"]*"[^>]*>[\s\S]*?<\/nav>/i);
if (!homeNavMatch) {
  fail("index.html: missing main navigation");
} else {
  const homeNavHtml = homeNavMatch[0];
  const ordinaryLinksMatch = homeNavHtml.match(/<div\b[^>]*class="[^"]*\bnav__links\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (!ordinaryLinksMatch) {
    fail("index.html: ordinary navigation links must be grouped inside nav__links");
  } else if (/href="research-log\.html"[\s\S]*?>\s*Research Log\s*</i.test(ordinaryLinksMatch[1])) {
    fail("index.html: Research Log must be separated from ordinary navigation links");
  }
  if (!/<a\b(?=[^>]*href="research-log\.html")(?=[^>]*class="[^"]*\bnav-log-gate\b)[^>]*>[\s\S]*?Research Log[\s\S]*?Active Archive[\s\S]*?<\/a>/i.test(homeNavHtml)) {
    fail("index.html: missing independent Research Log gate in the header");
  }
}

const researchLogHeader = readDistPage("research-log.html");
if (!/<body\b[^>]*class="[^"]*\bui-page-research-log\b/i.test(researchLogHeader)) {
  fail("research-log.html: body must expose ui-page-research-log for page-specific design");
}
if (!/<a\b(?=[^>]*href="research-log\.html")(?=[^>]*class="[^"]*\bnav-log-gate\b)(?=[^>]*aria-current="page")[^>]*>/i.test(researchLogHeader)) {
  fail("research-log.html: independent Research Log gate must show the active state");
}

const publicMissionImageDir = path.join(distDir, "assets", "img", "mission-log");
const publicMissionImages = fs.existsSync(publicMissionImageDir)
  ? fs.readdirSync(publicMissionImageDir).filter((name) => /^grad-log-.*\.jpg$/i.test(name))
  : [];
if (publicMissionImages.length !== 50) {
  fail(`dist: expected 50 published Mission Log images, found ${publicMissionImages.length}`);
}
if (!fs.existsSync(missionDataPath)) {
  fail("dist: missing assets/data/mission-log.json");
} else {
  const missionData = JSON.parse(fs.readFileSync(missionDataPath, "utf8"));
  if (!Array.isArray(missionData) || missionData.length !== 10) {
    fail(`assets/data/mission-log.json: expected 10 entries, found ${Array.isArray(missionData) ? missionData.length : "non-array"}`);
  }
  if (JSON.stringify(missionData).includes("assets/img/grad-log-")) {
    fail("assets/data/mission-log.json: image paths must use assets/img/mission-log/");
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

const researchLog = readDistPage("research-log.html");
if (researchLog.includes("assets/js/research-lock.js") || researchLog.includes("data-research-lock-content") || researchLog.includes("data-research-lock-gate") || researchLog.includes("Research Log Locked")) {
  fail("research-log.html: password gate must be removed from the public Research Log");
}
if (!researchLog.includes("Download research proposal") || !researchLog.includes("assets/files/Bachelors_Thesis_Research_Proposal_Mads_LIU_YONG.pdf")) {
  fail("research-log.html: must keep the research proposal download before the private Mission Log boundary");
}
if (!researchLog.includes('class="project-grid"') || !researchLog.includes("Future Research Project") || !researchLog.includes("Open protected log")) {
  fail("research-log.html: must keep the Ongoing/Future project card interface");
}
if (researchLog.includes("<h2>Graduation Research</h2>")) {
  fail("research-log.html: graduation project card must use the research title, not the generic label");
}
if (!/<a\b(?=[^>]*href="research-graduation\.html")(?=[^>]*class="[^"]*\bproject-link-card\b)[^>]*>/i.test(researchLog)) {
  fail("research-log.html: graduation project card must link to research-graduation.html");
}
if (/<a\b[^>]*class="[^"]*\bproject-link-card\b[^"]*\bdisabled-project\b/i.test(researchLog)) {
  fail("research-log.html: disabled future project must not be clickable");
}

const graduationPage = readDistPage("research-graduation.html");
if (!graduationPage.includes("assets/js/research-lock.js") || !graduationPage.includes("data-research-lock-gate") || !graduationPage.includes("data-research-lock-content")) {
  fail("research-graduation.html: missing password gate");
}
if (!graduationPage.includes('data-mission-data-url="assets/data/mission-log.json"')) {
  fail("research-graduation.html: missing lazy Mission Log data URL");
}
if (!graduationPage.includes("assets/js/mission-index.js") || !graduationPage.includes("assets/js/mission-lightbox.js")) {
  fail("research-graduation.html: missing Mission Log scripts");
}
if (graduationPage.includes("Mission Log 009")) {
  fail("research-graduation.html: Mission Log entries must load after unlock, not in initial HTML");
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
if (!interface2046.includes("MOBILE_INTERFACE_MEDIA") || !interface2046.includes("mads-mobile-lite") || !interface2046.includes("removeInterfaceLayers")) {
  fail("interface-2046.js: mobile lightweight mode must skip the solar-system/interface layer");
}

const styleCss = fs.readFileSync(path.join(assetsDir, "css", "style.css"), "utf8");
if (!styleCss.includes("mads-soft-nav-active")) {
  fail("style.css: missing soft navigation stability styles");
}
if (!styleCss.includes("mobile-lightweight-mode")) {
  fail("style.css: missing mobile lightweight rendering overrides");
}
if (!styleCss.includes("mission-lightbox-unified-theme") || !styleCss.includes("mission-lightbox-fullscreen-focus") || !styleCss.includes("mission-lightbox-minimal-image-viewer")) {
  fail("style.css: missing unified Mission Log lightbox theme styles");
}
if (!/mission-lightbox-rationalized-viewer[\s\S]*html:not\(\[data-theme="space"\]\):not\(\[data-theme-space\]\) body:not\(\.space-mode\) \.mission-lightbox[\s\S]*background: rgba\(226, 234, 241, \.94\) !important/.test(styleCss)) {
  fail("style.css: Mission Log image viewer must use a dedicated light image-viewer surface in light mode");
}
const researchLockPath = path.join(assetsDir, "js", "research-lock.js");
if (!fs.existsSync(researchLockPath)) {
  fail("research-lock.js: missing graduation password gate script");
} else {
  const researchLock = fs.readFileSync(researchLockPath, "utf8");
  if (researchLock.includes("1029384756Y")) {
    fail("research-lock.js: must not contain the plain password");
  }
  if (/\b(sessionStorage|localStorage)\b/.test(researchLock)) {
    fail("research-lock.js: must request the password on each page entry, without browser storage unlock caching");
  }
}
const missionLightbox = fs.readFileSync(path.join(assetsDir, "js", "mission-lightbox.js"), "utf8");
if (missionLightbox.includes("mission-lightbox__thumbs") || missionLightbox.includes("buildThumbs")) {
  fail("mission-lightbox.js: full-screen viewer must not render thumbnail strip");
}
if (
  missionLightbox.includes("mission-lightbox__panel") ||
  missionLightbox.includes("mission-lightbox__info") ||
  missionLightbox.includes("mission-lightbox__title") ||
  missionLightbox.includes("mission-lightbox__kicker")
) {
  fail("mission-lightbox.js: image viewer must use minimal image-first layout without side information panel");
}
const ambientSpace = fs.readFileSync(path.join(assetsDir, "js", "ambient-space.js"), "utf8");
if (!ambientSpace.includes("MOBILE_AMBIENT_MEDIA") || !ambientSpace.includes("isMobileAmbientView") || !ambientSpace.includes("mobile ambient disabled")) {
  fail("ambient-space.js: mobile lightweight mode must prevent ambient particle creation");
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

console.log(`Site check passed: ${pages.length} public pages, protected Mission Log, local assets, SEO metadata, and Paper Shelf.`);

