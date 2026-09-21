import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageRoot = path.join(root, "public", "assets", "img");
const requireFromRoot = createRequire(path.join(root, "package.json"));
const requireFromAstro = createRequire(requireFromRoot.resolve("astro/package.json"));
const sharp = requireFromAstro("sharp");

// Display derivatives for site-wide backgrounds and the portrait. The JPEG
// originals stay in place as the archival source and the <picture> fallback.
const webpJobs = [
  { source: "Solar_System_true_color.jpg", output: "Solar_System_true_color.webp", width: 2560, quality: 74 },
  { source: "asteroid-bennu.jpg", output: "asteroid-bennu.webp", width: 1920, quality: 72 },
  { source: "profile.jpg", output: "profile.webp", width: 960, quality: 80 }
];

for (const job of webpJobs) {
  await sharp(path.join(imageRoot, job.source))
    .rotate()
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: job.quality, effort: 6 })
    .toFile(path.join(imageRoot, job.output));
}

// Social preview card: crawlers expect a modest JPEG close to 1200x630.
await sharp(path.join(imageRoot, "Solar_System_true_color.jpg"))
  .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
  .jpeg({ quality: 82, progressive: true, mozjpeg: true })
  .toFile(path.join(imageRoot, "og-cover.jpg"));

console.log(`Generated ${webpJobs.length} WebP display derivatives and og-cover.jpg.`);
