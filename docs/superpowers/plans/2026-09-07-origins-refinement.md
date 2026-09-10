# Origins Refinement Implementation Plan

**Goal:** Refine the approved Origins illustration without changing Research navigation or scientific claims.
**Architecture:** Retain the scene/controller API. Add deterministic surface and crystal helpers, refine the existing geometry and timeline, and scope compact controls to Origins.
**Tech Stack:** Three.js, Astro, CSS, Node tests, Playwright with Edge.

User approved: irregular rock and porous cutaway, branching flow and rhombohedral aggregates, continuous transitions, compact controls, preserved themes and existing page layout. All internal structures remain illustrative. Local preview only; no publication or commit requested.

## Tasks
- [x] Add failing geometry tests: nonplanar cutaway, varied crystal aggregates, continuous fragmentation, stable resources during scrubbing.
- [x] Implement multi-scale rock relief, distinct cut-face texture, recessed pores and natural crystal aggregates in Origins only.
- [x] Refine flow progression and body-to-fragment transition without camera jumps or new perpetual animation loops.
- [x] Compact Origins controls while retaining 44px targets, accessible slider names and mobile page scrolling.
- [x] Run unit and Origins browser/lifecycle regressions; inspect desktop/mobile dark/light screenshots and nonblank canvas checks. Build and check the production site.

## Verification
Use `scripts/planetary-origins.test.mjs`, `scripts/planetary-origins.browser.test.mjs`, and `scripts/planetary-origins-lifecycle.browser.test.mjs`. Geometry must remain finite and deterministic, with stable GPU resources during slider updates. Inspect relief and framing directly, not only DOM assertions. Preserve context-loss recovery and instance-buffer disposal tests.

## Results
54 Node tests passed, including cap coverage across 51 slider depths. All three Origins browser suites passed: stages/materials, playback, saved views, context recovery, mobile touch release, six cut depths and 36 rotations. Dark/light desktop and mobile screenshots inspected. Production build and site check passed (9 pages, 11 paper records). The existing lazy renderer chunk-size warning remains (706.27 kB, 186.42 kB gzip). No commit or publication performed.

Review findings addressed: shallow cuts now use actual triangle-plane intersection contours (including disconnected outlines and holes); the cap no longer assumes a convex radial section; alteration opens progressively from the intact parent. Surface shading uses continuous height textures rather than exposing cap tessellation.

## Recording Follow-up (18:25:39)

User reported remaining bugs and insufficient refinement. Inspected the 12.77-second Edge recording. Around 7 seconds, scrubbing crosses into alteration and the timeline jumps towards the endpoint. Reproduced with actual mouse movement: the range changes from 1142px to 642.8px when the cutaway lane appears. Previous fill-based tests did not exercise this interaction.

- Timeline and cutaway now retain fixed tracks. Cutaway stays visibly disabled outside alteration; the legend reserves its height without exposing inactive content to accessibility APIs.
- Added real pointer-drag regression at 320, 390, 760, 1000 and 1440px, checking monotonic values, pointer alignment and stationary canvas coordinates.
- Added an Origins-only camera-facing inspection light. Six-angle central-rock luminance improved from 9.8-87.5 to 67.8-123.1 (8-bit screenshot luminance); other viewers keep their existing lights.
- Added broken faces and varied instance proportions, softened the coarse texture contrast, and kept the final surviving fragment near the scene centre instead of translating 1.1 units towards the camera.
- Added geometry coverage for the centred fragment and varied proportions. The Node regression suite now passes 55 tests; build and site export/check pass. No publication or commit.
