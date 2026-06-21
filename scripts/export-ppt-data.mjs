import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function readConstArray(relativePath, exportName) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const pattern = new RegExp(`export const ${exportName} = ([\\s\\S]*?) as const;`);
  const match = source.match(pattern);
  if (!match) throw new Error(`Cannot find ${exportName} in ${relativePath}`);
  return JSON.parse(match[1]);
}

const papers = readConstArray("src/data/papers.ts", "papers");
const localMissionSource = "_local/mission-source/missionLog.ts";
const missionEntries = fs.existsSync(path.join(root, localMissionSource))
  ? readConstArray(localMissionSource, "missionEntries")
  : [];

const payload = {
  generatedAt: new Date().toISOString(),
  site: "https://erdwmads.github.io",
  researchTheme: "Cosmomineralogical Study of Dolomite in the Orgueil CI1 Chondrite: Aqueous Alteration Processes and Material Evolution in a Primitive Asteroidal Parent Body",
  papers: papers.map((paper) => ({
    status: paper.status,
    title: paper.title,
    authors: paper.authors,
    summary: paper.summary,
    tags: [...paper.tags],
    filters: [...paper.filters]
  })),
  missionLog: missionEntries.map((entry) => ({
    label: entry.label,
    sol: entry.sol,
    date: entry.date,
    stage: entry.stage,
    question: entry.question,
    nextStep: entry.nextStep,
    latestNote: entry.latestNote,
    stageNote: entry.stageNote,
    questionNote: entry.questionNote,
    nextNote: entry.nextNote,
    plainText: stripHtml(entry.bodyHtml)
  }))
};

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "ppt-data.json"), `${JSON.stringify(payload, null, 2)}\n`);

console.log(`Exported PPT data: ${payload.papers.length} papers, ${payload.missionLog.length} mission entries.`);
