# Research Exploration Implementation Plan

**Goal:** Implement the user's approved features 2, 5, 6, 1 in that order, preserving the existing dark/gold/cyan UI and scientific boundaries.

**Architecture:** Extend the existing lazy planetary renderer and controller. Keep public questions, sample provenance and URL serialization in small dedicated modules. Reuse public imagery and a single canvas; never load private records for these features. Four explicit observation scales distinguish orbit coordinates, body geometry, public specimen photographs and illustrative minerals.

**Tech Stack:** Astro, Three.js / OrbitControls, Lucide, URLSearchParams, Web Animations, node:test, Playwright / Edge.

## 2. Object-linked light
- [x] Add a failing browser assertion for the selected body/label and FX gating.
- [x] Renderer: mark one selected orbit and body, use a restrained alpha halo with depth writing off, keep Sun and reference orbits legible. Mineral selection highlights its own geometry, not the whole background.
- [x] Controller/CSS: selected label and summary edge share the accent; honour FX off, reduced motion and light theme. No pulsing text or continuous shader animation.
- [x] Verify selection, dragging, zoom, playback and existing label-stability tests.

## 5. Question-led entry
- [x] Add public questions with Observation / Possible explanation / Missing evidence, public method sources and explicit candidate-versus-identification wording.
- [x] Use a compact accessible disclosure so existing controls are not buried. Each question has a clearly named action leading to the relevant model or public material; no private experiment claims or images.
- [x] Verify keyboard operation, source links, target model and mobile layouts.

## 6. Observation links
- [x] Unit-test a versioned, whitelisted URL codec: view/material/inspected/date/scope/angle/mineral/toggles and camera pose; malformed numbers/enums/vectors rejected, no arbitrary properties or query credentials retained.
- [x] Add Lucide link command and copy status. On clipboard denial show a selectable link field. Freeze the saved date; do not resume playback automatically when opening a link.
- [x] Restore controls, selection and camera after lazy loading, hard entry and soft entry; same-page hash/history changes also restore. Cancel obsolete async restores on navigation/user actions.
- [x] Test hard reload round trips for orbit/mineral, date, zoom/rotation, failed clipboard, malformed URL and private-data exclusion.

## 1. Scale journey
- [x] Add an explicit Samples view using existing Bennu/Orgueil photos plus a sourced JAXA Ryugu sample photo; retain original image proportions/scale bars and credit.
- [x] Add an opt-in journey with previous/next/exit controls. Sequence: orbit -> body model -> public sample photograph -> illustrative mineral. Orgueil starts at its specimen, with no invented parent-body trajectory or scan.
- [x] Use a short cancellable camera approach followed by a restrained crossfade; reduced motion/FX off uses immediate changes. Manual controls, Escape, visibility loss and navigation interrupt cleanly. Keep source/type/scale labels visible.
- [x] Test journey for all materials, interruption, reduced motion, failed assets, mobile layout and nonblank model pixels.

## Final verification
- [x] Independent review, then run new and existing unit/browser suites, production build, PPT export and site check.
- [x] Inspect desktop/mobile dark/light screenshots; leave preview on 4322. No commit, push or deployment; no image comparison or atomistic model work in this batch.

## Verification record

- 56 Node tests passed: planetary data/time/minerals/view links, research lock, mobile layout, Mission Log publisher/index/lightbox.
- Edge browser suites passed: planetary exploration, restoration races, explorer, playback, labels; research workflow, mineral interactions, navigation lifecycle, reading UI, research-scale mobile, site audit.
- New race cases cover overlapping model builds, copy during loading, abandoned URL restoration, theme changes during restoration and journey cancellation during restoration. Source-image failure, hard/soft entry and history restoration are covered.
- Screenshots inspected at 1440px and 390px in both themes; overflow checks include 320px and 760px. Existing explorer tests verify actual canvas pixels, framing, rotation and pinch zoom.
- Production build: 9 pages. Lazy Three.js renderer remains a 670.88 kB chunk (174.13 kB gzip); Vite size warning remains, not a build failure.
- PPT export: 11 papers. Site check passed: 9 public pages, protected Mission Log, local assets, SEO and Paper Shelf.
- Actual private archive was not unlocked. Private-access lifecycle tests use fixtures; public features require no private data.
- Local preview: http://127.0.0.1:4322/research.html#planetary-title. No commit or deployment.
