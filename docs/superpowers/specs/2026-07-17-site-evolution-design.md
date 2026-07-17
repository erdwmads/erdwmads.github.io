# Site Evolution Design

Date: 2026-07-17
Status: Approved direction

## Decision

Evolve the existing Astro site in place. Preserve its cosmic mineralogy archive identity, planetary header, lunar material imagery, Mission Log language, SOL numbering, and the distinct Research Log entry point. Do not replace it with a generic academic template and do not change frameworks.

The approved approach is a controlled evolution delivered in independently verifiable phases. Privacy and factual consistency come first, then loading cost, responsive hierarchy, Research Log presentation, Light Mode, and finally stylesheet consolidation.

## Approaches Considered

### 1. Controlled evolution - selected

Keep the existing visual identity and interactions, but reduce competing layers, correct the information hierarchy, and progressively replace historical overrides. This has the best balance of visual continuity, maintainability, and regression risk.

### 2. Research-first redesign

Rebuild the public pages around a conventional academic portfolio and keep the Mission Log as the only expressive interface. This would improve clarity quickly but would remove too much of the site's personality.

### 3. Full frontend rewrite

Reimplement the site with a new component and styling system. This could produce a cleaner codebase, but it creates unnecessary visual and interaction risk. Astro is not the current bottleneck; accumulated CSS and image-loading behaviour are.

## Goals

- Make protected Mission Log content genuinely confidential rather than merely hidden by a client-side gate.
- Bring meaningful page content into the first mobile viewport.
- Preserve the site's signature visual language while reducing decorative competition.
- Make long research titles readable without awkward word splitting.
- Reduce Photography and Mission Log image transfer and decode cost.
- Give Research Log a clear project-dashboard hierarchy.
- Make Light Mode a deliberate lunar research archive rather than a grey overlay.
- Reduce CSS size and override depth without changing accepted behaviours.
- Keep FX opt-in and low power by default.

## Non-goals

- No framework migration.
- No marketing landing page.
- No removal of Mission Log, Mission Index, SOL numbering, Interface 2046, or Cosmic Mineralogy language.
- No redesign of scientific content or reinterpretation of research evidence.
- No loading of third-party trackers, analytics, remote fonts, or runtime services.

## Visual System

The permanent signature is limited to three strong signals:

1. Planetary or lunar material imagery.
2. The gold Research Log archive marker.
3. The dark-space / cool-lunar dual theme.

Interface 2046 labels, research-coordinate cards, ambient particles, orbital diagrams, glass highlights, and secondary status pills become supporting layers. On mobile they are hidden or reduced. On desktop, low-priority HUD layers may appear only when they do not compete with content; animated ambient layers remain behind FX On.

Typography follows the information hierarchy:

- Display title: concise project-facing title.
- Full academic title: retained once in project metadata and proposal context.
- Section titles: compact and scan-friendly.
- Captions and metadata: restrained, with no forced hyphenation of scientific terms or proper names.

## Responsive Header

### Desktop

- Preserve the planetary band and visible primary navigation.
- Reduce the vertical header footprint so page content begins earlier.
- Keep Research Log visually independent from the ordinary navigation.
- Keep theme control accessible without placing it inside the primary navigation capsule.

### Mobile

- Use a compact brand row with name, menu control, and theme control.
- Keep Research Log as a distinct archive action.
- Move the planetary composition into a shallow visual band rather than using most of the first viewport.
- Target a total collapsed header height of 120-180 px.
- Opening the navigation must not change document width or trigger horizontal zoom.

## Research Title Strategy

Use the concise display title `Dolomite in the Orgueil CI1 Chondrite` for repeated cards and mobile project headers. Preserve the full title:

`Cosmomineralogical Study of Dolomite in the Orgueil CI1 Chondrite: Aqueous Alteration Processes and Material Evolution in a Primitive Asteroidal Parent Body`

The full title appears once on the detailed project page and in research-proposal metadata. It must wrap at phrase boundaries where possible and must not use automatic hyphenation.

## Research Log 2.0

The public Research Log becomes a project dashboard:

1. Compact project identity and status.
2. Current research question and material.
3. Most recent Mission Log update.
4. Analytical pathway and methods.
5. Protected archive action.
6. Research proposal download.

Remove duplicate full-title blocks. Hide the Future Research Project placeholder until a second real project exists. The Research page must no longer describe Mission Log as local-only.

The password gate remains attached to opening the graduation-research archive, not to the public Research Log index.

## Real Privacy For A Static Site

The current public JSON and public source history mean existing Mission Log content must be treated as already disclosed. The new design prevents future plaintext publication:

- Move the authoritative plaintext Mission Log source outside the public repository into the private Grad Research workspace.
- Generate a versioned encrypted archive during the local publishing workflow.
- Encrypt with Web Crypto compatible AES-GCM using a key derived from a user-supplied passphrase.
- Commit only ciphertext, salt, IV, schema version, and non-sensitive public project metadata.
- Do not embed the passphrase, derived key, or a reversible password verifier in shipped JavaScript.
- Decrypt only in browser memory after the user enters the passphrase.
- Clear decrypted state on navigation, close, reload, and inactivity timeout.
- Use a new strong passphrase before enabling real protection.

Removing historical plaintext from the public Git repository requires a separate, explicitly approved history rewrite. The site upgrade must not rewrite history silently.

## Image Loading

### Photography

- Generate dedicated small WebP or AVIF thumbnails.
- Load the active full-size image eagerly and preload only adjacent images.
- Do not use full-resolution originals for the filmstrip or marquee.
- Lazy-load off-screen thumbnails.
- Preserve original image files and current ordering.

### Mission Log

- Keep the source originals.
- Generate display thumbnails for log cards.
- Fetch the full image only when the desktop viewer opens.
- Preserve the existing mobile rule: inline figures and captions, no heavy lightbox.
- Continue the separate Grad Research backup workflow for Mission Log originals.

## Light Mode

Light Mode uses a cool lunar archive palette:

- cool white and pale mineral grey surfaces;
- deep navy text with WCAG-compatible contrast;
- muted gold only for archive/status emphasis;
- restrained carbon and mineral accents to avoid a one-colour interface.

The planetary background remains visible but quieter. Brand text, controls, captions, and focus states must stay readable over every background region.

## Stylesheet Architecture

Consolidation is incremental and must preserve cascade order during each phase:

- tokens and themes;
- base typography and document layout;
- shared shell and navigation;
- reusable components;
- page-specific styles;
- responsive rules;
- temporary legacy overrides.

New work must not append another broad override layer to the end of the 17,000-line stylesheet. Extract one verified component group at a time, compare screenshots, then remove only the superseded rules. Page-specific CSS should load only on the pages that use it where practical.

## Accessibility And Interaction

- Maintain semantic links, headings, button names, and keyboard access.
- Provide visible focus states in both themes.
- Respect `prefers-reduced-motion`.
- Keep FX Off as the default.
- Maintain at least 44 px touch targets for primary mobile controls.
- Prevent horizontal overflow at 320, 375, 390, and 430 px widths.
- Do not rely on colour alone for protected/archive states.

## Delivery Phases

### Phase 1: correctness and privacy boundary

- Correct stale local-only wording.
- Separate public metadata from protected Mission Log data.
- Add encrypted-archive build and unlock flow.
- Add tests proving plaintext is absent from generated public files.

### Phase 2: image performance

- Add thumbnail generation.
- Change Photography to active-plus-adjacent full-image loading.
- Add Mission Log display thumbnails and full-image-on-open loading.

### Phase 3: responsive shell and typography

- Compact mobile header.
- Reduce desktop header height.
- Apply concise display titles and remove awkward hyphenation.
- Recheck both themes and all navigation routes.

### Phase 4: Research Log 2.0 and Light Mode

- Reorder the public project dashboard.
- Remove duplicate title and future placeholder content.
- Apply the deliberate lunar Light Mode palette and contrast corrections.

### Phase 5: CSS consolidation

- Extract verified style groups without changing visual output.
- Remove superseded overrides.
- Record remaining legacy sections rather than attempting an unsafe one-pass rewrite.

## Verification

Every phase must pass:

- Astro production build.
- Existing `scripts/check-site.mjs` checks plus new phase-specific guards.
- No plaintext Mission Log entries in `dist` after the privacy phase.
- Desktop checks at 1365x768 and 1440x900.
- Mobile checks at 320x568, 375x812, 390x844, and 430x932.
- Light and Space theme screenshots for Home, Research, Research Log, Photography, and the protected project page.
- Navigation, theme toggle, password unlock, image next/previous, and back/close interactions.
- No horizontal overflow or page-width pinch-zoom regression.
- Public deployment verification after GitHub Pages completes.

## Success Criteria

- The first mobile viewport shows both navigation identity and meaningful page content.
- Protected Mission Log plaintext cannot be fetched from a public URL or found in generated assets.
- Photography does not request every full-size image on initial load.
- Research Log has one clear project title and one primary protected-archive action.
- Light Mode text and controls remain clearly readable.
- FX remains opt-in and the site remains usable with all ambient effects disabled.
- Visual identity is recognisably the same site after every phase.
