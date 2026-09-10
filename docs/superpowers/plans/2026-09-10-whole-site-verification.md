# Whole-site refinement — local verification record

Date: 2026-09-10. Local preview: http://127.0.0.1:52523/index.html?revision=whole-site-refinement

## Scope

Home, Research, Origins, Paper Shelf, CV, Photography, Contact, Research Log and the password-protected graduation archive were reviewed as one website. The retired Sample Cabinet was not revived. All existing uncommitted work was retained. This iteration has not been published.

## Changes

- Shared shell: one compact display-settings entry; contextual metadata moved into its panel; consistent reading surfaces, quieter heading treatment, semantic skip link, footer positioning and page-top link.
- Navigation: ordinary site content links use the same fade and persistent background as the header; page-local anchors preserve the existing model; active-page links preserve state; browser Back restores reading position; keyboard focus follows the new heading; canonical/social metadata follows the current page. Escape no longer redirects focus to a closed mobile menu.
- Home: concise current research heading, optional full formal title and clearly labeled destinations. The original biography and research facts remain.
- Research: five section links connect focus, missions, materials/orbits, microscopy and methods. Plain wheel input scrolls the page; mobile model interaction has an explicit Explore/Done entry. No guided-tour button was reintroduced.
- Origins: readable scientific copy exists before WebGL initialization; scientific context opens independently of the renderer; chapters precede the model; mobile explanations follow it. Touch defaults to page scrolling. Material/Process controls meet the 44 px target; keyboard playback, descriptive slider values, offscreen pause and scene retry preserve the chapter/progress/color mode.
- Paper Shelf: all 11 entries have original publication links; several shortened titles now match publication records. Search provides a live result count, empty state and clear action.
- CV: newest research/education first; the ongoing undergraduate degree is described as studies rather than an awarded degree.
- Photography: all 21 images received descriptions based on inspection of their actual content; no image identities or locations were guessed.
- Contact: email is the first actionable block, with compose, copy and a selectable fallback. No messages were sent.
- Research Log: stable archive wording replaces a stale hard-coded latest-record number. The graduation page separates a concise archive heading from the retained formal project title. Encryption remains intact.

## Verification evidence

- Production build and static-site checks passed: local assets, metadata, source links and protected archive structure.
- Nine routes at 1440 px and 390 px in both themes: no horizontal overflow, unnamed visible buttons or theme-dependent control geometry drift.
- Nine routes additionally checked at 320, 768, 1024 and 1920 px; no overflow or undersized primary buttons in the audit. Origins was rechecked after its compact mobile chapter layout change.
- Browser tests covered skip navigation, body-link continuity, new-page focus, active-link state retention, history restoration, paper filtering and reset, all source links, recent CV order, email copy/fallback and photo descriptions.
- Navigation continuity tests covered persistent document/background elements, fade-out before swaps, repeated Origins entry, renderer disposal, Back/Forward and interrupted navigation.
- Protected archive layout tests used encrypted synthetic fixtures (two records, seven figures each) at 1440/1024/768/390/320 px in both themes. Caption flow, log/tool placement, presentation, comparison, atlas and relocking passed. No private password or private image content was needed.
- All 17 Hayabusa2/OSIRIS-REx chapters rendered nonblank frames without browser errors. Play, pause, scrub, automatic chapters, mission-tab keyboard operation, reduced motion, offscreen pause, BFCache restoration and mobile touch were checked.
- All four Origins chapters were inspected in Material and Process views, including actual rendered-pixel checks. Touch, keyboard, context-loss retry and restored progress/color state were exercised.
- Orbit models loaded local Sun/Earth/asteroid assets; Earth selection, rotation, cached Shapes, wireframe, size comparison and mobile rendering passed.
- Photography opening/return animation, image change, fullscreen, scroll/focus restoration, reduced motion and FX OFF passed. Public research-atlas sources, return focus and FX gating passed.
- 31 core unit checks passed for spacecraft mechanisms, geometry ownership/batching, orbital bodies/time and observation links.

Screenshots and layout reports are retained in the local temporary folders `site-quality-20260910` (before) and `site-quality-20260910-final` (after). This is a concrete verification record, not an objective 9.99 aesthetic rating or a guarantee for all hardware.

## Publication source verification

The publication links were checked against publisher or author-institution records, including:

- [King et al. (2015)](https://www.sciencedirect.com/science/article/pii/S0016703715003634)
- [Gregg et al. (2015)](https://doi.org/10.1111/sed.12202)
- [Fujiya et al. (2023)](https://www.nature.com/articles/s41561-023-01226-y)
- [Johnson & Prinz (1993)](https://www.sciencedirect.com/science/article/pii/001670379390393B)
- [Endreß & Bischoff (1996)](https://www.sciencedirect.com/science/article/pii/0016703795003991)
- [Nakamura et al. (2023)](https://authors.library.caltech.edu/records/q87v9-v3004)
- [Zega et al. (2025)](https://www.nature.com/articles/s41561-025-01741-0)
- [Fujiya et al. (2013)](https://www.sciencedirect.com/science/article/pii/S0012821X12006838)
- [Singerling et al. (2025)](https://www.researchwithrowan.com/en/publications/naca-carbonates-in-osiris-rex-samples-evidence-for-low-temperatur/)
- [Pilorget et al. (2025)](https://www.nature.com/articles/s41467-025-65438-z)
- [Lee & Nicholson (2009)](https://eprints.gla.ac.uk/24412/)
