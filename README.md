# I. Mads Lieu Academic Website

Astro-based GitHub Pages site for `erdwmads.github.io`.

The current version preserves the original visual effects and interactions, while moving repeated content into small data files so future updates are easier to make safely.

## Local Use

Requires Node.js 24 or later (`.nvmrc` and `engines` in `package.json`); CI reads the same `.nvmrc`. Node 24 strips TypeScript types, so `scripts/export-ppt-data.mjs` imports `src/data/papers.ts` directly.

```powershell
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:4321/
```

Build and check the public website:

```powershell
npm run check
```

Generate the image inventory:

```powershell
npm run audit:images
```

Generate structured data for PPT work:

```powershell
npm run export:ppt-data
```

Run every unit test, or the Playwright browser regression tests against a fresh build (see `scripts/README.md`):

```powershell
npm run test:unit
npm run build
npm run test:browser
```

## Structure

- `src/pages/` - Astro routes that generate public pages. `research.astro` renders the research question and the Analytical Pathway from `src/data/project.mjs`; `ryugu-bennu.astro` holds the comparison materials (sample-return missions, planetary field guide, published microscopy). `sample-cabinet.astro` is only a noindex redirect stub to `research.html` for old links to the retired Sample Cabinet page.
- `src/pages/assets/css/site.css.ts` and `src/lib/stylesheet-bundle.ts` - build-time stylesheet bundle; see CSS Maintenance.
- `src/components/SiteShell.astro` - shared head, SEO metadata, Content Security Policy and script shell; it renders `SiteHeader.astro` (navigation) and `SiteFooter.astro` (colophon).
- `src/data/share-cards.json` - each page's share card (`og:image`, `twitter:image` and their alt text), drawn by `npm run images:imagery -- share` into `public/assets/img/share/`; a new page needs an entry, or the build stops.
- `src/components/Masthead.astro`, `Section.astro`, `Kicker.astro`, `Marker.astro`, `Plate.astro`, `Figure.astro`, `Ledger.astro` - the page primitives, each with a small validator module next to it (see `src/styles/folio/README.md`).
- `src/components/PaperShelf.astro` - Paper Shelf rendering and filter controls.
- `src/components/MissionLogShell.astro` - password-gated Graduation Research Mission Log shell.
- `src/data/site.ts` - site metadata, navigation, footer, script registry, stylesheet order, sitemap page list.
- `src/data/papers.ts` - Paper Shelf source data.
- `src/data/home.ts`, `src/data/cv.ts`, `src/data/colophon.ts` - Home, CV and footer colophon text.
- `src/data/project.mjs` - project facts (question, titles, methods, Analytical Pathway and statuses) for Home, Research, Research Log, the graduation page, the research atlas and `export-ppt-data`.
- `public/assets/data/mission-log.enc.json` - encrypted Mission Log payload. The plaintext source lives outside this repository; see `docs/content-workflow.md`.
- `src/styles/folio/` - every stylesheet, in cascade order; its `README.md` records the architecture and ownership.
- `public/assets/js/` - theme, ambient effects, soft navigation, Paper Shelf filters, password gate, and Mission Log scripts.
- `src/scripts/` - bundled modules, among them the home arrival and the planetary explorer, Origins, sample missions and image inspector (loaded only where needed by `feature-loader.js`), plus the inline scripts in `src/scripts/inline/`.
- `src/lib/` - build helpers: the Content Security Policy (`csp.mjs`, `inline-scripts.ts`), script content hashes (`script-version.ts`), the stylesheet bundle and the photo wall rows.
- `public/assets/img/` - portraits, gallery photos, public research images, and the still scene posters (`posters/`) shown until each 3D scene is ready.
- `public/assets/img/mission-log/` - Mission Log images used by the password-gated Graduation Research page.
- `scripts/` - build checks, audits, data generators and tests; indexed in `scripts/README.md`.
- Retired and deleted: the legacy stylesheets in `public/assets/css/`, the `src/legacy/` page fragments and `LegacyShell.astro` (replaced in the November 2026 rebuild by `src/styles/folio/`, data-fed Astro pages and `SiteShell.astro`), the fixed Bennu and solar-system backdrops with their generator, the Entry Gate (replaced by the home arrival dialog), the Origins view embedded in the planetary field guide (now `origins-study.html`), `photography.js` (the Photography page is a static photo wall), `mission-status-sync.js` and the research proposal PDF. `npm run check:site` fails on orphaned files (`scripts/orphan-files.mjs`) and on a republished proposal.

## Routine Updates

Codex should do the website edits. The user can send rough content.

- Add papers: update `src/data/papers.ts` under the Paper Shelf Rule in `docs/codex-update-contract.md` (stable `id`, `primaryFilter` and `filters` from `dolomite`, `ci-orgueil`, `ryugu-bennu`, `methods`, `chronology`, structured `authors`, Crossref-checked citation fields, `summary`, `relevance`, `tags`).
- Add Mission Log entries: update the private Mission Log JSON outside the repository, place display photos under `public/assets/img/mission-log/`, have the owner publish the encrypted payload with `powershell -NoProfile -File scripts\publish-mission-log.ps1 -CheckLeaks` (it prompts for the passphrase and runs the same publisher as `npm run publish:mission-log`), then run `npm run check:all`. Only entry text is encrypted; images in that folder are publicly reachable (see `docs/content-workflow.md`).
- Change navigation, page scripts, sitemap list, or global metadata: update `src/data/site.ts`.
- Replace normal images: add files under `public/assets/img/`, then update the relevant data file or page.
- Build PPTs from website content: run `npm run export:ppt-data` and use `dist/ppt-data.json`.
  `researchTheme` is the formal title from `src/data/project.mjs`. Each entry in its `papers` list carries the structured fields from `src/data/papers.ts` (`authors` as `{family, initials}` objects, which list fewer names than `authorCount` for papers with more than two authors) plus the display strings the site shows: `authorYear` ("King et al. (2015)") and `reference` (the copied citation with its DOI link). Print those two rather than `authors`.

See:

- `docs/codex-update-contract.md`
- `docs/maintenance-templates.md`
- `docs/content-workflow.md`
- `docs/ui-invariants.md`
- `docs/perf-browser-watchlist.md`

## Deployment

Pushes to `main` (or a manual run) trigger `.github/workflows/deploy.yml` on `ubuntu-24.04`:

1. check out the full history and set up Node from `.nvmrc`
2. install dependencies with `npm ci` and configure Pages
3. run every unit test with `npm run test:unit`
4. build, export PPT data and check the site (`npm run build`, `npm run export:ppt-data`, `npm run check:site`, the same steps as `npm run check`)
5. upload `dist/`, dotfiles included
6. deploy to GitHub Pages

Keep `public/.nojekyll` in the repository so GitHub Pages serves all static assets as-is.

## Rollback

If a deployment breaks the live site, revert the latest merge or content commit on `main`, then push `main` again.

For the Astro compatibility merge, the pre-merge recovery point was:

```text
b27650d36470015bc138fae1b022ce1068efeb97
```

## CSS Maintenance

Pages load one stylesheet, `assets/css/site.css`, generated at build time from the `stylesheets` list in `src/data/site.ts`, which names every file in `src/styles/folio/` in cascade order. Components do not import CSS and carry no `<style>`. The bundle removes only whitespace, and its `?v=` version is a content hash. Edit the source files, never the bundle, and add a new stylesheet to the list or the build fails. The architecture, file ownership, budgets and rules are in `src/styles/folio/README.md`; `docs/ui-invariants.md` summarises them.

- Theme colours are tokens in `src/styles/folio/00-tokens.css`, the only file that may name a theme. Components read tokens.
- Each file's header line declares its owner and budget. `npm run audit:css:check` fails on a file over budget, a selector over the specificity limit, a misplaced `!important`, `backdrop-filter`, `@import`, nested rules or a remote `url()`.
- Do not move the Mission Log lightbox rules or the "Mobile Mission Log: Disable Large Image Lightbox" block out of `components/lightbox.css` unless changing them intentionally. The home arrival dialog (`src/components/CosmicArrival.astro`, styled in `src/styles/folio/components/arrival.css`) is the opening screen.
- `node scripts/prune-dead-css.mjs` (after a build) reports rules in the file named by `--css` whose selectors can never match anything on the site. `--write` removes them only with the unlocked Mission Log content passed by `--extra` or with `--no-private-content`; see `scripts/README.md`. It stays until the owner's local unlock check of the rebuilt Mission Log.
- After changing styles, run `npm run check` and `npm run audit:css:check`, run the style snapshot (`node scripts/run-browser-tests.mjs style-snapshot`; see `scripts/README.md`), then compare the public site and local Mission Log visually in both themes.
