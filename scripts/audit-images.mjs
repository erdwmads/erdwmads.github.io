import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageDir = path.join(root, "public/assets/img");
const docsDir = path.join(root, "docs");
const outputPath = path.join(docsDir, "image-inventory.md");
const requireFromRoot = createRequire(path.join(root, "package.json"));
const sharp = createRequire(requireFromRoot.resolve("astro/package.json"))("sharp");

// Public Mission Log images are display derivatives; instrument and camera originals stay in the private backup.
const missionDir = path.join(imageDir, "mission-log");
const MISSION_MAX_EDGE = 2400;
const MISSION_MAX_BYTES = 1.5 * 1024 * 1024;
const PANORAMA_RATIO = 2.3;

// Every Mission Log display image needs a thumbnail; count the sources the same
// way generate-image-derivatives.mjs does so new entries do not stale this check.
const missionSourceCount = fs.readdirSync(missionDir)
  .filter((name) => /^grad-log-.*\.jpg$/i.test(name)).length;
// Photography srcset tiers: every photograph at 640w and 960w, panoramas also at 1600w.
const photoSources = Array.from({ length: 21 }, (_, index) => path.join(imageDir, `photo (${index + 1}).jpg`));
const panoramaCount = (await Promise.all(photoSources.map(async (source) => {
  const { width, height, orientation = 1 } = await sharp(source).metadata();
  return (orientation >= 5 ? height / width : width / height) > PANORAMA_RATIO;
}))).filter(Boolean).length;
const derivativeTargets = [
  { label: "Photography 480w", dir: path.join(imageDir, "thumbs", "photography"), expected: photoSources.length },
  { label: "Photography 640w", dir: path.join(imageDir, "photography", "w640"), expected: photoSources.length },
  { label: "Photography 960w", dir: path.join(imageDir, "photography", "w960"), expected: photoSources.length },
  { label: "Photography 1600w", dir: path.join(imageDir, "photography", "w1600"), expected: panoramaCount },
  { label: "Mission Log", dir: path.join(imageDir, "thumbs", "mission-log"), expected: missionSourceCount }
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

for (const target of derivativeTargets) {
  const count = fs.existsSync(target.dir)
    ? walk(target.dir).filter((file) => file.endsWith(".webp")).length
    : 0;
  if (count !== target.expected) {
    throw new Error(`${target.label}: expected ${target.expected} WebP derivatives, found ${count}; run npm run images:derive`);
  }
}

const missionProblems = [];
for (const name of fs.readdirSync(missionDir).sort()) {
  const file = path.join(missionDir, name);
  const bytes = fs.statSync(file).size;
  const { width, height, exif, xmp } = await sharp(file).metadata();
  const problems = [
    Math.max(width, height) > MISSION_MAX_EDGE && `${width}x${height} px`,
    bytes > MISSION_MAX_BYTES && formatBytes(bytes),
    exif && "EXIF",
    xmp && "XMP"
  ].filter(Boolean);
  if (problems.length) missionProblems.push(`${name} (${problems.join(", ")})`);
}
if (missionProblems.length) {
  throw new Error(`Mission Log images must be display derivatives (at most ${MISSION_MAX_EDGE} px on the long edge and ${formatBytes(MISSION_MAX_BYTES)}, EXIF/XMP stripped); back up the original to 事前準備 and replace: ${missionProblems.join("; ")}`);
}

// Scene posters (scripts/capture-scene-posters.mjs): every 3D viewer at 1600 px, at most 140 KB, and at 640 px, at
// most 60 KB (spec §7.2, WP4 phase B).
const posterDir = path.join(imageDir, "posters");
const posterViewers = ["missions", "planetary", "origins"];
const posterLimits = [[1600, 140 * 1024], [640, 60 * 1024]];
const posterProblems = [];
for (const name of posterViewers) {
  for (const [width, limit] of posterLimits) {
    const file = path.join(posterDir, `${name}-${width}.webp`);
    if (!fs.existsSync(file)) { posterProblems.push(`${name}-${width}.webp is missing`); continue; }
    const bytes = fs.statSync(file).size;
    const metadata = await sharp(file).metadata();
    const problems = [
      metadata.format !== "webp" && metadata.format,
      metadata.width !== width && `${metadata.width} px wide`,
      bytes > limit && formatBytes(bytes)
    ].filter(Boolean);
    if (problems.length) posterProblems.push(`${name}-${width}.webp (${problems.join(", ")})`);
  }
}
if (posterProblems.length) {
  throw new Error(`Scene posters must be WebP at 1600 px (at most 140 KB) and 640 px (at most 60 KB); rebuild and run node scripts/capture-scene-posters.mjs: ${posterProblems.join("; ")}`);
}

// Page backdrops and context plates: the files derived from the owner-approved public images, each at its two widths,
// WebP, within its budget and named in its folder's PROVENANCE.md (source page, licence, placement, toning). Each page's
// backdrop (2026-11-28, components/backdrop.css) is a greyscale luminance mask, a 1600 x 1000 composition for windows
// and an upright 800 x 1600 one for phones (Bennu, on Research, keeps its own files); context plates (2026-11-27) are
// prints (components/plate.css).
const imageryBudgets = { backdrops: { 1600: 40 * 1024, 800: 35 * 1024 }, plates: { 640: 100 * 1024, 320: 40 * 1024 } };
const imageryHeights = { backdrops: { 1600: 1000, 800: 1600 } };
const imagery = [
  { dir: "backdrops", name: "comet-west-mask", page: "Home (behind the sheet)", subject: "Comet West, March 1976, P. Stättmayer/ESO", source: "https://www.eso.org/public/images/c-west-mar1976-ps/", licence: "CC BY 4.0" },
  { dir: "backdrops", name: "asteroid-ryugu-mask", page: "Ryugu & Bennu", subject: "Asteroid 162173 Ryugu, Hayabusa2 ONC-T, 11 September 2018, ISAS/JAXA; image processed by Anonymsiy, via Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:162173_Ryugu.png", licence: "CC BY 4.0" },
  { dir: "backdrops", name: "cosmic-cliffs-mask", page: "Origins", subject: "The Cosmic Cliffs in the Carina Nebula (NIRCam), NASA, ESA, CSA, and STScI", source: "https://esawebb.org/images/weic2205a/", licence: "CC BY 4.0" },
  { dir: "backdrops", name: "comet-neowise-mask", page: "Research Log", subject: "Comet NEOWISE, 14 July 2020, SimgDe (simg.de), via Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:Comet_2020_F3_(NEOWISE)_on_Jul_14_2020_aligned_to_comet.jpg", licence: "CC BY-SA 4.0; the derived files are CC BY-SA 4.0" },
  { dir: "backdrops", name: "trouvelot-orion-nebula-mask", page: "Paper Shelf", subject: "E. L. Trouvelot, The Great Nebula in Orion (1881–82), from The New York Public Library, via Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:Trouvelot-_The_great_nebula_in_Orion_-_1875.jpg", licence: "public domain" },
  { dir: "backdrops", name: "trouvelot-milky-way-mask", page: "CV", subject: "E. L. Trouvelot, Part of the Milky Way (1881–82), from The New York Public Library, via Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:Trouvelot_-_Part_of_the_Milky_Way.jpg", licence: "public domain" },
  { dir: "backdrops", name: "milky-way-panorama-mask", page: "Photography", subject: "The Milky Way panorama, ESO/S. Brunier", source: "https://www.eso.org/public/images/eso0932a/", licence: "CC BY 4.0" },
  { dir: "backdrops", name: "comet-pons-brooks-mask", page: "Contact", subject: "Comet 12P/Pons-Brooks, 6 April 2024, Don Heffernan, via Flickr and Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:12P_Pons-Brooks_(53635474808).jpg", licence: "CC BY 2.0" },
  { dir: "backdrops", name: "dark-cloud-b68-mask", page: "404", subject: "Barnard 68, the dark cloud, ESO", source: "https://www.eso.org/public/images/eso9924a/", licence: "CC BY 4.0" },
  { dir: "backdrops", name: "trouvelot-november-meteors-mask", page: "Research Log, protected (locked)", subject: "E. L. Trouvelot, The November Meteors (1881–82), from The New York Public Library, via Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:Trouvelot-_The_November_meteors._-_1868.jpg", licence: "public domain" },
  { dir: "plates", name: "orgueil-mnhn", page: "Research", subject: "The Orgueil meteorite, Muséum national d’Histoire naturelle, Paris, Eunostos, via Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:M%C3%A9t%C3%A9orite_Orgueil,_exposition_M%C3%A9t%C3%A9orites,_Mus%C3%A9um_national_d%27histoire_naturelle_de_Paris.jpg", licence: "CC BY-SA 4.0; the derived files are CC BY-SA 4.0" },
  { dir: "plates", name: "hl-tauri-alma", page: "Origins", subject: "The protoplanetary disc around HL Tauri, ALMA (ESO/NAOJ/NRAO)", source: "https://www.eso.org/public/images/eso1436a/", licence: "CC BY 4.0" },
  { dir: "plates", name: "trouvelot-great-comet-1881", page: "Paper Shelf", subject: "E. L. Trouvelot, The Great Comet of 1881 (1881–82), scan University of Michigan Library, via Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:Trouvelot_-_The_great_comet_of_1881_-_1881.jpg", licence: "public domain" },
  { dir: "plates", name: "comet-hale-bopp", page: "404", subject: "Comet Hale-Bopp, 14 March 1997, ESO/E. Slawik", source: "https://www.eso.org/public/images/phot-mar14-hbs-2/", licence: "CC BY 4.0" }
];
const imageryFile = (item, width) => `${item.name}-${width}.webp`;
const imageryProblems = [];
for (const dir of Object.keys(imageryBudgets)) {
  const folder = path.join(imageDir, dir);
  const provenance = path.join(folder, "PROVENANCE.md");
  const record = fs.existsSync(provenance) ? fs.readFileSync(provenance, "utf8") : "";
  if (!record) imageryProblems.push(`${dir}/PROVENANCE.md is missing`);
  const widths = Object.keys(imageryBudgets[dir]).map(Number);
  const expected = new Set(imagery.filter((item) => item.dir === dir).flatMap((item) => widths.map((width) => imageryFile(item, width))));
  for (const name of fs.existsSync(folder) ? fs.readdirSync(folder) : []) {
    if (name !== "PROVENANCE.md" && !expected.has(name)) imageryProblems.push(`${dir}/${name} is not a listed derivative`);
  }
  for (const name of expected) {
    const file = path.join(folder, name);
    if (!fs.existsSync(file)) { imageryProblems.push(`${dir}/${name} is missing`); continue; }
    const width = Number(name.match(/-(\d+)\.webp$/)[1]);
    const bytes = fs.statSync(file).size;
    const metadata = await sharp(file).metadata();
    const problems = [
      metadata.format !== "webp" && metadata.format,
      metadata.width !== width && `${metadata.width} px wide`,
      imageryHeights[dir] && metadata.height !== imageryHeights[dir][width] && `${metadata.height} px tall`,
      bytes > imageryBudgets[dir][width] && `${formatBytes(bytes)}, over ${formatBytes(imageryBudgets[dir][width])}`,
      record && !record.includes(name) && "not in PROVENANCE.md"
    ].filter(Boolean);
    if (problems.length) imageryProblems.push(`${dir}/${name} (${problems.join(", ")})`);
  }
}
if (imageryProblems.length) {
  throw new Error(`Page backdrops and context plates must be the listed WebP derivatives, within budget and recorded in PROVENANCE.md: ${imageryProblems.join("; ")}`);
}

// The Home opening's plate (2026-11-28, pages/home-opening.css): Comet McNaught as a Space print (transparent margins)
// and a Light print (sepia ink on the paper), each wide at 1000 and 1600 px tall and for phones at 1500 px tall; the
// number in the name is the height. WebP, within budget, named in opening/PROVENANCE.md, nothing else in the folder.
const openingBudgets = { "wide-1000": 45 * 1024, "wide-1600": 95 * 1024, "phone-1500": 35 * 1024 };
const openingFiles = ["comet-mcnaught-opening", "comet-mcnaught-ink"].flatMap((name) => Object.keys(openingBudgets).map((tier) => ({ name: `${name}-${tier}.webp`, tier })));
const openingDir = path.join(imageDir, "opening");
const openingRecord = fs.existsSync(path.join(openingDir, "PROVENANCE.md")) ? fs.readFileSync(path.join(openingDir, "PROVENANCE.md"), "utf8") : "";
const openingProblems = openingRecord ? [] : ["opening/PROVENANCE.md is missing"];
for (const name of fs.existsSync(openingDir) ? fs.readdirSync(openingDir) : []) {
  if (name !== "PROVENANCE.md" && !openingFiles.some((file) => file.name === name)) openingProblems.push(`opening/${name} is not a listed print`);
}
for (const { name, tier } of openingFiles) {
  const file = path.join(openingDir, name);
  if (!fs.existsSync(file)) { openingProblems.push(`opening/${name} is missing`); continue; }
  const bytes = fs.statSync(file).size;
  const metadata = await sharp(file).metadata();
  const problems = [
    metadata.format !== "webp" && metadata.format,
    metadata.height !== Number(tier.split("-")[1]) && `${metadata.height} px tall`,
    bytes > openingBudgets[tier] && `${formatBytes(bytes)}, over ${formatBytes(openingBudgets[tier])}`,
    openingRecord && !openingRecord.includes(name) && "not in PROVENANCE.md"
  ].filter(Boolean);
  if (problems.length) openingProblems.push(`opening/${name} (${problems.join(", ")})`);
}
if (openingProblems.length) {
  throw new Error(`The Home opening prints must be the listed WebP files, within budget and recorded in PROVENANCE.md: ${openingProblems.join("; ")}`);
}

// Share cards (2026-11-28, src/data/share-cards.json, made by scripts/derive-imagery.mjs share): one JPEG per page at
// 1200 x 630 (Open Graph allows no WebP for og:image), at most 120 KB, named in share/PROVENANCE.md, nothing else there.
const SHARE_MAX_BYTES = 120 * 1024;
const shareConfig = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "share-cards.json"), "utf8"));
const shareFiles = Object.values(shareConfig.cards).map((card) => card.file);
const shareDir = path.join(imageDir, "share");
const shareRecord = fs.existsSync(path.join(shareDir, "PROVENANCE.md")) ? fs.readFileSync(path.join(shareDir, "PROVENANCE.md"), "utf8") : "";
const shareProblems = shareRecord ? [] : ["share/PROVENANCE.md is missing"];
for (const name of fs.existsSync(shareDir) ? fs.readdirSync(shareDir) : []) {
  if (name !== "PROVENANCE.md" && !shareFiles.includes(name)) shareProblems.push(`share/${name} is not a listed card`);
}
for (const name of shareFiles) {
  const file = path.join(shareDir, name);
  if (!fs.existsSync(file)) { shareProblems.push(`share/${name} is missing`); continue; }
  const bytes = fs.statSync(file).size;
  const metadata = await sharp(file).metadata();
  const problems = [
    metadata.format !== "jpeg" && metadata.format,
    (metadata.width !== 1200 || metadata.height !== 630) && `${metadata.width} x ${metadata.height}`,
    bytes > SHARE_MAX_BYTES && `${formatBytes(bytes)}, over ${formatBytes(SHARE_MAX_BYTES)}`,
    shareRecord && !shareRecord.includes(name) && "not in PROVENANCE.md"
  ].filter(Boolean);
  if (problems.length) shareProblems.push(`share/${name} (${problems.join(", ")})`);
}
if (shareProblems.length) {
  throw new Error(`The share cards must be the listed 1200 x 630 JPEG files, within budget and recorded in PROVENANCE.md: ${shareProblems.join("; ")}`);
}

const imageFiles = walk(imageDir)
  .filter((file) => /\.(png|jpe?g|webp|svg|ico)$/i.test(file))
  .map((file) => {
    const rel = path.relative(path.join(root, "public"), file).replace(/\\/g, "/");
    const bytes = fs.statSync(file).size;
    return { rel, bytes };
  })
  .sort((a, b) => b.bytes - a.bytes);

const largeImages = imageFiles.filter((image) => image.bytes >= 1024 * 1024);
const totalBytes = imageFiles.reduce((sum, image) => sum + image.bytes, 0);
const missionCount = fs.readdirSync(missionDir).length;

const lines = [
  "# Image Inventory",
  "",
  "Generated by `npm run audit:images`.",
  "",
  `Total images: ${imageFiles.length}`,
  `Total image weight: ${formatBytes(totalBytes)}`,
  `Images over 1 MB: ${largeImages.length}`,
  `Mission Log display images: ${missionCount}, all within ${MISSION_MAX_EDGE} px, ${formatBytes(MISSION_MAX_BYTES)} and no EXIF/XMP`,
  `Scene posters: ${posterViewers.length * posterLimits.length}, each 3D viewer at 1600 px (at most 140 KB) and 640 px (at most 60 KB)`,
  `Page backdrops and context plates: ${imagery.length} public images, ${imagery.length * 2} WebP files (backdrop masks at 1600 and 800 px, at most 40 and 35 KB; plates at 640 and 320 px, at most 100 and 40 KB)`,
  `Home opening prints: ${openingFiles.length} WebP files of Comet McNaught (Space and Light, wide at 1000 and 1600 px tall, at most 45 and 95 KB; phone at 1500 px tall, at most 35 KB)`,
  `Share cards: ${shareFiles.length} JPEG files at 1200 x 630, one per page, each at most ${formatBytes(SHARE_MAX_BYTES)}`,
  "",
  "## Largest Images",
  "",
  "| File | Size |",
  "| --- | ---: |",
  ...imageFiles.slice(0, 20).map((image) => `| \`${image.rel}\` | ${formatBytes(image.bytes)} |`),
  "",
  "## Optimization Policy",
  "",
  `- New Mission Log images publish display derivatives in \`public/assets/img/mission-log/\`: auto-oriented sRGB JPEG, at most ${MISSION_MAX_EDGE} px on the long edge and ${formatBytes(MISSION_MAX_BYTES)}, EXIF/XMP stripped. This audit fails otherwise.`,
  "- Instrument and camera originals live in `C:\\Users\\tsuku\\Desktop\\Grad Research\\Orgueil Grad Data\\事前準備` as `orgueil-mission-log-YYYYMMDD-figNN.jpg`; back up the original there before publishing its derivative.",
  "- Keep Photography originals and other original files in `public/assets/img/` unless the owner explicitly approves destructive replacement; page display uses generated derivatives (`npm run images:derive`, `npm run images:backgrounds -- --only <file>` for the Bennu backdrop and the band, and `npm run images:imagery` for the pictures derived from originals kept outside the repository).",
  "- The Bennu backdrop and the header band (`asteroid-bennu*`, `Solar_System_true_color*`) are restored from commit 2f20d7e; Bennu is a NASA/Goddard/University of Arizona photograph, since 2026-11-28 the Research page's backdrop only; the Solar System montage is \"Solar System true color\" by CactiStaccingCrane (Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Solar_System_true_color.jpg), CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/), cropped and toned, on every page. Both are credited in the footer colophon (`src/data/colophon.ts`).",
  "- Page backdrops (`public/assets/img/backdrops/*-mask-*.webp`, one picture per page since 2026-11-28) and context plates (`public/assets/img/plates/`) are derived from public images the owner approved on 2026-11-26 and 2026-11-28; only the WebP derivatives are published, the originals stay outside the repository; `npm run images:imagery -- backdrops|plates --originals <folder>` (`scripts/derive-imagery.mjs`) makes them again and `npm run images:verify` checks that it reproduces the committed files. Each folder's `PROVENANCE.md` records the source page, licence, placement or crop, toning and checksum, and each file carries its credit and licence in EXIF. The share-alike files (the NEOWISE mask and the Orgueil plate) are released under CC BY-SA 4.0. Each page's footer credits the pictures on that page (`src/data/colophon.ts`), the plates also in their captions. The far plates of 2026-11-27 were merged into the backdrops; the Tsuchinshan-ATLAS picture was retired.",
  "- The Home opening prints (`public/assets/img/opening/`, 2026-11-28) are derived from the Comet McNaught original (S. Deiries/ESO, CC BY 4.0; Home’s backdrop behind the sheet is Comet West since 2026-11-28): a Space print with transparent margins and a Light print in sepia ink on the paper, sized so the painted picture always covers the window (never the LCP). They load after the page (`html.backdrop-ready`) and are never preloaded. `opening/PROVENANCE.md` records the crop, toning and checksum; the opening and the footer carry the credit. The Light ink comes from the Light tokens: after a change to them, run `npm run images:imagery -- opening --originals <folder>`.",
  "- The share cards (`public/assets/img/share/`, 2026-11-28) are the pages' Open Graph and Twitter images: each page's own picture in the Space colours with the name, the page's public title and the picture's credit, made from the committed pictures by `npm run images:imagery -- share` (list, titles and alt texts in `src/data/share-cards.json`). The NEOWISE card keeps CC BY-SA 4.0.",
  "- Mission Log images should keep `loading=\"lazy\"` and `decoding=\"async\"`.",
  "- Scene posters in `public/assets/img/posters/` are stills of the site's own 3D scenes, made by `node scripts/capture-scene-posters.mjs` after a build (provenance and hashes in `posters/PROVENANCE.md`). Recapture them when a scene's first frame or its stage size changes.",
  "- Before replacing public or Mission Log images, run `npm run check`."
];

lines.push(
  "",
  "## Page Backdrops and Context Plates",
  "",
  "| Files | Page | Image | Source | Licence |",
  "| --- | --- | --- | --- | --- |",
  ...imagery.map((item) => `| ${Object.keys(imageryBudgets[item.dir]).map((width) => "`" + item.dir + "/" + imageryFile(item, width) + "`").join(", ")} | ${item.page} | ${item.subject} | ${item.source} | ${item.licence} |`),
  `| ${openingFiles.map((file) => "`opening/" + file.name + "`").join(", ")} | Home (the opening) | Comet McNaught, January 2007, S. Deiries/ESO | https://www.eso.org/public/images/mc_naught34/ | CC BY 4.0 |`
);

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);

console.log(`Wrote ${path.relative(root, outputPath)} with ${imageFiles.length} images.`);
