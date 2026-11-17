// Soft navigation (legacy-navigation.js) re-runs only the scripts a page marks data-page-script, every public script
// URL carries a content hash, and the shell links the one versioned stylesheet bundle that deploy-skew detection
// compares (ui-invariants.md). Split from mobile-layout.test.mjs for the Folio 2046 rebuild.
import assert from "node:assert/strict";
import test from "node:test";
import { manifest, publicScriptsDir, read, shell } from "./lib/site-paths.mjs";

const shellSource = read(shell.file);
const siteSource = read(manifest);
const legacyNavigationScript = read(`${publicScriptsDir}/legacy-navigation.js`);

test("soft navigation re-runs only page scripts, and script versions are content hashes", () => {
  // Page scripts re-run; a bundled module loads once per document (Astro cannot mark it data-page-script).
  assert.ok(legacyNavigationScript.includes(`nextDoc.querySelectorAll('body script[data-page-script], body script[type="module"][src]')`));
  assert.equal(legacyNavigationScript.includes("commonScripts"), false, "legacy-navigation.js must not keep its own copy of the shell script list");
  assert.match(siteSource, /const scope = pageScoped \? " data-page-script" : "";/);
  assert.match(siteSource, /\?v=\$\{contentVersion\(src\)\}/);
  assert.doesNotMatch(siteSource, /\?v=\d{8}/, "no hand-written ?v= dates remain in site.ts");
  assert.match(siteSource, /const shellScriptsAfterPage: ScriptSpec\[\] = \[[\s\S]*?"observatory-interactions\.js"/);
  // The script registry names files in public/assets/js; the ?v= content hash is added at build time.
  assert.match(siteSource, /const shellScriptsBeforePage: ScriptSpec\[\] = \[[^\]]*\{ file: "ambient-space\.js", defer: true \}/);
});

test("the shell links one versioned stylesheet bundle and imports no CSS", () => {
  assert.match(shellSource, /<link\s+rel="stylesheet"\s+href=\{`assets\/css\/site\.css\?v=\$\{stylesheetVersion\}`\}>/);
  // One stylesheet request: component CSS goes into the bundle through the manifest, never through an import.
  assert.doesNotMatch(shellSource, /^\s*import\s+["'][^"']+\.css["']/m);
});
