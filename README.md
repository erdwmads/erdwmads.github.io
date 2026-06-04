# Mads LIU YONG — Blue Multi-page Website

This version fixes the footer overlap issue, changes the design to a clean blue-white theme, and separates each section into its own page.

## Pages

- `index.html`
- `research.html`
- `cv.html`
- `notes.html`
- `photography.html`
- `contact.html`

## Upload method

1. Open your GitHub repository: `erdwmads.github.io`
2. Delete or replace the old website files.
3. Upload all files in this folder, not the zip itself.
4. Commit changes.
5. Open `https://erdwmads.github.io`

## Edit first

- Replace the public email in `contact.html`.
- Replace `assets/img/profile-placeholder.svg` with your own image if needed.


## Photo page ratio fix

This version adds safe CSS for the photography page:

- `.photo-grid img` is automatically limited to the gallery width.
- Images use `object-fit: cover`.
- Gallery cards stay at a fixed visual height.
- Plain `<img>` tags will not become huge even if no class is added.


## Research Log

This version adds:

- `research-log.html`
- Navigation link: Research Log
- CSS classes for chronological timeline entries
- `research-log-entry-template.html`

To add a new research log entry, open `research-log.html`, copy one `<article class="log-entry">...</article>` block, paste it above older entries, and update the date, title, content, and tags.


## 2026-06 update

- Header wording updated from Earth Sciences to Planetary Sciences.
- Homepage interest pills updated to:
  Cosmic Mineralogy / CI Chondrite / Ryugu-Bennu / Astromaterials Science / SEM-EPMA-TEM.


## Homepage photo fix

The homepage now expects your portrait at:

`assets/img/profile.jpg`

Upload your own image with exactly this filename.

If you want to use another filename, edit `index.html` and change:

`assets/img/profile.jpg`

to your actual image path.

The CSS now forces the homepage portrait into a square card and prevents the original image size from breaking the layout.


## Final image paths

This version expects:

- Homepage portrait: `assets/img/profile.jpg`
- Photography page: `assets/img/photo1.jpg`
- Photography page: `assets/img/photo2.jpg`
- Photography page: `assets/img/photo3.jpg`

The gallery is cropped and aligned automatically by CSS.

If images do not show, check the exact file names. GitHub Pages is case-sensitive.


## 2026-06 final update

- Photography page now uses:
  - `assets/img/photo01.jpg`
  - `assets/img/photo02.jpg`
  - `assets/img/photo03.jpg`
- Homepage portrait uses:
  - `assets/img/profile.jpg`
- Research Log is now project-based:
  - `research-log.html` = project overview
  - `research-graduation.html` = clickable graduation research project page
