# Scripts

Everything here runs with Node 24 or later (`.nvmrc`) from the repository root. Scripts and tests stay flat in this folder because tests import each other and `package.json` and older plans refer to them by path; this index groups them by purpose instead. Three subfolders hold modules, not runnable tests:

- `lib/`: helpers shared by checks and tests. `site-paths.mjs` names the source paths tests share (the shell and its header and footer parts, the stylesheet manifest, fonts, the script folders); `read-bundle-source.mjs` concatenates the manifest's stylesheets the way the bundle does, without a build, and minifies them as the build does; `css-rules.mjs` reads rules out of stylesheet text; `css-lint.mjs` holds the CSS lint's rules (specificity weight, nesting, bans, pinned file headers); `js-hooks.mjs` is the table of frozen JS hooks; `pending.mjs` is the registry of checks waiting for the package that owns their area, tolerated only while that package is listed in its `rebuilding` set, which has been empty since integration, so every entry fails; `static-server.mjs` and `browser.mjs` serve `dist/` on a free port and launch Edge for the browser tools; `guard.mjs` is the harness of the site guards (below); `perf-probe.mjs` is the loading-performance probe.
- `check-site/`: the modules `check-site.mjs` runs, one per area and owner (`core` and `styles` WP1, `shell` WP2, `research` WP3, `features` WP4, `collections` WP5, `archive` WP6), with their shared `context.mjs`.
- `style-contract/`: the style-contract tables `style-contract.test.mjs` checks, one per area and owner, with their `matchers.mjs`.

## Run in CI (GitHub Actions, every push to `main`)

`.github/workflows/deploy.yml` runs on `ubuntu-24.04` with Node from `.nvmrc` and a full-history checkout (so `spacecraft-model-simplify.test.mjs` can read the NASA GLB from git history instead of skipping). After `npm ci` it runs these, then uploads and deploys `dist/`:

| Command | Script | Checks |
|---|---|---|
| `npm run test:unit` | `run-unit-tests.mjs` | every Node unit test (see Unit tests below); none needs `dist/` or a browser |
| `npm run build` | Astro | generated pages and the stylesheet bundle |
| `npm run export:ppt-data` | `export-ppt-data.mjs` | public data for slides (`dist/ppt-data.json`) |
| `npm run check:site` | `check-site.mjs` and `check-site/*.mjs` | generated pages, assets, SEO, stylesheet bundle, protected archive boundary, Mission Log display-image limits, the Sample Cabinet redirect stub, the deploy workflow itself, orphaned files (`orphan-files.mjs`: every `public/assets/js/*.js` loaded by `src/data/site.ts`, a component or a built page, every `src/scripts/` file reachable from a page or component unless it is a test or test helper, and no legacy HTML fragment left unimported), content-hash `?v=` versions on every public script, and the Content Security Policy (one identical CSP meta per page, before the first script, listing every executable inline script's hash; no inline event handlers, `javascript:` URLs, off-origin `src`/`href` in scripts, stylesheets, images, frames or media, or off-origin CSS `url()`). A check waiting for the package that owns its area is printed as pending with that owner while the owner is still rebuilding (`rebuilding` in `lib/pending.mjs`, empty since integration, so nothing is pending now); `FOLIO_STRICT=1` fails on it |

## Before publishing (local)

| Command | What it does |
|---|---|
| `npm run check` | build, PPT export and site check (the CI build steps) |
| `npm run check:all` | every unit test (`npm run test:unit`, the suite CI runs) and `npm run check` |
| `npm run test:unit` | every Node unit test (`run-unit-tests.mjs`): `scripts/*.test.mjs` and `src/**/*.test.mjs` |
| `npm run test:browser` | every Playwright regression test (`run-browser-tests.mjs`) against the built `dist/`; see below |
| `npm run audit:css:check` | the CSS lint: every stylesheet in `src/styles/folio` against the budget and `!important` allowance in its own header, the bans (`backdrop-filter`, `@layer`, `@import`, remote `url()`, `body#`, theme selectors outside the tokens), the specificity limits and the 145 KB bundle limit |
| `npm run audit:images` | derivative counts, Mission Log display limits (2400 px, 1.5 MB, no EXIF/XMP) and `docs/image-inventory.md` |

## Maintenance tools

| Script | Purpose |
|---|---|
| `publish-protected-mission-log.mjs` | encrypts the private Mission Log JSON into `public/assets/data/mission-log.enc.json` (`npm run publish:mission-log`); refuses to write unless the passphrase decrypts the current archive (`--rotate-passphrase` changes it on purpose), refuses entries whose `bodyHtml` the site's Content Security Policy would block (off-site images or media, inline event handlers, `javascript:` URLs; same scanner as `check-site`), decrypts the new file before replacing the old one, and `--check-leaks` scans `src/`, `public/` and `dist/` for entry text, reporting only paths and entry ids |
| `publish-mission-log.ps1` | the owner's one-time passphrase handoff: prompts with `Read-Host -AsSecureString` and passes the passphrase only to the node publisher (`-CheckLeaks`, `-RotatePassphrase`, `-Node`) |
| `audit-css.mjs` | the CSS lint (`src/styles/folio/README.md`, rules in `lib/css-lint.mjs`, held to known selectors by `audit-css.test.mjs`); without `--check` it reports every file's size against its budget and the minified bundle size |
| `font-metrics.mjs` | measures the fallback-face overrides (`size-adjust`, ascent, descent) for Georgia and Arial against Source Serif 4 and Source Sans 3 in Edge, and prints the block to paste into `src/styles/folio/01-fonts.css` |
| `prune-dead-css.mjs` | reports CSS rules in the stylesheet named by `--css` (its old default, the retired legacy `style.css`, no longer exists, so pass a file from `src/styles/folio/`) whose selectors can never match; `--write` removes them. Build first. It stays until the owner's local unlock check of the rebuilt Mission Log (spec §2.10), then goes. Classes such as `.mission-data-table` appear only inside the encrypted Mission Log, so without `--extra` the report lists rules that have no reference outside the encrypted Mission Log, and `--write` refuses to run unless the unlocked entries come in with `--extra` (an owner-provided or synthetic file) or `--no-private-content` accepts removing those rules. `--strict` (`--min-affix 12` by default) stops short prefix/suffix tokens such as `is-` or `-card` from protecting whole class families and lists the candidates for review; it never writes |
| `orphan-files.mjs` | the orphaned-file rules `check-site.mjs` enforces (unloaded public scripts, `src/scripts/` modules no page reaches, unimported legacy fragments) |
| `lib/perf-probe.mjs` | loads Home, Research, Paper Shelf and Origins at 390 and 1440 px in Edge with a 4x CPU slowdown and a throttled network, and records LCP, CLS and font and stylesheet bytes; `--write` records `docs/perf-baseline.json`, `--compare` fails on an LCP regression beyond `--tolerance` (10%) or a new layout shift. Build first |
| `audit-images.mjs` | image inventory, derivative counts and Mission Log display limits |
| `generate-image-derivatives.mjs` | Photography 480w thumbnails and 640w/960w srcset tiers (1600w for the panorama), Mission Log WebP thumbnails (`npm run images:derive`; `-- photography` or `-- mission-log` regenerates one group) |
| `capture-scene-posters.mjs` | the scene posters in `public/assets/img/posters/` (each 3D stage shows one until its scene is ready): every viewer captured from `dist/` in headless Edge at the desktop and the phone layout with the clock pinned, written as WebP at 1600 px (at most 140 KB) and 640 px (at most 60 KB), and `posters/PROVENANCE.md` rewritten with sizes and hashes. Run after `npm run build` when a scene's first frame or stage size changes; `audit-images.mjs` checks the files |
| (retired) `generate-site-backgrounds.mjs` | removed in the Folio 2046 rebuild with the background images. The images it made stay committed: `profile*.webp`, `CV-*.webp`, `research-scale/bennu-whole.webp` and `og-cover.jpg`. To redraw one, run the script from `git show 2f20d7e:scripts/generate-site-backgrounds.mjs`; `og-cover.jpg` was drawn from `Solar_System_true_color.jpg`, which is in that commit too |
| `shape-model-glb.mjs` | lossless OBJ → GLB re-encoding of measured shape models |
| `spacecraft-model-simplify.mjs` | reproducible display simplification of NASA's OSIRIS-REx GLB (reads the unmodified NASA file from git history or a path; see `SPACECRAFT-CREDITS.md`) |
| `draco-sequential-encoder.mjs` | minimal Draco mesh encoder used by the simplifier; output is checked with the site's own decoder |
| `mission-data-pack.mjs` | repacks `journey.json` / `ephemeris.json` into the compact `journey.packed.json` / `ephemeris.packed.json` the site loads; the two mission generators call it too |
| `export-ppt-data.mjs` | public Paper Shelf and project data for slides |

## Data generators (offline, network or Python)

| Script | Output |
|---|---|
| `fetch-planetary-data.mjs` | JPL Horizons orbits, the Bennu GLB and the Ryugu GLB (converted from JAXA's OBJ) |
| `fetch-planetary-timeline.mjs` | daily ephemeris timelines for the planetary field guide |
| `fetch-mission-journey.mjs` | Hayabusa2 and OSIRIS-REx heliocentric journey vectors (`journey.json` and packed `journey.packed.json`) |
| `fetch-mission-ephemeris.mjs` | mission ephemerides (needs Python with `spiceypy`; `ephemeris.json` and packed `ephemeris.packed.json`) |
| `generate-fine-settling.mjs`, `generate-remnant-packing.mjs` | conceptual Origins geometry for `origins-study.html` (illustrative, not a reconstruction) |
| `nasa-geometry-fixture.mjs` | decodes the NASA spacecraft model for geometry tests |

## Unit tests

`npm run test:unit` runs all of them with `node --test`; they need no browser. `npm run test:mission-publisher`, `test:research-lock`, `test:mission-index`, `test:mission-lightbox` (purge on lock, phone guard, inert background, Tab containment) and `test:contracts` (style contract, JS hooks, theme preload, soft-navigation scripts) run subsets. By area:

- Mission Log and unlock: `publish-protected-mission-log`, `research-lock`, `research-passkey`, `mission-index`, `mission-lightbox`, `mission-layout`
- Rebuild contracts: `style-contract` (the non-visual CSS mechanics per area, against the bundle source; a row marked `pending` is skipped only while its owner is rebuilding), `tokens-contract` (grounds equal in the tokens, the first-paint style, the metas and the preload; WCAG contrast of every text and control token on its grounds; Light and Space distinct; `.on-night` complete; fonts within the preload budget with their licences), `plate` (the prop validators of Plate, Marker, Masthead, Section, Figure and Ledger), `revision` (the colophon's revision date from git or `REVISION_DATE`), `js-hooks` (every frozen JS hook still queried, created and provided in the markup's own syntax, and every hook a script looks up through a literal selector listed), `audit-css` (the lint's rules against known selectors), `theme-preload` (Space by default; the preload and first-paint style before any font or stylesheet request; one storage key, both attributes and both grounds in the preload, the style and `theme.js`) and `soft-nav-scripts` (page-script re-runs, content-hashed URLs, one stylesheet bundle)
- Site shell and pages: `site-header`, `home-shell`, `feature-loader` (per-page loading of the heavier features), `paper-shelf`, `photography-loading`, `viewer-keyboard-boundaries`, `orphan-files` (the orphaned-file rules of `check-site`), `project-facts` (project facts and Analytical Pathway statuses in `src/data/project.mjs`), `src/lib/csp.test.mjs` (the policy and its page scanner) and `src/lib/photo-rows.test.mjs` (photo wall row breaks)
- Planetary field guide: `planetary-*`, `asteroid-scale`, `shape-model-glb`
- Sample-return missions: `sample-*`, `physical-models`, `mission-data-pack`, `spacecraft-model-simplify`, `draco-sequential-encoder`, and `src/scripts/sample-missions/*.test.mjs`
- Origins: `origins-*`, `arrival-timeline`, and `src/scripts/origins-study/*.test.mjs`
- Image inspector: `src/scripts/image-inspector.test.mjs`
- Evidence status lines on Ryugu & Bennu and Origins: `evidence-status`

## Browser regression tests

`*.browser.test.mjs` (and `mission-presentation.browser.test.cjs`) drive a real browser through Playwright. They are manual regression checks, not CI steps, and each takes from a few seconds to a few minutes because several render WebGL scenes.

```powershell
npm run build
npm run test:browser                              # all of them
node scripts/run-browser-tests.mjs planetary       # only names containing "planetary"
node scripts/run-browser-tests.mjs --report out.json --timeout 300
node scripts/run-browser-tests.mjs layout-shift contrast --area research   # site guards on one area's pages
```

The runner serves `dist/` on a free local port (`lib/static-server.mjs`, so runs in several checkouts can overlap) and passes it as `SITE_TEST_URL` and `TEST_BASE_URL`. It needs Playwright (`PLAYWRIGHT_MODULE`, or an installed `playwright` package) and a Chromium-family browser (`EDGE_EXECUTABLE`, else Microsoft Edge in its standard Windows location, else Playwright's Chromium).

| Area | Tests |
|---|---|
| Site guards (WP1, every page) | `typography`, `controls`, `theme-geometry`, `interaction-stability`, `evidence-status`, `layout-shift`, `first-paint`, `contrast`, `reduced-motion`, `focus-visibility`, `accessible-names`, `forced-colors`, `legibility-gate` |
| Home arrival and display settings | `arrival`, `arrival-focus`, `arrival-performance`, `ambient-resize`, `orbital-motion`, `home-background`, `home-focus`, `fullscreen-paint` |
| Header, navigation and soft navigation | `site-header`, `soft-nav-page-class`, `navigation-beam`, `navigation-intent`, `navigation-lifecycle`, `site-control-clearance`, `page-alignment` |
| Research page | `research-reading`, `research-flow-visual`, `research-workflow`, `research-hub`, `mineral-interactions`, `reading-ui`, `reading-tools` |
| Ryugu & Bennu: sample-return missions | `sample-missions*`, `mission-*`, `physical-missions`, `earth-*`, `flight-frames`, `readable-motion`, `sample-camera`, `observation-workspaces` |
| Ryugu & Bennu: planetary field guide | `planetary-*`, `research-navigation`, `research-review` |
| Ryugu & Bennu: published microscopy | `research-scale`, `research-scale-mobile`, `experimental-folio`, `experimental-folio-access` |
| Origins | `origins-*`, `porous-continuum` |
| Paper Shelf | `paper-shelf` |
| Photography, CV, Contact | `photo-flight`, `photo-wall`, `portrait-framing`, `progress-polish` |
| Protected Research Log | `research-passkey`, `research-passkey-virtual` (virtual authenticator: API flow only, not a real Windows Hello check) |
| Whole site | `site-audit`, `site-refinement`, `whole-site-content`, `observatory`, `style-snapshot` |

The site guards share `lib/guard.mjs`. Each loads the registry's pages (the eleven pages the shell renders, each with the package that rebuilds it) at its widths in both themes, and reports every page:
- **Filters.** `--pages index,cv`, `--area research` (research, features, collections or archive; core and shell keep every page), `--widths` and `--themes`, as arguments when a guard runs on its own or through the runner, which passes them on as `GUARD_PAGES`, `GUARD_AREA`, `GUARD_WIDTHS`, `GUARD_THEMES` and `FOLIO_OWNER` (`--owner`).
- **Attribution.** Every finding names the package that owns the element: the nearest WP1 primitive, component with its own owner (contents bar and pathway WP3, scenes WP4, shelf and photographs WP5, archive WP6) or shell element (WP2), else the page's owner.
- **Pending.** Findings of WP1, of a requested area and of `--owner` fail; the others print as `PENDING [WPn]` while their owner is still rebuilding, like check-site's pending entries; `FOLIO_STRICT=1` fails on all of them. A guard that stops on a page fails whoever owns the page, and a run that checks no page fails (with `--area` on an area the guard has no page in, it reports SKIPPED).
- **Fixture.** WP1's primitives are measured on every page through a stand-in fixture inserted into main (`fixtureHtml`).
- **Reports.** The last lines are a per-page table and a summary; `GUARD_REPORT=<file or directory>` also writes the results as JSON.

`layout-shift` loads each page cold over a throttled network and fails on any shift (CLS 0) except the web-font swap. Shifts from the swap are WP1's and may total 0.02 per page load (`GUARD_FONT_SWAP_BUDGET` overrides it); the table and the JSON report give both numbers, non-font CLS and font-swap CLS, for every page. `--font-hold <ms>` (`GUARD_FONT_HOLD` through the runner) holds the web fonts back so they always swap in after the first paint (a diagnostic of the fallback metrics, with the same budget). `legibility-gate` writes its screenshot to `--shot <file>` or `LEGIBILITY_SHOT` (default `.codex_tmp/legibility-gate.png`).

`style-snapshot` compares computed styles (about two dozen properties of shell and component selectors, both themes at 1440, 900 and 390 px; FX off, reduced motion, fixed clock) with one baseline per area in `docs/style-snapshot/<area>.json` (`core`, `shell`, `research`, `features`, `collections`, `archive`, each owned by one rebuild package, whose pages and selectors live in `style-snapshot/<area>.mjs`; `core` records WP1's primitives alone, the guard fixture rendered as the only content of a page without a page class, so no later package changes it) and prints each changed property. Run it after every CSS change (`node scripts/run-browser-tests.mjs style-snapshot` checks every area; `node scripts/style-snapshot.browser.test.mjs --area shell` checks one and serves `dist/` itself); one that should look the same must pass unchanged. Record a new baseline only after reviewing the printed diff of an intended visual change: rebuild, then run it with `--area <area> --write` (or `STYLE_SNAPSHOT_AREA` and `STYLE_SNAPSHOT_WRITE=1` through the runner), and commit the baseline with the CSS change. `docs/style-snapshot/before-2026-11.json` is the single-file baseline from before the rebuild, kept read-only. The baselines belong to one browser engine; regenerate them rather than hand-edit them.

`interaction-stability` takes over three minutes on its own; run the full suite with `--timeout 600`.

### Updated after the first full run (2026-09-25)

The first full run of this suite (2026-09-25) passed 50 of 84 tests. The other 34 also failed on `be10de7`, the commit before that run, with the same errors: they described UI that had since changed on purpose. They were updated or retired the same day:

| What changed on the site | Tests |
|---|---|
| **Retired.** Origins used to be a view inside the planetary field guide; since 000abf8 it lives on `origins-study.html`, which the `origins-*` tests cover directly | `origins-contact`, `origins-controls-state`, `origins-explanation`, `origins-inspection`, `planetary-origins`, `planetary-origins-drag`, `planetary-origins-lifecycle`, `planetary-origins-lighting`, `planetary-origins-refinement` |
| Chapter buttons appear in both the chapter strip and the mission overview; selectors are scoped to `[data-mission-chapters]` | `sample-missions`, `sample-missions-interaction`, `research-review` |
| Chapters open on the distance overview and capsule separation on the Earth overview (972dc30); at 960px and below the view controls start in the collapsed notebook, which the tests open first; a BFCache restore resumes the mission remembered for the session; the surface checks select the first touchdown by kind | `mission-continuity`, `mission-geography`, `earth-flyby`, `flight-frames`, `physical-missions`, `sample-camera`, `sample-missions-interaction`, `sample-missions-refinement` |
| The unlock form has a password button and a passkey button; tests submit with `button[type="submit"]` | `mission-experience`, `mission-layout`, `progress-polish` |
| WebAuthn rejects IP addresses as relying-party IDs, so the virtual-authenticator test reaches the runner's `127.0.0.1` server as `localhost` | `research-passkey-virtual` |
| Photographs, captions and counters change only after the image has loaded and decoded (972dc30); the home arrival and on-by-default FX (b8ab393) came after `observatory` was written | `photo-flight`, `photo-wall`, `fullscreen-paint`, `observatory` |
| Origins chapters keep a fixed camera, and a lost WebGL context disposes the scene while the chapter stays readable (972dc30) | `origins-dissolve`, `origins-reading` |
| Quiet controls replaced the 3px prism lip with one line-token edge and no resting shadow | `prism-controls`, `progress-polish` |
| `.page-outline` became `[data-research-guide]` navigators on Research and Ryugu & Bennu; Contact now scrolls at 1100px; the framing check squares the stage's rounded corners and hides the sticky guide; the stability and audit routes include `ryugu-bennu` and `origins-study` | `site-refinement`, `site-audit`, `planetary-explorer`, `interaction-stability` |
| Waits for the reduced-motion change event, or up to 3 s for a slow background pebble to move, instead of sampling once (failed intermittently) | `planetary-exploration`, `home-background` |

That run also found two real cascade conflicts, fixed on 2026-09-28: hovering a control switched it back to the older prism gradient, cyan edge and 3px inset lip (`prism-controls`), and hovering a CV, Paper Shelf or timeline record added a drop shadow and recoloured its edge (`progress-polish`). Older hover rules outranked the quiet and editorial resting rules. The hover rules in `observatory-experience.css`, `site-refinement.css` and `planetary-explorer.css` no longer repaint the resting material or add shadows, and `quiet-observatory.css` keeps unselected Paper Shelf filters on their face (`observatory.css` would paint the old metal). Only the edge answers the pointer, plus the quiet highlight on buttons. Secondary buttons still rest on the prism gradient because `main .button.secondary` (1,3,3, now in `components.css`) outranks the quiet resting rule (1,3,2); that is what separates them from primary buttons, which have no `.primary` class.

This section is a record of that run. The November 2026 rebuild retired the stylesheets it names (all of `public/assets/css/`, replaced by `src/styles/folio/`) and the `prism-controls` test with the prism controls themselves.
