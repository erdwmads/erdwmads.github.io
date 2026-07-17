import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cssDir = path.join(root, "public", "assets", "css");
const files = fs.readdirSync(cssDir).filter((name) => name.endsWith(".css")).sort();

const report = files.map((name) => {
  const source = fs.readFileSync(path.join(cssDir, name), "utf8");
  const selectors = [...source.matchAll(/(^|\})\s*([^@{}][^{}]+)\{/gm)]
    .map((match) => match[2].trim())
    .filter(Boolean);
  const counts = new Map();

  selectors.forEach((selector) => counts.set(selector, (counts.get(selector) || 0) + 1));

  return {
    file: name,
    bytes: Buffer.byteLength(source),
    lines: source.split(/\r?\n/).length,
    repeatedSelectors: [...counts.values()].filter((count) => count > 1).length
  };
});

console.log(JSON.stringify(report, null, 2));
