# Planetary Explorer Implementation Plan

**Goal:** Add a source-backed Research explorer linking heliocentric context, public asteroid shapes and CI mineral interpretation without changing the existing reading UI or publishing.

**Architecture:** One Astro section above the existing materials section. A browser entry loaded by the shared shell handles soft-navigation lifecycle; Three.js is imported only for an active explorer. Static JPL trajectories and NASA/JAXA meshes are served locally. Existing material tabs and the explorer exchange material-selection events.

**Tech stack:** Astro, Three.js loaders and controls, Lucide, node:test, Playwright/Edge.

## Data and contracts
- [x] Write `scripts/planetary-data.test.mjs`: require ten named bodies, 181 finite heliocentric AU points per trajectory, a common first epoch, Earth radius in 0.98-1.02 AU, nonzero asteroid inclination, original query provenance, and local model files.
- [x] Run `node --test scripts/planetary-data.test.mjs` and observe missing data failure.
- [x] Add `scripts/fetch-planetary-data.mjs`. Fetch JPL VECTORS with Sun center, ecliptic J2000/ICRF, AU-D, no light-time corrections; 180 intervals over approximately one revolution from 2026-09-07 TDB. Preserve API query URLs and raw responses. Do not propagate orbits with custom physics.
- [x] Download NASA Bennu glTF and JAXA Ryugu 49k OBJ with source attribution. Check dimensions/units before model comparison. Never infer a mineral map from a shape mesh.

## Viewer and interpretation
- [x] Add `PlanetaryExplorer.astro`, scoped CSS, browser controller and render module. Use Orbit/Shape/Minerals tabs, material selection, inner/full system scope, plan/tilted view, model wireframe, matched-scale comparison and reset. Single scene, stable viewport, no decorative outer card.
- [x] Retain selected material across tabs and synchronize the existing materials section without moving keyboard focus. CI orbit state explicitly states unknown parent body; no fictitious orbit or reconstructed specimen mesh.
- [x] Orgueil Shapes view uses the specimen photograph; Minerals uses a separate labeled conceptual matrix/carbonate/sulfide diagram. No invented proportions, boundaries or individual-mineral identifications in the photo. Keep references visible through source details.
- [x] Add keyboard camera rotation, touch-scroll-safe activation, zoom/reset and visible loading/error fallback. Rendering is on demand, with no perpetual animation to pause. Dispose controls, WebGL resources, observers and listeners on navigation; stop rendering offscreen or hidden. Preserve reduced-motion behavior.

## Verification
- [x] Browser test: all modes/materials, model meshes/pixels, pointer/keyboard movement, reset, compare scale, complete photos, sources, mobile scrolling and overflow (320/390/760), desktop/light/dark, navigation re-entry and failure fallback. Passed against development and built production pages, including WebGL context loss/restoration.
- [x] Inspect screenshots, not only DOM assertions. Existing Research/mobile/navigation/photo tests remain passing.
- [x] Build, export PPT data, run site checks and unit tests. 36 unit tests and ten browser suites passed. Local preview remains on 4322; no commit/push.

Review fixes: camera distance fits the complete inclined outer-system trajectory; inspected planet metadata is independent of CI selection; replacement labels retain keyboard focus. All 1,810 source positions fit the default inclined full-system viewing volume.

Remaining maintenance: npm audit reports six pre-existing development dependency advisories (five high, one low). Astro, esbuild, js-yaml, nanoid, postcss and svgo versions are unchanged from HEAD. A framework upgrade is outside this feature. The Three.js dynamic chunk triggers the size warning (166.53 kB gzip); it is fetched only when this section becomes visible, not on Home.

## UI follow-on ideas
Preserve object identity through scales, expose evidence categories, keep one compact control row on phones. Later additions can include an independently approved dated mission timeline and a literature-linked mineral comparison table; not part of this implementation.
