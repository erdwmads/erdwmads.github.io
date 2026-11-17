# Folio stylesheets

Every style on the site comes from this folder. It is the architecture record that `docs/ui-invariants.md` points to.

## How the CSS reaches a page

- `stylesheets` in `src/data/site.ts` lists every file here, as a path from the project root, in cascade order.
- `src/lib/stylesheet-bundle.ts` joins them behind `/*! path */` markers and minifies whitespace only, so selectors, declarations and rule order stay exactly as written. The result is served as one request, `assets/css/site.css?v=<10 hex>`.
- The build fails if a listed file is missing or a file here is not listed.
- No component imports CSS: Astro would emit a second, render-blocking stylesheet. No CSS lives in `public/`.

## Layers, in cascade order

| Files | What they hold |
|---|---|
| `00-tokens.css` | Every custom property: colour for both themes, type, spacing, radii, motion, layers, layout. |
| `01-fonts.css` | `@font-face` for Source Serif 4 and Source Sans 3, and the metric-matched fallback faces. |
| `02-reset.css` | Box model, margins, media defaults, `[hidden]`, closed dialogs, form fonts, no sideways scroll. |
| `03-base.css` | Ground and text colour, the reading veil on `main`, headings and text on the type scale, links, focus (drawn inset inside plate and figure media, which clip their images), selection, the skip link. |
| `04-layout.css` | `.page` and `.page--wide`, the `.folio` grid and its placement classes, `.flow`, `.cluster`, section rhythm. |
| `05-utilities.css` | `.visually-hidden` and its aliases, `.tabular`, `.measure`, the space-reserving `[hidden][data-reserve-space]`. |
| `components/*.css` | One block each. WP1 owns button, marker, evidence-status, masthead, plate, ledger, table, disclosure and form; the header comment of every other file names its owner. |
| `pages/*.css` | Rules for one page, scoped under its body class (`.ui-page-research`, …). |
| `states/*.css` | Global states that must win by order: scroll locks, motion, forced colours and contrast, print. |

## File headers and the lint

Every file starts with one header line, which `scripts/audit-css.mjs` reads (`npm run audit:css:check`):

```css
/* @owner WP4 · @budget 24KB · @important 0 · Ryugu & Bennu sample-mission workspace */
```

- `@budget` is the file's source size in bytes (LF line endings); 1 KB is 1,024 bytes.
- `@important` is how many `!important` the file may use. Only `02-reset.css`, `05-utilities.css`, `states/motion.css` and `states/print.css` may use any, 30 in all.
- The header values are pinned in `scripts/lib/css-lint.mjs`, so a package cannot raise its own budget. To change one, ask in the package's handoff; the integration pass changes the header and the table together.
- The lint also bans `backdrop-filter`, `@layer`, `@import`, remote addresses (in `url()`, `image-set()` or any string) and `body#`, in any letter case. It keeps `[data-theme` inside `00-tokens.css` and caps the minified bundle at 145 KB.
- Every rule is flat: no rule nested inside a style rule and no `&`.
- No component `<style>`: every rule lives in this tree. `check-site` fails on any `<style>` in an `.astro` file other than the shell's first-paint style.
- `scripts/audit-css.test.mjs` holds the lint's rules to known selectors and text.

## Themes and tokens

- One attribute on `html` decides the theme. `:root` holds the Space values (the server default); `:root:where([data-theme="light"]:not([data-theme-space]))` holds Light, mirroring the inline first-paint style in `SiteShell.astro`. The `:where()` keeps the Light rule at the weight of `:root`, so it wins by order and `states/contrast.css` and `states/print.css` can still override a token for both themes.
- The grounds `#0f1625` (Space) and `#f7f3eb` (Light) must equal the inline style, both `theme-color` metas and `theme-preload.js`.
- Components read tokens only. No component names a theme. `body.space-mode` is still set by `theme.js` for compatibility; no CSS uses it.
- `.on-night` (night plates, the presentation view, the lightbox) keeps the Space colours in either theme. It also sets `color: var(--obs-text)`, because text inherits the colour the page computed, not the tokens.
- `data-fx-intensity` changes only `--fx-dust-opacity` and `--fx-orbit-alpha`, never a control face.
- A component may define a local custom property on its own root (for example `--photo-gap-wide`). A token every component needs goes into `00-tokens.css` through the integration pass.

## Naming

- **Frozen hooks:** classes and attributes that scripts query or create keep their names, however old (`scripts/lib/js-hooks.mjs`, checked by `scripts/js-hooks.test.mjs`).
- **New markup:** block, element and modifier names with no prefix: `.plate`, `.plate__caption`, `.plate--wide`.
- **State:** ARIA and data attributes (`[aria-current]`, `[aria-expanded]`, `[data-status]`) or the scripts' existing `is-*` classes. No new state classes.
- **IDs are never style hooks.** An element that has only an id gets a class in its markup.

## Specificity

- Element defaults sit inside `:where()`, so they weigh nothing and any class overrides them.
- A component is one class (0,1,0); a part with a state (0,2,0).
- Page scoping is `.ui-page-x .block` (0,2,0), at most (0,3,0) with a state.
- Global state contexts are wrapped in `:where()` and placed after the base rule, so they win by order.
- Hard limits (lint): no id outside `:where()`; at most three classes, attributes or pseudo-classes in one compound selector. Each `:is()`, `:not()` and `:has()` adds the weight of its heaviest argument, so `.a:not(.b):not(.c)` weighs 3.
- A component that sets `display` on a dialog does it on `dialog.x[open]`; `dialog:not([open])` in `02-reset.css` hides every closed dialog.

## Primitives

The Astro primitives in `src/components/` render the markup these files style. Each validates its props in a plain module next to it, so `scripts/plate.test.mjs` can test it without Astro:

| Component | Validator | Styles |
|---|---|---|
| `Masthead.astro` | `masthead.js` | `components/masthead.css`, `04-layout.css` |
| `Section.astro` | `section.js` | `04-layout.css`, `components/masthead.css` (kicker) |
| `Kicker.astro` | none (nothing to check) | `components/masthead.css` |
| `Marker.astro` | `marker.js` | `components/marker.css` |
| `Plate.astro` | `plate.js` | `components/plate.css` |
| `Figure.astro` | `figure.js` | `components/plate.css` |
| `Ledger.astro` | `ledger.js` | `components/ledger.css` |
| `EvidenceStatus.astro` | `evidence-status.js` | `components/evidence-status.css`, `components/marker.css` |

## Breakpoints

The numbers are written literally in media queries, because the scripts use the same values.

| Phone / wider | Use |
|---|---|
| 760 / 761 px | Phone layout; FX, the lightbox and the Interface 2046 HUD (`site-header.js`, `ambient-space.js`, `interface-2046.js`, `mission-lightbox.js`) |
| 960 / 961 px | The mission notebook beside the model (`src/scripts/sample-missions/loader.js`) |
| 1199 / 1200 px | The monograph grid, the sticky Mission Index ledger, the spine |
| 1359 / 1360 px | The header tagline and the gate's sub-label |

`.folio` has 4 columns at 760 px and below, 8 from 761 px and 12 named columns from 1200 px: `margin` (1–2), `text` (3–8), `notes` (10–12), `wide` (3–12) and `full` (1–12).

## Motion

- Interface motion answers input and lasts at most 320 ms (`--ed-dur-1` to `--ed-dur-3`).
- Under `prefers-reduced-motion: reduce`, `states/motion.css` sets every animation and transition to zero, on `::backdrop` and `::details-content` as well as on elements, `::before` and `::after`. The one allowance is an opacity fade of at most 120 ms: set `--motion-fade` (a non-inherited time) on the element that fades, and only where its transition is opacity alone.
- A disclosure clips its content only while it opens or closes. Once open, the content stops clipping, so a focus outline at its edge is drawn whole.
- Smooth scrolling applies only with no reduced-motion preference, and never during a soft navigation (`.mads-soft-nav-active`).

## Adding a file

1. Create it in the right folder, with the header line (owner, budget, `@important 0`, purpose).
2. Add its path to `stylesheets` in `src/data/site.ts` at its place in the cascade: components before pages, pages before states.
3. Run `npm run audit:css:check` and `npm run check`.

Only the owner of the manifest (WP1, then the integration pass) edits `site.ts`; during the parallel work every file already exists as a stub.
