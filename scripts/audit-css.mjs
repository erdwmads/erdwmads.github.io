// The CSS lint (spec §2.9). It reads every stylesheet the manifest lists (stylesheets in src/data/site.ts, the
// files in src/styles/folio in cascade order) and holds each to the budget and the rules in its own header, so
// parallel work never edits a shared baseline:
//   /* @owner WP4 · @budget 24KB · @important 0 · what the file styles */
// The header values themselves are pinned in scripts/lib/css-lint.mjs (spec §7.3 freezes them), so a package cannot
// raise its own budget. It fails when a file has no valid header, or one that differs from the pinned table; exceeds
// its @budget (source bytes, LF line endings); uses !important outside 02-reset.css, 05-utilities.css,
// states/motion.css and states/print.css, more often than its @important, or more than 30 times in all; contains
// backdrop-filter, @layer, @import, a remote url() or address, or body#; names [data-theme outside 00-tokens.css;
// nests a rule inside a style rule or uses &; breaks the specificity limits of spec §2.4 (no id outside :where(), at
// most three classes, attributes or pseudo-classes in one compound selector, each :is(), :not() and :has() weighed
// by its heaviest argument); or when the whitespace-minified bundle exceeds 145 KB. The rules themselves live in
// scripts/lib/css-lint.mjs, and scripts/audit-css.test.mjs holds them to known selectors.
//   node scripts/audit-css.mjs           report every file against its budget
//   node scripts/audit-css.mjs --check   fail on any violation (npm run audit:css:check)
import fs from "node:fs";
import { cssRules } from "./lib/css-rules.mjs";
import { bans, countImportant, namesThemeSelector, nestedRules, pinnedHeaders, stripComments, weighComplex } from "./lib/css-lint.mjs";
import { bundleSources, minifiedBundle } from "./lib/read-bundle-source.mjs";
import { abs, folioStylesDir, manifest } from "./lib/site-paths.mjs";

const check = process.argv.includes("--check");
const headerPattern = /^\/\* @owner (WP[1-6]) · @budget (\d+(?:\.\d+)?)KB · @important (\d+) · ((?:[^*\n]|\*(?!\/))+?) \*\/\r?\n/;
const importantFiles = new Set(["02-reset.css", "05-utilities.css", "states/motion.css", "states/print.css"].map((file) => `${folioStylesDir}/${file}`));
const tokensFile = `${folioStylesDir}/00-tokens.css`;
const importantLimit = 30;
const bundleLimit = 145 * 1024; // the rebuild planned 100 KB; the owner raised it on 2026-11-17 to keep the reviewed design (about 142 KB)
const compoundLimit = 3;

const failures = [];
const report = [];
const listed = bundleSources().map(({ file }) => file);
const onDisk = fs.readdirSync(abs(folioStylesDir), { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".css"))
  .map((file) => `${folioStylesDir}/${file.replace(/\\/g, "/")}`);
for (const file of onDisk) if (!listed.includes(file)) failures.push(`${file}: not listed in ${manifest}`);
const pinnedFiles = Object.keys(pinnedHeaders).map((file) => `${folioStylesDir}/${file}`);
for (const file of pinnedFiles) if (!listed.includes(file)) failures.push(`${file}: pinned in scripts/lib/css-lint.mjs but not listed in ${manifest}`);

let totalImportant = 0;
for (const file of listed) {
  if (!fs.existsSync(abs(file))) {
    failures.push(`${file}: listed in ${manifest} but missing`);
    continue;
  }
  const source = fs.readFileSync(abs(file), "utf8").replace(/\r\n/g, "\n");
  const bytes = Buffer.byteLength(source);
  const header = source.match(headerPattern);
  const css = stripComments(source);
  const important = countImportant(css);
  totalImportant += important;
  report.push({ file, owner: header?.[1] || "?", bytes, budget: header ? Math.round(Number(header[2]) * 1024) : 0, important, allowed: header ? Number(header[3]) : 0 });
  if (!header) {
    failures.push(`${file}: the first line must be the header /* @owner WPn · @budget nKB · @important n · purpose */`);
    continue;
  }
  const pinned = pinnedHeaders[file.slice(folioStylesDir.length + 1)];
  if (!pinned) failures.push(`${file}: has no pinned header in scripts/lib/css-lint.mjs; the integration pass adds new files there`);
  else if (pinned[0] !== header[1] || pinned[1] !== Number(header[2]) || pinned[2] !== Number(header[3])) {
    failures.push(`${file}: header says @owner ${header[1]} · @budget ${header[2]}KB · @important ${header[3]}, but the pinned header is @owner ${pinned[0]} · @budget ${pinned[1]}KB · @important ${pinned[2]}; request a change in your handoff`);
  }
  const budget = Math.round(Number(header[2]) * 1024);
  if (bytes > budget) failures.push(`${file}: ${bytes} bytes, over its ${header[2]} KB budget (${budget} bytes)`);
  if (Number(header[3]) > 0 && !importantFiles.has(file)) failures.push(`${file}: declares @important ${header[3]}, but only the reset, utilities, motion and print files may use !important`);
  if (important > Number(header[3])) failures.push(`${file}: ${important} !important, over its @important ${header[3]}`);
  for (const [pattern, name] of bans) if (pattern.test(css)) failures.push(`${file}: contains ${name}`);
  if (file !== tokensFile && namesThemeSelector(css)) failures.push(`${file}: names [data-theme; theme selectors live only in 00-tokens.css (read the tokens instead)`);
  for (const prelude of nestedRules(css)) failures.push(`${file}: "${prelude}" is nested in a style rule or uses &; write each rule flat with its full selector`);
  for (const rule of cssRules(css)) {
    if (rule.conditions.some((condition) => condition.startsWith("@keyframes"))) continue;
    for (const selector of rule.selectors) {
      const weight = weighComplex(selector);
      if (weight.ids) failures.push(`${file}: "${selector}" uses an id outside :where(); ids are never style hooks`);
      if (weight.worst > compoundLimit) failures.push(`${file}: "${selector}" has ${weight.worst} classes, attributes or pseudo-classes in one compound (limit ${compoundLimit})`);
    }
  }
}
if (totalImportant > importantLimit) failures.push(`all stylesheets: ${totalImportant} !important, over the limit of ${importantLimit}`);

const bundleBytes = Buffer.byteLength(await minifiedBundle());
if (bundleBytes > bundleLimit) failures.push(`bundle: ${bundleBytes} bytes minified, over ${bundleLimit / 1024} KB`);

const totalBytes = report.reduce((sum, entry) => sum + entry.bytes, 0);
if (!check) {
  for (const entry of report) {
    console.log(`${entry.file.padEnd(52)} ${entry.owner.padEnd(4)} ${String(entry.bytes).padStart(6)} / ${String(entry.budget).padStart(6)} bytes   !important ${entry.important}/${entry.allowed}`);
  }
  console.log(`${report.length} stylesheets, ${totalBytes} bytes of source, ${totalImportant} !important; bundle ${bundleBytes} bytes minified.`);
}
if (failures.length) {
  failures.forEach((failure) => console.error(`CSS lint: ${failure}`));
  if (check) process.exit(1);
} else if (check) {
  console.log(`CSS lint passed: ${report.length} stylesheets, ${totalBytes} bytes of source, ${totalImportant} of ${importantLimit} !important, bundle ${bundleBytes} bytes minified (limit ${bundleLimit / 1024} KB).`);
}
