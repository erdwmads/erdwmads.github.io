import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cssDir = path.join(root, "public", "assets", "css");
const baselinePath = path.join(root, "docs", "css-baseline.json");
// The public stylesheets, then the component stylesheets from src/ that the bundle appends after them
// (componentStylesheets in src/data/site.ts, reported by their path from the project root).
const siteData = fs.readFileSync(path.join(root, "src", "data", "site.ts"), "utf8");
const componentFiles = [...(siteData.match(/export const componentStylesheets = \[([\s\S]*?)\]/)?.[1] || "").matchAll(/"([^"]+\.css)"/g)].map((match) => match[1]);
const files = [
  ...fs.readdirSync(cssDir).filter((name) => name.endsWith(".css")).sort().map((name) => ({ name, file: path.join(cssDir, name) })),
  ...componentFiles.map((name) => ({ name, file: path.join(root, name) }))
];
const mode = process.argv.includes("--write") ? "write" : process.argv.includes("--check") ? "check" : "report";

// style.css is legacy compatibility CSS: it may shrink, never grow.
const frozenFiles = new Set(["style.css"]);

const report = files.map(({ name, file }) => {
  // Normalise line endings so the byte count does not depend on the checkout.
  const source = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const selectors = [...source.matchAll(/(^|\})\s*([^@{}][^{}]+)\{/gm)]
    .map((match) => match[2].trim())
    .filter(Boolean);
  const counts = new Map();

  selectors.forEach((selector) => counts.set(selector, (counts.get(selector) || 0) + 1));

  return {
    file: name,
    bytes: Buffer.byteLength(source),
    lines: source.split("\n").length,
    repeatedSelectors: [...counts.values()].filter((count) => count > 1).length,
    important: (source.match(/!important/g) || []).length
  };
});

if (mode === "write") {
  fs.writeFileSync(baselinePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote CSS baseline for ${report.length} stylesheets.`);
} else if (mode === "check") {
  const baseline = new Map(JSON.parse(fs.readFileSync(baselinePath, "utf8")).map((entry) => [entry.file, entry]));
  const failures = [];

  for (const entry of report) {
    const previous = baseline.get(entry.file);
    if (!previous) {
      failures.push(`${entry.file}: not in docs/css-baseline.json; run "npm run audit:css -- --write" after deciding its owner`);
      continue;
    }
    if (!frozenFiles.has(entry.file)) continue;
    for (const metric of ["bytes", "repeatedSelectors", "important"]) {
      if (entry[metric] > previous[metric]) {
        failures.push(`${entry.file}: ${metric} grew from ${previous[metric]} to ${entry[metric]}`);
      }
    }
  }

  if (failures.length) {
    failures.forEach((failure) => console.error(`CSS audit: ${failure}`));
    process.exit(1);
  }
  const totalBytes = report.reduce((sum, entry) => sum + entry.bytes, 0);
  console.log(`CSS audit passed: ${report.length} stylesheets, ${totalBytes} bytes, legacy style.css did not grow.`);
} else {
  console.log(JSON.stringify(report, null, 2));
}
