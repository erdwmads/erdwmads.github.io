// One place for the source paths that the Folio 2046 rebuild renames or removes, so a rename is a one-line change
// here instead of an ENOENT crash in every test that opened the old file by name. Paths are relative to the project
// root (as messages print them); abs() turns one into an absolute path.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const abs = (relative) => path.join(root, ...relative.split("/"));
export const read = (relative) => fs.readFileSync(abs(relative), "utf8");
export const exists = (relative) => fs.existsSync(abs(relative));

// The shell every page renders. Its component name also names the bundled module Astro emits for it
// (/_astro/<name>.<hash>.js), which some browser tests intercept.
export const shell = {
  name: "SiteShell",
  file: "src/components/SiteShell.astro"
};
export const shellModulePattern = new RegExp(`/_astro/${shell.name}[^/"]*\\.js`);

// The parts the shell renders as components. readShell() returns the shell source with each <Part .../> tag
// replaced by that part's template (its frontmatter dropped), so a check of the page markup reads one continuous
// text, whichever file holds the element it looks for.
export const shellParts = [
  { name: "SiteHeader", file: "src/components/SiteHeader.astro" },
  { name: "SiteFooter", file: "src/components/SiteFooter.astro" }
];
const template = (source) => source.replace(/^---[\s\S]*?\n---\r?\n/, "").trimEnd();
export const readShell = () =>
  shellParts.reduce((source, part) => source.replace(new RegExp(`<${part.name}\\b[^>]*/>`), () => template(read(part.file))), read(shell.file));

// The stylesheet manifest (stylesheets: paths from the project root, in cascade order) and the bundle it builds.
// scripts/lib/read-bundle-source.mjs concatenates the listed sources without a build.
export const manifest = "src/data/site.ts";
export const bundleUrl = "assets/css/site.css";
export const bundleDist = "dist/assets/css/site.css";

// Fonts: the folder and the faces the shell preloads (as the page links them).
export const fontsDir = "public/assets/fonts";
export const fontPreloads = ["assets/fonts/source-serif-4-latin.woff2", "assets/fonts/source-sans-3-latin.woff2"];

// Behaviour scripts. Their names are frozen hooks (scripts/lib/js-hooks.mjs), so they are not expected to move.
export const publicScriptsDir = "public/assets/js";
export const bundledScriptsDir = "src/scripts";

// The stylesheet tree (spec §2.1). The build fails unless the manifest lists exactly its files.
export const folioStylesDir = "src/styles/folio";

