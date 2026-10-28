import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { findOrphanedFiles } from "./orphan-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");
const assetsDir = path.join(publicDir, "assets");
const photoThumbDir = path.join(assetsDir, "img", "thumbs", "photography");
const missionThumbDir = path.join(assetsDir, "img", "thumbs", "mission-log");
const encryptedMissionPayloadPath = path.join(publicDir, "assets", "data", "mission-log.enc.json");
const pptDataPath = path.join(distDir, "ppt-data.json");

const pages = [
  "index.html",
  "research.html",
  "ryugu-bennu.html",
  "research-graduation.html",
  "research-log.html",
  "paper-shelf.html",
  "cv.html",
  "photography.html",
  "contact.html"
];

const failures = [];
// Academic signature and full name (settled 2026-09-30).
const expectedDisplayName = "I. Mads Lieu";
const expectedFullName = "Ioong Mads Lieu";
// Retired spellings of the owner's name in any case, joined by spaces, underscores, hyphens, entities or markup:
// LIU Yong / Lieu Yong forms, Mads Yong Lieu, and "Mads Lieu" without "I." or "Ioong" before it (so Y. Mads Lieu too),
// plus Chinese-character forms (built from code points so this file never carries them).
const nameGap = "(?:[\\s_-]|&nbsp;|&#160;|<[^>]+>)";
const staleNamePattern = new RegExp(
  [
    `(?:liu|lieu)${nameGap}*yong`,
    `mads${nameGap}+yong${nameGap}+lieu`,
    `(?<!\\bI\\.\\s|\\bIoong\\s)\\bmads${nameGap}+lieu\\b`,
    String.fromCodePoint(0x5289, 0x96cd),
    String.fromCodePoint(0x5218, 0x96cd)
  ].join("|"),
  "i"
);
// The former romanization is published once on purpose, in the Home Person alternateName, so older search results match.
const formerName = ["Mads", "LIU", "Yong"].join(" ");
const formerNameHolds = new Set(["src/data/site.ts", "index.html"]);
// The research proposal is no longer published (backed up privately on 2026-10-24). Its former filename is still
// cited in archived plans under docs/, which are historical records and stay as written.
const retiredProposalPath = `assets/files/Bachelors_Thesis_Research_Proposal_${["Mads", "LIU", "Yong"].join("_")}.pdf`;
function withoutHeldNames(relativePath, text) {
  if (formerNameHolds.has(relativePath)) text = text.replace(`"${formerName}"`, "");
  return relativePath.startsWith("docs/") ? text.split(retiredProposalPath).join("") : text;
}
// Decodes the entity and percent forms a harvester would also decode.
function decodeText(text) {
  return text
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&(commat|period|colon|nbsp|amp);/gi, (_, name) => ({ commat: "@", period: ".", colon: ":", nbsp: " ", amp: "&" })[name.toLowerCase()])
    .replace(/%(40|2e|3a)/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
const orcidUrl = "https://orcid.org/0009-0007-3960-3959";
const orcidIcon = "assets/img/orcid/ORCID-iD_icon-vector.svg";
// ORCID's official iD icon (ORCID-iD_icon-vector.svg from ORCID's iD icon deposit), kept byte-for-byte.
const orcidIconSha256 = "020778f61ea32e76f938bfd059543cfc99f0f7beed304e9b018a141fc3b0b7dd";
const publicEmail = ["madslieu", "gmail.com"].join("@");
const publicEmailShown = "madslieu [at] gmail [dot] com";
const textFilePattern = /\.(?:astro|css|html|js|json|md|mjs|svg|ts|txt|xml)$/i;

const legacyShellSource = fs.readFileSync(path.join(root, "src", "components", "LegacyShell.astro"), "utf8");
if (/<script\b[^>]*\bsrc=["']assets\/js\/(?:power-manager|legacy-navigation)\.js["']/i.test(legacyShellSource)) {
  fail("LegacyShell.astro: public runtime scripts must be emitted as raw HTML instead of Vite module imports");
}

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

const forbiddenPlaintextMissionPaths = [
  path.join(root, "src", "data", "missionLog.ts"),
  path.join(root, "src", "pages", "assets", "data", "mission-log.json.ts"),
  path.join(publicDir, "assets", "data", "mission-log.json"),
  path.join(distDir, "assets", "data", "mission-log.json")
];
for (const forbiddenPath of forbiddenPlaintextMissionPaths) {
  if (fs.existsSync(forbiddenPath)) {
    fail(`${path.relative(root, forbiddenPath)}: protected Mission Log plaintext route must not exist`);
  }
}

const photoThumbCount = collectFiles(photoThumbDir).filter((file) => file.endsWith(".webp")).length;
const missionThumbCount = collectFiles(missionThumbDir).filter((file) => file.endsWith(".webp")).length;
if (photoThumbCount !== 21) {
  fail(`Photography: expected 21 WebP thumbnails, found ${photoThumbCount}`);
}
// Every Mission Log display image needs its WebP thumbnail (npm run images:derive), and no thumbnail may be orphaned.
const missionImages = fs.readdirSync(path.join(assetsDir, "img", "mission-log")).filter((name) => /^grad-log-.*\.jpg$/i.test(name));
const missionThumbs = new Set(collectFiles(missionThumbDir).filter((file) => file.endsWith(".webp")).map((file) => path.basename(file, ".webp")));
const missingThumbs = missionImages.filter((name) => !missionThumbs.has(name.replace(/\.jpg$/i, "")));
// Public Mission Log images are display derivatives: at most 2400 px on the long edge and 1.5 MiB, no EXIF/XMP (APP1).
function jpegInfo(buffer) {
  let offset = 2, exif = false;
  while (offset + 4 <= buffer.length && buffer[offset] === 0xff) {
    const marker = buffer[offset + 1];
    if (marker === 0xe1) exif = true;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), exif };
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return { width: 0, height: 0, exif };
}
for (const name of missionImages) {
  const file = path.join(assetsDir, "img", "mission-log", name);
  const { width, height, exif } = jpegInfo(fs.readFileSync(file));
  if (!width || Math.max(width, height) > 2400 || fs.statSync(file).size > 1.5 * 1024 * 1024 || exif) fail(`Mission Log: ${name} must be a display derivative (<= 2400 px long edge, <= 1.5 MiB, no EXIF/XMP)`);
}
if (missingThumbs.length || missionThumbCount !== missionImages.length) {
  fail(`Mission Log: ${missionImages.length} display images but ${missionThumbCount} WebP thumbnails${missingThumbs.length ? ` (missing ${missingThumbs.slice(0, 3).join(", ")})` : ""}`);
}

const requiredEncryptedMissionPayloadKeys = ["cipher", "ciphertext", "iterations", "iv", "kdf", "salt", "version"];
if (!fs.existsSync(encryptedMissionPayloadPath)) {
  fail("public/assets/data/mission-log.enc.json: missing encrypted Mission Log payload");
} else {
  try {
    const encryptedPayload = JSON.parse(fs.readFileSync(encryptedMissionPayloadPath, "utf8"));
    const payloadKeys = Object.keys(encryptedPayload).sort();
    if (JSON.stringify(payloadKeys) !== JSON.stringify(requiredEncryptedMissionPayloadKeys)) {
      fail("mission-log.enc.json: encrypted payload must use the exact supported envelope keys");
    }
    if (
      encryptedPayload.version !== 1 ||
      encryptedPayload.kdf !== "PBKDF2-SHA-256" ||
      encryptedPayload.cipher !== "AES-256-GCM" ||
      !Number.isInteger(encryptedPayload.iterations) ||
      encryptedPayload.iterations <= 0 ||
      !["salt", "iv", "ciphertext"].every((key) => typeof encryptedPayload[key] === "string" && encryptedPayload[key])
    ) {
      fail("mission-log.enc.json: encrypted payload envelope values are invalid");
    }
  } catch {
    fail("mission-log.enc.json: encrypted payload must be valid JSON");
  }
}

for (const relativePath of ["README.md", "docs/codex-update-contract.md", "docs/maintenance-templates.md"]) {
  const documentPath = path.join(root, relativePath);
  if (fs.readFileSync(documentPath, "utf8").includes("src/data/missionLog.ts")) {
    fail(`${relativePath}: stale plaintext Mission Log maintenance path`);
  }
}

const protectedMissionCanaries = [
  "Mission Log 010 - SEM training",
  "Ca-Mg-C-O carbonate candidate",
  "Diamond wire saw dry cutting"
];
const protectedMissionMetadataPatterns = [
  /["']missionEntries["']\s*:/,
  /["']bodyHtml(?:Ja)?["']\s*:/,
  /["']captions?["']\s*:/,
  /["'](?:fullSrc|thumbSrc|mobileFullSrc)["']\s*:/,
  /assets\/img\/mission-log\//
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
  if (protectedMissionMetadataPatterns.some((pattern) => pattern.test(text))) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
    fail(`${relativePath}: protected Mission Log metadata leaked into public source or build output`);
  }
}

if (!fs.existsSync(pptDataPath)) {
  fail("dist/ppt-data.json: missing PPT data export");
} else {
  try {
    const pptData = JSON.parse(fs.readFileSync(pptDataPath, "utf8"));
    if (Object.hasOwn(pptData, "missionLog")) {
      fail("dist/ppt-data.json: public PPT data must not include Mission Log entries");
    }
    const pptText = JSON.stringify(pptData);
    if (protectedMissionMetadataPatterns.some((pattern) => pattern.test(pptText))) {
      fail("dist/ppt-data.json: public PPT data must not include Mission Log plaintext or protected image metadata");
    }
  } catch {
    fail("dist/ppt-data.json: PPT data must be valid JSON");
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
    if (staleNamePattern.test(relativePath)) fail(`${relativePath}: stale display-name spelling in file path`);
    if (!textFilePattern.test(filePath)) continue;
    if (staleNamePattern.test(withoutHeldNames(relativePath, decodeText(fs.readFileSync(filePath, "utf8"))))) {
      fail(`${relativePath}: stale display-name spelling`);
    }
  }
}

for (const page of pages) {
  const html = readDistPage(page);
  if (!html) continue;

  if (!html.includes("assets/js/power-manager.js")) fail(`${page}: missing power-manager.js`);
  if (!html.includes("assets/js/legacy-navigation.js")) fail(`${page}: missing legacy-navigation.js`);
  if (html.includes("Planetology ??") || html.includes("Mineralogy ??")) fail(`${page}: header contains mojibake question marks`);
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
if (!homePage.includes('<link rel="icon" type="image/png" href="assets/img/favicon-32x32.png" sizes="32x32">')) {
  fail("index.html: the PNG icon must be the 32 px favicon, not the 512 px original");
}
if (!homePage.includes('<button class="theme-toggle" type="button" aria-label="Switch to Light Mode">Light Mode</button>')) {
  fail("index.html: theme toggle must name its action, match the default Space theme and carry no aria-pressed");
}
if (!/<dialog id="cosmic-arrival"[\s\S]*?<\/dialog>\s*<a class="site-skip-link" href="#main-content">/.test(homePage)) {
  fail("index.html: the skip link must follow the entrance dialog so the first Tab after the entrance reaches it");
}
const researchPage = readDistPage("research.html");
const comparisonPage = readDistPage("ryugu-bennu.html");
// Research presents the Orgueil question and pathway; the comparison materials live on their own page.
for (const marker of ["data-sample-missions", "data-planetary-explorer", "data-image-inspector"]) {
  if (researchPage.includes(marker)) fail(`research.html: ${marker} belongs on ryugu-bennu.html`);
  if (!comparisonPage.includes(marker)) fail(`ryugu-bennu.html: missing ${marker}`);
}
if (!researchPage.includes('href="ryugu-bennu.html"') || !/location\.replace\("ryugu-bennu\.html"/.test(researchPage)) {
  fail("research.html: must link to ryugu-bennu.html and forward shared views from before the move");
}
if (researchPage.includes("local-only archive")) {
  fail("research.html: stale local-only Mission Log wording");
}
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
// ui-page-* classes come only from LegacyShell; soft navigation copies them from the fetched page.
if (!/<body\b[^>]*class="[^"]*\bui-page-research-log\b[^"]*\bui-page-research-graduation\b/i.test(readDistPage("research-graduation.html"))) {
  fail("research-graduation.html: body must render ui-page-research-log and ui-page-research-graduation");
}
if (legacyNavigationSource.includes("pageClassMap") || /pageClassMap|ui-page-\$\{/.test(fs.readFileSync(path.join(assetsDir, "js", "interface-2046.js"), "utf8"))) {
  fail("legacy-navigation.js / interface-2046.js: ui-page-* classes must come only from the server-rendered body");
}
// Soft navigation re-runs only scripts marked data-page-script (src/data/site.ts). The entrance dialog and the header
// persist with the shell; re-running the entrance opener would reopen the dialog over another page.
if (!legacyNavigationSource.includes(`querySelectorAll('body script[data-page-script], body script[type="module"][src]')`) || legacyNavigationSource.includes("commonScripts") || !readDistPage("index.html").includes("<script data-arrival-gate>")) {
  fail("legacy-navigation.js: soft navigation must re-run only data-page-script scripts, never the entrance opener (data-arrival-gate)");
}
{
  // Every public/assets/js URL carries its content hash, and exactly the scripts that some page lacks are page-scoped.
  const scriptTags = new Map(pages.map((page) => [page, (readDistPage(page) || "").match(/<script\b[^>]*>/g) || []]));
  const filesOn = (tags) => new Set(tags.map((tag) => tag.match(/\bsrc="assets\/js\/([^"?]+)/)?.[1]).filter(Boolean));
  const shellFiles = [...scriptTags.values()].map(filesOn).reduce((shared, files) => new Set([...shared].filter((file) => files.has(file))));
  for (const [page, tags] of scriptTags) {
    for (const tag of tags) {
      if (/data-(?:site-header|arrival-gate)/.test(tag) && tag.includes("data-page-script")) fail(`${page}: shell inline scripts must not carry data-page-script`);
      const match = tag.match(/\bsrc="assets\/js\/([^"?]+)(?:\?v=([^"]*))?"/);
      if (!match) continue;
      const [, file, version] = match;
      const hash = createHash("sha256").update(fs.readFileSync(path.join(assetsDir, "js", file))).digest("hex").slice(0, 10);
      if (version !== hash) fail(`${page}: assets/js/${file} must carry its content hash ?v=${hash}, not ${version ? `?v=${version}` : "no version"}`);
      if (shellFiles.has(file) === tag.includes("data-page-script")) fail(`${page}: assets/js/${file} ${shellFiles.has(file) ? "loads on every page and must not" : "is page-scoped and must"} carry data-page-script`);
    }
  }
  if (!shellFiles.has("legacy-navigation.js") || !shellFiles.has("interface-2046.js")) fail("pages: the shell scripts must load on every page");
}
// The header controller runs as a classic script right after </header>, so the compact phone header is ready before first paint.
for (const page of pages) {
  const html = readDistPage(page);
  if (!html) continue;
  if (!/<\/header>\s*<script data-site-header>[\s\S]*?data-nav-ready[\s\S]*?<\/script>\s*<main\b/i.test(html)) fail(`${page}: site-header.js must be inlined as a classic script directly after </header>`);
  if (html.includes("assets/js/site-header.js")) fail(`${page}: site-header.js must not also load as an external script`);
}
if (!legacyNavigationSource.includes('document.querySelectorAll(".nav a, .nav-log-gate")')) {
  fail("legacy-navigation.js: soft navigation must update the independent Research Log gate");
}

const paperShelf = readDistPage("paper-shelf.html");
// The card count, ids and old #paper-N aliases come from src/data/papers.ts (a JSON literal).
const paperRecords = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "papers.ts"), "utf8").match(/export const papers = ([\s\S]*?) as const;/)?.[1] || "[]");
if (!paperRecords.length || (paperShelf.match(/class="paper-card"/g) || []).length !== paperRecords.length) {
  fail(`paper-shelf.html: expected ${paperRecords.length} paper cards from src/data/papers.ts`);
}
for (const paper of paperRecords) {
  if (!paperShelf.includes(`id="${paper.id}" class="paper-card"`)) fail(`paper-shelf.html: missing card anchor #${paper.id}`);
  if (paper.legacyAnchor && !paperShelf.includes(`id="${paper.legacyAnchor}"`)) fail(`paper-shelf.html: missing old anchor #${paper.legacyAnchor} for ${paper.id}`);
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
if (/Research_Proposal|research proposal/i.test(researchLog + readDistPage("research-graduation.html")) || fs.existsSync(path.join(publicDir, "assets", "files", "Bachelors_Thesis_Research_Proposal.pdf"))) {
  fail("research proposal: no longer published; remove the download links and the PDF");
}
if (!researchLog.includes("Dolomite in the Orgueil CI1 Chondrite")) {
  fail("research-log.html: missing concise display title");
}
if (researchLog.includes("Future Research Project")) {
  fail("research-log.html: empty future-project placeholder must be hidden");
}
if (!researchLog.includes('class="research-dashboard"') || !researchLog.includes("Open protected archive")) {
  fail("research-log.html: missing unified research dashboard");
}
if (researchLog.includes("<h2>Graduation Research</h2>")) {
  fail("research-log.html: graduation project card must use the research title, not the generic label");
}
if (!/<a\b(?=[^>]*href="research-graduation\.html")[^>]*>\s*Open protected archive\s*<\/a>/i.test(researchLog)) {
  fail("research-log.html: dashboard must link to the protected archive");
}
// Project facts render from src/data/project.mjs; scripts/project-facts.test.mjs checks the data itself.
const projectFacts = await import("../src/data/project.mjs");
for (const [file, html, variant] of [["research.html", readDistPage("research.html"), "full"], ["research-log.html", researchLog, "compact"], ["research-graduation.html", readDistPage("research-graduation.html"), "compact"]]) {
  if (file === "research.html") {
    // The page also carries the question in the hidden atlas JSON, so check the visible heading itself.
    const escapedQuestion = projectFacts.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`<h2 id="research-focus-title">\\s*${escapedQuestion}\\s*</h2>`).test(html)) fail("research.html: h2#research-focus-title must state the canonical research question from project.mjs");
    const atlasJson = html.match(/<template data-public-atlas-data>([\s\S]*?)<\/template>/)?.[1] ?? "";
    let atlasQuestion;
    try {
      atlasQuestion = JSON.parse(atlasJson.replace(/&(quot|amp|lt|gt|#39|#x27);/g, (_, name) => ({ quot: '"', amp: "&", lt: "<", gt: ">", "#39": "'", "#x27": "'" })[name])).question;
    } catch {
      atlasQuestion = undefined;
    }
    if (atlasQuestion !== projectFacts.question) fail("research.html: the research atlas data must carry the canonical research question from project.mjs");
  } else if (file !== "research-graduation.html" && !html.includes(projectFacts.question)) fail(`${file}: missing the canonical research question from project.mjs`);
  const chips = [...html.matchAll(/<span class="pathway-chip"[^>]*>([\s\S]*?)<\/span>\s*<\/div>/g)].map((match) => match[1].replace(/<[^>]+>/g, "").replace(/^Status: /, ""));
  if (!html.includes(`data-analytical-pathway="${variant}"`) || chips.length !== projectFacts.pathway.length) fail(`${file}: the Analytical Pathway (${variant}) must render every step with a status chip`);
  if (chips.some((chip) => !projectFacts.pathwayStatuses.includes(chip))) fail(`${file}: unknown or completed Analytical Pathway status (${chips.join(", ")})`);
}
// The public front door describes the archive without exposing any of its metadata.
if (/\bSOL\s*\d|Mission Log \d{2,}|\bLOG\s*\d{3}\b/i.test(researchLog)) {
  fail("research-log.html: must not expose Mission Log entry numbers or SOL values");
}
// Entry dates (YYYY-MM-DD or the Mission Index's YYYY/MM/DD); the public period "2026/04 – present" has no day.
if (/\b20\d\d[-/]\d\d[-/]\d\d\b/.test(researchLog)) {
  fail("research-log.html: must not expose Mission Log entry dates");
}

const shellSource = fs.readFileSync(path.join(root, "src", "components", "LegacyShell.astro"), "utf8");
if (!shellSource.includes("data-nav-toggle") || !shellSource.includes("data-mobile-nav")) {
  fail("LegacyShell: missing compact mobile navigation contract");
}
const siteDataSource = fs.readFileSync(path.join(root, "src", "data", "site.ts"), "utf8");
const stylesheetOrder = [...(siteDataSource.match(/export const stylesheets = \[([\s\S]*?)\]/)?.[1] || "").matchAll(/"([^"]+\.css)"/g)].map((match) => match[1]);
if (stylesheetOrder.indexOf("tokens.css") < 0 || stylesheetOrder.indexOf("tokens.css") > stylesheetOrder.indexOf("shell-evolution.css")) {
  fail("site.ts: evolution tokens must load before component styles");
}
const publicStylesheets = fs.readdirSync(path.join(assetsDir, "css")).filter((name) => name.endsWith(".css"));
for (const name of publicStylesheets) {
  if (!stylesheetOrder.includes(name)) fail(`site.ts: ${name} is not in the stylesheet bundle order, so no page loads it`);
}
if (!/<link\s+rel="stylesheet"\s+href=\{`assets\/css\/site\.css\?v=\$\{stylesheetVersion\}`\}>/.test(shellSource)) {
  fail("LegacyShell: pages must link the generated stylesheet bundle");
}
// Component stylesheets in src/ are appended to the bundle after the public ones (componentStylesheets in site.ts).
// A CSS import in a component would make Astro emit a second render-blocking /_astro/*.css sheet.
const componentStylesheetOrder = [...(siteDataSource.match(/export const componentStylesheets = \[([\s\S]*?)\]/)?.[1] || "").matchAll(/"([^"]+\.css)"/g)].map((match) => match[1]);
for (const name of componentStylesheetOrder) {
  if (!fs.existsSync(path.join(root, name))) fail(`site.ts: component stylesheet ${name} does not exist`);
}
for (const file of collectFiles(path.join(root, "src")).filter((name) => /\.(astro|[cm]?[jt]s)$/.test(name))) {
  if (/^\s*import\s+["'][^"']+\.css["']/m.test(fs.readFileSync(file, "utf8"))) {
    fail(`${path.relative(root, file).replace(/\\/g, "/")}: imports a stylesheet; add it to componentStylesheets in src/data/site.ts so pages keep one stylesheet request`);
  }
}
const stylesheetBundlePath = path.join(distDir, "assets", "css", "site.css");
if (!fs.existsSync(stylesheetBundlePath)) {
  fail("Missing generated stylesheet bundle: assets/css/site.css");
} else {
  const bundle = fs.readFileSync(stylesheetBundlePath, "utf8");
  let lastIndex = -1;
  for (const name of [...stylesheetOrder, ...componentStylesheetOrder]) {
    const index = bundle.indexOf(`/*! ${name} */`);
    if (index <= lastIndex) fail(`assets/css/site.css: ${name} is missing or out of cascade order`);
    lastIndex = index;
  }
}
const astroStylesheets = fs.existsSync(path.join(distDir, "_astro")) ? fs.readdirSync(path.join(distDir, "_astro")).filter((name) => name.endsWith(".css")) : [];
if (astroStylesheets.length) fail(`_astro: ${astroStylesheets.join(", ")} is a second stylesheet; fold it into the bundle (componentStylesheets in src/data/site.ts)`);
for (const file of fs.readdirSync(distDir).filter((name) => name.endsWith(".html") && name !== "sample-cabinet.html")) {
  const links = readDistPage(file).match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) || [];
  if (links.length !== 1 || !/href="assets\/css\/site\.css\?v=[0-9a-f]{10}"/.test(links[0])) {
    fail(`${file}: expected exactly one stylesheet link, the versioned assets/css/site.css (found ${links.length})`);
  }
}
// The retired Sample Cabinet URL is a shell-less noindex redirect to Research, with no dolomite wording.
const sampleCabinetStub = readDistPage("sample-cabinet.html");
if (!sampleCabinetStub.includes('<meta name="robots" content="noindex">') || !sampleCabinetStub.includes('<link rel="canonical" href="https://erdwmads.github.io/research.html">') || !sampleCabinetStub.includes('<meta http-equiv="refresh" content="0; url=research.html">') || !sampleCabinetStub.includes('<a href="research.html">This page has moved to Research.</a>') || /dolomite/i.test(sampleCabinetStub)) {
  fail("sample-cabinet.html: must be a noindex redirect stub to research.html");
}
// Every generated page, including Origins and 404 (but not the Sample Cabinet redirect stub): the owner's name in the
// page metadata, and the footer ORCID iD.
const titleSuffix = `| ${expectedDisplayName}`;
for (const file of fs.readdirSync(distDir).filter((name) => name.endsWith(".html") && name !== "sample-cabinet.html")) {
  const html = fs.readFileSync(path.join(distDir, file), "utf8");
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  if (!title.endsWith(titleSuffix)) fail(`${file}: <title> must end with "${titleSuffix}"`);
  for (const property of ["og:title", "twitter:title"]) {
    const content = (html.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`)) || [])[1] || "";
    if (!content.endsWith(titleSuffix)) fail(`${file}: ${property} must end with "${titleSuffix}"`);
  }
  if (!html.includes(`<meta property="og:site_name" content="${expectedDisplayName} Academic Website">`)) fail(`${file}: og:site_name must be the site title`);
  if (!html.includes(`<meta name="author" content="${expectedDisplayName}">`)) fail(`${file}: missing author metadata`);
  const footerStart = html.indexOf('<footer class="site-footer">');
  const footer = footerStart >= 0 ? html.slice(footerStart) : "";
  if (!footer.includes(`© 2026 ${expectedDisplayName}`) || !footer.includes(`href="${orcidUrl}"`) || !footer.includes(`src="${orcidIcon}"`)) {
    fail(`${file}: footer must carry the owner's name and the ORCID iD with the local iD icon`);
  }
  if (/(?:\bsrcset?\s*=\s*["']?[^"'>]*|url\(\s*["']?)https?:\/\/[^"'\s)>]*orcid/i.test(html)) fail(`${file}: the ORCID iD icon must be served locally`);
  if (/[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?!(?:png|jpe?g|webp|avif|gif|svg)\b)[a-z]{2,}\b/i.test(decodeText(html))) {
    fail(`${file}: plain email address in static HTML`);
  }
}
for (const [file, marker] of [
  ["index.html", `<h1 id="home-name">${expectedDisplayName}</h1>`],
  ["index.html", `<span class="person-name">${expectedFullName}</span>`],
  ["cv.html", `<p class="cv-identity"><span class="person-name">${expectedDisplayName}</span> `],
  ["cv.html", `<p class="cv-citation">Cite as <span class="person-name">Lieu, I. M.</span></p>`],
  ["contact.html", `<h3 class="person-name">${expectedDisplayName}</h3>`]
]) {
  if (!readDistPage(file).includes(marker)) fail(`${file}: missing the owner's name in ${marker}`);
}

// Every generated text file: no retired name, and the email only as "madslieu [at] gmail [dot] com" with no mailto.
// contact.js assembles the address and its mailto at runtime; cv.js decodes it only for printing.
for (const filePath of collectFiles(distDir).filter((file) => textFilePattern.test(file))) {
  const relativePath = path.relative(distDir, filePath).replace(/\\/g, "/");
  const text = fs.readFileSync(filePath, "utf8");
  const decoded = decodeText(text);
  if (staleNamePattern.test(withoutHeldNames(relativePath, decoded))) fail(`${relativePath}: stale display-name spelling`);
  const flat = decoded.replace(/<[^>]*>/g, "").replace(/\s+/g, "").toLowerCase();
  for (const needle of [publicEmail, "madslieu@", "rivieraliuyong", "fuji.waseda"]) {
    if (flat.includes(needle)) fail(`${relativePath}: publish the email only as "${publicEmailShown}"`);
  }
  const runtimeMailto = relativePath === "assets/js/contact.js" && text.split("mailto:").length === 2 && text.includes("'mailto:'+email");
  if (/mailto:/i.test(decoded.replace(/\s+/g, "")) && !runtimeMailto) fail(`${relativePath}: no mailto links; contact.js adds one at runtime`);
}
for (const file of ["README.md", "src", "public"].flatMap((target) => collectFiles(path.join(root, target)))) {
  if (!textFilePattern.test(file)) continue;
  const flat = decodeText(fs.readFileSync(file, "utf8")).replace(/\s+/g, "").toLowerCase();
  if (flat.includes(publicEmail) || flat.includes("rivieraliuyong")) fail(`${path.relative(root, file)}: the email must not appear in full in the source`);
}
const contactPage = readDistPage("contact.html");
if (!contactPage.includes(`<code data-email-address>${publicEmailShown}</code>`) || !/data-email-actions hidden/.test(contactPage)) {
  fail("contact.html: expected the obfuscated address with script-only actions");
}
if (!readDistPage("cv.html").includes(`<span data-email-print>${publicEmailShown}</span>`)) fail("cv.html: expected the obfuscated print address");
for (const iconPath of [path.join(publicDir, orcidIcon), path.join(distDir, orcidIcon)]) {
  if (!fs.existsSync(iconPath) || createHash("sha256").update(fs.readFileSync(iconPath)).digest("hex") !== orcidIconSha256) {
    fail(`${path.relative(root, iconPath)}: the ORCID iD icon must be ORCID's unmodified official SVG`);
  }
}
for (const file of ["index.html", "cv.html", "contact.html"]) {
  const html = readDistPage(file);
  if (!html.includes(`<span>${orcidUrl}</span>`) || !html.includes(`src="${orcidIcon}" width="24" height="24" alt="ORCID iD"`)) {
    fail(`${file}: expected the full ORCID iD link with the 24px iD icon`);
  }
}
const homeSchema = (readDistPage("index.html").match(/<script type="application\/ld\+json">([^<]+)<\/script>/) || [])[1];
try {
  // Home publishes a WebSite node and a ProfilePage whose mainEntity is the Person.
  const graph = JSON.parse(homeSchema)["@graph"] || [];
  const profile = graph.find((node) => node["@type"] === "ProfilePage");
  const person = profile?.mainEntity || {};
  const names = [person["@type"], person.name, person.givenName, person.familyName, JSON.stringify(person.alternateName)];
  const expectedNames = ["Person", expectedDisplayName, "Ioong Mads", "Lieu", JSON.stringify([expectedFullName, formerName])];
  if (names.join("\n") !== expectedNames.join("\n") || !person.sameAs?.includes(orcidUrl) || JSON.stringify(graph).includes("@gmail")) {
    fail("index.html: Person structured data must carry the name, given and family names, alternate names and ORCID iD, without the email");
  }
  if (profile.url !== "https://erdwmads.github.io/" || !graph.some((node) => node["@type"] === "WebSite" && node.url === profile.url)) {
    fail("index.html: structured data must describe the WebSite and the ProfilePage at the site root");
  }
} catch {
  fail("index.html: missing or unreadable Person structured data");
}
const graduationPage = readDistPage("research-graduation.html");
if (!researchPage.includes("<dd>Ca–Mg carbonate <span>Reported as dolomite</span></dd>")) {
  fail("research.html: mineral record must read Ca–Mg carbonate, reported as dolomite");
}
for (const [file, html] of [["index.html", homePage], ["research.html", researchPage], ["research-graduation.html", graduationPage]]) {
  if (/primitive chondritic constituent/i.test(html)) fail(`${file}: use the plain-English formation wording`);
}
if (!researchPage.includes("EBSD-guided FIB preparation") || !researchPage.includes("not a checklist of completed results")) {
  fail("research.html: Analytical Pathway must show the planned EBSD-guided FIB step and the not-completed caveat");
}
if (!readDistPage("cv.html").includes('<h2 class="section-label">Research experience</h2>')) {
  fail("cv.html: missing Research experience entry");
}
const originsPage = readDistPage("origins-study.html");
if (!/<dialog\b(?=[^>]*\bid="sources")(?=[^>]*\baria-labelledby="sources-title")/.test(originsPage) || !originsPage.includes('id="sources-title"')) {
  fail("origins-study.html: the scientific-context dialog must be named by its heading");
}
if (!/<div class="planetary-stage" data-stage[^>]*aria-describedby="planetary-stage-hint"/.test(comparisonPage) || !comparisonPage.includes('id="planetary-stage-hint"')) {
  fail("ryugu-bennu.html: the planetary viewer must describe its keyboard controls");
}
if (!graduationPage.includes("assets/js/research-lock.js") || !graduationPage.includes("data-research-lock-gate") || !graduationPage.includes("data-research-lock-content")) {
  fail("research-graduation.html: missing password gate");
}

const photographyPage = readDistPage("photography.html");
if (!photographyPage.includes('data-full-src="assets/img/photo%20%281%29.jpg"')) {
  fail("Photography: missing separate full-image source");
}
if (!photographyPage.includes("assets/img/thumbs/photography/photo-01.webp")) {
  fail("Photography: missing derivative thumbnail source");
}
if ((photographyPage.match(/data-full-src="assets\/img\/photo%20%28\d+%29\.jpg"/g) || []).length !== 21) {
  fail("Photography: expected 21 independently hydratable full-image sources");
}
for (const [tier, expected] of [["w640", 21], ["w960", 21], ["w1600", 1]]) {
  const count = collectFiles(path.join(assetsDir, "img", "photography", tier)).filter((file) => file.endsWith(".webp")).length;
  if (count !== expected) fail(`Photography: expected ${expected} ${tier} WebP tiers, found ${count} (npm run images:derive photography)`);
}
if ((photographyPage.match(/assets\/img\/photography\/w(?:640|960)\/photo-\d\d\.webp (?:640|960)w/g) || []).length !== 42 || !photographyPage.includes("assets/img/photography/w1600/photo-11.webp 1600w")) {
  fail("Photography: srcset must list the 640w and 960w WebP tiers for every photograph and 1600w for the panorama");
}
if (!photographyPage.includes('<h2 class="section-label">Camera</h2>') || (photographyPage.match(/<s class="del">Hasselblad X2D<\/s><span class="visually-hidden"> \(crossed out\)<\/span>/g) || []).length !== 2) {
  fail("Photography: Camera must be an h2 and the crossed-out camera must be announced");
}
if (!photographyPage.includes('class="photo-wall"') || photographyPage.includes('assets/js/photography.js')) {
  fail("Photography: expected a static photo wall without the retired autoplay controller");
}
if (!graduationPage.includes('data-protected-archive-url="assets/data/mission-log.enc.json"')) {
  fail("research-graduation.html: missing protected Mission Log archive URL");
}
if (!graduationPage.includes('aria-describedby="research-lock-error"') || !graduationPage.includes('id="research-lock-error"') || !graduationPage.includes('role="alert"')) {
  fail("research-graduation.html: password errors must be announced to assistive technology");
}
if (!/<form\b(?=[^>]*data-research-lock-form)(?=[^>]*method="post")/i.test(graduationPage)) {
  fail("research-graduation.html: password form must use POST");
}
if (graduationPage.includes("assets/data/mission-log.json") || graduationPage.includes("data-mission-data-url")) {
  fail("research-graduation.html: Mission Log must not declare a plaintext data source");
}
if (!graduationPage.includes('data-mission-auto-start="false"')) {
  fail("research-graduation.html: Mission Log must wait for protected archive unlock");
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

const sitemapPath = path.join(distDir, "sitemap.xml");
if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  if (sitemap.includes("sample-cabinet.html")) {
    fail("sitemap.xml: retired hidden Sample Cabinet page must not be indexed");
  }
  // Home is listed at the root, like its canonical URL; build-date lastmod stamps are not published.
  if (!sitemap.includes("<loc>https://erdwmads.github.io/</loc>") || sitemap.includes("index.html") || /<lastmod>|<changefreq>/.test(sitemap)) {
    fail("sitemap.xml: list Home at the site root, without build-date lastmod or changefreq");
  }
}
if (!readDistPage("index.html").includes('<link rel="canonical" href="https://erdwmads.github.io/">')) {
  fail("index.html: the Home canonical URL must be the site root");
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
if (!interface2046.includes("mads:fx-state") || !interface2046.includes("syncOrbitalSystem")) {
  fail("interface-2046.js: orbital system must mount only while ambient FX is enabled");
}

const researchCoordinates = fs.readFileSync(path.join(assetsDir, "js", "research-coordinates.js"), "utf8");
if (!researchCoordinates.includes("MOBILE_COORDINATES_MEDIA") || !researchCoordinates.includes("removeCoordinates")) {
  fail("research-coordinates.js: mobile views must not create the supporting coordinates panel");
}
if (!researchCoordinates.includes('location.pathname.includes("ryugu-bennu")') || !researchCoordinates.includes('mode = "Comparison"') || researchCoordinates.includes('phase = "Dolomite"') || researchCoordinates.includes("sample-cabinet")) {
  fail("research-coordinates.js: HUD must label Ryugu & Bennu as a comparison, default to Ca–Mg carbonate and drop Sample Cabinet");
}
if (researchCoordinates.includes("6ﾃ・")) {
  fail("research-coordinates.js: photography camera label contains mojibake");
}

const shellEvolution = fs.readFileSync(path.join(assetsDir, "css", "shell-evolution.css"), "utf8");
if (!shellEvolution.includes("body .research-coordinates") || !shellEvolution.includes("body .ui2046-progress")) {
  fail("shell-evolution.css: mobile lightweight mode must hide supporting HUD elements");
}
if (!/body \.header-inner\s*\{[\s\S]*?min-height:\s*0\s*!important[\s\S]*?padding:\s*0\s*!important/.test(shellEvolution)) {
  fail("shell-evolution.css: compact mobile header must clear legacy height and padding");
}

const collapsibleNavigationMedia = "(max-width: 760px)";
if (!shellEvolution.includes(`@media ${collapsibleNavigationMedia}`)) {
  fail("shell-evolution.css: collapsible navigation breakpoint must match the script");
}
if (/\(hover:\s*hover\)[\s\S]*?\(pointer:\s*fine\)/.test(shellEvolution)
  || /html\.mobile-nav-open body \.header-actions\s*\{[^}]*position:\s*absolute\s*!important/is.test(shellEvolution)) {
  fail("shell-evolution.css: mobile navigation must not change layout by pointer type or overlay page content");
}
const widerMobileGrid = shellEvolution.slice(shellEvolution.lastIndexOf("/* wider-mobile-nav-grid */"));
if (!widerMobileGrid.startsWith("/* wider-mobile-nav-grid */")
  || !widerMobileGrid.includes("@media (min-width: 400px) and (max-width: 760px)")
  || !/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*!important/.test(widerMobileGrid)) {
  fail("shell-evolution.css: wider phones must use the compact three-column navigation grid");
}

const siteHeaderScript = fs.readFileSync(path.join(assetsDir, "js", "site-header.js"), "utf8");
if (!siteHeaderScript.includes(`const COLLAPSIBLE_NAVIGATION_MEDIA = "${collapsibleNavigationMedia}"`)) {
  fail("site-header.js: navigation state must use the same narrow-window breakpoint as CSS");
}

const styleCss = fs.readFileSync(path.join(assetsDir, "css", "style.css"), "utf8");
if (!styleCss.includes('content: "\\2192" / "" !important;') || !styleCss.includes('content: "ID" / "" !important;')) {
  fail("style.css: home hero glyphs must keep empty alt text so the links are named Research and CV");
}
if (styleCss.includes("asteroid-bennu.webp") || !fs.existsSync(path.join(assetsDir, "img", "asteroid-bennu-1600.webp"))) {
  fail("style.css: the page background must use the grayscale asteroid-bennu-1600.webp derivative");
}
if (styleCss.includes("/* compact-desktop-header */")) {
  fail("style.css: narrow desktop navigation must not remain permanently expanded");
}
const mediumDesktopHeader = styleCss.slice(styleCss.lastIndexOf("/* medium-desktop-header */"));
if (!mediumDesktopHeader.startsWith("/* medium-desktop-header */")
  || !/@media \(min-width:\s*761px\) and \(max-width:\s*1040px\)/.test(mediumDesktopHeader)
  || !/\.header-actions\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content\s+max-content\s*!important/.test(mediumDesktopHeader)
  || !/\.header-actions \.nav\s*\{[\s\S]*?grid-column:\s*auto\s*!important[\s\S]*?display:\s*flex\s*!important/.test(mediumDesktopHeader)) {
  fail("style.css: medium desktop header must keep navigation and actions on one compact row");
}
const corruptedCssContent = styleCss
  .split(/\r?\n/)
  .filter((line) => /\bcontent\s*:/.test(line) && /[鬯驛郢繝譎髫]/.test(line));
if (corruptedCssContent.length > 0) {
  fail(`style.css: ${corruptedCssContent.length} rendered content declarations contain mojibake`);
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
const uiRegressionGuards = styleCss.slice(styleCss.lastIndexOf("/* ui-regression-guards */"));
if (!uiRegressionGuards.startsWith("/* ui-regression-guards */")) {
  fail("style.css: missing final UI regression guards");
} else {
  if (!/\[hidden\]\s*\{[\s\S]*?display:\s*none\s*!important[\s\S]*?\}/.test(uiRegressionGuards)) {
    fail("style.css: hidden password-gate elements must stay visually hidden");
  }
  if (!/\.mission-log-entry\s+\.research-note-body\s*\{[\s\S]*?min-width:\s*0[\s\S]*?width:\s*100%[\s\S]*?max-width:\s*100%[\s\S]*?\}/.test(uiRegressionGuards)) {
    fail("style.css: Mission Log body must not retain a desktop intrinsic width on mobile");
  }
  if (!/\.mission-lightbox__captionbar\s*\{[\s\S]*?display:\s*grid\s*!important[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s*!important[\s\S]*?\}/.test(uiRegressionGuards)) {
    fail("style.css: Mission Log caption bar must reserve a wrapping text column");
  }
  if (!/\.mission-lightbox__caption\s*\{[\s\S]*?min-width:\s*0\s*!important[\s\S]*?\}/.test(uiRegressionGuards)) {
    fail("style.css: Mission Log caption must be allowed to wrap inside the viewport");
  }
}
// The Research Log gate is written once in its block at the end of shell-evolution.css.
const navLogGateBlock = shellEvolution.slice(shellEvolution.lastIndexOf("/* Research Log gate"));
if (!navLogGateBlock.startsWith("/* Research Log gate")) {
  fail("shell-evolution.css: missing the Research Log gate block");
} else {
  if (!/body#academic-site \.nav-log-gate\s*\{[^}]*position:\s*relative\s*!important[^}]*\}/.test(navLogGateBlock)) {
    fail("shell-evolution.css: Research Log navigation gate must contain its decorative layers");
  }
  if (!/body#academic-site \.nav-log-gate::before,\s*html\[data-theme\] body#academic-site \.nav-log-gate::after\s*\{[^}]*pointer-events:\s*none\s*!important[^}]*\}/.test(navLogGateBlock)) {
    fail("shell-evolution.css: Research Log decorative layers must not intercept navigation clicks");
  }
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
  if (!researchLock.includes("sessionNotice?.focus?.({ preventScroll: true })") || !researchLock.includes("'Mission Log unlocked · '")) {
    fail("research-lock.js: unlock must focus the session notice that states the record count");
  }
}
const missionIndexPath = path.join(assetsDir, "js", "mission-index.js");
const missionIndex = fs.readFileSync(missionIndexPath, "utf8");
if (missionIndex.includes("assets/data/mission-log.json")) {
  fail("mission-index.js: Mission Log UI must not request a plaintext archive");
}
if (/\bfetch\s*\(/.test(missionIndex) || missionIndex.includes("dataEl") || missionIndex.includes("mission-log-data")) {
  fail("mission-index.js: Mission Log entries must only come from the protected in-memory archive");
}
for (const protectedUiScript of ["research-lock.js", "mission-index.js", "mission-lightbox.js"]) {
  const scriptPath = path.join(assetsDir, "js", protectedUiScript);
  if (!fs.existsSync(scriptPath)) {
    fail(`${protectedUiScript}: missing protected Mission Log UI script`);
    continue;
  }
  const script = fs.readFileSync(scriptPath, "utf8");
  if (script.includes("assets/data/mission-log.json") || script.includes("assets/img/mission-log/")) {
    fail(`${protectedUiScript}: protected UI scripts must not contain a plaintext Mission Log URL`);
  }
}
const missionLogShell = fs.readFileSync(path.join(root, "src", "components", "MissionLogShell.astro"), "utf8");
if (missionLogShell.includes("assets/data/mission-log.json") || missionLogShell.includes("data-mission-data-url")) {
  fail("MissionLogShell.astro: Mission Log must not declare a plaintext data source");
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
if (!missionLightbox.includes("mobile-mission-lightbox-disabled") || !missionLightbox.includes("if (locked || isTouch) return;") || !missionLightbox.includes("setBackgroundInert(true)")) {
  fail("mission-lightbox.js: phones keep inline figures (no viewer buttons) and the open viewer makes the page behind it inert");
}
if (/data-mission-index-list[^>]*aria-live/.test(missionLogShell)) {
  fail("MissionLogShell.astro: the Mission Index must not be a live region; unlock moves focus to the session notice instead");
}
if (fs.existsSync(path.join(root, "src", "legacy", "research-graduation-inline-scripts.html"))) {
  fail("src/legacy/research-graduation-inline-scripts.html: unused fragment must stay deleted; the phone guard lives in mission-lightbox.js");
}
const deployWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "deploy.yml"), "utf8");
if (!/run: npm run test:unit\b/.test(deployWorkflow) || /runs-on:\s*ubuntu-latest/.test(deployWorkflow)) {
  fail(".github/workflows/deploy.yml: CI must run the whole unit suite on a pinned runner image");
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

// Orphaned files (scripts/orphan-files.mjs): delete retired fragments, scripts and modules instead of keeping them.
const orphans = findOrphanedFiles(root, { distDir });
for (const file of orphans.legacy) fail(`${file}: legacy fragment is not imported by any page or component`);
for (const file of orphans.publicScripts) fail(`${file}: not loaded by src/data/site.ts, a component or any built page`);
for (const { file, testOnly } of orphans.srcScripts) {
  fail(`${file}: not reachable from any page or component${testOnly ? " (only tests import it; retire it with its tests)" : ""}`);
}

// Content Security Policy (src/lib/csp.mjs, rendered by LegacyShell.astro and the Sample Cabinet stub) and the
// external-request guard, over every generated page. Soft navigation keeps the meta policy of the first page it
// loads and runs the next page's data-page-script inline scripts again (research.html's forwarder), so all pages
// carry one policy that lists every inline script's hash.
const csp = await import("../src/lib/csp.mjs");
const siteOrigin = "https://erdwmads.github.io";
const htmlPages = fs.readdirSync(distDir).filter((name) => name.endsWith(".html")).sort();
const pagePolicies = new Map();
const inlineScriptHashes = new Map();
for (const file of htmlPages) {
  const html = readDistPage(file);
  const metas = csp.policyMetas(html);
  if (metas.length !== 1) {
    fail(`${file}: expected one Content-Security-Policy meta tag, found ${metas.length}`);
  } else {
    const headEnd = html.search(/<\/head\s*>/i);
    const firstScript = html.search(/<script\b/i);
    if (headEnd < 0 || metas[0].index > headEnd || (firstScript >= 0 && metas[0].index > firstScript)) {
      fail(`${file}: the Content-Security-Policy meta must be in <head> before the first script (a meta policy only governs what follows it)`);
    }
    pagePolicies.set(file, metas[0].content);
  }
  for (const { tag, hash } of csp.executableInlineScripts(html)) {
    if (!inlineScriptHashes.has(hash)) inlineScriptHashes.set(hash, `${file} ${tag}`);
  }
  for (const problem of csp.pageRequestProblems(html, siteOrigin)) {
    if (problem.kind === "external") fail(`${file}: external request ${problem.url.slice(0, 80)} in ${problem.tag}; serve it from this site`);
    else if (problem.kind === "inline-handler") fail(`${file}: inline event handler in ${problem.tag.slice(0, 80)} (the policy blocks it; use a script file)`);
    else fail(`${file}: javascript: URL in ${problem.tag.slice(0, 80)} (the policy blocks it)`);
  }
}
for (const file of collectFiles(distDir).filter((name) => name.endsWith(".css"))) {
  for (const url of csp.externalCssUrls(fs.readFileSync(file, "utf8"), siteOrigin)) fail(`${path.relative(distDir, file).replace(/\\/g, "/")}: external CSS url(${url.slice(0, 80)}); serve it from this site`);
}
if (new Set(pagePolicies.values()).size > 1) {
  fail(`Content-Security-Policy differs between pages (${[...pagePolicies.keys()].join(", ")}); every page must render the one policy from src/lib/inline-scripts.ts`);
}
// Each distinct policy is checked once, labelled with the pages that carry it.
const policyPages = new Map();
for (const [file, policy] of pagePolicies) policyPages.set(policy, [...(policyPages.get(policy) || []), file]);
for (const [policy, files] of policyPages) {
  const file = files.length === htmlPages.length ? "every page" : files.join(", ");
  const directives = csp.parsePolicy(policy);
  const expected = new Map(csp.policyDirectives.map(([name, ...sources]) => [name, sources]));
  for (const name of directives.keys()) if (!expected.has(name)) fail(`${file}: unexpected CSP directive ${name}`);
  for (const [name, sources] of expected) {
    const actual = directives.get(name) || [];
    const extra = actual.filter((source) => !sources.includes(source) && !(name === "script-src" && /^'sha256-[A-Za-z0-9+/]{43}='$/.test(source)));
    if (sources.some((source) => !actual.includes(source)) || extra.length) fail(`${file}: CSP ${name} must be "${sources.join(" ")}"${name === "script-src" ? " plus inline-script hashes" : ""}, found "${actual.join(" ")}"`);
  }
  const scriptSources = directives.get("script-src") || [];
  for (const [hash, where] of inlineScriptHashes) {
    if (!scriptSources.includes(hash)) fail(`${file}: CSP script-src does not allow the inline script ${where.slice(0, 100)} (${hash}); render it from src/lib/inline-scripts.ts`);
  }
  for (const hash of scriptSources.filter((source) => source.startsWith("'sha256-") && !inlineScriptHashes.has(source))) {
    fail(`${file}: CSP script-src lists ${hash}, which matches no inline script on the site; remove it from src/lib/inline-scripts.ts`);
  }
}

if (failures.length) {
  console.error("Site check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Site check passed: ${pages.length} public pages, protected Mission Log, local assets, SEO metadata, and Paper Shelf.`);
