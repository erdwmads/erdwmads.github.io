# Responsive Research Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact the responsive shell, clarify research-title hierarchy, redesign the public Research Log dashboard, and make Light Mode deliberate and readable.

**Architecture:** Add a semantic mobile menu control to LegacyShell, keep desktop navigation intact, and place the new component styles in focused CSS files loaded after the legacy stylesheet. Page copy uses a shared concise display title while preserving the full academic title once on the detailed project page.

**Tech Stack:** Astro, semantic HTML, vanilla JavaScript, scoped CSS, browser visual regression.

---

### Task 1: Establish responsive regression guards

**Files:**
- Modify: `scripts/check-site.mjs`
- Create: `public/assets/css/shell-evolution.css`
- Create: `public/assets/css/research-log-evolution.css`

- [ ] **Step 1: Add failing structure checks**

```js
const shellSource = fs.readFileSync(path.join(root, "src", "components", "LegacyShell.astro"), "utf8");
if (!shellSource.includes("data-nav-toggle") || !shellSource.includes("data-mobile-nav")) {
  fail("LegacyShell: missing compact mobile navigation contract");
}
if (!researchLogPage.includes("Dolomite in the Orgueil CI1 Chondrite")) {
  fail("research-log.html: missing concise display title");
}
if (researchLogPage.includes("Future Research Project")) {
  fail("research-log.html: empty future-project placeholder must be hidden");
}
```

- [ ] **Step 2: Verify RED**

Run: `node scripts/check-site.mjs`

Expected: FAIL for mobile navigation, concise title, and Future placeholder.

- [ ] **Step 3: Commit**

```powershell
git add scripts/check-site.mjs public/assets/css/shell-evolution.css public/assets/css/research-log-evolution.css
git commit -m "test: define responsive research interface"
```

### Task 2: Add the compact mobile navigation

**Files:**
- Modify: `src/components/LegacyShell.astro`
- Create: `public/assets/js/site-header.js`
- Modify: `src/data/site.ts`
- Modify: `public/assets/css/shell-evolution.css`

- [ ] **Step 1: Add the menu button**

```astro
<button
  class="nav-toggle"
  type="button"
  aria-label="Open navigation"
  aria-expanded="false"
  aria-controls="mobile-navigation"
  data-nav-toggle
>
  <span aria-hidden="true"></span>
</button>
```

Give the existing `.header-actions` the attributes `id="mobile-navigation"` and `data-mobile-nav`.

- [ ] **Step 2: Add menu behaviour**

```js
(() => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const navigation = document.querySelector("[data-mobile-nav]");
  if (!toggle || !navigation) return;

  const close = () => {
    document.documentElement.classList.remove("mobile-nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  };

  toggle.addEventListener("click", () => {
    const open = !document.documentElement.classList.contains("mobile-nav-open");
    document.documentElement.classList.toggle("mobile-nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  });
  window.addEventListener("pageshow", close);
})();
```

- [ ] **Step 3: Load the script and focused stylesheet**

Add `site-header.js` to `commonScripts`. Load `shell-evolution.css` after `style.css` in LegacyShell.

- [ ] **Step 4: Add responsive dimensions**

Under `max-width: 760px`, keep the closed header between 120 and 180 px, make the brand readable, place the menu control at least 44x44 px, and show the navigation as a full-width sheet only when `.mobile-nav-open` is present. Do not use viewport-width font scaling.

- [ ] **Step 5: Build, check, and commit**

```powershell
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add src/components/LegacyShell.astro src/data/site.ts public/assets/js/site-header.js public/assets/css/shell-evolution.css
git commit -m "feat: add compact mobile navigation"
```

### Task 3: Correct title hierarchy and wrapping

**Files:**
- Modify: `src/legacy/research-log-main.html`
- Modify: `src/legacy/research-graduation-hero.html`
- Modify: `src/legacy/research-main.html`
- Modify: `public/assets/css/research-log-evolution.css`

- [ ] **Step 1: Replace repeated display titles**

Use `Dolomite in the Orgueil CI1 Chondrite` on the Research Log index card and Research summary card. Keep the full academic title once as the H1 in `research-graduation-hero.html`.

- [ ] **Step 2: Remove manual and automatic word splitting**

Remove `<wbr>` from the title. Add:

```css
.ui-page-research-log h1,
.ui-page-research-graduation h1 {
  word-break: normal;
  overflow-wrap: break-word;
  hyphens: none;
  letter-spacing: 0;
}
```

- [ ] **Step 3: Set stable title sizes**

Use a desktop detailed-project maximum of 52 px and a mobile size of 32 px, with a constrained reading width. Do not use `vw` font sizing.

- [ ] **Step 4: Build, check, and commit**

```powershell
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add src/legacy/research-log-main.html src/legacy/research-graduation-hero.html src/legacy/research-main.html public/assets/css/research-log-evolution.css
git commit -m "refactor: clarify research title hierarchy"
```

### Task 4: Build Research Log 2.0

**Files:**
- Modify: `src/legacy/research-log-main.html`
- Modify: `public/assets/css/research-log-evolution.css`
- Test: `scripts/check-site.mjs`

- [ ] **Step 1: Replace the four status cards and project grid with one dashboard**

Use this order and semantic structure:

```html
<section class="research-dashboard" aria-labelledby="current-project-title">
  <div class="research-dashboard__status">
    <span class="status-badge">Ongoing</span>
    <span>2026-present</span>
  </div>
  <h1 id="current-project-title">Dolomite in the Orgueil CI1 Chondrite</h1>
  <p class="research-dashboard__full-title">Cosmomineralogical Study of Dolomite in the Orgueil CI1 Chondrite: Aqueous Alteration Processes and Material Evolution in a Primitive Asteroidal Parent Body</p>
  <dl class="research-dashboard__facts">
    <div><dt>Research question</dt><dd>What conditions controlled dolomite formation in Orgueil CI1?</dd></div>
    <div><dt>Material</dt><dd>Orgueil CI1 chondrite</dd></div>
    <div><dt>Methods</dt><dd>SEM / EPMA / XRD / TEM</dd></div>
    <div><dt>Latest record</dt><dd data-mission-project="graduation">Mission Log 010</dd></div>
  </dl>
  <div class="research-dashboard__actions">
    <a class="button" href="research-graduation.html">Open protected archive</a>
    <a class="button secondary" href="assets/files/Bachelors_Thesis_Research_Proposal_Mads_LIU_Yong.pdf">Research proposal</a>
  </div>
</section>
```

- [ ] **Step 2: Remove the disabled Future card**

Do not render a replacement placeholder.

- [ ] **Step 3: Style without nested cards**

The dashboard is one unframed content band. The facts use dividers or a simple grid, not cards inside a card.

- [ ] **Step 4: Build, check, and commit**

```powershell
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add src/legacy/research-log-main.html public/assets/css/research-log-evolution.css scripts/check-site.mjs
git commit -m "feat: redesign research log dashboard"
```

### Task 5: Recalibrate Light Mode

**Files:**
- Modify: `public/assets/css/shell-evolution.css`
- Modify: `public/assets/css/research-log-evolution.css`

- [ ] **Step 1: Define focused Light Mode tokens**

```css
html:not([data-theme="space"]) {
  --evo-surface: #edf3f6;
  --evo-surface-strong: #f8fafb;
  --evo-ink: #10243a;
  --evo-muted: #5f7080;
  --evo-line: rgba(16, 36, 58, .18);
  --evo-gold: #a88232;
  --evo-mineral: #7d5c58;
}
```

- [ ] **Step 2: Apply readable contrast**

Set brand tagline, navigation, project metadata, captions, and focus rings from these tokens. Keep gold limited to archive/status emphasis.

- [ ] **Step 3: Reduce the Light Mode planetary wash**

Preserve the planetary image but reduce the uniform grey overlay. Use a cool-white content surface and deep navy text; do not add gradients or decorative blobs.

- [ ] **Step 4: Build and commit**

```powershell
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add public/assets/css/shell-evolution.css public/assets/css/research-log-evolution.css
git commit -m "style: refine lunar light mode"
```

### Task 6: Reduce supporting HUD competition

**Files:**
- Modify: `public/assets/css/shell-evolution.css`
- Modify: `public/assets/js/interface-2046.js`
- Modify: `public/assets/js/research-coordinates.js`

- [ ] **Step 1: Hide low-priority HUD on mobile**

At `max-width: 760px`, hide Interface 2046 side labels, research-coordinate cards, orbit labels, and any non-interactive telemetry. Keep Research Log and theme controls.

- [ ] **Step 2: Couple decorative orbital layers to FX**

When FX is Off, do not create moving orbital or particle nodes. Static planetary imagery may remain.

- [ ] **Step 3: Verify reduced motion**

With `prefers-reduced-motion: reduce`, no ambient or orbit animation loop starts.

- [ ] **Step 4: Build and commit**

```powershell
node .\node_modules\astro\astro.js build
node scripts\check-site.mjs
git add public/assets/css/shell-evolution.css public/assets/js/interface-2046.js public/assets/js/research-coordinates.js
git commit -m "perf: quiet supporting interface layers"
```

### Task 7: Responsive visual regression

**Files:**
- No source changes unless verification reveals a defect.

- [ ] **Step 1: Test mobile widths**

At 320x568, 375x812, 390x844, and 430x932, verify: closed header is at most 180 px; meaningful page content is visible in the first viewport; menu opens and closes; document width equals viewport width.

- [ ] **Step 2: Test desktop widths**

At 1365x768 and 1440x900, verify planets, navigation, independent Research Log control, and theme control align without wrapping.

- [ ] **Step 3: Test both themes**

Capture Home, Research, Research Log, Photography, and protected graduation page in Light and Space modes.

- [ ] **Step 4: Test interaction**

Verify soft navigation, theme persistence, FX Off default, Research Log gate, focus states, Escape/menu close, and browser back.
