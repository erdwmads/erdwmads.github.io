// Finds (and with --write removes) CSS rules that can never match: every selector in the
// rule's list requires a class or id that appears nowhere in the site's built output or
// sources. Conservative by design:
// - content tokens come from dist/ (HTML, bundled JS, data), src/ and any --extra files;
// - class names built at runtime are protected by prefix tokens ("is-" from `is-${state}`)
//   and suffix tokens ("-active" from `${base}-active`);
// - tokens inside :not()/:is()/:where()/:has() and attribute selectors are not required;
// - a rule is removed only when all of its selectors are dead, so no selector list is
//   rewritten (removing one selector from a list can revive a rule the browser drops).
// Usage: node scripts/prune-dead-css.mjs [--css public/assets/css/style.css] [--extra file,...] [--report out.json] [--write]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireFromRoot = createRequire(path.join(root, "package.json"));
const requireFromAstro = createRequire(requireFromRoot.resolve("astro/package.json"));
const postcss = createRequire(requireFromAstro.resolve("vite/package.json"))("postcss");

const args = process.argv.slice(2);
const option = (name) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : undefined; };
const cssPath = path.resolve(root, option("css") || "public/assets/css/style.css");
const extra = (option("extra") || "").split(",").filter(Boolean);
const reportPath = option("report");
const write = args.includes("--write");

const contentExtensions = new Set([".html", ".js", ".mjs", ".json", ".astro", ".ts", ".svg", ".md", ".txt", ".xml"]);
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
    return contentExtensions.has(path.extname(entry.name).toLowerCase()) ? [full] : [];
  });
}

const distDir = path.join(root, "dist");
if (!fs.existsSync(path.join(distDir, "index.html"))) {
  console.error("Build the site first: the scan needs dist/ (bundled JS and generated HTML).");
  process.exit(1);
}
const contentFiles = [...walk(distDir), ...walk(path.join(root, "src")), ...extra.map((file) => path.resolve(file))];
const tokens = new Set();
for (const file of contentFiles) for (const token of fs.readFileSync(file, "utf8").split(/[^A-Za-z0-9_-]+/)) if (token) tokens.add(token);
const prefixes = [...tokens].filter((token) => token.length >= 2 && /[-_]$/.test(token) && /[A-Za-z]/.test(token));
const suffixes = [...tokens].filter((token) => token.length >= 3 && /^[-_]/.test(token) && /[A-Za-z]/.test(token));
const present = (name) => tokens.has(name) || prefixes.some((prefix) => name.startsWith(prefix)) || suffixes.some((suffix) => name.endsWith(suffix));

function splitSelectorList(selector) {
  const parts = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === "\\") { i++; continue; }
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "\"" || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) { parts.push(selector.slice(start, i)); start = i + 1; }
  }
  parts.push(selector.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

// Class and id names a selector needs outside brackets and functional pseudo-classes.
function requiredNames(selector) {
  if (selector.includes("\\")) return [];
  let outer = "", depth = 0, quote = null;
  for (const ch of selector) {
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "\"" || ch === "'") { quote = ch; continue; }
    if (ch === "(" || ch === "[") { depth++; continue; }
    if (ch === ")" || ch === "]") { depth--; continue; }
    if (depth === 0) outer += ch;
  }
  return [...outer.matchAll(/[.#](-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)].map((match) => match[1]);
}

const source = fs.readFileSync(cssPath, "utf8");
const ast = postcss.parse(source, { from: cssPath });
const dead = [];
let totalRules = 0;
ast.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
  totalRules++;
  const selectors = splitSelectorList(rule.selector);
  const missing = selectors.map((selector) => requiredNames(selector).filter((name) => !present(name)));
  if (selectors.length && missing.every((names) => names.length > 0)) {
    dead.push({ rule, selector: rule.selector.replace(/\s+/g, " "), missing: [...new Set(missing.flat())], line: rule.source?.start?.line });
  }
});

const removedBytes = dead.reduce((sum, entry) => sum + entry.rule.toString().length, 0);
console.log(`${path.relative(root, cssPath)}: ${dead.length} of ${totalRules} rules can never match (${Math.round(removedBytes / 1024)} KB); scanned ${contentFiles.length} content files, ${tokens.size} tokens.`);
if (reportPath) {
  fs.writeFileSync(reportPath, JSON.stringify(dead.map(({ selector, missing, line }) => ({ line, selector, missing })), null, 2));
  console.log(`Report: ${reportPath}`);
}
if (write && dead.length) {
  for (const entry of dead) entry.rule.remove();
  // Drop conditional blocks that no longer contain anything.
  let changed = true;
  while (changed) {
    changed = false;
    ast.walkAtRules((atRule) => {
      if (/^(media|supports|container)$/i.test(atRule.name) && atRule.nodes && atRule.nodes.every((node) => node.type === "comment")) {
        atRule.remove();
        changed = true;
      }
    });
  }
  fs.writeFileSync(cssPath, ast.toString());
  console.log(`Removed ${dead.length} rules from ${path.relative(root, cssPath)}.`);
}
