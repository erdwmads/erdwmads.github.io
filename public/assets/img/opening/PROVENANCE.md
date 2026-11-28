# Home opening prints

Derived 2026-11-28 from the owner-approved original of candidate C03 (the Home opening, owner decision of 2026-11-28, direction A "Comet opening"). The files are the opening's plate (`.home-opening__sky::before` in `src/styles/folio/pages/home-opening.css`): one print per visit, requested only after load and idle (`html.backdrop-ready`) and never preloaded. Credits: the opening's own credit line and the footer credit line (`src/data/colophon.ts`). No file here is the site author’s data.

Made by `npm run images:imagery -- opening --originals <folder>` (`scripts/derive-imagery.mjs`), with every parameter in `scripts/lib/imagery-jobs.mjs`; `npm run images:verify` derives the files again and compares them with these.

## Source

- Subject: Comet McNaught over the Pacific Ocean, January 2007 (candidate C03).
- Used on: Home (index.html): the opening's plate, Space and Light printings.
- Source page: https://www.eso.org/public/images/mc_naught34/
- Download: https://cdn.eso.org/images/large/mc_naught34.jpg
- Credit: S. Deiries/ESO.
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Original: 3354x2235 px, 1,744,992 bytes, SHA-256 c0bae23ce371c72910fa86ffd8961f952d6fcc9d93aee0becf7f788cd4175687. Kept outside the repository.
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).

## Geometry

The painted picture must always cover the window, so Chromium treats it as a background (as it does Bennu) and never reports it as the Largest Contentful Paint. Each file therefore carries its margins and feathers itself, and the page bleeds it 2 px past the window.

- Wide files: a left margin of 1.0 file height, then the crop (x 0 to 78 % of the original, full height, 1.1705 file heights wide, the comet's head 30.4 % across it) with a left feather of 0.2 and a right feather of 0.12 file height, then a right margin of 0.3 file height. The number in the name is the file height.
- Phone files: the crop x 10 to 62 % of the original, drawn in the top 70 % of the file; the sea feathers out from 64 % to 70 % of the file height.

## Space printings: comet-mcnaught-opening-wide-1000.webp, comet-mcnaught-opening-wide-1600.webp, comet-mcnaught-opening-phone-1500.webp

- Changes: cropped as above, toned (levels 0.93 and -4, saturation 0.9); the margins are transparent and the feathers are in the alpha channel, so the night ground of the page (`--obs-open-ground`) shows through.
- WebP quality 70 (wide 1000), 64 (wide 1600), 68 (phone); alpha quality 60.
- Files: `comet-mcnaught-opening-wide-1000.webp` 2470 × 1000 px, 37.9 KB; `comet-mcnaught-opening-wide-1600.webp` 3953 × 1600 px, 86.4 KB; `comet-mcnaught-opening-phone-1500.webp` 819 × 1500 px, 26.4 KB.

## Light printings: comet-mcnaught-ink-wide-1000.webp, comet-mcnaught-ink-wide-1600.webp, comet-mcnaught-ink-phone-1500.webp

- Changes: cropped as above; greyscale, the sky background subtracted row by row (95 % of the smoothed 15th percentile of each row), black point at the 40th and white point at the 99.7th percentile, power 1.1; printed as sepia ink at 60 % on the Light paper, opaque, with paper margins.
- Ink: `color-mix(in srgb, #765725 62%, #1d2434)` = rgb(84, 68, 43), from the Light `--obs-accent` and `--obs-text`; paper #f7f3eb, the Light `--obs-paper`. Derive the files again if those Light tokens change.
- WebP quality 72 (wide 1000), 66 (wide 1600), 70 (phone).
- Files: `comet-mcnaught-ink-wide-1000.webp` 2470 × 1000 px, 18.0 KB; `comet-mcnaught-ink-wide-1600.webp` 3953 × 1600 px, 35.5 KB; `comet-mcnaught-ink-phone-1500.webp` 819 × 1500 px, 13.8 KB.
