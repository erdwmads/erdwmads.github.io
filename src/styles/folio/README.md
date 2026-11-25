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
| `components/*.css` | One block each. WP1 owns button, marker, evidence-status, masthead, plate, ledger, table, disclosure and form; the header comment of every other file names its owner. `components/backdrop.css` (WP2) alone draws on `body::before`, `body::after` and `html::after`: the Bennu backdrop, the band under the floating header and the old site's graticule over Bennu. `components/surface-light.css` (WP2) comes last among the components, so the control sheen, the old opaque faces, shadow, hover glow and pressed shadow, the gate's light sweep, the lit rule of Onward and ledger rows and the pointer edge light lie over every component face. |
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
- The lint also bans `@layer`, `@import`, remote addresses (in `url()`, `image-set()` or any string) and `body#`, in any letter case, and allows `backdrop-filter` only on the selectors in `blurAllowList` (`scripts/lib/css-lint.mjs`): those where Microsoft Edge rendered a live blur on the old site, which are the CV education date chips alone. Elsewhere glass is a translucent face and gradient without blur. It keeps `[data-theme` inside `00-tokens.css` and caps the minified bundle at 200 KB (raised by the owner on 2026-11-18 for the effects: 150 KB for the first four, 170 KB for all of the old site's effects, 200 KB so that the size never removes one).
- Every rule is flat: no rule nested inside a style rule and no `&`.
- No component `<style>`: every rule lives in this tree. `check-site` fails on any `<style>` in an `.astro` file other than the shell's first-paint style.
- `scripts/audit-css.test.mjs` holds the lint's rules to known selectors and text.

## Themes and tokens

- One attribute on `html` decides the theme. `:root` holds the Space values (the server default); `:root:where([data-theme="light"]:not([data-theme-space]))` holds Light, mirroring the inline first-paint style in `SiteShell.astro`. The `:where()` keeps the Light rule at the weight of `:root`, so it wins by order and `states/contrast.css` and `states/print.css` can still override a token for both themes.
- The grounds `#0f1625` (Space) and `#f7f3eb` (Light) must equal the inline style, both `theme-color` metas and `theme-preload.js`.
- Components read tokens only. No component names a theme. `body.space-mode` is still set by `theme.js` for compatibility; no CSS uses it.
- `.on-night` (night plates, the presentation view) keeps the Space colours in either theme. It also sets `color: var(--obs-text)`, because text inherits the colour the page computed, not the tokens. The Mission Log viewer follows the page's theme, as the old one did: a dark veil in Space, pale paper in Light (`--obs-lightbox-veil`, the old blur folded into its alpha).
- `data-fx-intensity` changes `--fx-dust-opacity` and `--fx-orbit-alpha`, and the two glow tokens: the default, Immersive, carries the old site's glow strength (`--obs-glow` and `--obs-gold-glow` at .2 and .24 in Space, .14 and .16 in Light), Standard the old Standard values. It never changes a control face.
- Text glows only where the old site's did (owner, 2026-11-18): the Light brand line's white halo (`--obs-text-halo`), the footer's soft white glow (`--obs-footer-halo`) and the kickers' faint gold glow with their brass star bead; the site name and the headings in main carry the old heading glow (`--obs-heading-glow`, `--obs-subheading-glow`: a light halo in Space, a white halo in Light; owner decision E116, `03-base.css` and `components/header.css`). In the decorative instrument layers the orrery's planet labels keep their faint glow, and the entrance's title and sky labels their dark legibility shadow (`--obs-label-glow`, `--obs-arrival-shadow`); on the 3-D scenes the Origins and sample-mission view hints keep theirs (`--obs-hint-shadow`). Body text, links and controls never glow (`style-contract/shell.mjs`).
- The workspaces carry the old site's light too (owner, 2026-11-18; `components/{planetary,sample-missions,origins,research-guide,pathway,image-inspector,research-scale}.css`): metal faces on the planetary buttons and glass on the sample-mission controls and player and the Planetary CI panel; the chosen state in brass (the contents bar's filled cell and short bar, the chosen mission's wash and rule, the Origins switch's sliding block, the inspector's region and its sliding gold beam); the pathway's turning chevron in place of the plus. Each mark lies outside the flow, so choosing moves nothing, and forced colours and print drop the faces, blocks and beams.
- So do the pages and records (owner, 2026-11-18; `components/{lightbox,mission-log,presentation}.css`, `pages/{photography,cv,home,not-found,paper-shelf}.css`): a Mission Log photograph under a fine pointer casts the old shadow, shows its Open chip and scan line and rises 2 px (motion allowed; the scan line also needs FX on and an awake page); the viewer's glass buttons glow and a decoding image dims; the current Mission Index record glows brass with a bead and the index scrolls on a brass bar; a photo tile takes a steel outline and glow, the chosen layout a brass inner bar, the presentation's full-screen button its label; the CV portrait its shadow and the education dates their frosted glass (the one live blur); the Home Research button its arrow chip and the keywords their pills; the 404 index its glazed card, drawn behind it, softening under the pointer; the Paper Shelf filters their flat boxes (brass edge on hover, the pressed one a highlight face behind a brass border) and the search box a brass ring. A CV, Paper Shelf or Home timeline record under the pointer takes the old record glow (E105); the pills, the Research Log card, the 404 card and the docked effects panel carry the old glass highlight band and glint, drawn without blur (`--obs-glass-band`, `--obs-glass-glint`, `--obs-chip-glint`; E097). Nothing moves a box on hover; forced colours and print show none of it. The size limit never removes an effect (owner, 2026-11-18).
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
| 760 / 761 px | Phone layout; FX, the lightbox and the Interface 2046 HUD (`site-header.js`, `ambient-space.js`, `interface-2046.js`, `mission-lightbox.js`); from 761 px the reading beam across the top of the window; from 761 px and 600 px tall the floating header and its band (`--header-clearance`, the same media query in `00-tokens.css`, `components/header.css` and `components/backdrop.css`) |
| 900 / 901 px | The orrery and the spine (as on the old site; the orrery at the Immersive .9 throughout, Standard .25 to 1120 px) |
| 960 / 961 px | The mission notebook beside the model (`src/scripts/sample-missions/loader.js`) |
| 1199 / 1200 px | The monograph grid, the sticky Mission Index ledger |
| 1359 / 1360 px | The header tagline and the gate's sub-label |

`.folio` has 4 columns at 760 px and below, 8 from 761 px and 12 named columns from 1200 px: `margin` (1–2), `text` (3–8), `notes` (10–12), `wide` (3–12) and `full` (1–12).

## Motion

- Interface motion answers input and lasts at most 320 ms (`--ed-dur-1` to `--ed-dur-3`). The old site's effects keep their own timing (owner, 2026-11-18: "all of my previous effects"): the Research Log gate's light sweep crosses in 580 ms, the header's orbit trace loops every 12 s (fine pointers, FX on, paused with the power manager and the overlays), the navigation beam glides in 300 ms, Bennu fades in over 600 ms once the page has loaded, and the reading beam follows the scroll in 60 ms. The FX field's particles, the orrery and the cleavage carry the old site's glows: static shadows on the particles and planets (each rasterised once on its layer), drop-shadow filters only where the old site had them (meteors, the orrery, the cleavage line).
- Small feedback motions are back where the old site had them: a hovered header link rises 1 px onto its lit face (only with `(hover: hover)` and no reduced-motion preference), the Onward arrow nudges 3 px up and right, a pressed control sinks into an inner shadow without moving. None of them moves a hit target away from the pointer or changes a box.
- Under `prefers-reduced-motion: reduce`, `states/motion.css` sets every animation and transition to zero, on `::backdrop` and `::details-content` as well as on elements, `::before` and `::after`. The one allowance is an opacity fade of at most 120 ms: set `--motion-fade` (a non-inherited time) on the element that fades, and only where its transition is opacity alone.
- A disclosure clips its content only while it opens or closes. Once open, the content stops clipping, so a focus outline at its edge is drawn whole.
- Smooth scrolling applies only with no reduced-motion preference, and never during a soft navigation (`.mads-soft-nav-active`).

## Adding a file

1. Create it in the right folder, with the header line (owner, budget, `@important 0`, purpose).
2. Add its path to `stylesheets` in `src/data/site.ts` at its place in the cascade: components before pages, pages before states.
3. Run `npm run audit:css:check` and `npm run check`.

Only the owner of the manifest (WP1, then the integration pass) edits `site.ts`; during the parallel work every file already exists as a stub.
