import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageRoot = path.join(root, "public", "assets", "img");
const requireFromRoot = createRequire(path.join(root, "package.json"));
const requireFromAstro = createRequire(requireFromRoot.resolve("astro/package.json"));
const sharp = requireFromAstro("sharp");

const photographyOutput = path.join(imageRoot, "thumbs", "photography");
const missionOutput = path.join(imageRoot, "thumbs", "mission-log");

// Photography srcset tiers live beside the 480w thumbnails, one directory per width, so the
// thumbnail counts stay 21. Panoramas (wider than 2.3:1, the rule PhotographyGallery.astro uses for
// photo-tile--wide) span the whole wall and also get 1600w. src/data/photography.ts lists the same tiers.
const PANORAMA_RATIO = 2.3;
const photographs = await Promise.all(Array.from({ length: 21 }, async (_, index) => {
  const number = index + 1;
  const source = path.join(imageRoot, `photo (${number}).jpg`);
  const { width, height, orientation = 1 } = await sharp(source).metadata();
  const [w, h] = orientation >= 5 ? [height, width] : [width, height];
  return { source, name: `photo-${String(number).padStart(2, "0")}.webp`, panorama: w / h > PANORAMA_RATIO };
}));
const photographyTier = (width, quality, items = photographs) => ({
  name: "photography",
  outputDir: path.join(imageRoot, "photography", `w${width}`),
  width,
  quality,
  inputs: items.map((photo) => ({ source: photo.source, output: path.join(imageRoot, "photography", `w${width}`, photo.name) }))
});

const jobs = [
  {
    name: "photography",
    outputDir: photographyOutput,
    width: 480,
    quality: 78,
    inputs: photographs.map((photo) => ({ source: photo.source, output: path.join(photographyOutput, photo.name) }))
  },
  photographyTier(640, 76),
  photographyTier(960, 78),
  photographyTier(1600, 78, photographs.filter((photo) => photo.panorama)),
  {
    name: "mission-log",
    outputDir: missionOutput,
    width: 720,
    quality: 80,
    inputs: fs.readdirSync(path.join(imageRoot, "mission-log"))
      .filter((name) => /^grad-log-.*\.jpg$/i.test(name))
      .sort()
      .map((name) => ({
        source: path.join(imageRoot, "mission-log", name),
        output: path.join(missionOutput, name.replace(/\.jpg$/i, ".webp"))
      }))
  }
];

// `node scripts/generate-image-derivatives.mjs photography` regenerates only the named groups.
const only = process.argv.slice(2);
const selected = jobs.filter((group) => !only.length || only.includes(group.name));
if (!selected.length) throw new Error(`Unknown group ${only.join(", ")}; use photography or mission-log`);

for (const group of selected) {
  fs.rmSync(group.outputDir, { recursive: true, force: true });
  fs.mkdirSync(group.outputDir, { recursive: true });
  for (const job of group.inputs) {
    await sharp(job.source)
      .rotate()
      .resize({ width: group.width, withoutEnlargement: true })
      .webp({ quality: group.quality })
      .toFile(job.output);
  }
}

console.log(selected.map((group) => `${group.inputs.length} ${group.name} ${group.width}w`).join(", "));
