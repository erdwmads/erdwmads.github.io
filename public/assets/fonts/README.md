# Locally Hosted Fonts

## Current Typography

Two families, both under the SIL Open Font License 1.1, approved by the owner in November 2026:

- **Source Serif 4** for display type, headings h1–h3, the lead, personal names at display size and record numbers (SOL, years, step numbers). The serif is never set below 18 px; smaller text, a name in a meta line included, is in the sans.
- **Source Sans 3** for body text, controls, captions, labels and data.

The faces are declared in `src/styles/folio/01-fonts.css`. `SiteShell.astro` preloads the two Latin files; the Latin Extended files load only when a character needs them (`unicode-range`). Every face uses `font-display: swap`, and the body sets `font-synthesis-weight: none` and `font-synthesis-style: none`, so no bold or italic is faked.

| File | Face | Bytes | Loading |
|---|---|---|---|
| `source-serif-4-latin.woff2` | Source Serif 4 roman, variable weight 200–900 (declared 400–600) | 50,936 | preloaded |
| `source-serif-4-latin-ext.woff2` | the same, Latin Extended | 42,212 | on demand |
| `source-serif-4-italic-latin.woff2` | Source Serif 4 italic, static 400 | 20,092 | on demand |
| `source-serif-4-italic-latin-ext.woff2` | the same, Latin Extended | 18,452 | on demand |
| `source-sans-3-latin.woff2` | Source Sans 3, variable weight 200–900 (declared 400–600) | 28,740 | preloaded |
| `source-sans-3-latin-ext.woff2` | the same, Latin Extended | 60,088 | on demand |

The preload is 79,676 bytes, within the 80 KB budget. The serif has no optical-size axis, so display and text sizes differ by weight and tracking only.

## Sources

- **Source Serif 4:** the Latin and Latin Extended WOFF2 subsets served by the Google Fonts CSS API (version 1), family `Source Serif 4`, styles `400,500,600,400i`, retrieved 2026-11-05. Font version 4.004. The files are unmodified; no instancing was done. Cutting the roman file to weights 400–600 (fontTools `varLib.instancer`) is optional and needs the owner's approval; record the command here if it is ever run.
- **Source Sans 3:** the Latin and Latin Extended WOFF2 subsets added in commit `07d8855` (2026-09-10), unchanged since. Font version 3.052. The retrieval URL was not recorded then; the subset ranges match the Google Fonts CSS API.

## Licences

- `SourceSerif4-OFL.txt`: SIL Open Font License 1.1, with no Reserved Font Name.
- `SourceSans3-OFL.txt`: SIL Open Font License 1.1, with the Reserved Font Name "Source". The site serves the files as they were distributed and does not modify them; if a file is ever subset or instanced here, check the Reserved Font Name clause first.

## Characters outside the subsets

Neither family's Latin or Latin Extended subset contains μ (U+03BC), → (U+2192) or ↗ (U+2197). These fall through the font stacks: for the serif to "Serif Fallback" (local Georgia), Georgia, Noto Serif and the system serif; for the sans to "Sans Fallback" (local Arial), Arial, Roboto and the system sans; for arrows the system symbol font picks up what those lack. The legibility gate (Edge 156 on Windows 11, 2026-11-05) showed all three rendering at the text's size in both themes, with no missing-glyph boxes. The micro sign µ (U+00B5) is in both Latin subsets.

## Fallback metrics

"Serif Fallback" and "Sans Fallback" in `01-fonts.css` carry `size-adjust`, `ascent-override` and `descent-override` measured against the real faces. They match each face's average width and line box, not the width of every word, so the swap from fallback to web font can still move text when a line breaks differently. The preloads usually arrive before the first paint, and the layout-shift check then sees no shift. When the fonts are held back until after the first paint (`node scripts/layout-shift.browser.test.mjs --font-hold 700`, measured on 2026-11-06), the swap moved text on 10 of 11 pages, with a layout shift of up to 0.0176 (Research at 390 px).

**Decision (director, 2026-11-06):** every face keeps `font-display: swap`, for fidelity to the design. The layout-shift check gives the swap a budget: the shifts it attributes to the font swap may total 0.02 per page load (one page at one width and theme; `GUARD_FONT_SWAP_BUDGET` overrides it), and above that they fail as a WP1 finding. Every other layout shift still fails at any CLS above 0. The check reports both numbers for each page. A shift counts as the font swap only when the browser reported it in the frame that first drew a newly loaded web face and the swap accounts for every node it moved (the check puts the fallback back in place and compares the distances), so a shift from anything else in that frame still fails. If a font file or the fallback metrics change, run the check with `--font-hold 700` and keep every page within the budget.

After changing a font file, run `node scripts/font-metrics.mjs` (Edge through Playwright) and paste the printed block into `01-fonts.css` with its date.

## Retired

Montserrat, Inter and Manrope, with their licence texts, were deleted on 2026-11-05 once nothing referenced them. They remain in the git history.
