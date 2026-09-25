# Scripts

Everything here runs with Node from the repository root. Files stay flat in this folder because tests import each other and `package.json`, the deploy workflow and older plans refer to them by path; this index groups them by purpose instead.

## Run in CI (GitHub Actions, every push to `main`)

The deploy workflow runs these, then builds and deploys `dist/`:

| Command | Script | Checks |
|---|---|---|
| `npm run test:mission-publisher` | `publish-protected-mission-log.test.mjs` | encrypted Mission Log payload format |
| `npm run test:research-lock` | `research-lock.test.mjs`, `research-passkey.test.mjs` | password and passkey unlock |
| `npm run test:mission-index` | `mission-index.test.mjs` | Mission Log renderer lifecycle |
| `npm run test:mission-lightbox` | `mission-lightbox.test.mjs` | lightbox purge on lock |
| `npm run build` | Astro | generated pages and the stylesheet bundle |
| `npm run export:ppt-data` | `export-ppt-data.mjs` | public data for slides (`dist/ppt-data.json`) |
| `npm run check:site` | `check-site.mjs` | generated pages, assets, SEO, stylesheet bundle, protected archive boundary |

## Before publishing (local)

| Command | What it does |
|---|---|
| `npm run check` | build, PPT export and site check (the CI build steps) |
| `npm run check:all` | the CI unit tests, the mobile layout test and `npm run check` |
| `npm run test:unit` | every Node unit test (`run-unit-tests.mjs`): `scripts/*.test.mjs` and `src/**/*.test.mjs` |
| `npm run test:browser` | every Playwright regression test (`run-browser-tests.mjs`) against the built `dist/`; see below |
| `npm run audit:css:check` | fails if legacy `style.css` grows or a stylesheet is missing from `docs/css-baseline.json` |
| `npm run audit:images` | thumbnail counts and `docs/image-inventory.md` |

## Maintenance tools

| Script | Purpose |
|---|---|
| `publish-protected-mission-log.mjs` | encrypts the private Mission Log JSON into `public/assets/data/mission-log.enc.json` (`npm run publish:mission-log`) |
| `audit-css.mjs` | stylesheet size report; `--write` refreshes the baseline, `--check` enforces it |
| `prune-dead-css.mjs` | reports CSS rules whose selectors can never match; `--write` removes them. Build first and pass the private Mission Log JSON with `--extra` |
| `audit-images.mjs` | image inventory and thumbnail checks |
| `generate-image-derivatives.mjs` | Photography and Mission Log WebP thumbnails (`npm run images:derive`) |
| `generate-site-backgrounds.mjs` | WebP backgrounds, portrait and the 1200×630 social card (`npm run images:backgrounds`) |
| `shape-model-glb.mjs` | lossless OBJ → GLB re-encoding of measured shape models |
| `export-ppt-data.mjs` | public Paper Shelf and project data for slides |

## Data generators (offline, network or Python)

| Script | Output |
|---|---|
| `fetch-planetary-data.mjs` | JPL Horizons orbits, the Bennu GLB and the Ryugu GLB (converted from JAXA's OBJ) |
| `fetch-planetary-timeline.mjs` | daily ephemeris timelines for the planetary field guide |
| `fetch-mission-journey.mjs` | Hayabusa2 and OSIRIS-REx heliocentric journey vectors |
| `fetch-mission-ephemeris.mjs` | mission ephemerides (needs Python with `spiceypy`) |
| `generate-origins-volume.mjs`, `generate-fine-settling.mjs`, `generate-remnant-packing.mjs`, `build-origins-section.mjs` | conceptual Origins geometry (illustrative, not a reconstruction) |
| `nasa-geometry-fixture.mjs` | decodes the NASA spacecraft model for geometry tests |

## Unit tests

`npm run test:unit` runs all of them with `node --test`. They need no browser:

- Mission Log and unlock: `publish-protected-mission-log`, `research-lock`, `research-passkey`, `mission-index`, `mission-lightbox`, `mission-layout`
- Site shell and pages: `mobile-layout`, `site-header`, `paper-shelf`, `photography-loading`, `viewer-keyboard-boundaries`
- Planetary field guide: `planetary-*`, `asteroid-scale`, `shape-model-glb`
- Sample-return missions: `sample-*`, `physical-models`, and `src/scripts/sample-missions/*.test.mjs`
- Origins: `origins-*`, `arrival-timeline`, and `src/scripts/origins-study/*.test.mjs`
- Image inspector: `src/scripts/image-inspector.test.mjs`

## Browser regression tests

`*.browser.test.mjs` (and `mission-presentation.browser.test.cjs`) drive a real browser through Playwright. They are manual regression checks, not CI steps, and each takes from a few seconds to a few minutes because several render WebGL scenes.

```powershell
npm run build
npm run test:browser                              # all of them
node scripts/run-browser-tests.mjs planetary       # only names containing "planetary"
node scripts/run-browser-tests.mjs --report out.json --timeout 300
```

The runner serves `dist/` on a free local port and passes it as `SITE_TEST_URL`. It needs Playwright (`PLAYWRIGHT_MODULE`, or an installed `playwright` package) and a Chromium-family browser (`EDGE_EXECUTABLE`, or Microsoft Edge in its standard Windows location).

| Area | Tests |
|---|---|
| Home arrival and display settings | `arrival`, `arrival-performance`, `ambient-resize`, `home-background`, `home-focus`, `fullscreen-paint`, `prism-controls`, `theme-geometry`, `typography` |
| Header, navigation and soft navigation | `site-header`, `navigation-beam`, `navigation-intent`, `navigation-lifecycle`, `site-control-clearance`, `page-alignment`, `interaction-stability` |
| Research page | `research-reading`, `research-flow-visual`, `research-workflow`, `mineral-interactions`, `reading-ui`, `reading-tools` |
| Ryugu & Bennu: sample-return missions | `sample-missions*`, `mission-*`, `physical-missions`, `earth-*`, `flight-frames`, `readable-motion`, `sample-camera`, `observation-workspaces` |
| Ryugu & Bennu: planetary field guide | `planetary-*`, `research-navigation`, `research-review` |
| Ryugu & Bennu: published microscopy | `research-scale`, `research-scale-mobile`, `experimental-folio`, `experimental-folio-access` |
| Origins | `origins-*`, `porous-continuum` |
| Photography, CV, Contact | `photo-flight`, `photo-wall`, `portrait-framing`, `progress-polish` |
| Protected Research Log | `research-passkey`, `research-passkey-virtual` (virtual authenticator: API flow only, not a real Windows Hello check) |
| Whole site | `site-audit`, `site-refinement`, `whole-site-content`, `observatory` |

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
| Waits for the reduced-motion change event instead of reading the attribute synchronously (failed intermittently) | `planetary-exploration` |

### Known failures (genuine, awaiting a design decision)

Two assertions fail because of real cascade conflicts on the site, not because the tests are stale:

- `prism-controls`, "tool hover must preserve its material" (desktop only): hovering a `main .button` switches it from the flat quiet face to the older prism gradient, cyan edge and 3px inset lip. The prism hover rule in `observatory-experience.css` (specificity 1,5,3) outranks the quiet hover rule in `quiet-observatory.css` (1,4,2). Secondary buttons also keep the prism gradient at rest, because `observatory-experience.css` `main .button.secondary` (1,3,3) outranks the quiet resting rule (1,3,2).
- `progress-polish`, card hover: hovering a CV education card or a Paper Shelf card adds a drop shadow and recolours its edge, because the hover rule in `site-refinement.css` (1,3,4) outranks the editorial resting rule (1,3,3). `observatory-experience.css` says a record's edge "stays quiet under the pointer".
