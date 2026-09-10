# Whole-site quality refinement implementation plan

**Goal:** Refine every active page of the existing academic website to a consistent, legible and reliable experience, with concrete visual and interaction evidence. The user's 9.99 target applies to the whole website; it is not a claim of an objectively measurable aesthetic score.

**Architecture:** Retain the approved shared space/light identity, persistent navigation and scientific content. Correct the shared shell before page-specific styling; keep domain interactions in their existing modules. Preserve all current uncommitted work and the protected archive boundary.
**Stack:** Astro, shared CSS and browser JavaScript, Three.js, Playwright.
**Delivery:** Local preview at 127.0.0.1:52523. No publication in this iteration.

## Coverage and acceptance

- All nine active routes: Home, Research, Origins, Paper Shelf, CV, Photography, Contact, Research Log and the gated graduation record. Retired Sample Cabinet remains retired.
- Review actual desktop and mobile screens in space/light themes, plus 320/768/1024/1920 layout checks. No horizontal overflow, overlapping primary controls, clipped captions or theme-induced geometry drift.
- Shared header, main alignment, typography and action hierarchy remain consistent across routes. Navigation fades retain background effects and respect reduced motion. History, focus and repeated page entry work.
- Each route has an understandable purpose, primary actions and logical reading order. Repeated image content is not used as decorative filler; figures retain one clear owning context, with thumbnails/fullscreen views referring to it.
- Buttons have meaningful visible/accessibility names, visible keyboard focus and operable close/reset paths. Main mobile controls have usable touch targets. Normal page scrolling is not trapped by models.
- Scientific models preserve source shape data and distinguish material appearance from process overlays. All active chapters, modes, inspection dialogs and return-to-page controls work.
- Images load with appropriate dimensions, descriptions and responsive sizing. No broken local assets or accidental disclosure of protected records.
- Pause offscreen work and dispose outgoing renderers/listeners. Measure representative performance without claiming universal hardware results.
- Run relevant existing checks and new reproduced-failure regressions. Resolve concrete independent-review findings; keep test evidence and before/after screenshots.

## Execution

- [x] Baseline: inventory all active pages and produce route/theme/viewport screenshots plus semantic/layout reports.
- [x] Shared shell: trace navigation, theme, focus, effects and lifecycle; write failing regressions for confirmed defects; implement and verify focused fixes.
- [x] Content pages: audit Home/CV/Contact/Paper Shelf/Photography/Research Log reading order, links, labels, image ownership and captions; fix page-specific defects while preserving research facts.
- [x] Science interfaces: audit Origins and the Research explorer, mission viewer and supporting evidence flow; verify concrete model states and input modes.
- [x] Visual pass: unify spacing, surfaces, typography, button hierarchy and light/dark contrast based on actual screenshots.
- [x] Integration: build once changes are stable; run nine-route responsive/theme tests, navigation/history/lifecycle and feature checks.
- [x] Final review: inspect final representative images and code; resolve actual blockers and rerun affected checks.
- [x] Deliver the complete local website preview with concise verified changes and remaining material limitations.

Independent code/content audits may run in parallel without edits during baseline. Assign non-overlapping file ownership before implementation. Builds remain parent-owned and never run while browser checks are reading dist.


Final evidence: `2026-09-10-whole-site-verification.md`. Browser screenshots and code were reviewed locally; no independent-review verdict is claimed.
