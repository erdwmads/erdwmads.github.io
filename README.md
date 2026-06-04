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
