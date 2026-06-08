# Mads LIU YONG Academic Website

Static GitHub Pages website for `erdwmads.github.io`.

## Structure

- `index.html` - home page
- `research.html` - research overview
- `research-log.html` - research project index
- `research-graduation.html` - graduation research mission log
- `paper-shelf.html` - curated paper list
- `cv.html` - CV page
- `photography.html` - photography page
- `contact.html` - contact page
- `sample-cabinet.html` - sample cabinet page
- `assets/css/style.css` - site styling
- `assets/js/` - theme, ambient effects, photography, and mission log scripts
- `assets/img/` - portraits, gallery photos, research log images, and backgrounds
- `assets/files/` - downloadable PDFs

## Deployment

This site has no build step. Upload or push the files in this folder to the root of the `erdwmads.github.io` repository. GitHub Pages serves `index.html` directly.

Keep `.nojekyll` in the repository root so GitHub Pages serves all static assets as-is.

## Common Updates

- Replace the homepage portrait: `assets/img/profile.jpg`
- Replace the CV image: `assets/img/CV.jpg`
- Add photography images by updating `photography.html` and adding files under `assets/img/`
- Add papers by copying a `paper-card` block in `paper-shelf.html`
- Add graduation research log entries in `research-graduation.html`
