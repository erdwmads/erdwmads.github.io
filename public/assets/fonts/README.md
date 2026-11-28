# Locally Hosted Fonts

## Current Typography

One web family, Montserrat, under the SIL Open Font License 1.1, with version 1's look (2f20d7e), restored with its layouts on 2026-11-25 (owner: "Can you merge 1 and 3? I also really like 1."):

- **Montserrat** for body text, headings h1–h3, leads, labels, controls and data, at weights 400 to 800.
- **Georgia** (a system face, no file) for the personal name: the brand, the Home name and its pronunciation line, `.person-name`. The stack is `--type-name` in `src/styles/folio/00-tokens.css`.

The faces are declared in `src/styles/folio/01-fonts.css`. `SiteShell.astro` preloads the Latin file; the Latin Extended file loads only when a character needs it (`unicode-range`). Every face uses `font-display: swap`, and the body sets `font-synthesis-weight: none` and `font-synthesis-style: none`, so no bold or italic is faked. Montserrat has no italic file here: text that asks for italic is drawn upright.

| File | Face | Bytes | Loading |
|---|---|---|---|
| `montserrat-latin.woff2` | Montserrat, variable weight 400–800 | 37,956 | preloaded |
| `montserrat-latin-ext.woff2` | the same, Latin Extended | 70,688 | on demand |

The preload is 37,956 bytes, within the 80 KB budget.

## Source

The Latin and Latin Extended WOFF2 subsets served by the Google Fonts CSS API (version 2), family `Montserrat:wght@400..800`, retrieved 2026-09-08 and unchanged since. They were deleted on 2026-11-05 and are restored byte for byte from commit `2f20d7e`.

## Licence

- `Montserrat-OFL.txt`: SIL Open Font License 1.1, from https://github.com/google/fonts/tree/main/ofl . The site serves the files as they were distributed and does not modify them.

## Characters outside the subsets

μ (U+03BC), → (U+2192) and ↗ (U+2197) are not in the subsets. They fall through the stack to "Sans Fallback" (local Arial), Arial and the system sans; for arrows the system symbol font picks up what those lack.

## Fallback metrics

"Sans Fallback" in `01-fonts.css` carries `size-adjust`, `ascent-override` and `descent-override` measured against Montserrat. It matches the face's average width and line box, not the width of every word, so the swap from fallback to web font can still move text when a line breaks differently. The preload usually arrives before the first paint, and the layout-shift check then sees no shift.

**Decision (director, 2026-11-06):** every face keeps `font-display: swap`, for fidelity to the design. The layout-shift check gives the swap a budget: the shifts it attributes to the font swap may total 0.02 per page load (one page at one width and theme; `GUARD_FONT_SWAP_BUDGET` overrides it), and above that they fail as a WP1 finding. Every other layout shift still fails at any CLS above 0. If a font file or the fallback metrics change, run the check with `--font-hold 700` and keep every page within the budget.

After changing a font file, run `node scripts/font-metrics.mjs` (Edge through Playwright) and paste the printed block into `01-fonts.css` with its date.

## Retired

Source Serif 4 and Source Sans 3 (the Folio 2046 faces, 2026-11-05 to 2026-11-25), Inter and Manrope, with their licence texts, were deleted once nothing referenced them. They remain in the git history.
