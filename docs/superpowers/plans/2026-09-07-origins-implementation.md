# Origins Implementation Plan

> **For agentic workers:** Execute inline with executing-plans. User approved the written design on 2026-09-07. Keep the current working tree and local preview; do not publish or commit unrelated work.

**Goal:** Add a scientifically bounded, interactive four-stage Origins view for Orgueil and asteroid comparisons.

**Architecture:** Reuse the existing Field Guide controller, Three.js renderer and observation codec. Keep scientific copy, deterministic scene construction and playback controls in separate focused modules. Progress is a normalized illustrative sequence, not a physical simulation or a dated reconstruction.

**Tech Stack:** Astro, Three.js / OrbitControls, Lucide, Node test runner, Playwright with Edge.

## Tasks

- [x] 1. Add failing tests for Origins scene/content and observation fields.
  Files: `scripts/planetary-origins.test.mjs`, `scripts/planetary-origins.browser.test.mjs`.
  Assertions include `originStage(1) === 3`, finite deterministic geometry,
  distinct material branches, bounded `originProgress` / `originCutaway`,
  nonblank pixels and actual progression after pressing Play.
  Run Node test first and observe the missing-module failure.
- [x] 2. Implement content and deterministic Three.js scene.
  Files: `src/scripts/origins-content.js`, `src/scripts/planetary-origins.js`.
  Interface: `createOriginsScene(material, light)` returns `{group, update, setFx}`;
  `update(progress, cutaway)` changes existing geometry transforms, visibility,
  local clipping and phase rather than allocating a scene every frame.
  Use existing `createMineralGroup` for explicitly illustrative carbonate forms.
  Unit tests check transforms after all phases and clip endpoints.
- [x] 3. Implement scoped controls and renderer integration.
  Files: `src/scripts/origins-controls.js`, `src/scripts/planetary-renderer.js`.
  Interface: `initOriginsControls(root, {signal,state,onChange,onEvidence})` returns
  `{sync,pause,setVisible,setMotionAllowed}`. Use normalized progression over
  48 seconds, pause on manual scrubbing/hidden/error/navigation and never persist
  a playing state. Renderer exposes `setOrigins(progress,cutaway)`.
- [x] 4. Integrate markup, copy and observation sharing.
  Files: `src/components/PlanetaryExplorer.astro`,
  `src/scripts/planetary-explorer.js`, `src/scripts/planetary-view-link.js`,
  `public/assets/css/planetary-explorer.css`, `src/components/LegacyShell.astro`.
  Add Origins as an additional tab, four process selectors, icon playback,
  sequence/cutaway sliders, legend and final evidence actions. Existing view
  defaults and guide steps stay unchanged. Extend URL fields to [0,1] numeric
  progress and cutaway, and restore paused. Hide unrelated orbital controls.
- [x] 5. Run tests and visual QA, then fix observed defects.
  Run `node --test scripts/planetary-origins.test.mjs scripts/planetary-view-link.test.mjs`.
  Run `node scripts/planetary-origins.browser.test.mjs` with installed Playwright
  and Edge executable environment variables. Inspect screenshots in both themes
  at 320/390/760/1440 widths; check clipping, touch and animated pixel changes.
  Run existing usability, explorer, restoration, playback and label regressions.
- [x] 6. Verify production output and leave preview running.
  Run `node node_modules/astro/astro.js build`, `node scripts/export-ppt-data.mjs`,
  `node scripts/check-site.mjs`, `git diff --check`. Report actual outcomes,
  remaining limitations and the existing preview URL, without publishing.

## Review

No orbit or dated parent-body dimensions are introduced for Orgueil. Rendering
is an explanatory animation, not accretion physics. Existing camera/touch/share
behavior remains authoritative. Invalid state is rejected at the public codec.
GPU resources share the renderer's existing disposal and context-loss lifecycle.

## Verification Results

- 60 Node tests passed, including Origins determinism, bounded URL state and
  instance-buffer disposal.
- Origins browser and lifecycle suites passed: all three material branches,
  actual animated pixels, cutaway, shared-view restore, WebGL context recovery,
  offscreen pause, touch release, 8 responsive layouts and mobile scene bounds.
- Existing usability, exploration, restoration, explorer, playback and label
  browser suites passed.
- Production build, PPT-data export, 9-page site check and diff checks passed.
  Build required approved execution outside the sandbox because esbuild was
  denied ancestor-directory reads. The lazy Three.js chunk still triggers the
  existing large-chunk warning; its final gzip size is approximately 181 kB.
- Review found and fixed disabled Play after context recovery and missing
  InstancedMesh disposal. No publication or git commit was performed.
