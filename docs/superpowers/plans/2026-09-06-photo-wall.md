# Photography Wall Implementation Plan

**Goal:** Replace the fixed-ratio slideshow with the approved uncropped photo wall.
**Architecture:** Render existing photographs once in CSS columns (three desktop, two mobile), with the panoramic photograph spanning all columns. Store measured dimensions to reserve image space. Reuse the shared presentation dialog; tile selection determines its starting index. Remove autoplay and duplicate thumbnails/marquee.
**Tech Stack:** Astro, CSS columns, existing vanilla-JavaScript viewer, Playwright/Edge.

- [x] Add a failing browser test for unique tiles, natural ratios, responsive columns and selected-image viewing.
- [x] Update photograph metadata, gallery markup/styles and viewer selection; stop loading the retired slideshow controller.
- [x] Verify photos visually in both themes on desktop/mobile; test keyboard/close/fullscreen, soft navigation and lazy loading.
- [x] Run existing viewer/layout tests, build and site checks. Do not commit or deploy.

Verification: all 21 images decoded; 18 lazy-loaded. Photo-wall tests passed at 1440, 760, 390 and 320px in both themes. Existing observatory, page-alignment and site-audit browser suites passed, as did 34 unit tests, Astro build and site checks.
