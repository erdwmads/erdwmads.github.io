// Derives the site's toned pictures from the owner-approved originals, which stay outside the repository, and writes
// each folder's PROVENANCE.md with every parameter, the original's checksum and the output sizes:
//   backdrops  the page backdrop masks (public/assets/img/backdrops/, components/backdrop.css)
//   opening    the Home opening prints, Space and Light (public/assets/img/opening/, pages/home-opening.css)
//   plates     the context plates (public/assets/img/plates/, Figure.astro)
//   share      the share cards, from the committed backdrops and opening prints (no originals needed)
//   all        the four above
//   verify     derives everything into a temporary folder and compares it with the committed files
// The parameters live in scripts/lib/imagery-jobs.mjs and the share-card list in src/data/share-cards.json.
//
//   node scripts/derive-imagery.mjs <command> [--originals <dir>[;<dir>...]] [--out <dir>] [--only <name,...>] [--keep]
//
// --originals (or the IMAGERY_ORIGINALS environment variable): the folders that hold the original files, separated by
// the platform's path delimiter (";" on Windows) or given as repeated flags. Each original is found by its file name
// and refused unless its SHA-256 matches imagery-jobs.mjs. --out writes into <dir>/backdrops, <dir>/opening,
// <dir>/plates and <dir>/share instead of public/assets/img. --only limits backdrops to the named pictures (then
// PROVENANCE.md is not rewritten). --keep leaves verify's temporary folder in place.
// Encoding is deterministic: with the same sharp (package-lock.json) the files come out byte for byte the same.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { backdrops, opening, originals, plates } from "./lib/imagery-jobs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageRoot = path.join(root, "public", "assets", "img");
const requireFromRoot = createRequire(path.join(root, "package.json"));
const requireFromAstro = createRequire(requireFromRoot.resolve("astro/package.json"));
const sharp = requireFromAstro("sharp");
// No operation cache: on Windows it keeps the files it read open, and verify could not remove its temporary folder.
sharp.cache(false);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const madeBy = (command) => `Made by \`npm run images:imagery -- ${command} --originals <folder>\` (\`scripts/derive-imagery.mjs\`), with every parameter in \`scripts/lib/imagery-jobs.mjs\`; \`npm run images:verify\` derives the files again and compares them with these.`;

function parseArgs(argv) {
  const args = { command: argv[0], originals: [], out: imageRoot, only: null, keep: false };
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--originals") args.originals.push(...argv[++i].split(path.delimiter));
    else if (flag === "--out") args.out = path.resolve(argv[++i]);
    else if (flag === "--only") args.only = argv[++i].split(",");
    else if (flag === "--keep") args.keep = true;
    else throw new Error(`unknown option ${flag}`);
  }
  if (!args.originals.length && process.env.IMAGERY_ORIGINALS) args.originals.push(...process.env.IMAGERY_ORIGINALS.split(path.delimiter));
  args.originals = args.originals.filter(Boolean);
  return args;
}

// The original for a candidate number: found by name in the given folders, refused if its checksum differs.
function originalFile(id, dirs) {
  const { file, sha256: expected } = originals[id];
  if (!dirs.length) throw new Error(`no originals folder: pass --originals <dir> or set IMAGERY_ORIGINALS (needs ${file})`);
  const found = dirs.map((dir) => path.join(dir, file)).find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`${file} (candidate ${id}) is in none of: ${dirs.join(", ")}`);
  const actual = sha256(found);
  if (actual !== expected) throw new Error(`${found}: SHA-256 ${actual}, expected ${expected} (scripts/lib/imagery-jobs.mjs)`);
  return found;
}

function exifFor(job, what) {
  return { IFD0: {
    Artist: job.credit,
    Copyright: job.licenceUrl ? `${job.licence} (${job.licenceUrl})${job.sa ? "; this derived version is released under CC BY-SA 4.0" : ""}` : job.licence,
    ImageDescription: `${what} derived for erdwmads.github.io: ${job.changes}`
  } };
}

// ---------------------------------------------------------------------------------------------------------------
// Page backdrops

async function renderBackdrop(job, oriented, meta, spec, [CW, CH]) {
  const tone = spec.tone ?? job.tone;
  const scale = spec.w / meta.width;
  const H = Math.round(meta.height * scale);
  const ox = spec.to[0] - spec.from[0] * spec.w, oy = spec.to[1] - spec.from[1] * H;
  // The crop window in canvas pixels, clipped to the canvas.
  const [cx0, cy0, cx1, cy1] = spec.crop;
  const L = Math.max(0, Math.round(ox + cx0 * spec.w)), T = Math.max(0, Math.round(oy + cy0 * H));
  const R = Math.min(CW, Math.round(ox + cx1 * spec.w)), B = Math.min(CH, Math.round(oy + cy1 * H));
  if (R <= L || B <= T) throw new Error(`${job.name}: crop misses the canvas`);
  // The matching region of the original, resized to exactly (R - L) x (B - T).
  const sx = Math.max(0, Math.round((L - ox) / scale)), sy = Math.max(0, Math.round((T - oy) / scale));
  const sw = Math.min(meta.width - sx, Math.round((R - L) / scale)), sh = Math.min(meta.height - sy, Math.round((B - T) / scale));
  let { data, info } = await sharp(oriented).extract({ left: sx, top: sy, width: sw, height: sh }).resize(R - L, B - T, { fit: "fill" }).greyscale().raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) data = await sharp(data, { raw: info }).extractChannel(0).raw().toBuffer();
  const w = R - L, h = B - T;
  if (tone.stars !== undefined) {
    const diffuse = await sharp(data, { raw: { width: w, height: h, channels: 1 } }).median(9).extractChannel(0).raw().toBuffer();
    for (let i = 0; i < data.length; i++) data[i] = Math.round(diffuse[i] + tone.stars * Math.max(0, data[i] - diffuse[i]));
  }
  if (tone.median) {
    const med = await sharp(data, { raw: { width: w, height: h, channels: 1 } }).median(5).extractChannel(0).raw().toBuffer();
    for (let i = 0; i < data.length; i++) data[i] = Math.round(data[i] * (1 - tone.median) + med[i] * tone.median);
  }
  const hist = new Uint32Array(256); for (const v of data) hist[v]++;
  const pct = (p) => { let acc = 0; const n = data.length * p; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n) return i; } return 255; };
  const b = tone.blackAbs ?? pct(tone.black), wp = Math.max(b + 1, tone.whiteAbs ?? pct(tone.white));
  const lut = new Float32Array(256); for (let i = 0; i < 256; i++) { const t = Math.min(1, Math.max(0, (i - b) / (wp - b))); lut[i] = Math.pow(t, tone.gamma); }
  // Feathers at the crop edges that fall inside the canvas.
  const f = spec.feather;
  const innerL = L > 0, innerT = T > 0, innerR = R < CW, innerB = B < CH;
  const canvas = Buffer.alloc(CW * CH);
  for (let y = 0; y < h; y++) {
    const ey = Math.min(innerT ? y / f : 1, innerB ? (h - 1 - y) / f : 1, 1);
    for (let x = 0; x < w; x++) {
      const ex = Math.min(innerL ? x / f : 1, innerR ? (w - 1 - x) / f : 1, 1);
      const fl = spec.fadeLeft ? Math.min(1, Math.max(0, (L + x - spec.fadeLeft[0]) / (spec.fadeLeft[1] - spec.fadeLeft[0]))) : 1;
      const e = Math.max(0, Math.min(ex, ey, fl)); const s = e * e * (3 - 2 * e);
      canvas[(T + y) * CW + (L + x)] = Math.round(255 * lut[data[y * w + x]] * s);
    }
  }
  return { canvas, black: b, white: wp, scale: +scale.toFixed(5), window: [L, T, R, B] };
}

async function deriveBackdrops(args) {
  const out = path.join(args.out, "backdrops");
  fs.mkdirSync(out, { recursive: true });
  const records = [];
  for (const job of backdrops.jobs.filter((item) => !args.only || args.only.includes(item.name))) {
    const file = originalFile(job.id, args.originals);
    // The intermediate re-encode of the auto-oriented original is part of the recorded pipeline: keep it, or the
    // files no longer reproduce.
    const oriented = await sharp(file).rotate().toBuffer();
    const meta = await sharp(oriented).metadata();
    const outputs = [];
    for (const [kind, width] of [["wide", 1600], ["phone", 800]]) {
      const size = backdrops.canvases[kind], quality = backdrops.quality[kind];
      const r = await renderBackdrop(job, oriented, meta, job[kind], size);
      const target = path.join(out, `${job.name}-mask-${width}.webp`);
      await sharp(r.canvas, { raw: { width: size[0], height: size[1], channels: 1 } }).webp({ quality, effort: 6 }).withExif(exifFor(job, "Greyscale luminance mask (page backdrop)")).toFile(target);
      const m = await sharp(target).metadata();
      outputs.push({ kind, file: path.basename(target), width: m.width, height: m.height, bytes: fs.statSync(target).size, quality, ...r });
    }
    records.push({ job, sourceSize: `${meta.width}x${meta.height}`, sourceBytes: fs.statSync(file).size, sourceSha256: originals[job.id].sha256, outputs });
    console.log(`${job.id} ${outputs.map((o) => `${o.file} ${o.width}x${o.height} ${kb(o.bytes)}`).join(" | ")}`);
  }
  if (args.only) console.log("--only: backdrops/PROVENANCE.md left as it is");
  else fs.writeFileSync(path.join(out, "PROVENANCE.md"), backdropProvenance(records));
}

function backdropProvenance(records) {
  const f3 = (n) => n.toFixed(3);
  const lines = ["# Page backdrops", ""];
  lines.push(`Derived ${backdrops.derived} from the owner-approved originals (the backdrops stage: one picture per page, owner decision of 2026-11-28). Each file is a greyscale luminance mask for its page’s backdrop (\`body::before\` in \`src/styles/folio/components/backdrop.css\`), never shown as a photograph on its own: the page fills it with its own ink (\`--obs-far-ink\`), pale light in Space and sepia ink on the Light paper. The \`-1600\` file is a 1600 × 1000 composition for windows wider than 760 px; the \`-800\` file is an upright 800 × 1600 composition for phones. Credits: the footer of the page that shows the picture (\`src/data/colophon.ts\`). No file here is the site author’s data.`, "");
  lines.push(madeBy("backdrops"), "");
  lines.push("The Research page keeps the Bennu photograph (`public/assets/img/asteroid-bennu-1280.webp` and `-800.webp`, NASA/Goddard/University of Arizona, made by `scripts/generate-site-backgrounds.mjs`), now drawn as a mask in the same way.", "");
  lines.push("Placement: the original (auto-oriented) is scaled to a width in canvas pixels; one point of it (fractions of the original) lands on one canvas point; only the crop window of the original is used and the rest of the canvas is black; a crop edge inside the canvas is feathered. Toning, measured on the visible crop: greyscale, black point and white point (percentiles of the crop, or absolute levels), then a power curve.", "");
  for (const { job, sourceSize, sourceBytes, sourceSha256, outputs } of records) {
    const m = backdrops.sources[job.id];
    const [wide, phone] = outputs;
    lines.push(`## ${wide.file}, ${phone.file}`, "");
    lines.push(`- Subject: ${m.subject}`);
    lines.push(`- Used on: ${m.used}`);
    lines.push(`- Source page: ${m.page}`);
    lines.push(`- Download: ${m.dl}`);
    lines.push(`- Credit: ${job.credit}.`);
    lines.push(`- Licence: ${job.licenceUrl ? `${job.licence} (${job.licenceUrl})` : job.licence}.${job.sa ? ` Share-alike: these derived files are released under ${job.licence} (${job.licenceUrl}); the repository licence does not cover them.` : ""}`);
    lines.push(`- Original: ${sourceSize} px, ${sourceBytes.toLocaleString("en-US")} bytes, SHA-256 ${sourceSha256}. Kept outside the repository.`);
    lines.push(`- Changes: ${job.changes}.`);
    for (const o of [wide, phone]) {
      const spec = job[o.kind];
      const tone = spec.tone ?? job.tone;
      const levels = tone.blackAbs !== undefined ? `black point ${tone.blackAbs} and white point ${tone.whiteAbs} (absolute levels)` : `black point at the ${(tone.black * 100).toFixed(1)}th and white point at the ${(tone.white * 100).toFixed(2)}th percentile of the crop (levels ${o.black} and ${o.white})`;
      const extra = [tone.stars !== undefined && `point light kept at ${Math.round(tone.stars * 100)} % above a 9 px median (the diffuse light)`, tone.median && `a 5 px median blended in at ${Math.round(tone.median * 100)} %`, spec.fadeLeft && `faded in from canvas x ${spec.fadeLeft[0]} to ${spec.fadeLeft[1]}`].filter(Boolean);
      lines.push(`- \`${o.file}\` (${o.kind === "wide" ? "windows wider than 760 px" : "phones"}): ${o.width} × ${o.height} px, ${kb(o.bytes)}, WebP quality ${o.quality}. The original at ${spec.w} px wide (scale ${o.scale}), its point (${spec.from.map(f3).join(", ")}) at canvas (${spec.to.join(", ")}); crop ${spec.crop.map(f3).join(", ")} of the original (x0, y0, x1, y1), drawn in canvas x ${o.window[0]}–${o.window[2]}, y ${o.window[1]}–${o.window[3]}, feather ${spec.feather} px. Toning: greyscale, ${levels}, power ${tone.gamma}${extra.length ? "; " + extra.join("; ") : ""}.`);
    }
    lines.push("- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).");
    for (const note of m.notes || []) lines.push(`- Note: ${note}`);
    lines.push("");
  }
  lines.push("## Retired", "");
  lines.push("The far plates of 2026-11-27 (`comet-mcnaught-mask-1920/1280`, `comet-neowise-mask-1920/1280`, `comet-pons-brooks-mask-1920/1280`, `trouvelot-milky-way-mask-1920/1280` and `comet-tsuchinshan-atlas-iss-mask-1920/1280`) were removed on 2026-11-28: each page now carries one backdrop. McNaught, NEOWISE, 12P/Pons-Brooks and Trouvelot’s Milky Way were merged into their pages’ backdrops above. Comet Tsuchinshan-ATLAS from the ISS (NASA, public domain) left the Ryugu & Bennu page, where it would have been a second far picture beside Ryugu, and is no longer published.", "");
  lines.push("Home’s first backdrop of 2026-11-28, `comet-mcnaught-mask-1600` and `-800` (Comet McNaught as the opening’s after-image), was retired the same day: Comet West took Home’s far plane (owner, 2026-11-28), so Home shows two comets, and Comet McNaught prints only the opening (`public/assets/img/opening/`).", "");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------------------------
// Home opening prints

// The Light ink and paper, from the Light block of the design tokens: ink = color-mix(in srgb, accent N%, text).
export function lightInk(tokensCss = fs.readFileSync(path.join(root, "src", "styles", "folio", "00-tokens.css"), "utf8")) {
  const block = tokensCss.match(/:root:where\(\[data-theme="light"\]:not\(\[data-theme-space\]\)\)\s*\{([^}]*)\}/);
  if (!block) throw new Error("00-tokens.css: no Light token block");
  const hex = (name) => {
    const value = (block[1].match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})\\s*;`, "i")) || [])[1];
    if (!value) throw new Error(`00-tokens.css: the Light ${name} is not a #rrggbb colour`);
    return { value: value.toLowerCase(), rgb: [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) };
  };
  const accent = hex("--obs-accent"), text = hex("--obs-text"), paper = hex("--obs-paper");
  const share = opening.inkAccentShare;
  const ink = accent.rgb.map((a, c) => Math.round(a * share + text.rgb[c] * (1 - share)));
  return { accent, text, paper, ink };
}

async function deriveOpening(args) {
  const out = path.join(args.out, "opening");
  fs.mkdirSync(out, { recursive: true });
  const file = originalFile(opening.id, args.originals);
  const { width: W, height: H } = await sharp(file).metadata();
  const { ink: INK, paper, accent, text } = lightInk();
  const PAPER = paper.rgb;
  const exif = (what) => ({ IFD0: { Artist: opening.credit, Copyright: `${opening.licence} (${opening.licenceUrl})`, ImageDescription: `Comet McNaught over the Pacific, January 2007; ${what}` } });
  const spaceExif = exif("cropped, toned, feathered with transparent margins (Home opening, Space print)");
  const lightExif = exif("cropped, sky background subtracted, printed as sepia ink on paper (Home opening, Light print)");
  const written = [];
  const record = async (target) => {
    const m = await sharp(target).metadata();
    written.push({ file: path.basename(target), width: m.width, height: m.height, bytes: fs.statSync(target).size });
    console.log(`${path.basename(target)} ${m.width}x${m.height} ${kb(fs.statSync(target).size)}`);
  };

  // Space: the photograph toned, its margins transparent and its feathers in the alpha channel.
  const photoRGB = (crop, h) => sharp(file).extract({ left: Math.round(crop[0] * W), top: 0, width: Math.round((crop[1] - crop[0]) * W), height: H })
    .resize({ height: h }).linear(0.93, -4).modulate({ saturation: 0.9 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const print of opening.space) {
    const h = print.height, target = path.join(out, print.file);
    let buf, tw;
    if (print.kind === "wide") {
      const p = await photoRGB(opening.wideCrop, h);
      const pw = p.info.width, ml = Math.round(1.0 * h), mr = Math.round(0.3 * h);
      tw = ml + pw + mr;
      const fl = 0.2 * h, fr = 0.12 * h;
      buf = Buffer.alloc(tw * h * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < pw; x++) {
        const a = smooth((x - 0.02 * h) / fl) * smooth((pw - x) / fr);
        const si = (y * pw + x) * 3, di = (y * tw + ml + x) * 4;
        buf[di] = p.data[si]; buf[di + 1] = p.data[si + 1]; buf[di + 2] = p.data[si + 2]; buf[di + 3] = Math.round(a * 255);
      }
    } else {
      const ph = Math.round(h * 0.7);
      const p = await photoRGB(opening.phoneCrop, ph);
      tw = p.info.width;
      buf = Buffer.alloc(tw * h * 4);
      for (let y = 0; y < ph; y++) for (let x = 0; x < tw; x++) {
        const a = 1 - smooth((y / h - 0.64) / 0.06);
        const si = (y * tw + x) * 3, di = (y * tw + x) * 4;
        buf[di] = p.data[si]; buf[di + 1] = p.data[si + 1]; buf[di + 2] = p.data[si + 2]; buf[di + 3] = Math.round(a * 255);
      }
    }
    await sharp(buf, { raw: { width: tw, height: h, channels: 4 } }).withExif(spaceExif).webp({ quality: print.quality, alphaQuality: 60, effort: 6, smartSubsample: true }).toFile(target);
    await record(target);
  }

  // Light: greyscale, the sky background subtracted row by row, levels and a power curve, printed as ink on paper.
  const inkAlpha = async ([x0, x1], h) => {
    const g = await sharp(file).extract({ left: Math.round(x0 * W), top: 0, width: Math.round((x1 - x0) * W), height: H }).resize({ height: h }).greyscale().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = g.info, d = g.data, bg = new Float32Array(height), sm = new Float32Array(height);
    for (let y = 0; y < height; y++) { const row = Array.from(d.subarray(y * width, (y + 1) * width)).sort((a, b) => a - b); bg[y] = row[Math.floor(width * 0.15)]; }
    const R = Math.round(height / 60);
    for (let y = 0; y < height; y++) { let s = 0, n = 0; for (let k = -R; k <= R; k++) { const j = y + k; if (j >= 0 && j < height) { s += bg[j]; n++; } } sm[y] = s / n; }
    const v = new Float32Array(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) v[y * width + x] = Math.max(0, d[y * width + x] - 0.95 * sm[y]);
    const s = Float32Array.from(v).sort(), lo = s[Math.floor(s.length * 0.40)], hi = s[Math.floor(s.length * 0.997)];
    for (let i = 0; i < v.length; i++) v[i] = Math.pow(Math.max(0, Math.min(1, (v[i] - lo) / (hi - lo))), 1.1);
    return { v, width };
  };
  const put = (buf, i, a) => { for (let c = 0; c < 3; c++) buf[i * 3 + c] = Math.round(PAPER[c] * (1 - a) + INK[c] * a); };
  const S = opening.inkStrength;
  for (const print of opening.light) {
    const h = print.height, target = path.join(out, print.file);
    let buf, tw;
    if (print.kind === "wide") {
      const { v, width: pw } = await inkAlpha(opening.wideCrop, h);
      const ml = Math.round(1.0 * h), mr = Math.round(0.3 * h), fl = 0.2 * h, fr = 0.12 * h;
      tw = ml + pw + mr;
      buf = Buffer.alloc(tw * h * 3);
      for (let i = 0; i < tw * h; i++) put(buf, i, 0);
      for (let y = 0; y < h; y++) for (let x = 0; x < pw; x++) put(buf, y * tw + ml + x, S * v[y * pw + x] * smooth((x - 0.02 * h) / fl) * smooth((pw - x) / fr));
    } else {
      const ph = Math.round(h * 0.7);
      const { v, width: pw } = await inkAlpha(opening.phoneCrop, ph);
      tw = pw;
      buf = Buffer.alloc(pw * h * 3);
      for (let i = 0; i < pw * h; i++) put(buf, i, 0);
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) put(buf, y * pw + x, S * v[y * pw + x] * (1 - smooth((y / h - 0.64) / 0.06)));
    }
    await sharp(buf, { raw: { width: tw, height: h, channels: 3 } }).withExif(lightExif).webp({ quality: print.quality, effort: 6, smartSubsample: true }).toFile(target);
    await record(target);
  }
  fs.writeFileSync(path.join(out, "PROVENANCE.md"), openingProvenance({ W, H, bytes: fs.statSync(file).size, written, ink: INK, paper, accent, text }));
}

function openingProvenance({ W, H, bytes, written, ink, paper, accent, text }) {
  const files = (list) => list.map((print) => written.find((item) => item.file === print.file)).map((o) => `\`${o.file}\` ${o.width} × ${o.height} px, ${kb(o.bytes)}`).join("; ");
  const qualities = (list) => list.map((print) => `${print.quality} (${print.kind === "wide" ? `wide ${print.height}` : "phone"})`).join(", ");
  const names = (list) => list.map((print) => print.file).join(", ");
  const share = Math.round(opening.inkAccentShare * 100);
  return [
    "# Home opening prints",
    "",
    `Derived ${opening.derived} from the owner-approved original of candidate ${opening.id} (the Home opening, owner decision of 2026-11-28, direction A "Comet opening"). The files are the opening's plate (\`.home-opening__sky::before\` in \`src/styles/folio/pages/home-opening.css\`): one print per visit, requested only after load and idle (\`html.backdrop-ready\`) and never preloaded. Credits: the opening's own credit line and the footer credit line (\`src/data/colophon.ts\`). No file here is the site author’s data.`,
    "",
    madeBy("opening"),
    "",
    "## Source",
    "",
    `- Subject: ${opening.source.subject}`,
    "- Used on: Home (index.html): the opening's plate, Space and Light printings.",
    `- Source page: ${opening.source.page}`,
    `- Download: ${opening.source.dl}`,
    `- Credit: ${opening.credit}.`,
    `- Licence: ${opening.licence} (${opening.licenceUrl}).`,
    `- Original: ${W}x${H} px, ${bytes.toLocaleString("en-US")} bytes, SHA-256 ${originals[opening.id].sha256}. Kept outside the repository.`,
    "- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).",
    "",
    "## Geometry",
    "",
    "The painted picture must always cover the window, so Chromium treats it as a background (as it does Bennu) and never reports it as the Largest Contentful Paint. Each file therefore carries its margins and feathers itself, and the page bleeds it 2 px past the window.",
    "",
    `- Wide files: a left margin of 1.0 file height, then the crop (x ${opening.wideCrop[0] * 100} to ${Math.round(opening.wideCrop[1] * 100)} % of the original, full height, ${((opening.wideCrop[1] - opening.wideCrop[0]) * W / H).toFixed(4)} file heights wide, the comet's head 30.4 % across it) with a left feather of 0.2 and a right feather of 0.12 file height, then a right margin of 0.3 file height. The number in the name is the file height.`,
    `- Phone files: the crop x ${Math.round(opening.phoneCrop[0] * 100)} to ${Math.round(opening.phoneCrop[1] * 100)} % of the original, drawn in the top 70 % of the file; the sea feathers out from 64 % to 70 % of the file height.`,
    "",
    `## Space printings: ${names(opening.space)}`,
    "",
    "- Changes: cropped as above, toned (levels 0.93 and -4, saturation 0.9); the margins are transparent and the feathers are in the alpha channel, so the night ground of the page (`--obs-open-ground`) shows through.",
    `- WebP quality ${qualities(opening.space)}; alpha quality 60.`,
    `- Files: ${files(opening.space)}.`,
    "",
    `## Light printings: ${names(opening.light)}`,
    "",
    `- Changes: cropped as above; greyscale, the sky background subtracted row by row (95 % of the smoothed 15th percentile of each row), black point at the 40th and white point at the 99.7th percentile, power 1.1; printed as sepia ink at ${Math.round(opening.inkStrength * 100)} % on the Light paper, opaque, with paper margins.`,
    `- Ink: \`color-mix(in srgb, ${accent.value} ${share}%, ${text.value})\` = rgb(${ink.join(", ")}), from the Light \`--obs-accent\` and \`--obs-text\`; paper ${paper.value}, the Light \`--obs-paper\`. Derive the files again if those Light tokens change.`,
    `- WebP quality ${qualities(opening.light)}.`,
    `- Files: ${files(opening.light)}.`,
    ""
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------------------------
// Context plates

async function derivePlates(args) {
  const out = path.join(args.out, "plates");
  fs.mkdirSync(out, { recursive: true });
  const records = [];
  for (const job of plates.jobs) {
    const file = originalFile(job.id, args.originals);
    const oriented = await sharp(file).rotate().toBuffer();
    const meta = await sharp(oriented).metadata();
    const [x0, y0, x1, y1] = job.crop;
    const ext = { left: Math.round(x0 * meta.width), top: Math.round(y0 * meta.height), width: Math.round((x1 - x0) * meta.width), height: Math.round((y1 - y0) * meta.height) };
    const outputs = [];
    for (const width of plates.widths) {
      const target = path.join(out, `${job.name}-${width}.webp`);
      await sharp(oriented).extract(ext).resize({ width, withoutEnlargement: true }).toColourspace("srgb").webp({ quality: job.quality, effort: 6 }).withExif(exifFor(job, "Plate")).toFile(target);
      const m = await sharp(target).metadata();
      outputs.push({ file: path.basename(target), width: m.width, height: m.height, bytes: fs.statSync(target).size });
    }
    records.push({ job, sourceSize: `${meta.width}x${meta.height}`, sourceBytes: fs.statSync(file).size, sourceSha256: originals[job.id].sha256, ext, outputs });
    console.log(`${job.id} ${outputs.map((o) => `${o.file} ${o.width}x${o.height} ${kb(o.bytes)}`).join(" | ")}`);
  }
  fs.writeFileSync(path.join(out, "PROVENANCE.md"), platesProvenance(records));
}

function platesProvenance(records) {
  const section = ({ job, sourceSize, sourceBytes, sourceSha256, ext, outputs }) => [
    `## ${outputs.map((o) => o.file).join(", ")}`, "",
    `- Subject: ${job.title} (candidate ${job.id}).`,
    `- Used on: ${job.where}.`,
    `- Source page: ${job.page}`,
    `- Download: ${job.download}`,
    `- Credit: ${job.credit}.`,
    `- Licence: ${job.licence}${job.licenceUrl ? ` (${job.licenceUrl})` : ""}.${job.sa ? " Share-alike: these derived files are released under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); the repository licence does not cover them." : ""}`,
    `- Original: ${sourceSize} px, ${sourceBytes.toLocaleString("en-US")} bytes, SHA-256 ${sourceSha256}. Kept outside the repository.`,
    `- Changes: ${job.changes}.`,
    `- Crop: ${job.crop.map((v) => v.toFixed(3)).join(", ")} of the original (x0, y0, x1, y1), ${ext.width} × ${ext.height} px from (${ext.left}, ${ext.top}).`,
    `- Encoding: sRGB WebP, quality ${job.quality}, no colour change.`,
    `- Files: ${outputs.map((o) => `\`${o.file}\` ${o.width} × ${o.height} px, ${kb(o.bytes)}`).join("; ")}.`,
    "- Embedded metadata: EXIF Artist (credit), Copyright (licence) and ImageDescription (changes).",
    ...(job.note ? [`- Note: ${job.note}`] : [])
  ].join("\n");
  return ["# Context plates", "", `Derived ${plates.derived} from the owner-approved originals (the imagery stage of the debox pass). Each is a small mounted print with a visible caption and credit (\`Figure.astro\` with \`.figure--context\`, \`src/styles/folio/components/plate.css\`), drawn at most at its file’s own width (the 320 px file at 1x, the 640 px file at 2x). They are context, not evidence: no file here is the site author’s data. Credits: the caption and the footer credit line (\`src/data/colophon.ts\`).`, "", madeBy("plates"), "", ...records.map((record) => section(record) + "\n")].join("\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------------------------------------------
// Share cards (Open Graph and Twitter), from the committed pictures: no originals needed. Each card is drawn in headless
// Edge with the site's own tokens (Space) and fonts, so the name is in Georgia (--type-name) and the page title in
// Montserrat, and encoded by sharp. The browser runs without the GPU and with an sRGB profile, so a run reproduces
// the files. The list, titles, credits and alt texts are in src/data/share-cards.json.

export const shareConfigPath = path.join(root, "src", "data", "share-cards.json");
const SHARE_QUALITY = 90;
const SHARE_STRENGTH = 0.72;

const dataUrl = (file, type) => `data:${type};base64,${fs.readFileSync(file).toString("base64")}`;
const escapeHtml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function shareCardHtml(card, { width, height }, css) {
  const picture = card.picture.opening
    ? `.pic { background: url("${dataUrl(path.join(imageRoot, card.picture.opening), "image/webp")}") calc(56vw - 135.6vh) 100% / auto 100% no-repeat, var(--obs-open-ground); }`
    : `.pic { background: var(--obs-far-ink); opacity: ${Math.min(1, SHARE_STRENGTH * card.picture.k).toFixed(3)}; mask: url("${dataUrl(path.join(imageRoot, card.picture.mask), "image/webp")}") ${card.picture.at} / cover no-repeat; mask-mode: luminance; }`;
  return `<!doctype html><html lang="en" data-theme="space" data-theme-space><head><meta charset="utf-8"><style>
${css}
* { box-sizing: border-box; margin: 0; }
html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: var(--obs-paper); }
.card { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; background: var(--obs-paper); font-family: var(--type-sans); font-synthesis: none; }
.pic, .shade { position: absolute; inset: 0; }
${picture}
.shade { background: linear-gradient(90deg, color-mix(in srgb, var(--obs-paper) 78%, transparent), color-mix(in srgb, var(--obs-paper) 36%, transparent) 46%, transparent 72%), linear-gradient(0deg, color-mix(in srgb, var(--obs-paper) 66%, transparent), transparent 46%); }
.lockup { position: absolute; left: 72px; bottom: 104px; }
.name { color: var(--obs-text); font: 400 88px/1 var(--type-name); letter-spacing: -.02em; }
.rule { width: 560px; height: 2px; margin-top: 28px; background: linear-gradient(90deg, var(--obs-accent), color-mix(in srgb, var(--obs-accent) 45%, transparent) 38%, transparent); }
.title { margin-top: 24px; color: var(--obs-accent); font-size: 26px; font-weight: var(--label-weight); line-height: 1.3; letter-spacing: var(--label-track); text-transform: uppercase; }
.credit { position: absolute; right: 40px; bottom: 30px; max-width: 640px; color: var(--obs-muted); font-size: 15px; font-weight: 500; line-height: 1.4; text-align: right; }
</style></head><body><div class="card"><div class="pic"></div><div class="shade"></div><div class="lockup"><p class="name">I. Mads Lieu</p><div class="rule"></div><p class="title">${escapeHtml(card.title)}</p></div><p class="credit">${escapeHtml(card.credit)}</p></div></body></html>`;
}

async function deriveShare(args) {
  const config = JSON.parse(fs.readFileSync(shareConfigPath, "utf8"));
  const out = path.join(args.out, "share");
  fs.mkdirSync(out, { recursive: true });
  const fontsDir = path.join(root, "public", "assets", "fonts");
  const css = [
    fs.readFileSync(path.join(root, "src", "styles", "folio", "00-tokens.css"), "utf8"),
    fs.readFileSync(path.join(root, "src", "styles", "folio", "01-fonts.css"), "utf8").replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (_, file) => `url("${dataUrl(path.join(fontsDir, file), "font/woff2")}")`)
  ].join("\n");
  const { loadPlaywright, edgeExecutable } = await import("./lib/browser.mjs");
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true, ...(edgeExecutable ? { executablePath: edgeExecutable } : {}), args: ["--disable-gpu", "--force-color-profile=srgb", "--disable-lcd-text", "--hide-scrollbars"] });
  const records = [];
  try {
    const page = await browser.newPage({ viewport: { width: config.width, height: config.height }, deviceScaleFactor: 1 });
    for (const [pagePath, card] of Object.entries(config.cards)) {
      await page.setContent(shareCardHtml(card, config, css), { waitUntil: "load" });
      const ready = await page.evaluate(async () => {
        await document.fonts.ready;
        const images = [...document.styleSheets[0].cssRules].flatMap((rule) => [...(rule.cssText || "").matchAll(/url\("(data:image[^"]+)"\)/g)].map((match) => match[1]));
        await Promise.all(images.map((src) => { const image = new Image(); image.src = src; return image.decode(); }));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return document.fonts.check("600 26px Montserrat") && [...document.fonts].some((face) => face.family === "Montserrat" && face.status === "loaded");
      });
      if (!ready) throw new Error(`${card.file}: Montserrat did not load`);
      const png = await page.screenshot({ type: "png" });
      const target = path.join(out, card.file);
      await sharp(png).removeAlpha().jpeg({ quality: SHARE_QUALITY, chromaSubsampling: "4:4:4", mozjpeg: true }).withExif({ IFD0: { Artist: "I. Mads Lieu", Copyright: `Picture: ${card.credit}`, ImageDescription: `Share card for ${pagePath} (erdwmads.github.io)` } }).toFile(target);
      const m = await sharp(target).metadata();
      records.push({ pagePath, card, width: m.width, height: m.height, bytes: fs.statSync(target).size });
      console.log(`${card.file} ${m.width}x${m.height} ${kb(fs.statSync(target).size)}`);
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(out, "PROVENANCE.md"), shareProvenance(records, config));
}

function shareProvenance(records, config) {
  const lines = ["# Share cards", "",
    `The Open Graph and Twitter image of each page (\`og:image\`, \`twitter:image\` in \`src/components/SiteShell.astro\`): ${config.width} \u00d7 ${config.height} px JPEG, drawn from the page's own picture in the Space colours, with the name in Georgia, a gold rule fading to the right and the page's public title in Montserrat capitals in the gold of the kickers, and the picture's credit. The protected Research Log's card shows only its public title. No file here is the site author\u2019s data.`, "",
    "Made by `npm run images:imagery -- share` (`scripts/derive-imagery.mjs`) from the committed pictures in `public/assets/img/backdrops/`, `asteroid-bennu-1280.webp` and `opening/` (no originals needed), with the list, titles, credits and alt texts in `src/data/share-cards.json`; the cards are drawn in headless Edge (no GPU, sRGB) with the tokens of `src/styles/folio/00-tokens.css` and the fonts of `01-fonts.css`, so a change to either needs the command run again. `npm run images:verify` derives them again and compares them with these.", ""];
  for (const { pagePath, card, width, height, bytes } of records) {
    const source = card.picture.opening || card.picture.mask;
    lines.push(`- \`${card.file}\` (${pagePath}): ${width} \u00d7 ${height} px, ${kb(bytes)}, JPEG quality ${SHARE_QUALITY}, no chroma subsampling. Picture: \`${source}\`${card.picture.mask ? `, anchored ${card.picture.at}, drawn in \`--obs-far-ink\` at ${Math.min(1, SHARE_STRENGTH * card.picture.k).toFixed(2)}` : ", over `--obs-open-ground`, placed as on the opening"}. Credit on the card: ${card.credit}.${/BY-SA/.test(card.credit) ? " Share-alike: this card is released under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/); the repository licence does not cover it." : ""}`);
  }
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------------------------------------------
// Verify: derive into a temporary folder and compare with the committed files.

const committedSets = ["backdrops", "opening", "plates", "share"];

async function verify(args) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "derive-imagery-"));
  const sets = committedSets.slice();
  try {
    await deriveBackdrops({ ...args, out: temp, only: null });
    await deriveOpening({ ...args, out: temp });
    await derivePlates({ ...args, out: temp });
    await deriveShare({ ...args, out: temp });
    let failures = 0, metadataOnly = 0, identical = 0;
    for (const set of sets) {
      const fresh = fs.readdirSync(path.join(temp, set)).sort();
      const committed = fs.readdirSync(path.join(imageRoot, set)).sort();
      for (const name of committed.filter((item) => !fresh.includes(item))) { failures++; console.log(`FAIL ${set}/${name}: committed but not derived`); }
      for (const name of fresh) {
        const a = path.join(temp, set, name), b = path.join(imageRoot, set, name);
        if (!fs.existsSync(b)) { failures++; console.log(`FAIL ${set}/${name}: derived but not committed`); continue; }
        if (sha256(a) === sha256(b)) { identical++; console.log(`same  ${set}/${name} ${sha256(a).slice(0, 16)}`); continue; }
        if (!/\.(webp|jpg)$/.test(name)) { failures++; console.log(`FAIL ${set}/${name}: text differs`); continue; }
        const [pa, pb] = await Promise.all([a, b].map((file) => sharp(file).raw().toBuffer({ resolveWithObject: true })));
        const sameSize = pa.info.width === pb.info.width && pa.info.height === pb.info.height && pa.info.channels === pb.info.channels;
        let maxDelta = sameSize ? 0 : 255;
        if (sameSize) for (let i = 0; i < pa.data.length; i++) maxDelta = Math.max(maxDelta, Math.abs(pa.data[i] - pb.data[i]));
        if (maxDelta === 0) { metadataOnly++; console.log(`pixels ${set}/${name}: identical pixels, the bytes differ (metadata)`); }
        else { failures++; console.log(`FAIL ${set}/${name}: pixels differ (${sameSize ? `largest channel difference ${maxDelta}` : "size differs"})`); }
      }
    }
    console.log(`verify: ${identical} byte-identical, ${metadataOnly} with identical pixels only, ${failures} different`);
    if (failures) process.exitCode = 1;
  } finally {
    if (args.keep) console.log(`kept ${temp}`);
    else fs.rmSync(temp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------

const commands = {
  backdrops: deriveBackdrops,
  opening: deriveOpening,
  plates: derivePlates,
  share: deriveShare,
  async all(args) { await deriveBackdrops(args); await deriveOpening(args); await derivePlates(args); await deriveShare(args); },
  verify
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const command = commands[args.command];
  if (!command) {
    console.error(`usage: node scripts/derive-imagery.mjs <${Object.keys(commands).join("|")}> [--originals <dir>] [--out <dir>] [--only <name,...>] [--keep]`);
    process.exit(2);
  }
  try {
    await command(args);
  } catch (error) {
    console.error(`derive-imagery: ${error.message}`);
    process.exitCode = 1;
  }
}
