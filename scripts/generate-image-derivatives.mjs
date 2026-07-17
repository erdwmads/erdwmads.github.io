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

const jobs = [
  {
    outputDir: photographyOutput,
    width: 480,
    quality: 78,
    inputs: Array.from({ length: 21 }, (_, index) => {
      const number = index + 1;
      return {
        source: path.join(imageRoot, `photo (${number}).jpg`),
        output: path.join(photographyOutput, `photo-${String(number).padStart(2, "0")}.webp`)
      };
    })
  },
  {
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

for (const group of jobs) {
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

console.log(`Generated ${jobs[0].inputs.length} Photography and ${jobs[1].inputs.length} Mission Log thumbnails.`);
