# CSS Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce override depth and isolate current component styles without changing accepted visual output.

**Architecture:** Keep the legacy stylesheet active while extracting only verified component groups into focused files. Add an audit script that reports duplicate selector count and file sizes. Remove a legacy rule only after the replacement passes desktop/mobile screenshots in both themes.

**Tech Stack:** CSS, Node.js audit scripts, Astro, browser screenshots.

---

### Task 1: Add a CSS audit baseline

**Files:**
- Create: `scripts/audit-css.mjs`
- Modify: `package.json`
- Create: `docs/css-baseline.json`

- [ ] **Step 1: Create the audit**

```js
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cssDir = path.join(root, "public", "assets", "css");
const files = fs.readdirSync(cssDir).filter((name) => name.endsWith(".css"));
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
```

- [ ] **Step 2: Add the command**

```json
"audit:css": "node scripts/audit-css.mjs"
```

- [ ] **Step 3: Save the baseline**

Run:

```powershell
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run audit:css
```

Copy the JSON output exactly to `docs/css-baseline.json`.

- [ ] **Step 4: Commit**

```powershell
git add scripts/audit-css.mjs package.json docs/css-baseline.json
git commit -m "chore: baseline css complexity"
```

### Task 2: Split current component ownership

**Files:**
- Create: `public/assets/css/tokens.css`
- Create: `public/assets/css/shell-evolution.css`
- Create: `public/assets/css/photography.css`
- Create: `public/assets/css/research-log-evolution.css`
- Modify: `src/components/LegacyShell.astro`

- [ ] **Step 1: Move only the new evolution tokens**

Move the new `--evo-*` declarations into `tokens.css`; keep original legacy variables in `style.css`.

- [ ] **Step 2: Assign component ownership**

```text
tokens.css                  theme and evolution tokens only
shell-evolution.css         header, navigation, theme control, mobile shell, HUD visibility
photography.css             slideshow, filmstrip, marquee, photo responsive rules
research-log-evolution.css  Research Log dashboard, protected gate, Mission Log index and viewer refinements
```

- [ ] **Step 3: Load in stable order**

```astro
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/tokens.css">
<link rel="stylesheet" href="assets/css/shell-evolution.css">
```

Load page-specific CSS through a new optional `stylesheets` LegacyShell prop. Photography loads `photography.css`; Research Log and graduation pages load `research-log-evolution.css`.

- [ ] **Step 4: Build and commit**

```powershell
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add public/assets/css src/components/LegacyShell.astro src/pages
git commit -m "refactor: isolate current component styles"
```

### Task 3: Remove superseded legacy component blocks

**Files:**
- Modify: `public/assets/css/style.css`
- Modify: `docs/css-baseline.json`

- [ ] **Step 1: Remove Photography rules now owned by photography.css**

Delete only selector blocks whose complete replacement exists in `photography.css`. Run the site check and both-theme Photography screenshots before continuing.

- [ ] **Step 2: Remove shell rules now owned by shell-evolution.css**

Delete only the superseded header/mobile navigation/HUD blocks. Verify Home and Research Log at all target widths.

- [ ] **Step 3: Remove Research Log rules now owned by research-log-evolution.css**

Preserve Mission Log viewer behaviour, mobile lightbox disabling, caption spacing, and stable viewport rules.

- [ ] **Step 4: Record the new baseline**

Run:

```powershell
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run audit:css
```

Update `docs/css-baseline.json` only when `style.css` bytes, lines, and repeated selectors are no greater than the previous baseline.

- [ ] **Step 5: Commit each component extraction separately**

```powershell
git add public/assets/css/style.css public/assets/css/photography.css docs/css-baseline.json
git commit -m "refactor: remove legacy photography overrides"
```

Repeat with shell and Research Log files using separate commits.

### Task 4: Final full-site verification and documentation

**Files:**
- Modify: `docs/ui-invariants.md`
- Modify: `docs/perf-browser-watchlist.md`
- Modify: `docs/codex-update-contract.md`

- [ ] **Step 1: Update ownership documentation**

Document which stylesheet owns each component and state that new page styles must not be appended to `style.css`.

- [ ] **Step 2: Run complete verification**

```powershell
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run images:derive
node .\node_modules\astro\astro.js build
node scripts\export-ppt-data.mjs
node scripts\check-site.mjs
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run audit:images
& 'C:\Users\tsuku\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd' run audit:css
```

Expected: all checks pass, originals remain, encrypted archive contains no plaintext, and CSS audit is at or below the post-extraction baseline.

- [ ] **Step 3: Browser regression**

Verify all nine public pages, protected unlock, Photography controls, mobile menu, Light/Space themes, FX Off, reduced motion, and no horizontal overflow.

- [ ] **Step 4: Commit**

```powershell
git add docs/ui-invariants.md docs/perf-browser-watchlist.md docs/codex-update-contract.md
git commit -m "docs: record evolved site maintenance contract"
```
