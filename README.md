# Mads LIU YONG Academic Website

Astro-based GitHub Pages site for `erdwmads.github.io`.

The current version preserves the original visual effects and interactions, while moving repeated content into small data files so future updates are easier to make safely.

## Local Use

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

## Structure

- `src/pages/` - Astro routes that generate public pages.
- `src/components/LegacyShell.astro` - shared head, SEO metadata, navigation, footer, and script shell.
- `src/components/PaperShelf.astro` - Paper Shelf rendering and filter controls.
- `src/components/MissionLogShell.astro` - password-gated Graduation Research Mission Log shell.
- `src/data/site.ts` - site metadata, navigation, footer, script registry, sitemap page list.
- `src/data/papers.ts` - Paper Shelf source data.
- `src/data/missionLog.ts` - Graduation Research Mission Log source data.
- `src/legacy/` - preserved page body fragments that have not yet been data-modeled.
- `public/assets/css/style.css` - visual system, effects, responsive rules.
- `public/assets/js/` - theme, ambient effects, soft navigation, Paper Shelf filters, password gate, and Mission Log scripts.
- `public/assets/img/` - portraits, gallery photos, public research images, and backgrounds.
- `public/assets/img/mission-log/` - Mission Log images used by the password-gated Graduation Research page.
- `public/assets/files/` - downloadable PDFs.

## Routine Updates

Codex should do the website edits. The user can send rough content.

- Add papers: update `src/data/papers.ts`.
  Each paper needs reader-facing `tags` and Paper Shelf `filters` (`dolomite`, `ci-orgueil`, `ryugu-bennu`, `methods`, `chronology`).
- Add Mission Log entries: update `src/data/missionLog.ts`, place log photos under `public/assets/img/mission-log/`, then run `npm run check`.
- Change navigation, page scripts, sitemap list, or global metadata: update `src/data/site.ts`.
- Replace normal images: add files under `public/assets/img/`, then update the relevant data or legacy fragment.
- Build PPTs from website content: run `npm run export:ppt-data` and use `dist/ppt-data.json`.

See:

- `docs/codex-update-contract.md`
- `docs/maintenance-templates.md`
- `docs/content-workflow.md`
- `docs/ui-invariants.md`
- `docs/perf-browser-watchlist.md`

## Deployment

Pushes to `main` trigger GitHub Actions:

1. install dependencies with `npm ci`
2. run `npm run check`
3. upload `dist/`
4. deploy to GitHub Pages

Keep `public/.nojekyll` in the repository so GitHub Pages serves all static assets as-is.

## Rollback

If a deployment breaks the live site, revert the latest merge or content commit on `main`, then push `main` again.

For the Astro compatibility merge, the pre-merge recovery point was:

```text
b27650d36470015bc138fae1b022ce1068efeb97
```

## CSS Maintenance

`public/assets/css/style.css` is intentionally kept as a single compatibility stylesheet. Rule order matters.

- Edit the latest matching section instead of appending another late override.
- Do not move Space Mode, Interface 2046, Mission Log lightbox, or Entry Gate rules unless changing cascade order intentionally.
- After changing styles, run `npm run check` and compare the public site and local Mission Log visually.
