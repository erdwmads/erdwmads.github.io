# Mineral Interactions Implementation Plan

**Goal:** Add the three approved experiences while preserving the current site, its security boundaries and mobile performance.

**Architecture:** A single guarded common controller handles short-lived visual effects and a native evidence dialog. Public atlas data comes from existing research copy and the Paper Shelf source. Private atlas data is read exclusively from the currently rendered, unlocked Mission Log; closing, relocking or navigating purges references and DOM. No fabricated relationships or mineral identifications.

**Tech Stack:** Astro components, vanilla JavaScript, CSS/WAAPI, SVG diagram connections, Playwright/Edge.

## Approved Design
- Cleavage: a brief angular edge trace accompanies soft navigation; no blocking overlay, added navigation delay or moving content. Desktop FX only; cancel on FX off, hidden/idle state, reduced motion or a new navigation.
- Polarisation: the unchanged laboratory logo becomes a keyboard-accessible controller. Holding and dragging it rotates decorative edge colours; arrow keys provide an equivalent action. Release fades the effect. Research imagery is never filtered. Desktop FX only.
- Evidence atlas: a central research question links to labelled groups. Public methods and literature are explicitly context, not proof. Private groups list actual figures, tables and notes from the active log, with actions returning to the original source. Native dialog supports Escape, focus restoration and responsive vertical layout. Works with FX off.

## Tasks
- [x] Add failing browser checks for the logo controller, gated cleavage animation and public/private atlas.
- [x] Implement public source data and launch points; preserve normal links and protected loading.
- [x] Implement event-driven effects and the evidence dialog, including cleanup and reduced-motion handling.
- [x] Validate dark/light desktop, mobile, keyboard controls, source navigation and relock privacy; run existing tests and production build.

No commit, deployment or Mission Log image modification is part of this task.

## Verification So Far
- Initial browser regression failed on the absent accessible logo control, then passed after implementation.
- Private atlas checks use the real encrypted archive: figure counts, table counts, original image viewer and relock purge passed.
- Mobile QA found intrinsic grid width overflow; explicit zero-minimum grid sizing fixed it. 320/390/760/1024 px checks now pass.
- Background animation pause/resume, reduced motion, FX gating, source anchors and public source isolation passed.
- Original 34 unit tests, navigation browser suite, observatory browser suite (with protected unlock) and Astro build/site check passed.
- Independent read-only review found a keyboard focus defect in record/table return actions. Added a failing regression and fixed destinations with temporary programmatic focusability; the complete browser suite passed again.
- Final Astro build and site check passed. No commit or deployment performed.
