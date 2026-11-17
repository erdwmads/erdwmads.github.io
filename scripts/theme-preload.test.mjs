// The theme is applied before any stylesheet: the shell renders Space Mode, the inline preload switches to Light
// only for an explicit saved choice, and the first-paint <style> follows the preload directly (ui-invariants.md).
// Split from mobile-layout.test.mjs for the Folio 2046 rebuild.
import assert from "node:assert/strict";
import test from "node:test";
import { publicScriptsDir, read, shell } from "./lib/site-paths.mjs";

const shellSource = read(shell.file);
// The theme preload is rendered from its own file so the Content Security Policy can hash it (src/lib/inline-scripts.ts).
const themePreload = read("src/scripts/inline/theme-preload.js");
const themeScript = read(`${publicScriptsDir}/theme.js`);

test("first visit starts in Space Mode while preserving an explicit saved choice", () => {
  assert.match(shellSource, /<html lang="en" data-theme="space" data-theme-space>/);
  assert.match(shellSource, /<script is:inline set:html=\{inlineScripts\.themePreload\}><\/script>\s*<style is:inline>/);
  assert.match(themePreload, /if \(savedTheme === "light"\)/);
  assert.match(themePreload, /catch \(error\)\s*\{[\s\S]*?setAttribute\("data-theme", "space"\)/);
  assert.match(themeScript, /function initialTheme\(\)[\s\S]*?if \(saved === "space" \|\| saved === "light"\) return saved;[\s\S]*?return "space";/);
});

// The rest of the first-paint chain (spec §5 row 1): the preload and its <style> come before any font preload or
// stylesheet request; the preload, the style, theme.js and the tokens agree on the one storage key, the two
// attributes and the two grounds, so the stylesheet arriving later changes nothing. tokens-contract.test.mjs holds the
// token side; first-paint.browser.test.mjs checks the same in a browser with the stylesheet held back.
test("the theme is settled before the first font or stylesheet request, the same way in every file", () => {
  const head = shellSource.slice(shellSource.indexOf("<head>"), shellSource.indexOf("</head>"));
  const at = (pattern) => head.search(pattern);
  const preload = at(/inlineScripts\.themePreload/);
  assert.ok(preload > 0 && preload < at(/<style is:inline>/), "theme preload, then the first-paint style");
  for (const later of [/<link rel="preload"[^>]*as="font"/, /<link rel="stylesheet"/, /<script>\s*\/\/|<script>\s*import/]) {
    assert.ok(at(/<\/style>/) < at(later), `the first-paint style precedes ${later}`);
  }
  const style = head.slice(at(/<style is:inline>/), at(/<\/style>/));
  assert.match(style, /html\[data-theme="light"\]:not\(\[data-theme-space\]\) \{\s*background: #f7f3eb !important;\s*color-scheme: light;/);
  assert.match(style, /html\[data-theme="space"\],\s*html\[data-theme-space\] \{\s*background: #0f1625 !important;\s*color-scheme: dark;/);
  // The preload sets both attributes together, in each branch, with the ground as an inline background.
  assert.match(themePreload, /setAttribute\("data-theme", "light"\);\s*document\.documentElement\.removeAttribute\("data-theme-space"\);[\s\S]*?backgroundColor = "#f7f3eb"/);
  assert.equal((themePreload.match(/setAttribute\("data-theme-space", ""\)/g) || []).length, 2, "Space in the default branch and in the catch");
  assert.equal((themePreload.match(/backgroundColor = "#0f1625"/g) || []).length, 2);
  // theme.js keeps the same key and attributes when the reader switches.
  assert.match(themeScript, /const storageKey = "mads-theme";/);
  assert.match(themeScript, /root\.toggleAttribute\("data-theme-space", useSpace\);\s*root\.setAttribute\("data-theme", useSpace \? "space" : "light"\);/);
  assert.match(themeScript, /root\.style\.backgroundColor = useSpace \? "#0f1625" : "#f7f3eb";/);
});
