// Finds source files the site can no longer reach, so retired code is deleted instead of
// drifting (a guard that lived only in an unimported legacy fragment let the mobile
// lightbox regress in June). check-site.mjs fails on every finding:
// - src/legacy/*.html must be imported by a page or component (directly or through a module);
// - public/assets/js/*.js must be registered in src/data/site.ts ({ file: "<file>" } or assets/js/<file>), a component
//   or the built HTML;
// - every file under src/scripts/ must be reachable through imports from src/pages or
//   src/components, unless it is a test (*.test.mjs) or a test helper (*.test-helper.mjs,
//   *.fixture.mjs). A module imported only by tests is still an orphan: delete it with its tests.
//   Component stylesheets listed in componentStylesheets in src/data/site.ts (appended to the
//   stylesheet bundle) are reachable too.
// Imports are read from static import/export ... from, side-effect imports, import("...") and
// new URL("...", import.meta.url); ?raw and other query suffixes are ignored, and template
// specifiers with ${} cannot be followed.
import fs from "node:fs";
import path from "node:path";

const moduleExtensions = new Set([".astro", ".js", ".mjs", ".cjs", ".ts", ".jsx", ".tsx"]);
const resolveSuffixes = ["", ".js", ".mjs", ".ts", "/index.js", "/index.ts"];
const testPattern = /\.(?:test|test-helper|fixture)\.m?js$|\.test\.cjs$/;
const specifierPattern = /\b(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["'`]([^"'`$]+)["'`]|\bimport\s*\(\s*["'`]([^"'`$]+)["'`]\s*\)|new\s+URL\(\s*["'`]([^"'`$]+)["'`]\s*,\s*import\.meta\.url/g;

function filesUnder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : filesUnder(full);
    return [full];
  });
}

export function importSpecifiers(text) {
  return [...text.matchAll(specifierPattern)].map((match) => (match[1] || match[2] || match[3]).split("?")[0]);
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const suffix of resolveSuffixes) {
    const candidate = base + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// Every file reachable from the given entry files through relative imports.
function reachableFrom(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!moduleExtensions.has(path.extname(file))) continue;
    for (const specifier of importSpecifiers(fs.readFileSync(file, "utf8"))) {
      const target = resolveImport(file, specifier);
      if (target) queue.push(target);
    }
  }
  return seen;
}

export function findOrphanedFiles(root, { distDir = path.join(root, "dist") } = {}) {
  const rel = (file) => path.relative(root, file).split(path.sep).join("/");
  const srcDir = path.join(root, "src");
  const entries = [...filesUnder(path.join(srcDir, "pages")), ...filesUnder(path.join(srcDir, "components"))]
    .filter((file) => moduleExtensions.has(path.extname(file)) && !testPattern.test(file));
  const siteData = path.join(srcDir, "data", "site.ts");
  const componentStylesheets = fs.existsSync(siteData)
    ? [...(fs.readFileSync(siteData, "utf8").match(/export const componentStylesheets = \[([\s\S]*?)\]/)?.[1] || "").matchAll(/"([^"]+\.css)"/g)].map((match) => path.join(root, match[1]))
    : [];
  const siteReach = reachableFrom([...entries, ...componentStylesheets]);
  const testReach = reachableFrom([...filesUnder(path.join(root, "scripts")), ...filesUnder(srcDir)].filter((file) => testPattern.test(file)));

  const legacy = filesUnder(path.join(srcDir, "legacy"))
    .filter((file) => file.endsWith(".html") && !siteReach.has(file))
    .map(rel);

  const scriptReferences = [
    path.join(srcDir, "data", "site.ts"),
    ...filesUnder(path.join(srcDir, "components")).filter((file) => file.endsWith(".astro")),
    ...(fs.existsSync(distDir) ? fs.readdirSync(distDir).filter((name) => name.endsWith(".html")).map((name) => path.join(distDir, name)) : [])
  ].filter((file) => fs.existsSync(file)).map((file) => fs.readFileSync(file, "utf8")).join("\n");
  // site.ts registers public scripts as { file: "<name>.js" } entries (versioned at build time) or as assets/js/<name>.js.
  const registered = new Set([...scriptReferences.matchAll(/\bfile:\s*["']([\w.-]+\.js)["']/g)].map((match) => match[1]));
  const publicScripts = filesUnder(path.join(root, "public", "assets", "js"))
    .filter((file) => file.endsWith(".js") && !registered.has(path.basename(file)) && !scriptReferences.includes(`assets/js/${path.basename(file)}`))
    .map(rel);

  const srcScripts = filesUnder(path.join(srcDir, "scripts"))
    .filter((file) => !testPattern.test(file) && !siteReach.has(file))
    .map((file) => ({ file: rel(file), testOnly: testReach.has(file) }));

  return { legacy, publicScripts, srcScripts };
}
