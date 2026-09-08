# Prism Controls Implementation Plan

**Approved design:** A's rounded double edge with a restrained amount of C's translucent material; retain gold-blue pointer edges and the existing navigation beam. No tilt, bounce, layout displacement, new features or deployment.

**Goal:** Refine the shared website buttons while preserving their labels, geometry and behaviour.

**Architecture:** Change the existing control tokens and scoped rules in observatory-experience.css. Keep the current pointer implementation. Opaque underlying surfaces provide glass-like depth without animated blur or backdrop filtering. Primary actions use the richer material; secondary actions use a neutral face. Existing selected filters remain visibly selected. Add static disabled and pressed states, with reduced-motion overrides.

**Tech Stack:** Astro, shared CSS, existing JavaScript, Edge/Playwright.

- [x] Add and run browser regression checks for distinct primary/secondary surfaces, pressed feedback without movement, stable typography, focus, touch and reduced-motion behaviour. Baseline failed in all six configurations on identical primary/secondary materials; font assertions subsequently failed before typography changes.
- [x] Update shared tokens and control states in public/assets/css/observatory-experience.css; preserve all card, photo, navigation and page-layout rules. Bump its stylesheet version in src/components/LegacyShell.astro.
- [x] Run the new test and existing mission-experience browser tests. Inspect real home and log-control samples at 1440, 390 and 320 pixels in both themes. Typography checks also passed across 54 page/theme/viewport combinations with no remote font requests.
- [x] Run all Mission Log regression tests, build and site validation. 37 tests pass; six Prism combinations, 54 typography combinations and actual LOG 007/010 checks pass. Review-found selected-filter hover border regression reproduced and corrected, with new coverage. Show local preview only; leave commit and publishing for a separate user request.

**Acceptance:** Stable button geometry and arrows across hover/press; complete labels; minimum 44px touch height for main actions; distinct keyboard focus; no moving edge for touch/reduced-motion/FX-off; readable dark/light materials; no new horizontal overflow.

**Additional user request:** Refine font pairing. Preserve Montserrat headings and brand identity; use Inter for prose and controls, 600-weight button labels and tabular metadata. Locally host licensed Latin/Latin Extended variable fonts, removing the existing external import. Keep existing responsive font sizes. Validate font loading and layout on every public page.
