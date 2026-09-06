# Research Materials and Visual Unification

**Approved design:** Retain the scale journey's image/text structure, use existing observatory colours, restrained glass edges and a sliding selection beam. Add CI / Orgueil as the default material and preserve Bennu's three observation scales as a separate comparison. Never imply a shared parent body or publish protected results.

**Implementation:** One material tablist controls two sibling panels. Bennu retains its nested scale tablist. Selection logic operates only on the selected tab's own tablist. CSS grid overlap reserves the maximum intrinsic height without exposing inactive panels. No persistent animation loops, image cropping, or transformed fullscreen ancestors.

**Files:** ResearchScaleJourney.astro, research-scale.css/js, research-scale.browser.test.mjs, public research-scale image/provenance, stylesheet/script cache versions.

- [x] Add failing tests for default Orgueil, independent nested tabs, keyboard focus, source boundary, mobile geometry and no-JS fallback.
- [x] Add Smithsonian CC0 specimen and provenance; implement material tabs and local selection beam.
- [x] Apply shared surface/edge/typography tokens and inspect desktop/mobile in both themes.
- [x] Run browser regression, build and resource checks. Leave uncommitted for review.

Verified: research-scale.browser.test.mjs (320, 390, 760, 1440 px, both themes, independent keyboard navigation, stable geometry, reduced motion/FX, source isolation and no-JS); navigation-beam.browser.test.mjs; site-audit.browser.test.mjs; Astro production build; PPT export; check-site.mjs; git diff --check. Desktop and mobile screenshots inspected. No commit or deployment.

## Ryugu Addition

User requested a third material entrance using the same design. Preserve Orgueil as default and Bennu's three scales. Ryugu gets a JAXA image and a concise, source-linked CI/aqueous-alteration comparison, not an invented parent-body identification.

- [x] Extend browser assertions to require three materials and five images; confirm failure on the two-material implementation.
- [x] Add unchanged JAXA image, credit/provenance, material panel, three-column selection bar.
- [x] Verify third-tab keyboard wrapping, responsive geometry and both themes; build and check resources. No deployment.
