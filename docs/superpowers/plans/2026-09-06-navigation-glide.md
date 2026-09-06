# Navigation Glide Implementation Plan

**Goal:** Keep the header mounted when the homepage Research/CV links navigate, allowing the existing marker to glide horizontally without a vertical flash.

**Approved design:** A 300 ms ease-out horizontal marker transition and a soft crossfade between selected navigation backgrounds. Mobile keeps the in-flow menu and no travelling marker. Reduced motion uses only a brief colour/opacity change. Preserve existing content, themes, effects and normal modified-click behaviour.

**Architecture:** Opt the two homepage links into the existing soft navigation controller. Reuse the shared beam and its measured initial placement. Use an opacity-transitioned pseudo-element for the existing selected background, because gradients cannot crossfade directly.

**Tech Stack:** Astro static pages, vanilla JavaScript/CSS, Playwright with Edge.

## Tasks
- [x] Extend `scripts/navigation-beam.browser.test.mjs` to assert header/beam identity across homepage navigation and actual intermediate horizontal frames; run it red.
- [x] Add explicit soft-navigation opt-ins in `src/legacy/index-main.html`; honour normal browser link semantics in `public/assets/js/legacy-navigation.js`.
- [x] Update `public/assets/css/observatory-experience.css` for 300 ms horizontal movement and selected-background opacity transitions; preserve initial-position snapping and reduced motion.
- [x] Run browser regressions in both themes, mobile/reduced-motion checks, existing unit tests, and visually inspect the transition. Do not commit or publish without a separate request.

## Verification
- Red: browser regression reported `space/research: navigation rebuilt the header`.
- Green: retained header/beam, intermediate horizontal frames, selected-background fade, history navigation, desktop/mobile layout, and reduced-motion checks passed.
- Existing 34 unit tests passed; the observatory browser suite passed without the optional protected-archive unlock test.
- Inspected Edge header screenshots in Space and Light modes. No commit or deployment performed.
