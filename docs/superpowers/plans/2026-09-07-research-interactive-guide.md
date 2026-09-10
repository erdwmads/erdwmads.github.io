# Research Interactive Guide Implementation Plan

**Goal:** Deliver the approved date-driven orbit viewer, concrete mineral explanations and readable research workflow locally, preserving the current site and label stability fix.

**Architecture:** Keep one lazy Three.js renderer. Add a shared, bounded UTC ephemeris timeline from cached JPL vectors, interpolate positions with Three.js interpolants, and update markers without rebuilding the scene. Mineral geometry is explicitly illustrative and uses named mineral examples. Rewrite only the public research atlas flow; protected experiment content stays protected.

**Tech Stack:** Astro, Three.js / OrbitControls / LinearInterpolant, Lucide, node:test and Playwright / Edge.

## Orbits and zoom
- [x] Add failing tests for shared timestamps, interpolation endpoints, play/pause/date/now, wheel/button zoom and touch activation.
- [x] Download a common UTC timeline for ten bodies (2025-2030, daily samples), with source queries and epoch bounds. Current-time positioning uses cached ephemerides, not live telemetry; outside the range, no fabricated live state.
- [x] Add date, play/pause, speed and Now controls. One simulated clock for all bodies; stop at bounds and suspend offscreen/hidden. Show the selected date and current distances. Do not loop each body's separate orbit samples as if periods were equal.
- [x] Enable wheel/button zoom and gated touch pinch, reset, meaningful zoom bounds and near/far framing. Preserve labels and camera during timeline changes.

## Minerals
- [x] Replace static three-motif panel with named selectable examples (dolomite, layered silicate, iron sulfide), rotatable models and plain-language descriptions.
- [x] Verify forms against authoritative mineral references. Only reuse photos with explicit suitable licenses; otherwise use labeled illustrative geometry, not invented specimen data or a fake crystal-structure solution.
- [x] Buttons visibly change the model and explanation; optional structure explanation remains distinct from measured composition. Preserve fallback information without WebGL.

## Research workflow
- [x] Replace the public atlas logo hub with Material > Question > Methods > Evidence. Show what each analytical method can answer and its limitations; keep source links and protected archive access.
- [x] Test keyboard, close/return focus, mobile layout, light/dark and protected-data isolation.

## Completion
- [x] Review all changes against the approved scope, then review lifecycle and scientific boundaries.
- [x] Test model pixels and movement, date synchronization, zoom, 320/390/760px layouts, navigation cleanup, existing scene/error regressions. Build, export PPT data and check the static site.
- [x] Leave preview on 4322. Do not commit, push or publish.

## Verification
- 39 unit tests passed.
- Edge browser suites passed: planetary explorer (model pixels, mineral changes, mobile pinch, failed fetch/model retry), playback (movement, pause, current clock, bounds, zoom), stable labels, public/private workflow fixtures, mineral interactions, mobile research scale, navigation lifecycle, reading UI and site audit.
- Actual protected archive was not unlocked; private behaviour used synthetic fixtures and lock tests.
- Build, PPT export and site check passed. The lazy Three.js renderer retains a bundle-size warning (about 667 kB minified / 173 kB gzip); no eager Three.js import was added to other pages.
- Review fixes: final clock/fact synchronization, integer-hour slider endpoints, retry after failed initialization/model loading, touch labels forwarding gestures, and material synchronization without duplicate rebuilds.
