// The stylesheet bundle's source without a build: the files the manifest (stylesheets in src/data/site.ts) lists,
// in cascade order, each behind the same /*! path */ marker src/lib/stylesheet-bundle.ts writes. The bundle only
// strips whitespace and comments, so a selector or declaration found here reaches dist/assets/css/site.css
// unchanged. Unit tests (CI runs them before the build) and the CSS lint read CSS through this module instead of
// opening one stylesheet by name.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { abs, manifest, read, root } from "./site-paths.mjs";

// [{ label, file }] in cascade order: the manifest entry, a path from the project root, is both the bundle marker
// and the file.
export function bundleSources() {
  const block = read(manifest).match(/export const stylesheets = \[([\s\S]*?)\]/)?.[1] || "";
  return [...block.matchAll(/"([^"]+\.css)"/g)].map((match) => ({ label: match[1], file: match[1] }));
}

export function readBundleSource() {
  return bundleSources()
    .map(({ label, file }) => {
      if (!fs.existsSync(abs(file))) throw new Error(`${manifest} lists ${label}, but ${file} does not exist`);
      return `/*! ${label} */\n${read(file)}\n`;
    })
    .join("");
}

// The bundle as the build minifies it (whitespace and comments only, legal comments kept), through the esbuild that
// Astro's Vite resolves, as src/lib/stylesheet-bundle.ts loads it.
export async function minifiedBundle(source = readBundleSource()) {
  const fromRoot = createRequire(path.join(root, "package.json"));
  const fromAstro = createRequire(fromRoot.resolve("astro/package.json"));
  const fromVite = createRequire(fromAstro.resolve("vite/package.json"));
  const { code } = await fromVite("esbuild").transform(source, { loader: "css", minifyWhitespace: true, legalComments: "inline" });
  return code;
}
