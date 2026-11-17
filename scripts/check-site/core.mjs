// check-site/core.mjs (owner WP1): metadata, identity, CSP, scripts and the soft-navigation contract, protected canaries, orphans, deploy.
// Moved verbatim from scripts/check-site.mjs; scripts/check-site.mjs runs every module in order.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { findOrphanedFiles } from "../orphan-files.mjs";
import { read, shell } from "../lib/site-paths.mjs";

export default async function checkCore({ root, distDir, publicDir, assetsDir, pages, fail, readDistPage, collectFiles }) {
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

  const legacyShellSource = read(shell.file);
  if (/<script\b[^>]*\bsrc=["']assets\/js\/(?:power-manager|legacy-navigation)\.js["']/i.test(legacyShellSource)) {
    fail(`${shell.name}.astro: public runtime scripts must be emitted as raw HTML instead of Vite module imports`);
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

  const pptDataPath = path.join(distDir, "ppt-data.json");

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

  if (!/<dialog id="cosmic-arrival"[\s\S]*?<\/dialog>\s*<a class="site-skip-link" href="#main-content">/.test(homePage)) {
    fail("index.html: the skip link must follow the entrance dialog so the first Tab after the entrance reaches it");
  }

  const legacyNavigationSource = fs.readFileSync(path.join(root, "public", "assets", "js", "legacy-navigation.js"), "utf8");
  // ui-page-* classes come only from SiteShell; soft navigation copies them from the fetched page.
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

  const deployWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "deploy.yml"), "utf8");
  if (!/run: npm run test:unit\b/.test(deployWorkflow) || /runs-on:\s*ubuntu-latest/.test(deployWorkflow)) {
    fail(".github/workflows/deploy.yml: CI must run the whole unit suite on a pinned runner image");
  }

  // Orphaned files (scripts/orphan-files.mjs): delete retired fragments, scripts and modules instead of keeping them.
  const orphans = findOrphanedFiles(root, { distDir });
  for (const file of orphans.legacy) fail(`${file}: legacy fragment is not imported by any page or component`);
  for (const file of orphans.publicScripts) fail(`${file}: not loaded by src/data/site.ts, a component or any built page`);
  for (const { file, testOnly } of orphans.srcScripts) {
    fail(`${file}: not reachable from any page or component${testOnly ? " (only tests import it; retire it with its tests)" : ""}`);
  }

  // Content Security Policy (src/lib/csp.mjs, rendered by SiteShell.astro and the Sample Cabinet stub) and the
  // external-request guard, over every generated page. Soft navigation keeps the meta policy of the first page it
  // loads and runs the next page's data-page-script inline scripts again (research.html's forwarder), so all pages
  // carry one policy that lists every inline script's hash.
  const csp = await import("../../src/lib/csp.mjs");
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
  // Folio additions (spec §3.1, §5 row 35, §6.5), with the package that rebuilt each page.
  const pageOwners = {
    "index.html": "WP3", "research.html": "WP3", "research-log.html": "WP3",
    "ryugu-bennu.html": "WP4", "origins-study.html": "WP4",
    "paper-shelf.html": "WP5", "photography.html": "WP5", "cv.html": "WP5", "contact.html": "WP5", "404.html": "WP5",
    "research-graduation.html": "WP6"
  };
  const shellPages = Object.keys(pageOwners);
  const mainOf = (html) => {
    const start = html.search(/<main\b/);
    const end = html.indexOf("</main>", start);
    return start < 0 || end < 0 ? "" : html.slice(start, end).replace(/<!--[\s\S]*?-->|<(script|template)\b[\s\S]*?<\/\1>/gi, "");
  };

  // Every plate carries its label, credit and evidence line (Plate.astro refuses to build without them; this holds
  // hand-written plates to the same rule).
  for (const file of shellPages) {
    for (const [plate] of mainOf(readDistPage(file)).matchAll(/<figure\b[^>]*\bclass="[^"]*\bplate\b[^"]*"[^>]*>[\s\S]*?<\/figure>/g)) {
      for (const [part, pattern] of [["label", /class="plate__label"/], ["credit", /class="plate__credit"/], ["evidence line", /data-evidence-status="/]]) {
        if (!pattern.test(plate)) fail(`${file}: a figure.plate has no ${part} (${plate.slice(0, 80)})`);
      }
    }
  }

  // Every image in main is a figure (a plate or a plain figure), except where the image is the interface itself: the
  // photo wall, the image inspector, scene posters, protected content, and icons inside links and buttons.
  const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
  const tagPattern = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
  const exempt = (element) =>
    ["figure", "a", "button"].includes(element.tag) ||
    /\b(?:photo-wall|image-inspector|scene-poster)\b/.test(element.className) ||
    /\bdata-(?:image-inspector|protected-archive|mission-log-list)\b/.test(element.attributes);
  for (const file of shellPages) {
    const stack = [];
    const loose = [];
    for (const [, closing, name, attributes] of mainOf(readDistPage(file)).matchAll(tagPattern)) {
      const tag = name.toLowerCase();
      if (closing) {
        const open = stack.map((element) => element.tag).lastIndexOf(tag);
        if (open >= 0) stack.length = open;
      } else if (tag === "img") {
        if (!stack.some(exempt)) loose.push(attributes.match(/\bsrc="([^"]*)"/)?.[1] || attributes.match(/\b(data-[\w-]+)/)?.[1] || "img");
      } else if (!voidElements.has(tag)) {
        stack.push({ tag, attributes, className: attributes.match(/\bclass="([^"]*)"/)?.[1] || "" });
      }
    }
    if (loose.length) fail(`${file} (${pageOwners[file]}): ${loose.length} image(s) in main outside a figure (Plate or Figure): ${loose.join(", ")}`);
  }

  // Preserved concepts stay on their pages, in the visible text: case-insensitive, since CSS may set a kicker in
  // capitals, except SOL, which is a word in capitals.
  const visibleText = (html) => html.replace(/<head>[\s\S]*?<\/head>|<(script|style|template)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const [term, pattern, files] of [
    ["Mission Log", /Mission Log/i, ["research-log.html", "research-graduation.html"]],
    ["Mission Index", /Mission Index/i, ["research-log.html", "research-graduation.html"]],
    ["SOL", /\bSOL\b/, ["research-log.html"]],
    ["Current Focus", /Current focus/i, ["index.html"]],
    ["Analytical Pathway", /Analytical Pathway/i, ["research.html", "research-log.html", "research-graduation.html"]],
    ["Astromineralogy", /Astromineralogy/i, ["index.html", "research.html"]],
    ["Orgueil CI1 chondrite", /Orgueil CI1 chondrite/i, ["index.html", "research.html", "research-log.html"]],
    ["Dolomite in Orgueil CI1", /Dolomite in Orgueil CI1/i, ["index.html"]]
  ]) {
    for (const file of files) {
      if (!pattern.test(visibleText(readDistPage(file)))) fail(`${file}: the preserved concept "${term}" must stay on this page`);
    }
  }
  // Interface 2046 and the revision date reach every page through the footer colophon (SiteFooter, WP2).
  const withoutColophon = [];
  for (const file of shellPages) {
    const html = readDistPage(file);
    const footer = html.slice(html.indexOf('<footer class="site-footer">'));
    if (!/class="footer-colophon"/.test(footer)) {
      withoutColophon.push(file);
      continue;
    }
    if (!/Interface 2046/i.test(visibleText(footer))) fail(`${file}: the footer colophon must name Interface 2046`);
    const revision = footer.match(/<time datetime="(\d{4}-\d{2}-\d{2})">([^<]*)<\/time>/);
    if (!revision || revision[1] !== revision[2]) fail(`${file}: the colophon revision must be a static ISO date, <time datetime="YYYY-MM-DD">YYYY-MM-DD</time>`);
  }
  if (withoutColophon.length) {
    fail(`no footer colophon on ${withoutColophon.length} pages (${withoutColophon.join(", ")}); it carries "Interface 2046" and the static revision date from src/lib/revision.ts`);
  }
}
