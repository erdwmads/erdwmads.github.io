# Mads LIU YONG Academic Website

Static GitHub Pages website for `erdwmads.github.io`.

This branch uses an Astro compatibility shell. Shared page chrome now lives in
`src/components/LegacyShell.astro`, while page bodies and page-specific scripts
remain as raw legacy partials under `src/legacy/`. This reduces repeated
head/header/footer code without changing the current visual effects or
interactions.

## Structure

- `src/pages/` - Astro routes that generate the public pages
- `src/components/LegacyShell.astro` - shared head, navigation, footer, and shell
- `src/legacy/` - raw legacy page bodies and page-specific scripts
- `public/assets/css/style.css` - site styling
- `public/assets/js/` - theme, ambient effects, photography, and mission log scripts
- `public/assets/img/` - portraits, gallery photos, research log images, and backgrounds
- `public/assets/files/` - downloadable PDFs

## Deployment

Install dependencies and build:

```powershell
npm install
npm run build
```

The deployable site is written to `dist/`. GitHub Pages should use GitHub Actions
deployment for this branch.

Keep `public/.nojekyll` in the repository so GitHub Pages serves all static
assets as-is.

## Common Updates

- Replace the homepage portrait: `public/assets/img/profile.jpg`
- Replace the CV image: `public/assets/img/CV.jpg`
- Add photography images by updating `public/photography.html` and adding files under `public/assets/img/`
- Add papers by copying a `paper-card` block in `public/paper-shelf.html`
- Add graduation research log entries in `public/research-graduation.html`

For copy-ready update templates, see `docs/maintenance-templates.md`.

Long-term maintenance references:

- `docs/handoff-report.md` - full imported handoff report
- `docs/content-workflow.md` - structured Mission Log fan-out rules
- `docs/writing-style.md` - public website prose rules
- `docs/ui-invariants.md` - design and behavior rules to preserve
- `docs/perf-browser-watchlist.md` - performance and Edge-specific risk notes

## CSS Maintenance

`public/assets/css/style.css` is intentionally kept as the single stylesheet for
the compatibility phase. It has accumulated several design iterations, so
changes should be made in small, reviewable passes:

- keep base layout and shared components near the top
- keep page-specific rules under their existing section comments
- prefer editing the latest matching rule instead of adding another late override
- run a local link/resource check after changing image paths, scripts, or downloads
