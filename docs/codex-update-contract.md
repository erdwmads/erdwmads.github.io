# Codex Update Contract

The user supplies research content, notes, papers, images, or presentation goals. Codex performs the website edits.

## Source Of Truth

- Site chrome, navigation, page scripts: `src/data/site.ts`
- Paper Shelf: `src/data/papers.ts`
- Password-gated Mission Log: `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\Website Archive\mission-log.private.json`
- Mission Log shell and lazy loading: `src/components/MissionLogShell.astro`
- Mission Log images: `public/assets/img/mission-log/`
- Paper Shelf layout and filters: `src/components/PaperShelf.astro`
- Research page: `src/pages/research.astro` (research question, sub-questions, Analytical Pathway and the Orgueil vs returned samples card), plus `src/components/EvidenceAtlasData.astro`
- Project facts (titles, question, methods, Analytical Pathway and its owner-set statuses): `src/data/project.mjs`, rendered by `src/components/CurrentFocus.astro`, `src/components/AnalyticalPathway.astro` and the Research, Research Log and graduation pages; see Project Facts in `docs/content-workflow.md`
- Comparison materials page (sample-return missions, planetary field guide, published microscopy): `src/pages/ryugu-bennu.astro`
- Stylesheet cascade order and bundle: `stylesheets` then `componentStylesheets` in `src/data/site.ts`, built into the one `assets/css/site.css`; every owner file is listed in `docs/ui-invariants.md`
- Theme tokens (`--obs-*`, `--evo-*`): `public/assets/css/tokens.css`
- Header, navigation, mobile shell, and HUD: `public/assets/css/shell-evolution.css`
- Research Log dashboard and protected research surfaces: `public/assets/css/research-log-evolution.css`
- Legacy visual compatibility: `public/assets/css/style.css` (do not append new component rules)
- Effects and interaction: `public/assets/js/` (classic scripts registered in `src/data/site.ts`) and `src/scripts/` (bundled modules; the planetary explorer, Origins, sample missions and image inspector load through `src/scripts/feature-loader.js`)
- Inline scripts and Content Security Policy: `src/scripts/inline/`, `src/lib/inline-scripts.ts` and `src/lib/csp.mjs` (rules in `docs/ui-invariants.md`)

## Mission Log Rule

When the user sends raw notes, Codex should:

1. Decide whether the notes are one entry or multiple entries.
2. Write clear public-facing English.
3. Preserve scientific details and uncertainty.
4. Add or update the private Mission Log JSON outside the repository.
5. Back up original photos to `C:\Users\tsuku\Desktop\Grad Research\Orgueil Grad Data\事前準備`, then add display derivatives under `public/assets/img/mission-log/` (image rule in `docs/content-workflow.md`).
6. Publish `public/assets/data/mission-log.enc.json` through the one-time local handoff `scripts/publish-mission-log.ps1 -CheckLeaks`: the owner runs it and types the passphrase at its hidden prompt, so the passphrase is never in a file, argument, log or prompt. Nothing is written if the passphrase does not decrypt the current archive (unless `-RotatePassphrase` is passed) or if an entry has markup the site's Content Security Policy would block (see `docs/content-workflow.md`).
7. Run `npm run check:all` (unit tests including the protected Mission Log tests, build, PPT export and site check) before committing website changes.
8. Commit only the encrypted payload and public image derivatives, never the private JSON or passphrase.
9. Delete temporary drafts and scratch files that hold entry text.

The user should not be asked to produce HTML or TypeScript unless they explicitly want to.

## Paper Shelf Rule

When the user sends a paper, Codex should:

1. Add it to `src/data/papers.ts`, which stays a JSON literal ending in `as const` (`check-site` and the tests parse it), with:
   - `id`: a new stable card anchor such as `king-2015`, never reused or renamed. `legacyAnchor` belongs only to the papers that had a `#paper-N` anchor before stable ids; new papers do not get one.
   - `authors` as `{ "family", "initials" }`: every author when there are two or fewer, otherwise the first (Zega 2025 also names McCoy so the shelf search finds him); `authorCount` is the full count. The author/year label and the copied reference are generated from these.
   - `year`, `journal`, `volume`, `pages` or `articleNumber`, and `doi`, taken from the publisher's Crossref record for the DOI, never guessed. The one exception: keep the published ß in Endreß (1996), which Crossref drops.
   - `summary`: what the paper reports. `relevance`: why it matters for the project, as literature context, never as the owner's result.
   - `tags`: short reader-facing labels. `filters`: every category whose button should show the paper. `primaryFilter`: the one group it is shelved under, which must be one of its `filters`.
2. Use existing filter IDs unless a genuinely new shelf category is needed: `dolomite`, `ci-orgueil`, `ryugu-bennu`, `methods`, `chronology`. A new one also needs an entry in `paperCategories`.
3. Run `npm run check:all`; `scripts/paper-shelf.test.mjs` checks these fields and `check:site` checks the cards and anchors.

## PPT Rule

When the user asks for slides, Codex should:

1. Run `npm run check:all`, which builds the site and writes `dist/ppt-data.json`.
2. Use `dist/ppt-data.json` for public Paper Shelf and project metadata only: `researchTheme` is the formal title from `src/data/project.mjs`, and each paper carries `authorYear` and `reference`, the strings the site shows.
3. When slides need Mission Log content, read it locally from the private Mission Log JSON; never add it back to the public PPT export.
4. Build the deck from the current private Mission Log and public Paper Shelf content.
5. Keep claims traceable to the provided notes, papers, or website data.

## Safety Rule

Codex commits or pushes only when the owner asks. Before pushing to `main`, Codex should:

1. Run `npm run check`, and `npm run audit:css:check` after CSS ownership changes so the baseline does not regress.
2. Confirm `git status --short --branch`.
3. Commit with a clear message.
4. Push `main`.
5. Keep the previous main commit available for rollback.
