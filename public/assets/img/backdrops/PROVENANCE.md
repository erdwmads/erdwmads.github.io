# Page backdrops

Derived 2026-11-28 from the owner-approved originals (the backdrops stage: one picture per page, owner decision of 2026-11-28). Each file is a greyscale luminance mask for its page’s backdrop (`body::before` in `src/styles/folio/components/backdrop.css`), never shown as a photograph on its own: the page fills it with its own ink (`--obs-far-ink`), pale light in Space and sepia ink on the Light paper. The `-1600` file is a 1600 × 1000 composition for windows wider than 760 px; the `-800` file is an upright 800 × 1600 composition for phones. Credits: the footer of the page that shows the picture (`src/data/colophon.ts`). No file here is the site author’s data.

Made by `npm run images:imagery -- backdrops --originals <folder>` (`scripts/derive-imagery.mjs`), with every parameter in `scripts/lib/imagery-jobs.mjs`; `npm run images:verify` derives the files again and compares them with these.

The Research page keeps the Bennu photograph (`public/assets/img/asteroid-bennu-1280.webp` and `-800.webp`, NASA/Goddard/University of Arizona, made by `scripts/generate-site-backgrounds.mjs`), now drawn as a mask in the same way.

Placement: the original (auto-oriented) is scaled to a width in canvas pixels; one point of it (fractions of the original) lands on one canvas point; only the crop window of the original is used and the rest of the canvas is black; a crop edge inside the canvas is feathered. Toning, measured on the visible crop: greyscale, black point and white point (percentiles of the crop, or absolute levels), then a power curve.

## comet-west-mask-1600.webp, comet-west-mask-800.webp

- Subject: Comet West, March 1976 (candidate C01).
- Used on: Home (index.html): the page backdrop under the sheet, once the opening has risen: on windows wider than 760 px the head low in the left margin, on the sheet’s soft edge, and the tails rising beside the column and passing behind the sheet; on phones the head low at the right edge. Home shows a second comet behind the sheet (Comet McNaught prints the opening).
- Source page: https://www.eso.org/public/images/c-west-mar1976-ps/
- Download: https://cdn.eso.org/images/large/c-west-mar1976-ps.jpg
- Credit: P. Stättmayer/ESO.
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Original: 3387x4252 px, 4,465,112 bytes, SHA-256 8399a750bab157b702a70d2ffef4aac4f78e1767cbc4f7b5997ccb6e27dd4b17. Kept outside the repository.
- Changes: cropped to the comet and the sky around it, placed for each window (wide: the head low and the left half of the fan of tails, cut 50 canvas px right of the head; phone: the head low at the right edge), toned to a greyscale light mask, stars dimmed against the tails.
- `comet-west-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 6.2 KB, WebP quality 42. The original at 1000 px wide (scale 0.29525), its point (0.490, 0.865) at canvas (260, 870); crop 0.000, 0.000, 0.540, 0.920 of the original (x0, y0, x1, y1), drawn in canvas x 0–310, y 0–939, feather 40 px. Toning: greyscale, black point 30 and white point 175 (absolute levels), power 1.35; point light kept at 15 % above a 9 px median (the diffuse light).
- `comet-west-mask-800.webp` (phones): 800 × 1600 px, 5.8 KB, WebP quality 46. The original at 1000 px wide (scale 0.29525), its point (0.490, 0.865) at canvas (690, 1480); crop 0.250, 0.000, 1.000, 0.920 of the original (x0, y0, x1, y1), drawn in canvas x 450–800, y 394–1549, feather 70 px. Toning: greyscale, black point at the 60.0th and white point at the 99.80th percentile of the crop (levels 43 and 216), power 1.3; point light kept at 15 % above a 9 px median (the diffuse light).
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).

## asteroid-ryugu-mask-1600.webp, asteroid-ryugu-mask-800.webp

- Subject: Asteroid 162173 Ryugu, Hayabusa2 ONC-T, 11 September 2018, processed from DARTS calibrated data (candidate A04).
- Used on: Ryugu & Bennu (ryugu-bennu.html): the page backdrop, the asteroid at the right edge of the window behind the two plates.
- Source page: https://commons.wikimedia.org/wiki/File:162173_Ryugu.png
- Download: https://upload.wikimedia.org/wikipedia/commons/5/5b/162173_Ryugu.png
- Credit: ISAS/JAXA; image processed by Anonymsiy (Wikimedia Commons).
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Original: 1167x1167 px, 1,476,666 bytes, SHA-256 3dce7ec63d3d59e950d36b2796474f83205575623bf04597c8c885ac1090204c. Kept outside the repository.
- Changes: placed at the right edge of the window, toned to a greyscale light mask.
- `asteroid-ryugu-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 15.6 KB, WebP quality 42. The original at 1100 px wide (scale 0.94259), its point (0.500, 0.500) at canvas (1520, 360); crop 0.000, 0.000, 1.000, 1.000 of the original (x0, y0, x1, y1), drawn in canvas x 970–1600, y 0–910, feather 40 px. Toning: greyscale, black point 18 and white point 150 (absolute levels), power 1.1; a 5 px median blended in at 70 %.
- `asteroid-ryugu-mask-800.webp` (phones): 800 × 1600 px, 10.1 KB, WebP quality 46. The original at 760 px wide (scale 0.65124), its point (0.500, 0.500) at canvas (720, 300); crop 0.000, 0.000, 1.000, 1.000 of the original (x0, y0, x1, y1), drawn in canvas x 340–800, y 0–680, feather 30 px. Toning: greyscale, black point 18 and white point 150 (absolute levels), power 1.1; a 5 px median blended in at 70 %.
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).
- Note: The ISAS data policy (https://darts.isas.jaxa.jp/doi/hyb2/hyb2-00200.html) lets these data be copied and modified; it asks for the credit ISAS/JAXA and a description of any modification, given here and in the footer. The JAXA site policy for press images does not apply to this file.
- Note: Ryugu is a comparison body for the site’s Orgueil work, not its sample and not Orgueil’s parent body.

## cosmic-cliffs-mask-1600.webp, cosmic-cliffs-mask-800.webp

- Subject: NIRCam image of the “Cosmic Cliffs” in the Carina Nebula (candidate N09).
- Used on: Origins (origins-study.html): the page backdrop, the ridge of the cliffs across the foot of the sheet’s rise.
- Source page: https://esawebb.org/images/weic2205a/
- Download: https://cdn.esawebb.org/archives/images/large/weic2205a.jpg
- Credit: NASA, ESA, CSA, and STScI.
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Original: 14575x8441 px, 17,843,041 bytes, SHA-256 99771479d4d83f439c95792b54069e7fd368f416c021346b1aa85058b3ca4d79. Kept outside the repository.
- Changes: cropped, toned to a greyscale light mask, stars dimmed against the nebula.
- `cosmic-cliffs-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 30.2 KB, WebP quality 42. The original at 1700 px wide (scale 0.11664), its point (0.500, 0.420) at canvas (800, 520); crop 0.000, 0.030, 1.000, 1.000 of the original (x0, y0, x1, y1), drawn in canvas x 0–1600, y 136–1000, feather 120 px. Toning: greyscale, black point at the 45.0th and white point at the 99.70th percentile of the crop (levels 74 and 203), power 1.5; point light kept at 30 % above a 9 px median (the diffuse light).
- `cosmic-cliffs-mask-800.webp` (phones): 800 × 1600 px, 17.1 KB, WebP quality 46. The original at 1500 px wide (scale 0.10292), its point (0.620, 0.420) at canvas (400, 420); crop 0.000, 0.030, 1.000, 1.000 of the original (x0, y0, x1, y1), drawn in canvas x 0–800, y 81–924, feather 100 px. Toning: greyscale, black point at the 45.0th and white point at the 99.70th percentile of the crop (levels 84 and 203), power 1.5; point light kept at 30 % above a 9 px median (the diffuse light).
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).

## comet-neowise-mask-1600.webp, comet-neowise-mask-800.webp

- Subject: Comet NEOWISE on 14 July 2020 (aligned to comet) (candidate C04).
- Used on: Research Log (research-log.html): the page backdrop, the head at the left edge of the window and the tails rising behind the opening.
- Source page: https://commons.wikimedia.org/wiki/File:Comet_2020_F3_(NEOWISE)_on_Jul_14_2020_aligned_to_comet.jpg
- Download: https://upload.wikimedia.org/wikipedia/commons/9/92/Comet_2020_F3_%28NEOWISE%29_on_Jul_14_2020_aligned_to_comet.jpg
- Credit: SimgDe (simg.de), via Wikimedia Commons.
- Licence: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Share-alike: these derived files are released under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); the repository licence does not cover them.
- Original: 2900x2000 px, 5,563,341 bytes, SHA-256 2f926e4b18dcad01025148a68ef5a23a8d5ede4919f62087773c1c5250ebd64f. Kept outside the repository.
- Changes: toned to a greyscale light mask, star trails dimmed against the tails; this version CC BY-SA 4.0.
- `comet-neowise-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 16.0 KB, WebP quality 42. The original at 1900 px wide (scale 0.65517), its point (0.035, 0.970) at canvas (56, 667); crop 0.000, 0.000, 1.000, 1.000 of the original (x0, y0, x1, y1), drawn in canvas x 0–1600, y 0–706, feather 60 px. Toning: greyscale, black point at the 55.0th and white point at the 99.00th percentile of the crop (levels 44 and 194), power 0.95; point light kept at 20 % above a 9 px median (the diffuse light).
- `comet-neowise-mask-800.webp` (phones): 800 × 1600 px, 13.3 KB, WebP quality 46. The original at 1300 px wide (scale 0.44828), its point (0.035, 0.970) at canvas (40, 860); crop 0.000, 0.000, 1.000, 1.000 of the original (x0, y0, x1, y1), drawn in canvas x 0–800, y 0–887, feather 50 px. Toning: greyscale, black point at the 55.0th and white point at the 99.00th percentile of the crop (levels 34 and 176), power 0.95; point light kept at 20 % above a 9 px median (the diffuse light).
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).

## trouvelot-orion-nebula-mask-1600.webp, trouvelot-orion-nebula-mask-800.webp

- Subject: E. L. Trouvelot, The Great Nebula in Orion (Plate XV, published 1881–82) (candidate H03).
- Used on: Paper Shelf (paper-shelf.html): the page backdrop, the nebula in the upper right of the window beside the frontispiece plate.
- Source page: https://commons.wikimedia.org/wiki/File:Trouvelot-_The_great_nebula_in_Orion_-_1875.jpg
- Download: https://upload.wikimedia.org/wikipedia/commons/1/1c/Trouvelot-_The_great_nebula_in_Orion_-_1875.jpg
- Credit: E. L. Trouvelot; from The New York Public Library, via Wikimedia Commons.
- Licence: public domain.
- Original: 9155x7212 px, 13,146,435 bytes, SHA-256 b5d4ae9b76603a2d8812d49ffb1bfee702eb799075deac37435ca8d7bd712901. Kept outside the repository.
- Changes: cropped inside the printed margin, toned to a greyscale light mask.
- `trouvelot-orion-nebula-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 13.6 KB, WebP quality 42. The original at 2000 px wide (scale 0.21846), its point (0.555, 0.585) at canvas (1390, 255); crop 0.070, 0.075, 0.935, 0.900 of the original (x0, y0, x1, y1), drawn in canvas x 420–1600, y 0–751, feather 120 px. Toning: greyscale, black point at the 55.0th and white point at the 99.80th percentile of the crop (levels 33 and 179), power 1.2.
- `trouvelot-orion-nebula-mask-800.webp` (phones): 800 × 1600 px, 8.8 KB, WebP quality 46. The original at 1500 px wide (scale 0.16384), its point (0.555, 0.585) at canvas (520, 420); crop 0.070, 0.075, 0.935, 0.900 of the original (x0, y0, x1, y1), drawn in canvas x 0–800, y 0–792, feather 90 px. Toning: greyscale, black point at the 55.0th and white point at the 99.80th percentile of the crop (levels 31 and 174), power 1.2.
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).
- Note: A drawing, not data. Public domain (PD-Art, PD-old-100); the credit is a courtesy.

## trouvelot-milky-way-mask-1600.webp, trouvelot-milky-way-mask-800.webp

- Subject: E. L. Trouvelot, Part of the Milky Way (Plate XIII, published 1881–82) (candidate H02).
- Used on: CV (cv.html): the page backdrop, the band of the Milky Way down the right edge of the window.
- Source page: https://commons.wikimedia.org/wiki/File:Trouvelot_-_Part_of_the_Milky_Way.jpg
- Download: https://upload.wikimedia.org/wikipedia/commons/d/d0/Trouvelot_-_Part_of_the_Milky_Way.jpg
- Credit: E. L. Trouvelot; from The New York Public Library, via Wikimedia Commons.
- Licence: public domain.
- Original: 6998x9193 px, 13,314,153 bytes, SHA-256 efd34d29ad3d82adb0a14f1d3bf7a7e97ae54f04bd12e32914b21ff1b00ebe11. Kept outside the repository.
- Changes: cropped inside the printed margin and above the horizon (the rocks and the ship removed), toned to a greyscale light mask.
- `trouvelot-milky-way-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 8.9 KB, WebP quality 42. The original at 1650 px wide (scale 0.23578), its point (0.450, 0.330) at canvas (1500, 400); crop 0.065, 0.055, 0.915, 0.620 of the original (x0, y0, x1, y1), drawn in canvas x 865–1600, y 0–1000, feather 140 px. Toning: greyscale, black point at the 55.0th and white point at the 99.95th percentile of the crop (levels 44 and 140), power 1.3; a 5 px median blended in at 60 %.
- `trouvelot-milky-way-mask-800.webp` (phones): 800 × 1600 px, 10.0 KB, WebP quality 46. The original at 1500 px wide (scale 0.21435), its point (0.450, 0.330) at canvas (560, 600); crop 0.065, 0.055, 0.915, 0.620 of the original (x0, y0, x1, y1), drawn in canvas x 0–800, y 58–1171, feather 100 px. Toning: greyscale, black point at the 55.0th and white point at the 99.95th percentile of the crop (levels 44 and 135), power 1.3; a 5 px median blended in at 60 %.
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).
- Note: A drawing, not data. Public domain (the author died in 1895); the credit is a courtesy.

## milky-way-panorama-mask-1600.webp, milky-way-panorama-mask-800.webp

- Subject: The Milky Way panorama (candidate N03).
- Used on: Photography (photography.html): the page backdrop, the band of the Milky Way across the upper right of the window.
- Source page: https://www.eso.org/public/images/eso0932a/
- Download: https://cdn.eso.org/images/large/eso0932a.jpg
- Credit: ESO/S. Brunier.
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Original: 6000x3000 px, 8,228,817 bytes, SHA-256 60400c92c54b7c1bd12299c69e83b16e5b6256e7dabacc478c021758ecd28179. Kept outside the repository.
- Changes: cropped to the band, toned to a greyscale light mask.
- `milky-way-panorama-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 23.7 KB, WebP quality 42. The original at 3000 px wide (scale 0.5), its point (0.500, 0.480) at canvas (1300, 333); crop 0.000, 0.200, 1.000, 0.800 of the original (x0, y0, x1, y1), drawn in canvas x 0–1600, y 0–813, feather 120 px. Toning: greyscale, black point at the 60.0th and white point at the 99.60th percentile of the crop (levels 17 and 151), power 1.1; point light kept at 50 % above a 9 px median (the diffuse light); faded in from canvas x 500 to 900.
- `milky-way-panorama-mask-800.webp` (phones): 800 × 1600 px, 12.2 KB, WebP quality 46. The original at 2400 px wide (scale 0.4), its point (0.500, 0.480) at canvas (560, 330); crop 0.000, 0.200, 1.000, 0.800 of the original (x0, y0, x1, y1), drawn in canvas x 0–800, y 0–714, feather 100 px. Toning: greyscale, black point at the 60.0th and white point at the 99.60th percentile of the crop (levels 17 and 162), power 1.1; point light kept at 50 % above a 9 px median (the diffuse light).
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).
- Note: ESO withholds only the 800-megapixel original; this 6000 × 3000 version is CC BY 4.0.

## comet-pons-brooks-mask-1600.webp, comet-pons-brooks-mask-800.webp

- Subject: Comet 12P/Pons-Brooks, 6 April 2024 (candidate C08).
- Used on: Contact (contact.html): the page backdrop, the head in the upper right of the window and the tail rising past the orrery.
- Source page: https://commons.wikimedia.org/wiki/File:12P_Pons-Brooks_(53635474808).jpg
- Download: https://upload.wikimedia.org/wikipedia/commons/1/1d/12P_Pons-Brooks_%2853635474808%29.jpg
- Credit: Don Heffernan, via Flickr and Wikimedia Commons.
- Licence: CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/).
- Original: 9576x6388 px, 10,533,121 bytes, SHA-256 fccb74b2c6d8fe7b5aba74e94b8b8f092e36fcf332062485ee9c8b6ee1c52600. Kept outside the repository.
- Changes: cropped (satellite trails at the right and the stacking edge at the top removed), toned to a greyscale light mask.
- `comet-pons-brooks-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 8.3 KB, WebP quality 42. The original at 1500 px wide (scale 0.15664), its point (0.660, 0.790) at canvas (1444, 522); crop 0.030, 0.020, 0.790, 0.860 of the original (x0, y0, x1, y1), drawn in canvas x 499–1600, y 0–592, feather 100 px. Toning: greyscale, black point at the 60.0th and white point at the 99.90th percentile of the crop (levels 9 and 239), power 1.3; point light kept at 35 % above a 9 px median (the diffuse light).
- `comet-pons-brooks-mask-800.webp` (phones): 800 × 1600 px, 7.8 KB, WebP quality 46. The original at 1300 px wide (scale 0.13576), its point (0.660, 0.790) at canvas (700, 760); crop 0.030, 0.020, 0.790, 0.860 of the original (x0, y0, x1, y1), drawn in canvas x 0–800, y 92–821, feather 80 px. Toning: greyscale, black point at the 60.0th and white point at the 99.90th percentile of the crop (levels 9 and 238), power 1.3; point light kept at 35 % above a 9 px median (the diffuse light).
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).

## dark-cloud-b68-mask-1600.webp, dark-cloud-b68-mask-800.webp

- Subject: Barnard 68, the dark cloud (candidate N06).
- Used on: 404 (404.html): the page backdrop, the starless cloud behind the opening words and the stars around it.
- Source page: https://www.eso.org/public/images/eso9924a/
- Download: https://cdn.eso.org/images/large/eso9924a.jpg
- Credit: ESO.
- Licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
- Original: 1955x1953 px, 2,489,949 bytes, SHA-256 9e42bd172653723fad3fde8d32a58f2c4e37f4beeeb03034cbcdf98ba95a3f73. Kept outside the repository.
- Changes: cropped, toned to a greyscale light mask (the fainter stars removed).
- `dark-cloud-b68-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 24.2 KB, WebP quality 42. The original at 2100 px wide (scale 1.07417), its point (0.450, 0.430) at canvas (520, 340); crop 0.000, 0.000, 1.000, 1.000 of the original (x0, y0, x1, y1), drawn in canvas x 0–1600, y 0–1000, feather 80 px. Toning: greyscale, black point at the 93.0th and white point at the 99.90th percentile of the crop (levels 57 and 255), power 1.4.
- `dark-cloud-b68-mask-800.webp` (phones): 800 × 1600 px, 28.8 KB, WebP quality 46. The original at 1500 px wide (scale 0.76726), its point (0.450, 0.430) at canvas (400, 420); crop 0.000, 0.000, 1.000, 1.000 of the original (x0, y0, x1, y1), drawn in canvas x 0–800, y 0–1274, feather 60 px. Toning: greyscale, black point at the 93.0th and white point at the 99.90th percentile of the crop (levels 60 and 255), power 1.4.
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).

## trouvelot-november-meteors-mask-1600.webp, trouvelot-november-meteors-mask-800.webp

- Subject: E. L. Trouvelot, The November Meteors (Plate XII, published 1881–82) (candidate H04).
- Used on: The protected Research Log (research-graduation.html), while it is locked: the page backdrop, the radiant at the top right of the window.
- Source page: https://commons.wikimedia.org/wiki/File:Trouvelot-_The_November_meteors._-_1868.jpg
- Download: https://upload.wikimedia.org/wikipedia/commons/b/bf/Trouvelot-_The_November_meteors._-_1868.jpg
- Credit: E. L. Trouvelot; from The New York Public Library, via Wikimedia Commons.
- Licence: public domain.
- Original: 7038x9276 px, 14,684,369 bytes, SHA-256 19211c32d5fcd76e056530c3a2f4d49476b6a80f39cb7e6d399fef2b9e00db6f. Kept outside the repository.
- Changes: cropped inside the printed margin and above the landscape, toned to a greyscale light mask.
- `trouvelot-november-meteors-mask-1600.webp` (windows wider than 760 px): 1600 × 1000 px, 21.9 KB, WebP quality 42. The original at 1700 px wide (scale 0.24155), its point (0.800, 0.100) at canvas (1450, 60); crop 0.065, 0.065, 0.925, 0.720 of the original (x0, y0, x1, y1), drawn in canvas x 201–1600, y 0–1000, feather 120 px. Toning: greyscale, black point at the 55.0th and white point at the 99.80th percentile of the crop (levels 36 and 154), power 1.3.
- `trouvelot-november-meteors-mask-800.webp` (phones): 800 × 1600 px, 15.6 KB, WebP quality 46. The original at 1300 px wide (scale 0.18471), its point (0.800, 0.100) at canvas (700, 40); crop 0.065, 0.065, 0.925, 0.720 of the original (x0, y0, x1, y1), drawn in canvas x 0–800, y 0–1102, feather 90 px. Toning: greyscale, black point at the 55.0th and white point at the 99.80th percentile of the crop (levels 40 and 175), power 1.3.
- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).
- Note: A drawing, not data. Public domain (PD-Art, PD-old-100); the credit is a courtesy.

## Retired

The far plates of 2026-11-27 (`comet-mcnaught-mask-1920/1280`, `comet-neowise-mask-1920/1280`, `comet-pons-brooks-mask-1920/1280`, `trouvelot-milky-way-mask-1920/1280` and `comet-tsuchinshan-atlas-iss-mask-1920/1280`) were removed on 2026-11-28: each page now carries one backdrop. McNaught, NEOWISE, 12P/Pons-Brooks and Trouvelot’s Milky Way were merged into their pages’ backdrops above. Comet Tsuchinshan-ATLAS from the ISS (NASA, public domain) left the Ryugu & Bennu page, where it would have been a second far picture beside Ryugu, and is no longer published.

Home’s first backdrop of 2026-11-28, `comet-mcnaught-mask-1600` and `-800` (Comet McNaught as the opening’s after-image), was retired the same day: Comet West took Home’s far plane (owner, 2026-11-28), so Home shows two comets, and Comet McNaught prints only the opening (`public/assets/img/opening/`).
