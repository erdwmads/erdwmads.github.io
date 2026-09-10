# Whole-site visual refinement, second pass

**Goal:** Close the visible quality gap admitted in the previous review: geological form/materials in Origins, repetitive editorial layout, and residual responsive continuity defects. Subjective 9.99 is an aspiration, not a test result.
**Architecture:** Keep approved shared shell, space/light themes and scientific content. Refine existing geometry/materials and page layouts. No new navigation destinations, decorative duplicated imagery, or extra features.
**Stack:** Astro / Three.js / CSS / Playwright.

- [x] Origins: uneven geological silhouettes, relief on exposed fracture faces, nonuniform rubble populations, embedded pore minerals; inspect four chapters at several progress positions and both views. Preserve deterministic replay, connected collision contact, and zero wire meshes.
- [x] Origins: tune camera framing and directional lighting for readable volume, preserve manual orbit and mobile reading.
- [x] Editorial layout: Home exploration, CV, Paper Shelf and Contact each get appropriate hierarchy rather than repeated glass cards; verify both themes and 320–1920 widths.
- [x] Responsive continuity: reproduce and repair concrete ambient/interface teardown defects found in current source; verify resize and reduced motion.
- [x] Build and inspect real renders. Run relevant unit/browser navigation, scientific interaction, content and responsive regressions. Use screenshots to reject weak imagery independently of test results.
- [x] Review integrated result and record concrete remaining limitations. Local preview only; no publish or commit.

Ownership: parent Origins model/render and integration; content audit agent editorial files; navigation audit agent two responsive effect scripts. Builds exclusively parent-owned. Existing changes retained.

Final evidence: `2026-09-10-visual-refinement-verification.md`. A late sequence review caught a fourth-chapter composition issue; the camera now follows the surviving aggregate and departing fragments fade from the explanatory view. Manual orbit/zoom suspends automatic framing.
