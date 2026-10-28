import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findOrphanedFiles, importSpecifiers } from "./orphan-files.mjs";

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "orphan-files-"));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), text);
  }
  return dir;
}

test("import specifiers cover static, side-effect, re-export, dynamic and URL imports", () => {
  const source = [
    "import a from './a.js';",
    "import * as T from \"three\";",
    "import {b, c as d} from '../b.mjs';",
    "import '../scripts/side.js';",
    "export {e} from './e.js';",
    "const f = () => import('./f.js');",
    "const g = new URL('./g.wasm', import.meta.url);",
    "import html from '../legacy/page.html?raw';",
    "const skipped = import(`./${name}.js`);"
  ].join("\n");
  assert.deepEqual(importSpecifiers(source), ["./a.js", "three", "../b.mjs", "../scripts/side.js", "./e.js", "./f.js", "./g.wasm", "../legacy/page.html"]);
});

test("reports unimported legacy fragments, unloaded public scripts and unreachable src/scripts modules", () => {
  const root = fixture({
    "src/pages/index.astro": "---\nimport Shell from '../components/Shell.astro';\nimport main from '../legacy/main.html?raw';\n---\n<Shell />",
    "src/components/Shell.astro": "<script>\n  import '../scripts/entry.js';\n</script>\n<script src=\"assets/js/header.js\"></script>",
    "src/data/site.ts": "export const scripts = ['assets/js/theme.js?v=1'];\nexport const componentStylesheets = [\"src/scripts/lazy/style.css\"] as const;",
    "src/scripts/lazy/style.css": "",
    "src/scripts/lazy/unlisted.css": "",
    "src/legacy/main.html": "<main></main>",
    "src/legacy/retired.html": "<main></main>",
    "public/assets/js/theme.js": "",
    "public/assets/js/header.js": "",
    "public/assets/js/built-only.js": "",
    "public/assets/js/retired.js": "",
    "dist/index.html": "<script src=\"assets/js/built-only.js\"></script>",
    "src/scripts/entry.js": "import {x} from './shared.js';\nexport const load = () => import('./lazy/main.js');",
    "src/scripts/shared.js": "export const x = 1;",
    "src/scripts/lazy/main.js": "export {y} from './y.js';",
    "src/scripts/lazy/y.js": "export const y = 2;",
    "src/scripts/lazy/main.test.mjs": "import './main.js';",
    "src/scripts/lazy/cases.fixture.mjs": "export const cases = [];",
    "src/scripts/retired-chain.js": "import './retired-leaf.js';",
    "src/scripts/retired-leaf.js": "",
    "src/scripts/never-imported.js": "",
    "scripts/retired-chain.test.mjs": "import '../src/scripts/retired-chain.js';"
  });
  try {
    const orphans = findOrphanedFiles(root);
    assert.deepEqual(orphans.legacy, ["src/legacy/retired.html"]);
    assert.deepEqual(orphans.publicScripts, ["public/assets/js/retired.js"]);
    assert.deepEqual(orphans.srcScripts.sort((a, b) => a.file.localeCompare(b.file)), [
      { file: "src/scripts/lazy/unlisted.css", testOnly: false },
      { file: "src/scripts/never-imported.js", testOnly: false },
      { file: "src/scripts/retired-chain.js", testOnly: true },
      { file: "src/scripts/retired-leaf.js", testOnly: true }
    ]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the site itself has no orphaned fragments, public scripts or src/scripts modules", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  // Without dist/ only site.ts and components count as script references, which already cover every public script.
  assert.deepEqual(findOrphanedFiles(root, { distDir: path.join(root, "dist-not-built") }), { legacy: [], publicScripts: [], srcScripts: [] });
});
