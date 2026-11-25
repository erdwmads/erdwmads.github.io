// The token contract (spec §2.5, §2.6, §6.5), checked from source so CI runs it before the build: the page grounds
// agree everywhere the first paint depends on them, every text and control colour meets WCAG contrast on every
// ground it can sit on, the two themes differ where the invariants say they must, .on-night keeps the Space colours
// complete, and the fonts stay within the preload budget with their licences beside them.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { cssRules } from "./lib/css-rules.mjs";
import { abs, folioStylesDir, fontPreloads, fontsDir, publicScriptsDir, read, readShell } from "./lib/site-paths.mjs";

const tokensSource = read(`${folioStylesDir}/00-tokens.css`);
const rules = cssRules(tokensSource).filter((rule) => !rule.conditions.length);
const declarationsOf = (test) => Object.fromEntries(rules.filter((rule) => rule.selectors.some(test)).flatMap((rule) => rule.declarations.map(({ property, value }) => [property, value])));
const space = declarationsOf((selector) => selector === ":root" || selector === ".on-night");
const night = declarationsOf((selector) => selector === ".on-night");
const light = { ...space, ...declarationsOf((selector) => selector.startsWith(":root:where([data-theme=\"light\"]")) };
const lightOnly = declarationsOf((selector) => selector.startsWith(":root:where([data-theme=\"light\"]"));
const grounds = { space: "#0f1625", light: "#f7f3eb" };

function rgb(value) {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (!hex) throw new Error(`not an opaque hex colour: ${value}`);
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16) / 255);
}
const luminance = (value) => {
  const [r, g, b] = rgb(value).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

test("the page grounds agree in the tokens, the inline first-paint style, the theme-color metas and the preload", () => {
  assert.equal(space["--obs-paper"], grounds.space);
  assert.equal(light["--obs-paper"], grounds.light);
  const shell = readShell();
  const inline = shell.slice(shell.indexOf("<style is:inline>"), shell.indexOf("</style>"));
  assert.match(inline, new RegExp(`html \\{ background: ${grounds.space}; color-scheme: dark; \\}`));
  assert.match(inline, new RegExp(`html\\[data-theme="light"\\]:not\\(\\[data-theme-space\\]\\) \\{\\s*background: ${grounds.light} !important;`));
  assert.ok(shell.includes(`<meta name="theme-color" content="${grounds.space}" media="(prefers-color-scheme: dark)">`));
  assert.ok(shell.includes(`<meta name="theme-color" content="${grounds.light}" media="(prefers-color-scheme: light)">`));
  const preload = read("src/scripts/inline/theme-preload.js");
  assert.ok(preload.includes(`"${grounds.light}"`) && preload.includes(`"${grounds.space}"`) && preload.includes('localStorage.getItem("mads-theme")'));
  assert.ok(fs.existsSync(abs(`${publicScriptsDir}/theme.js`)));
});

test("text, links, focus, errors, brass and control borders meet WCAG contrast on every ground they can sit on", () => {
  const text = ["--obs-text", "--obs-muted", "--obs-link", "--obs-focus", "--obs-error"];
  const marks = ["--obs-accent", "--obs-control-border"];
  const failures = [];
  const measure = (theme, tokens, groundNames) => {
    for (const ground of groundNames) {
      const background = tokens[ground] ?? space[ground] ?? declarationsOf((selector) => selector === ":root")[ground];
      for (const token of [...text, ...marks]) {
        const ratio = contrast(tokens[token], background);
        const needed = text.includes(token) ? 4.5 : 3;
        if (ratio < needed) failures.push(`${theme}: ${token} ${tokens[token]} on ${ground} ${background} is ${ratio.toFixed(2)}:1, needs ${needed}:1`);
      }
    }
  };
  const themeGrounds = ["--obs-paper", "--obs-surface", "--obs-surface-hover", "--obs-highlight", "--obs-plate"];
  measure("Space", space, themeGrounds);
  measure("Light", light, themeGrounds);
  // Night plates and the presentation view carry .on-night, so the Space colours apply there in either theme (the
  // Mission Log viewer follows the page's theme, E045).
  measure(".on-night", night, ["--obs-plate-night", "--obs-screen"]);
  assert.deepEqual(failures, []);
  // Primary buttons: the face against its text.
  for (const [theme, tokens] of [["Space", space], ["Light", light]]) {
    assert.ok(contrast(tokens["--obs-primary-face"], tokens["--obs-primary-text"]) >= 4.5, `${theme}: primary button text`);
  }
});

test("Light and Space differ where the invariants require two editions, not an inversion", () => {
  // The effects (owner, 2026-11-18): Light carries them paler, never as Space's values.
  const effects = ["--obs-header-surface", "--obs-band-veil", "--obs-backdrop-opacity", "--obs-backdrop-opacity-home", "--obs-backdrop-tone", "--obs-glow",
    "--obs-gold-glow", "--obs-edge-cool", "--obs-sheen", "--obs-sheen-card", "--obs-sheen-primary", "--obs-control-shadow", "--obs-control-glow", "--obs-row-glow",
    // The rest of the old site's light (second effects pass, 2026-11-18), each at its own old Light value.
    "--obs-control-face", "--obs-control-secondary-face", "--obs-control-active-face", "--obs-control-pressed", "--obs-metal", "--obs-glass-face",
    "--obs-glass-edge", "--obs-text-halo", "--obs-bead", "--obs-bead-glow", "--obs-graticule", "--obs-graticule-size", "--obs-graticule-opacity",
    "--obs-photo-shadow", "--obs-fx-face", "--obs-fx-face-on", "--obs-fx-text", "--obs-fx-text-on", "--obs-fx-lift-on", "--obs-fx-dot",
    "--obs-fx-dot-glow", "--obs-fx-dot-on", "--obs-fx-dot-on-glow", "--obs-coord-rest", "--obs-progress-beam", "--obs-progress-glow", "--obs-atlas-grid",
    "--obs-lightbox-veil", "--obs-lightbox-button", "--obs-lightbox-button-hover", "--obs-lightbox-button-glow"];
  for (const token of ["--obs-surface", "--obs-toggle-face", "--obs-control-border", ...effects]) {
    assert.ok(lightOnly[token] && lightOnly[token] !== space[token], `${token} must have its own Light value`);
  }
});

test(".on-night redeclares every colour the Light theme changes, and sets its own text colour from them", () => {
  const missing = Object.keys(lightOnly).filter((property) => property.startsWith("--obs-") && !(property in night));
  assert.deepEqual(missing, []);
  assert.equal(night["color-scheme"], "dark");
  // color inherits as a computed value, so without its own declaration the box would keep the page's Light ink.
  assert.equal(night.color, "var(--obs-text)");
});

test("only the two families are served, within the preload budget, each with its licence", () => {
  const fonts = read(`${folioStylesDir}/01-fonts.css`);
  const families = new Set([...fonts.matchAll(/font-family: "([^"]+)"; (?:font-style: \w+; )?font-weight: [\d ]+; font-display: swap; src: url\("\.\.\/fonts\/([^"]+)"\)/g)].map((match) => match[1]));
  assert.deepEqual([...families].sort(), ["Source Sans 3", "Source Serif 4"]);
  const referenced = [...fonts.matchAll(/url\("\.\.\/fonts\/([^"]+)"\)/g)].map((match) => match[1]);
  const files = fs.readdirSync(abs(fontsDir)).filter((name) => name.endsWith(".woff2"));
  assert.deepEqual(files.sort(), [...new Set(referenced)].sort(), "every font file is used and every used file exists");
  for (const licence of ["SourceSerif4-OFL.txt", "SourceSans3-OFL.txt"]) {
    assert.match(read(`${fontsDir}/${licence}`), /SIL Open Font License, Version 1\.1/);
  }
  const shell = readShell();
  const preloads = [...shell.matchAll(/<link rel="preload" href="([^"]+)" as="font" type="font\/woff2" crossorigin>/g)].map((match) => match[1]);
  assert.deepEqual(preloads, fontPreloads);
  const bytes = preloads.reduce((sum, href) => sum + fs.statSync(abs(`public/${href}`)).size, 0);
  assert.ok(bytes <= 80 * 1024, `font preload ${bytes} bytes, over 80 KB`);
});
