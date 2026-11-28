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
// The Bennu backdrop (the Research page's picture since 2026-11-28) is drawn as a greyscale luminance mask at low
// strength (src/styles/folio/components/backdrop.css), so it ships pre-grayscaled: 1280w at low quality (it is never
// seen undimmed, and its bytes share the link with the page's LCP image), and 800w for phones. The solar-system band is
// at most 101 px tall, so 1600w at low quality is enough.
const webpJobs = [
  { source: "Solar_System_true_color.jpg", output: "Solar_System_true_color-1600.webp", width: 1600, quality: 50 },
  { source: "asteroid-bennu.jpg", output: "asteroid-bennu-1280.webp", width: 1280, quality: 35, grayscale: true },
  { source: "asteroid-bennu.jpg", output: "asteroid-bennu-800.webp", width: 800, quality: 60, grayscale: true },
  { source: "profile.jpg", output: "profile.webp", width: 960, quality: 80 },
  // srcset tiers: the portrait is shown at most 328 CSS px wide, and the CV hero (the CV page LCP) at most
  // 480 px; profile.jpg and CV.jpg stay the <picture> fallbacks.
  { source: "profile.jpg", output: "profile-640.webp", width: 640, quality: 80 },
  { source: "CV.jpg", output: "CV-800.webp", width: 800, quality: 80 },
  { source: "CV.jpg", output: "CV-1200.webp", width: 1200, quality: 80 },
  // Planetary explorer error fallback: the same 1024x968 frame, re-encoded only (no crop or enhancement);
  // the downloaded PNG recorded in research-scale/PROVENANCE.md stays the original and the fallback.
  { source: "research-scale/bennu-whole.png", output: "research-scale/bennu-whole.webp", width: 1024, quality: 82 }
];

// --og-cover regenerates only the social card, leaving the WebP derivatives untouched.
// --only <output> regenerates that one derivative and nothing else (no social card).
const ogOnly = process.argv.includes("--og-cover");
const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : null;
if (only && !webpJobs.some((job) => job.output === only)) throw new Error(`--only: no derivative named ${only}`);

for (const job of ogOnly ? [] : webpJobs.filter((job) => !only || job.output === only)) {
  await sharp(path.join(imageRoot, job.source))
    .rotate()
    .resize({ width: job.width, withoutEnlargement: true })
    .grayscale(Boolean(job.grayscale))
    .webp({ quality: job.quality, effort: 6 })
    .toFile(path.join(imageRoot, job.output));
}

// Social preview card: crawlers expect a modest JPEG close to 1200x630. The name and topic sit in the dark
// lower left, below the planets, with a soft shade so they stay legible whatever frames the card (light or dark).
// Georgia matches the site's name face; the topic line falls back from Montserrat to a system sans-serif.
const ogCard = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="shade" x1="0" y1="1" x2="0.8" y2="0.2">
      <stop offset="0" stop-color="#040910" stop-opacity="0.9"/>
      <stop offset="0.6" stop-color="#040910" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#shade)"/>
  <rect x="72" y="446" width="56" height="2" fill="#d6b568"/>
  <text x="70" y="522" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="74" fill="#edf3f7">I. Mads Lieu</text>
  <text x="72" y="578" font-family="Montserrat, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="32" letter-spacing="0.5" fill="#d6b568">Astromineralogy · Orgueil CI1</text>
</svg>`;
if (!only) {
  await sharp(path.join(imageRoot, "Solar_System_true_color.jpg"))
    .resize({ width: 1200, height: 630, fit: "cover", position: "centre" })
    .composite([{ input: Buffer.from(ogCard), top: 0, left: 0 }])
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(path.join(imageRoot, "og-cover.jpg"));
}

console.log(only ? `Generated ${only}.` : ogOnly ? "Generated og-cover.jpg." : `Generated ${webpJobs.length} WebP display derivatives and og-cover.jpg.`);
