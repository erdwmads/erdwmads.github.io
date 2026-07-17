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
const expectedDisplayName = "Mads LIU Yong";
const staleNameNeedles = [
  ["Mads", "LIU", "YONG"].join(" "),
  ["MADS", "LIU", "YONG"].join(" "),
  ["LIU", "YONG"].join(" "),
  ["Mads", "LIU", "YONG"].join("_"),
  ["LIU", "YONG"].join("_")
];
const textFilePattern = /\.(?:astro|css|html|js|json|md|mjs|svg|ts|txt|xml)$/i;

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

const forbiddenMissionPaths = [
  path.join(root, "src", "data", "missionLog.ts"),
  path.join(root, "src", "pages", "assets", "data", "mission-log.json.ts")
];
for (const forbiddenPath of forbiddenMissionPaths) {
  if (fs.existsSync(forbiddenPath)) {
    fail(`${path.relative(root, forbiddenPath)}: protected Mission Log plaintext must not be public source`);
  }
}

const protectedMissionCanaries = [
  "Mission Log 010 - SEM training",
  "Ca-Mg-C-O carbonate candidate",
  "Diamond wire saw dry cutting"
];
const protectedMissionTextFiles = [
  ...collectFiles(path.join(root, "src")),
  ...collectFiles(publicDir),
  ...collectFiles(distDir)
].filter((file) => textFilePattern.test(file));
for (const filePath of protectedMissionTextFiles) {
  const text = fs.readFileSync(filePath, "utf8");
  const matchedCanaries = protectedMissionCanaries.filter((canary) => text.includes(canary));
  if (matchedCanaries.length) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
    fail(`${relativePath}: protected Mission Log plaintext leaked (${matchedCanaries.join(", ")})`);
  }
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

for (const targetPath of [
  "README.md",
  "docs",
  "src",
  "public/assets/css",
  "public/assets/js",
  "public/assets/img/profile-placeholder.svg"
]) {
  for (const filePath of collectFiles(path.join(root, targetPath))) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
    for (const staleName of staleNameNeedles) {
      if (relativePath.includes(staleName)) {
        fail(`${relativePath}: stale display-name spelling in file path`);
      }
    }
    if (!textFilePattern.test(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    for (const staleName of staleNameNeedles) {
      if (text.includes(staleName)) {
        fail(`${relativePath}: stale display-name spelling ${staleName}`);
      }
    }
  }
}

for (const page of pages) {
  const html = readDistPage(page);
  if (!html) continue;

  if (!html.includes(expectedDisplayName)) fail(`${page}: must use the canonical display name ${expectedDisplayName}`);
  for (const staleName of staleNameNeedles) {
    if (html.includes(staleName)) fail(`${page}: stale display-name spelling ${staleName}`);
  }

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
const homeHeaderMatch = homePage.match(/<header\b[^>]*class="[^"]*\bsite-header\b[^"]*"[^>]*>[\s\S]*?<\/header>/i);
if (!homeHeaderMatch) {
  fail("index.html: missing site header");
} else {
  const homeHeaderHtml = homeHeaderMatch[0];
  const homeNavMatch = homeHeaderHtml.match(/<nav\b[^>]*class="[^"]*\bnav\b[^"]*"[^>]*>[\s\S]*?<\/nav>/i);
  const headerActionsMatch = homeHeaderHtml.match(/<div\b[^>]*class="[^"]*\bheader-actions\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/header>/i);
  if (!homeNavMatch) {
    fail("index.html: missing main navigation");
  }
  if (!headerActionsMatch) {
    fail("index.html: missing header-actions wrapper");
  }
  if (homeNavMatch) {
    const homeNavHtml = homeNavMatch[0];
    const ordinaryLinksMatch = homeNavHtml.match(/<div\b[^>]*class="[^"]*\bnav__links\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!ordinaryLinksMatch) {
      fail("index.html: ordinary navigation links must be grouped inside nav__links");
    } else if (/href="research-log\.html"[\s\S]*?>\s*Research Log\s*</i.test(ordinaryLinksMatch[1])) {
      fail("index.html: Research Log must be separated from ordinary navigation links");
    }
    if (/\bnav-log-gate\b/i.test(homeNavHtml)) {
      fail("index.html: Research Log gate must be outside the ordinary nav dock");
    }
    if (/\btheme-toggle\b/i.test(homeNavHtml)) {
      fail("index.html: theme toggle must be outside the ordinary nav dock");
    }
  }
  if (!/<a\b(?=[^>]*href="research-log\.html")(?=[^>]*class="[^"]*\bnav-log-gate\b)[^>]*>[\s\S]*?Research Log[\s\S]*?Active Archive[\s\S]*?<\/a>/i.test(homeHeaderHtml)) {
    fail("index.html: missing independent Research Log gate in the header");
  }
  if (!/<button\b(?=[^>]*class="[^"]*\btheme-toggle\b)[^>]*>/i.test(homeHeaderHtml)) {
    fail("index.html: missing theme toggle in the header actions");
  }
}

const researchLogHeader = readDistPage("research-log.html");
if (!/<body\b[^>]*class="[^"]*\bui-page-research-log\b/i.test(researchLogHeader)) {
  fail("research-log.html: body must expose ui-page-research-log for page-specific design");
}
if (!/<a\b(?=[^>]*href="research-log\.html")(?=[^>]*class="[^"]*\bnav-log-gate\b)(?=[^>]*aria-current="page")[^>]*>/i.test(researchLogHeader)) {
  fail("research-log.html: independent Research Log gate must show the active state");
}

const legacyNavigationSource = fs.readFileSync(path.join(root, "public", "assets", "js", "legacy-navigation.js"), "utf8");
if (!legacyNavigationSource.includes('document.querySelectorAll(".nav a, .nav-log-gate")')) {
  fail("legacy-navigation.js: soft navigation must update the independent Research Log gate");
}

const publicMissionImageDir = path.join(distDir, "assets", "img", "mission-log");
const publicMissionImages = fs.existsSync(publicMissionImageDir)
  ? fs.readdirSync(publicMissionImageDir).filter((name) => /^grad-log-.*\.jpg$/i.test(name))
  : [];
if (publicMissionImages.length !== 55) {
  fail(`dist: expected 55 published Mission Log images, found ${publicMissionImages.length}`);
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
if (!researchLog.includes("Download research proposal") || !researchLog.includes("assets/files/Bachelors_Thesis_Research_Proposal_Mads_LIU_Yong.pdf")) {
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
if (!graduationPage.includes('data-protected-archive-url="assets/data/mission-log.enc.json"')) {
  fail("research-graduation.html: missing protected Mission Log archive URL");
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
const missionLogJson = fs.readFileSync(path.join(distDir, "assets", "data", "mission-log.json"), "utf8");
if (!missionLogJson.includes("grad-log-20260701-09.jpg") || !missionLogJson.includes("Ca-Mg-C-O carbonate candidate")) {
  fail("mission-log.json: LOG010 must include the Ca-Mg-C-O dolomite candidate evidence figure");
}

for (const required of ["robots.txt", "sitemap.xml"]) {
  if (!fs.existsSync(path.join(distDir, required)) && !fs.existsSync(path.join(publicDir, required))) {
    fail(`Missing SEO file: ${required}`);
  }
}

if (!fs.existsSync(missionDataPath)) {
  fail("mission-log.json: missing generated Mission Log data");
} else {
  const missionData = JSON.parse(fs.readFileSync(missionDataPath, "utf8"));
  const log010 = Array.isArray(missionData) ? missionData.find((entry) => entry.id === "log-010") : null;
  const log010Html = log010?.bodyHtml || "";
  const log010ImageCount = (log010Html.match(/mission-thumb-img/g) || []).length;
  if (!log010) {
    fail("mission-log.json: missing log-010 entry");
  } else {
    for (const phrase of ["EDS reconnaissance evidence", "Ca-rich EDS map", "Fe-S EDS map", "matrix-like altered material"]) {
      if (!log010Html.includes(phrase)) {
        fail(`log-010: missing EDS evidence phrase: ${phrase}`);
      }
    }
    if (log010ImageCount < 8) {
      fail(`log-010: expected at least 8 evidence figures, found ${log010ImageCount}`);
    }
    if (/\b(is|are|was|were)\s+(pyrrhotite|magnetite|dolomite)\b/i.test(log010Html)) {
      fail("log-010: EDS interpretation must remain candidate/preliminary, not definitive");
    }
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
if (!styleCss.includes('content: "\\2039" !important;') || !styleCss.includes('content: "\\203A" !important;')) {
  fail("style.css: photography controls must use encoding-safe previous/next arrows");
}
if (!styleCss.includes("mads-soft-nav-active")) {
  fail("style.css: missing soft navigation stability styles");
}
if (!/\.header-actions\s+\.nav\s*\{[\s\S]*?flex-wrap:\s*nowrap\s*!important[\s\S]*?\}/.test(styleCss)) {
  fail("style.css: header action rail must keep ordinary navigation on one desktop row");
}
if (/body\.ui-page-research-log\s+\.research-log-main::after\s*\{[\s\S]*?url\(\"\.\.\/img\/asteroid-bennu\.jpg\"\)[\s\S]*?\}/.test(styleCss)) {
  fail("style.css: Research Log page must not add a second asteroid background layer");
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
if (!styleCss.includes("mission-lightbox-stable-viewport")) {
  fail("style.css: missing stable Mission Log lightbox viewport rules");
}
const finalLightboxBlock = styleCss.slice(styleCss.lastIndexOf("/* mission-lightbox-stable-viewport */"));
if (/backdrop-filter:\s*blur/.test(finalLightboxBlock) || /-webkit-backdrop-filter:\s*blur/.test(finalLightboxBlock)) {
  fail("style.css: final Mission Log lightbox viewport must not use live backdrop blur during image viewing");
}
if (!/mission-lightbox-open[\s\S]*ambient-space-layer[\s\S]*animation:\s*none/.test(styleCss)) {
  fail("style.css: Mission Log lightbox must pause ambient layers while open");
}
const rationalizedLightboxBlock = styleCss.slice(styleCss.lastIndexOf("/* mission-lightbox-rationalized-viewer */"));
const rationalizedCaptionMatch = rationalizedLightboxBlock.match(/\.mission-lightbox__captionbar\s*\{[\s\S]*?\}/);
if (!rationalizedCaptionMatch || /position:\s*fixed/.test(rationalizedCaptionMatch[0])) {
  fail("style.css: Mission Log lightbox caption must reserve layout space instead of overlaying the image");
}

const researchLockPath = path.join(assetsDir, "js", "research-lock.js");
if (!fs.existsSync(researchLockPath)) {
  fail("research-lock.js: missing graduation password gate script");
} else {
  const researchLock = fs.readFileSync(researchLockPath, "utf8");
  if (!researchLock.includes("AES-GCM") || !researchLock.includes("PBKDF2")) {
    fail("research-lock.js: protected archive must use PBKDF2 and AES-GCM decryption");
  }
  if (researchLock.includes("expectedHash")) {
    fail("research-lock.js: obsolete password hash gate must be removed");
  }
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
if (!missionLightbox.includes("emitLightboxPowerState") || !missionLightbox.includes("document.documentElement.classList.add('mission-lightbox-open')")) {
  fail("mission-lightbox.js: opening the viewer must pause background rendering through the shared lightbox state");
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
if (!ambientSpace.includes("mission-lightbox-open") || !fs.readFileSync(path.join(assetsDir, "js", "interface-2046.js"), "utf8").includes("mission-lightbox-open")) {
  fail("ambient/interface scripts: Mission Log lightbox must pause background animation loops while open");
}
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
