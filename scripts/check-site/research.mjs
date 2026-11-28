// check-site/research.mjs (owner WP3): Home, Research and the public Research Log, checked in the built pages.
// scripts/check-site.mjs runs every module in order; the CSS mechanics of this area are in style-contract/research.mjs.
import fs from "node:fs";
import path from "node:path";

// The visible text of some markup: aria-hidden parts (arrows, cell labels) and tags removed, entities decoded.
const visibleText = (html) => html
  .replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, "")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function checkResearch({ distDir, publicDir, fail, readDistPage }) {
  const homePage = readDistPage("index.html");
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
  // The accession record: the display title as h1#current-project-title and the four public facts.
  const facts = researchLog.match(/<dl class="log-facts[^"]*">([\s\S]*?)<\/dl>/)?.[1] ?? "";
  const factLabels = [...facts.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/g)].map((match) => visibleText(match[1]));
  if (!/<h1 id="current-project-title">/.test(researchLog) || factLabels.join("|") !== "Research question|Material|Methods|Laboratories") {
    fail(`research-log.html: the accession record needs h1#current-project-title and the four public facts (found ${factLabels.join(", ") || "none"})`);
  }
  if (researchLog.includes("<h2>Graduation Research</h2>")) {
    fail("research-log.html: graduation project card must use the research title, not the generic label");
  }
  if (!/<a\b(?=[^>]*href="research-graduation\.html")[^>]*>\s*Open protected archive\s*<\/a>/i.test(researchLog)) {
    fail("research-log.html: dashboard must link to the protected archive");
  }
  // Project facts render from src/data/project.mjs; scripts/project-facts.test.mjs checks the data itself.
  const projectFacts = await import("../../src/data/project.mjs");
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
  // Entry dates (YYYY-MM-DD or the Mission Index's YYYY/MM/DD); the public period "2026/04 – present" has no day. The
  // footer colophon's site revision date (WP2) is the one date allowed on the page.
  if (/\b20\d\d[-/]\d\d[-/]\d\d\b/.test(researchLog.replace(/<p class="footer-colophon">[\s\S]*?<\/p>/, ""))) {
    fail("research-log.html: must not expose Mission Log entry dates");
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

  // Home ((g) revert to version 1, 2026-11-26): the title page sets version 1's lead straight after the masthead, the
  // department and the affiliation of src/data/home.ts on two lines, so the full name and its pronunciation are read
  // before it, as they are seen; the canonical question opens the Current Focus facts as version 1's "Current
  // question" row; the two ways onward are text controls named Research and CV (their glyphs are drawn by CSS and
  // hidden from assistive technology); the hero glyphs are retired.
  const { affiliations } = await import("../../src/data/home.ts");
  if (!new RegExp(`</header>\\s*<p class="home-lead">\\s*${affiliations.map(escape).join("\\s*<br>\\s*")}\\s*</p>`).test(homePage)) {
    fail("index.html: the title page must set version 1's lead (the two affiliation lines of src/data/home.ts) right after the masthead");
  }
  if (!new RegExp(`<dt class="kicker">Current question</dt><dd>\\s*${escape(projectFacts.question)}\\s*</dd>`).test(homePage)) {
    fail("index.html: Current Focus must open with version 1's Current question row, the canonical question from project.mjs");
  }
  const homeActions = homePage.match(/<div class="home-actions[^"]*">([\s\S]*?)<\/div>/)?.[1] ?? "";
  const actionNames = [...homeActions.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => `${match[1]} ${visibleText(match[2])}`);
  if (actionNames.join("|") !== "research.html Research|cv.html CV" || !/<a class="button" href="research\.html">/.test(homeActions) || !/<a class="button secondary" href="cv\.html">/.test(homeActions)) {
    fail(`index.html: the Home actions must be a Research control and a secondary CV control (found ${actionNames.join(", ") || "none"})`);
  }
  // The keywords (E052; small words since 2026-11-26) are checked below; the old pill wrapper and the hero card stay
  // retired.
  if (/class="(pills|hero|hero-card)"/.test(homePage)) fail("index.html: the old pill wrapper and the hero card are retired (spec §4.1)");
  // The keyword pills (E052) carry the words of src/data/home.ts, no more and no fewer, in their order, in a named list.
  const { keywords } = await import("../../src/data/home.ts");
  const pillList = homePage.match(/<ul class="home-keywords" aria-label="Keywords">([\s\S]*?)<\/ul>/)?.[1] ?? "";
  const pills = [...pillList.matchAll(/<li class="pill">([\s\S]*?)<\/li>/g)].map((match) => visibleText(match[1]));
  if (pills.join(" | ") !== keywords.join(" | ")) fail(`index.html: the keyword pills must read the words from src/data/home.ts (found "${pills.join(" | ")}")`);

  // Research: the comparison table carries each material's catalogue designation (fact-checked in project.mjs), its
  // column and row headers, and the parent-body sentence across both materials.
  const table = researchPage.match(/<table class="[^"]*\bcomparison-table\b[^"]*">([\s\S]*?)<\/table>/)?.[1] ?? "";
  for (const material of Object.values(projectFacts.comparisonMaterials)) {
    if (!material.designation || !table.includes(`<span class="comparison-table__designation">${material.designation}</span>`)) fail(`research.html: the comparison table must show the designation of ${material.title}`);
  }
  if (!/<caption>/.test(table) || (table.match(/<th scope="col">/g) || []).length !== 2 || (table.match(/<th scope="row">/g) || []).length !== 2) {
    fail("research.html: the comparison table needs a caption, two material column headers and two row headers");
  }
  if (!/<tfoot>[\s\S]*do not establish Orgueil’s parent body[\s\S]*<\/tfoot>/.test(table)) fail("research.html: the comparison table must close on the parent-body sentence");
  // The one key to the calibration marks is on Research and on no other page.
  for (const file of fs.readdirSync(distDir).filter((name) => name.endsWith(".html"))) {
    const hasKey = fs.readFileSync(path.join(distDir, file), "utf8").includes("How to read the marks");
    if (hasKey !== (file === "research.html")) fail(`${file}: the key "How to read the marks" belongs on research.html only`);
  }
}
