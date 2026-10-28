import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formalTitle } from "../src/data/project.mjs";
// Node 24 strips the types, so the display strings come from the same helpers the site uses.
import { papers, paperAuthorYear, paperReference } from "../src/data/papers.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");

const payload = {
  generatedAt: new Date().toISOString(),
  site: "https://erdwmads.github.io",
  // The formal title comes from the project facts (src/data/project.mjs), not a copy.
  researchTheme: formalTitle,
  papers: papers.map((paper) => ({
    id: paper.id,
    relevance: paper.relevance,
    title: paper.title,
    authors: paper.authors.map((author) => ({ ...author })),
    authorCount: paper.authorCount,
    authorYear: paperAuthorYear(paper),
    reference: paperReference(paper),
    year: paper.year,
    journal: paper.journal,
    volume: paper.volume,
    pages: paper.pages,
    articleNumber: paper.articleNumber,
    doi: paper.doi,
    summary: paper.summary,
    tags: [...paper.tags],
    primaryFilter: paper.primaryFilter,
    filters: [...paper.filters]
  }))
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "ppt-data.json"), `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Exported PPT data: ${payload.papers.length} papers.`);
