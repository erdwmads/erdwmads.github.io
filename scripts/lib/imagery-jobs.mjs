// The parameters of every picture scripts/derive-imagery.mjs makes: the page backdrop masks, the Home opening prints,
// the context plates and the share cards. Each original is named by file and checked by its SHA-256 before use; the
// originals themselves stay outside the repository. Change a value here, run the derive command, and review the
// written files and PROVENANCE.md before committing them. The `derived` dates are written into PROVENANCE.md: change
// one when that set's parameters change.

export const BY = "https://creativecommons.org/licenses/by/4.0/";
export const BYSA = "https://creativecommons.org/licenses/by-sa/4.0/";
export const BY2 = "https://creativecommons.org/licenses/by/2.0/";

// The owner-approved originals (candidate numbers from the imagery selection of 2026-11-26).
export const originals = {
  C01: { file: "C01-comet-west.jpg", sha256: "8399a750bab157b702a70d2ffef4aac4f78e1767cbc4f7b5997ccb6e27dd4b17" },
  A04: { file: "A04-ryugu.png", sha256: "3dce7ec63d3d59e950d36b2796474f83205575623bf04597c8c885ac1090204c" },
  A05: { file: "A05-orgueil-mnhn.jpg", sha256: "3bb760612e257b37e09b479312a74942cc6769ff1fa74e127f43a682de17f1d7" },
  C02: { file: "C02-hale-bopp-slawik.jpg", sha256: "28424a5f46a732271a38602ac2087bf16dd995ed6d3ca207948d3196c34aef50" },
  C03: { file: "C03-mc_naught34.jpg", sha256: "c0bae23ce371c72910fa86ffd8961f952d6fcc9d93aee0becf7f788cd4175687" },
  C04: { file: "C04-neowise-2020-07-14.jpg", sha256: "2f926e4b18dcad01025148a68ef5a23a8d5ede4919f62087773c1c5250ebd64f" },
  C08: { file: "C08-12p-pons-brooks.jpg", sha256: "fccb74b2c6d8fe7b5aba74e94b8b8f092e36fcf332062485ee9c8b6ee1c52600" },
  H01: { file: "H01-trouvelot-great-comet-1881.jpg", sha256: "644b90e746d7d1f58cbdabcd9ba746d156fc1b0947c7978da39eda07b22a1b82" },
  H02: { file: "H02-trouvelot-milky-way.jpg", sha256: "efd34d29ad3d82adb0a14f1d3bf7a7e97ae54f04bd12e32914b21ff1b00ebe11" },
  H03: { file: "H03-trouvelot-orion.jpg", sha256: "b5d4ae9b76603a2d8812d49ffb1bfee702eb799075deac37435ca8d7bd712901" },
  H04: { file: "H04-trouvelot-november-meteors.jpg", sha256: "19211c32d5fcd76e056530c3a2f4d49476b6a80f39cb7e6d399fef2b9e00db6f" },
  N03: { file: "N03-milky-way-panorama.jpg", sha256: "60400c92c54b7c1bd12299c69e83b16e5b6256e7dabacc478c021758ecd28179" },
  N06: { file: "N06-b68.jpg", sha256: "9e42bd172653723fad3fde8d32a58f2c4e37f4beeeb03034cbcdf98ba95a3f73" },
  N07: { file: "N07-eso1436a.jpg", sha256: "e6e6b4c6eaa787b296d6f0256af7b75e3a9a348174a869fffb871a13d5069696" },
  N09: { file: "N09-cosmic-cliffs.jpg", sha256: "99771479d4d83f439c95792b54069e7fd368f416c021346b1aa85058b3ca4d79" }
};

// Page backdrops (public/assets/img/backdrops/): a 1600 x 1000 composition for windows wider than 760 px and an
// upright 800 x 1600 one for phones, each a greyscale luminance mask the page fills with its own ink
// (src/styles/folio/components/backdrop.css). Placement: the original (auto-oriented) is scaled to `w` canvas pixels
// wide; its point `from` (fractions of the original) lands on canvas point `to`; only the window `crop` of the
// original (fractions) is used and the rest of the canvas is black. A crop edge inside the canvas is feathered over
// `feather` px; `fadeLeft` [a, b] fades the picture in from canvas x = a to x = b. Toning, measured on the visible
// crop: greyscale, black and white points at percentiles (black, white) or absolute levels (blackAbs, whiteAbs),
// then a power curve; `stars` keeps that share of the light above a 9 px median (dimming point stars and trails);
// `median` blends in a 5 px median. A canvas may carry its own `tone`, which then replaces the job's for that file.
export const backdrops = {
  derived: "2026-11-28",
  canvases: { wide: [1600, 1000], phone: [800, 1600] },
  quality: { wide: 42, phone: 46 },
  jobs: [
    { id: "C01", page: "index", name: "comet-west", credit: "P. Stättmayer/ESO", licence: "CC BY 4.0", licenceUrl: BY,
      changes: "cropped to the comet and the sky around it, placed for each window (wide: the head low and the left half of the fan of tails, cut 50 canvas px right of the head; phone: the head low at the right edge), toned to a greyscale light mask, stars dimmed against the tails",
      tone: { black: 0.6, white: 0.998, gamma: 1.3, stars: 0.15 },
      // Wide: the page places the head in the left margin and the cut on the column's edge (components/backdrop.css);
      // absolute levels, as the crop is mostly the fan.
      wide: { w: 1000, from: [0.49, 0.865], to: [260, 870], crop: [0, 0, 0.54, 0.92], feather: 40, tone: { blackAbs: 30, whiteAbs: 175, gamma: 1.35, stars: 0.15 } },
      phone: { w: 1000, from: [0.49, 0.865], to: [690, 1480], crop: [0.25, 0, 1, 0.92], feather: 70 } },
    { id: "A04", page: "ryugu-bennu", name: "asteroid-ryugu", credit: "ISAS/JAXA; image processed by Anonymsiy (Wikimedia Commons)", licence: "CC BY 4.0", licenceUrl: BY,
      changes: "placed at the right edge of the window, toned to a greyscale light mask",
      tone: { blackAbs: 18, whiteAbs: 150, gamma: 1.1, median: 0.7 },
      wide: { w: 1100, from: [0.5, 0.5], to: [1520, 360], crop: [0, 0, 1, 1], feather: 40 },
      phone: { w: 760, from: [0.5, 0.5], to: [720, 300], crop: [0, 0, 1, 1], feather: 30 } },
    { id: "N09", page: "origins-study", name: "cosmic-cliffs", credit: "NASA, ESA, CSA, and STScI", licence: "CC BY 4.0", licenceUrl: BY,
      changes: "cropped, toned to a greyscale light mask, stars dimmed against the nebula",
      tone: { black: 0.45, white: 0.997, gamma: 1.5, stars: 0.3 },
      wide: { w: 1700, from: [0.5, 0.42], to: [800, 520], crop: [0, 0.03, 1, 1], feather: 120 },
      phone: { w: 1500, from: [0.62, 0.42], to: [400, 420], crop: [0, 0.03, 1, 1], feather: 100 } },
    { id: "C04", page: "research-log", name: "comet-neowise", credit: "SimgDe (simg.de), via Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: BYSA, sa: true,
      changes: "toned to a greyscale light mask, star trails dimmed against the tails; this version CC BY-SA 4.0",
      tone: { black: 0.55, white: 0.99, gamma: 0.95, stars: 0.2 },
      wide: { w: 1900, from: [0.035, 0.97], to: [56, 667], crop: [0, 0, 1, 1], feather: 60 },
      phone: { w: 1300, from: [0.035, 0.97], to: [40, 860], crop: [0, 0, 1, 1], feather: 50 } },
    { id: "H03", page: "paper-shelf", name: "trouvelot-orion-nebula", credit: "E. L. Trouvelot; from The New York Public Library, via Wikimedia Commons", licence: "public domain", licenceUrl: "",
      changes: "cropped inside the printed margin, toned to a greyscale light mask",
      tone: { black: 0.55, white: 0.998, gamma: 1.2 },
      wide: { w: 2000, from: [0.555, 0.585], to: [1390, 255], crop: [0.07, 0.075, 0.935, 0.9], feather: 120 },
      phone: { w: 1500, from: [0.555, 0.585], to: [520, 420], crop: [0.07, 0.075, 0.935, 0.9], feather: 90 } },
    { id: "H02", page: "cv", name: "trouvelot-milky-way", credit: "E. L. Trouvelot; from The New York Public Library, via Wikimedia Commons", licence: "public domain", licenceUrl: "",
      changes: "cropped inside the printed margin and above the horizon (the rocks and the ship removed), toned to a greyscale light mask",
      tone: { black: 0.55, white: 0.9995, gamma: 1.3, median: 0.6 },
      wide: { w: 1650, from: [0.45, 0.33], to: [1500, 400], crop: [0.065, 0.055, 0.915, 0.62], feather: 140 },
      phone: { w: 1500, from: [0.45, 0.33], to: [560, 600], crop: [0.065, 0.055, 0.915, 0.62], feather: 100 } },
    { id: "N03", page: "photography", name: "milky-way-panorama", credit: "ESO/S. Brunier", licence: "CC BY 4.0", licenceUrl: BY,
      changes: "cropped to the band, toned to a greyscale light mask",
      tone: { black: 0.6, white: 0.996, gamma: 1.1, stars: 0.5 },
      wide: { w: 3000, from: [0.5, 0.48], to: [1300, 333], crop: [0, 0.2, 1, 0.8], feather: 120, fadeLeft: [500, 900] },
      phone: { w: 2400, from: [0.5, 0.48], to: [560, 330], crop: [0, 0.2, 1, 0.8], feather: 100 } },
    { id: "C08", page: "contact", name: "comet-pons-brooks", credit: "Don Heffernan, via Flickr and Wikimedia Commons", licence: "CC BY 2.0", licenceUrl: BY2,
      changes: "cropped (satellite trails at the right and the stacking edge at the top removed), toned to a greyscale light mask",
      tone: { black: 0.6, white: 0.999, gamma: 1.3, stars: 0.35 },
      wide: { w: 1500, from: [0.66, 0.79], to: [1444, 522], crop: [0.03, 0.02, 0.79, 0.86], feather: 100 },
      phone: { w: 1300, from: [0.66, 0.79], to: [700, 760], crop: [0.03, 0.02, 0.79, 0.86], feather: 80 } },
    { id: "N06", page: "404", name: "dark-cloud-b68", credit: "ESO", licence: "CC BY 4.0", licenceUrl: BY,
      changes: "cropped, toned to a greyscale light mask (the fainter stars removed)",
      tone: { black: 0.93, white: 0.999, gamma: 1.4 },
      wide: { w: 2100, from: [0.45, 0.43], to: [520, 340], crop: [0, 0, 1, 1], feather: 80 },
      phone: { w: 1500, from: [0.45, 0.43], to: [400, 420], crop: [0, 0, 1, 1], feather: 60 } },
    { id: "H04", page: "research-graduation", name: "trouvelot-november-meteors", credit: "E. L. Trouvelot; from The New York Public Library, via Wikimedia Commons", licence: "public domain", licenceUrl: "",
      changes: "cropped inside the printed margin and above the landscape, toned to a greyscale light mask",
      tone: { black: 0.55, white: 0.998, gamma: 1.3 },
      wide: { w: 1700, from: [0.8, 0.1], to: [1450, 60], crop: [0.065, 0.065, 0.925, 0.72], feather: 120 },
      phone: { w: 1300, from: [0.8, 0.1], to: [700, 40], crop: [0.065, 0.065, 0.925, 0.72], feather: 90 } }
  ],
  // PROVENANCE.md: the subject, where it is used, the source page and download for each original.
  sources: {
    C01: { subject: "Comet West, March 1976 (candidate C01).", used: "Home (index.html): the page backdrop under the sheet, once the opening has risen: on windows wider than 760 px the head low in the left margin, on the sheet’s soft edge, and the tails rising beside the column and passing behind the sheet; on phones the head low at the right edge. Home shows a second comet behind the sheet (Comet McNaught prints the opening).", page: "https://www.eso.org/public/images/c-west-mar1976-ps/", dl: "https://cdn.eso.org/images/large/c-west-mar1976-ps.jpg" },
    A04: { subject: "Asteroid 162173 Ryugu, Hayabusa2 ONC-T, 11 September 2018, processed from DARTS calibrated data (candidate A04).", used: "Ryugu & Bennu (ryugu-bennu.html): the page backdrop, the asteroid at the right edge of the window behind the two plates.", page: "https://commons.wikimedia.org/wiki/File:162173_Ryugu.png", dl: "https://upload.wikimedia.org/wikipedia/commons/5/5b/162173_Ryugu.png",
      notes: ["The ISAS data policy (https://darts.isas.jaxa.jp/doi/hyb2/hyb2-00200.html) lets these data be copied and modified; it asks for the credit ISAS/JAXA and a description of any modification, given here and in the footer. The JAXA site policy for press images does not apply to this file.", "Ryugu is a comparison body for the site’s Orgueil work, not its sample and not Orgueil’s parent body."] },
    N09: { subject: "NIRCam image of the “Cosmic Cliffs” in the Carina Nebula (candidate N09).", used: "Origins (origins-study.html): the page backdrop, the ridge of the cliffs across the foot of the sheet’s rise.", page: "https://esawebb.org/images/weic2205a/", dl: "https://cdn.esawebb.org/archives/images/large/weic2205a.jpg" },
    C04: { subject: "Comet NEOWISE on 14 July 2020 (aligned to comet) (candidate C04).", used: "Research Log (research-log.html): the page backdrop, the head at the left edge of the window and the tails rising behind the opening.", page: "https://commons.wikimedia.org/wiki/File:Comet_2020_F3_(NEOWISE)_on_Jul_14_2020_aligned_to_comet.jpg", dl: "https://upload.wikimedia.org/wikipedia/commons/9/92/Comet_2020_F3_%28NEOWISE%29_on_Jul_14_2020_aligned_to_comet.jpg" },
    H03: { subject: "E. L. Trouvelot, The Great Nebula in Orion (Plate XV, published 1881–82) (candidate H03).", used: "Paper Shelf (paper-shelf.html): the page backdrop, the nebula in the upper right of the window beside the frontispiece plate.", page: "https://commons.wikimedia.org/wiki/File:Trouvelot-_The_great_nebula_in_Orion_-_1875.jpg", dl: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Trouvelot-_The_great_nebula_in_Orion_-_1875.jpg",
      notes: ["A drawing, not data. Public domain (PD-Art, PD-old-100); the credit is a courtesy."] },
    H02: { subject: "E. L. Trouvelot, Part of the Milky Way (Plate XIII, published 1881–82) (candidate H02).", used: "CV (cv.html): the page backdrop, the band of the Milky Way down the right edge of the window.", page: "https://commons.wikimedia.org/wiki/File:Trouvelot_-_Part_of_the_Milky_Way.jpg", dl: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Trouvelot_-_Part_of_the_Milky_Way.jpg",
      notes: ["A drawing, not data. Public domain (the author died in 1895); the credit is a courtesy."] },
    N03: { subject: "The Milky Way panorama (candidate N03).", used: "Photography (photography.html): the page backdrop, the band of the Milky Way across the upper right of the window.", page: "https://www.eso.org/public/images/eso0932a/", dl: "https://cdn.eso.org/images/large/eso0932a.jpg",
      notes: ["ESO withholds only the 800-megapixel original; this 6000 × 3000 version is CC BY 4.0."] },
    C08: { subject: "Comet 12P/Pons-Brooks, 6 April 2024 (candidate C08).", used: "Contact (contact.html): the page backdrop, the head in the upper right of the window and the tail rising past the orrery.", page: "https://commons.wikimedia.org/wiki/File:12P_Pons-Brooks_(53635474808).jpg", dl: "https://upload.wikimedia.org/wikipedia/commons/1/1d/12P_Pons-Brooks_%2853635474808%29.jpg" },
    N06: { subject: "Barnard 68, the dark cloud (candidate N06).", used: "404 (404.html): the page backdrop, the starless cloud behind the opening words and the stars around it.", page: "https://www.eso.org/public/images/eso9924a/", dl: "https://cdn.eso.org/images/large/eso9924a.jpg" },
    H04: { subject: "E. L. Trouvelot, The November Meteors (Plate XII, published 1881–82) (candidate H04).", used: "The protected Research Log (research-graduation.html), while it is locked: the page backdrop, the radiant at the top right of the window.", page: "https://commons.wikimedia.org/wiki/File:Trouvelot-_The_November_meteors._-_1868.jpg", dl: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Trouvelot-_The_November_meteors._-_1868.jpg",
      notes: ["A drawing, not data. Public domain (PD-Art, PD-old-100); the credit is a courtesy."] }
  }
};

// The Home opening prints (public/assets/img/opening/), from C03. Each painted print always covers the window, so
// Chromium treats it as a background and never reports it as the Largest Contentful Paint: the files carry their
// margins and feathers. Wide files: a left margin of 1.0 file height, the crop (x 0 to 78 % of the original, full
// height) with a left feather of 0.2 and a right feather of 0.12 file height, a right margin of 0.3 file height.
// Phone files: the crop x 10 to 62 % in the top 70 % of the file, the sea feathering out from 64 % to 70 %.
// Space: the photograph, toned, with transparent margins (the page's night ground shows through). Light: the sepia ink
// printed onto the Light paper, opaque. The ink and the paper are read from the Light tokens in
// src/styles/folio/00-tokens.css (ink = color-mix(in srgb, --obs-accent 62%, --obs-text)), so a change to those
// tokens only needs this command run again.
export const opening = {
  derived: "2026-11-28",
  id: "C03",
  credit: "S. Deiries/ESO",
  licence: "CC BY 4.0",
  licenceUrl: BY,
  wideCrop: [0, 0.78],
  phoneCrop: [0.10, 0.62],
  inkAccentShare: 0.62,
  inkStrength: 0.6,
  space: [
    { kind: "wide", height: 1000, quality: 70, file: "comet-mcnaught-opening-wide-1000.webp" },
    { kind: "wide", height: 1600, quality: 64, file: "comet-mcnaught-opening-wide-1600.webp" },
    { kind: "phone", height: 1500, quality: 68, file: "comet-mcnaught-opening-phone-1500.webp" }
  ],
  light: [
    { kind: "wide", height: 1000, quality: 72, file: "comet-mcnaught-ink-wide-1000.webp" },
    { kind: "wide", height: 1600, quality: 66, file: "comet-mcnaught-ink-wide-1600.webp" },
    { kind: "phone", height: 1500, quality: 70, file: "comet-mcnaught-ink-phone-1500.webp" }
  ],
  source: { subject: "Comet McNaught over the Pacific Ocean, January 2007 (candidate C03).", page: "https://www.eso.org/public/images/mc_naught34/", dl: "https://cdn.eso.org/images/large/mc_naught34.jpg" }
};

// Context plates (public/assets/img/plates/): small mounted prints with a visible caption and credit, cropped
// (fractions of the auto-oriented original) and re-encoded at 640 and 320 px, with no colour change.
export const plates = {
  derived: "2026-11-27",
  widths: [640, 320],
  jobs: [
    { id: "A05", name: "orgueil-mnhn", crop: [0.055, 0.055, 0.945, 0.865], quality: 78,
      credit: "Eunostos, via Wikimedia Commons", licence: "CC BY-SA 4.0", licenceUrl: BYSA, sa: true, changes: "cropped to the stone (most of the display plate removed); this version CC BY-SA 4.0",
      title: "Météorite Orgueil, exposition Météorites, Muséum national d’Histoire naturelle, Paris", page: "https://commons.wikimedia.org/wiki/File:M%C3%A9t%C3%A9orite_Orgueil,_exposition_M%C3%A9t%C3%A9orites,_Mus%C3%A9um_national_d%27histoire_naturelle_de_Paris.jpg", download: "https://upload.wikimedia.org/wikipedia/commons/c/c7/M%C3%A9t%C3%A9orite_Orgueil%2C_exposition_M%C3%A9t%C3%A9orites%2C_Mus%C3%A9um_national_d%27histoire_naturelle_de_Paris.jpg", where: "Research (research.html): context plate at the foot of the Project scope aside", note: "A museum hand specimen, not the site author’s sample. The caption makes no mineral identification and no claim about dolomite." },
    { id: "N07", name: "hl-tauri-alma", crop: [0.1, 0.1, 0.9, 0.9], quality: 80,
      credit: "ALMA (ESO/NAOJ/NRAO)", licence: "CC BY 4.0", licenceUrl: BY, changes: "cropped to the disc",
      title: "ALMA image of the protoplanetary disc around HL Tauri", page: "https://www.eso.org/public/images/eso1436a/", download: "https://cdn.eso.org/images/large/eso1436a.jpg", where: "Origins (origins-study.html): context plate beside the study introduction", note: "Captioned as an analogue of a young planet-forming disc, not as the early Solar System." },
    { id: "H01", name: "trouvelot-great-comet-1881", crop: [0.575, 0.07, 0.915, 0.775], quality: 78,
      credit: "E. L. Trouvelot; scan University of Michigan Library, via Wikimedia Commons", licence: "public domain", licenceUrl: "", changes: "cropped to the comet (the margin, the caption, the observatory and the trees removed)",
      title: "E. L. Trouvelot, The Great Comet of 1881 (Plate XI, 1881–82)", page: "https://commons.wikimedia.org/wiki/File:Trouvelot_-_The_great_comet_of_1881_-_1881.jpg", download: "https://upload.wikimedia.org/wikipedia/commons/d/d1/Trouvelot_-_The_great_comet_of_1881_-_1881.jpg", where: "Paper Shelf (paper-shelf.html): frontispiece beside the title", note: "A drawing, not data. Public domain (PD-Art); the credit is a courtesy." },
    { id: "C02", name: "comet-hale-bopp", crop: [0, 0, 0.985, 0.985], quality: 78,
      credit: "ESO/E. Slawik", licence: "CC BY 4.0", licenceUrl: BY, changes: "cropped (the white scan edge at the right and bottom removed)",
      title: "Comet Hale-Bopp, 14 March 1997", page: "https://www.eso.org/public/images/phot-mar14-hbs-2/", download: "https://cdn.eso.org/images/large/phot-mar14-hbs-2.jpg", where: "404 (404.html): context plate beside the archive index" }
  ]
};
