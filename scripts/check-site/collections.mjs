// check-site/collections.mjs (owner WP5): Paper Shelf, Photography, CV, Contact and 404 as built (spec §4.6–§4.10).
// scripts/check-site.mjs runs every module in order.
import fs from "node:fs";
import path from "node:path";
import { WALL_BANDS } from "../../src/lib/photo-rows.js";

export default async function checkCollections({ root, assetsDir, fail, readDistPage, collectFiles }) {
  const photoThumbDir = path.join(assetsDir, "img", "thumbs", "photography");
  const photoThumbCount = collectFiles(photoThumbDir).filter((file) => file.endsWith(".webp")).length;

  if (photoThumbCount !== 21) {
    fail(`Photography: expected 21 WebP thumbnails, found ${photoThumbCount}`);
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
  // The bibliography (spec §4.6): the contents line, and on every card the owner's reading under its own label (the
  // scope stays, hidden, for assistive technology) and a Keywords line.
  const sections = new Set(paperRecords.map((paper) => paper.primaryFilter)).size;
  const contentsLine = `${paperRecords.length} papers in ${sections} sections`;
  if (!paperShelf.includes(`<p class="masthead__meta tabular">${contentsLine}</p>`)) fail(`paper-shelf.html: missing the contents line "${contentsLine}"`);
  const readingLabel = '<span class="paper-relevance-label kicker">My reading<span class="paper-relevance-scope visually-hidden">, why it matters for my project</span></span>';
  const keywords = '<p class="project-tags"><strong>Keywords:</strong>';
  if (paperShelf.split(readingLabel).length - 1 !== paperRecords.length || paperShelf.split(keywords).length - 1 !== paperRecords.length) {
    fail("paper-shelf.html: every paper needs the My reading label (with its hidden scope) and a Keywords line");
  }

  const cvPage = readDistPage("cv.html");
  if (!/<h2 id="[^"]+">Research experience<\/h2>/.test(cvPage)) {
    fail("cv.html: missing Research experience entry");
  }
  // Controls that a script reveals keep their box until then (spec §2.4), so revealing them shifts nothing.
  for (const [file, html, hook] of [["cv.html", cvPage, "data-print-cv"], ["contact.html", readDistPage("contact.html"), "data-email-actions"]]) {
    if (!html.includes(`${hook} hidden data-reserve-space`)) fail(`${file}: [${hook}] must wait hidden with data-reserve-space`);
  }
  const notFound = readDistPage("404.html");
  if ((notFound.match(/<a class="ledger__title" href="\/[a-z-]+\.html">/g) || []).length !== 9 || !notFound.includes('class="ledger ledger--leaders archive-index"')) {
    fail("404.html: the archive index must be a contents list (Ledger with leaders) of the 9 sections");
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
  if (!/<h2 id="[^"]+">Camera<\/h2>/.test(photographyPage) || (photographyPage.match(/<s class="del">Hasselblad X2D<\/s><span class="visually-hidden"> \(crossed out\)<\/span>/g) || []).length !== 2) {
    fail("Photography: Camera must be an h2 and the crossed-out camera must be announced");
  }
  // The wall carries its gaps from WALL_BANDS (src/lib/photo-rows.js), the only source the CSS reads them from.
  const wallStyle = WALL_BANDS.map((band) => `--photo-gap-${band.name}: ${band.gap}px`).join("; ");
  if (!photographyPage.includes(`<div class="photo-wall" style="${wallStyle}">`) || photographyPage.includes("assets/js/photography.js")) {
    fail(`Photography: expected a static photo wall carrying ${wallStyle}, without the retired autoplay controller`);
  }
  if ((photographyPage.match(/<span class="photo-index-label" aria-hidden="true"><b>Pl\. \d\d<\/b>/g) || []).length !== 21) {
    fail("Photography: every contact-sheet label must number its photograph as a plate (Pl. 07)");
  }
  if ((photographyPage.match(/(?:data-photo-layout-controls|data-present-photos)[^>]*hidden data-reserve-space/g) || []).length !== 2) {
    fail("Photography: the view switch and the Present button must wait hidden with data-reserve-space");
  }
}
