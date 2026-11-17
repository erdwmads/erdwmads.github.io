// Scene posters (spec §7.2 WP4 phase B): the still each 3D stage shows until its scene reports ready, captured from
// the real scenes in the built site, so a stage is never an empty box. Each viewer is loaded in headless Edge at a
// desktop and a phone layout, waits for its own ready state, hides every overlay so only the canvas is left, and the
// canvas is screenshotted and written as WebP: 1600 px wide (at most 140 KB) from the desktop layout and 640 px wide
// (at most 60 KB) from the phone layout. The phone tier keeps the phone stage's own ratio (1:1, 4:5), which is why
// the markup chooses between them with <picture> media rather than a width srcset.
// The clock is pinned (CAPTURE_TIME), so the planetary orbit view always shows the same day and a rerun on the same
// build and browser reproduces the posters. The run rewrites public/assets/img/posters/PROVENANCE.md with each
// file's size and SHA-256.
// Usage: npm run build, then node scripts/capture-scene-posters.mjs [missions|planetary|origins ...]
// Needs Playwright and Edge, found as the browser tests find them (scripts/lib/browser.mjs).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { root } from "./lib/site-paths.mjs";
import { distBuilt, serveDist } from "./lib/static-server.mjs";
import { launchBrowser, edgeExecutable } from "./lib/browser.mjs";

const requireFromRoot = createRequire(path.join(root, "package.json"));
const sharp = createRequire(requireFromRoot.resolve("astro/package.json"))("sharp");
const outputDir = path.join(root, "public", "assets", "img", "posters");
const CAPTURE_TIME = "2026-11-17T00:00:00Z";

// stage: the box whose overlays are hidden; canvas: the scene canvas in it; ready: the state each viewer already sets.
const posterViewers = {
  missions: {
    page: "ryugu-bennu.html",
    stage: "[data-mission-viewport]",
    canvas: ":scope > canvas",
    ready: "[data-sample-missions][data-ready=\"true\"]",
    subject: "Sample missions, Hayabusa2 chapter 01 (Launch) at its first frame: the H-IIA 202 on the pad, with the Earth-context inset."
  },
  planetary: {
    page: "ryugu-bennu.html",
    stage: "[data-planetary-explorer] [data-stage]",
    canvas: ":scope > canvas",
    ready: "[data-planetary-explorer][data-render-state=\"ready\"]",
    subject: `Planetary explorer, the default orbit view (heliocentric, Mercury to Mars with Ryugu and Bennu) on ${CAPTURE_TIME.slice(0, 10)}.`
  },
  origins: {
    page: "origins-study.html",
    stage: ".origins-study .scene-viewport",
    canvas: "#scene",
    ready: ".origins-study[data-render-state=\"ready\"]",
    subject: "Origins study, chapter 01 (the protoplanetary disk) at progress 0."
  }
};
const posterTiers = [
  { width: 1600, maxBytes: 140 * 1024, viewport: { width: 1440, height: 900 }, layout: "desktop, 1440 x 900" },
  { width: 640, maxBytes: 60 * 1024, viewport: { width: 390, height: 844 }, layout: "phone, 390 x 844" }
];
const posterFile = (name, width) => `${name}-${width}.webp`;

// A canvas rarely sits on whole device pixels, so the clip can catch a hairline of the box above or beside it: two
// device pixels come off each edge before the resize (the poster is drawn with object-fit: cover, so nothing is missed).
async function encode(png, tier) {
  const { width, height } = await sharp(png).metadata();
  const trimmed = await sharp(png).extract({ left: 2, top: 2, width: width - 4, height: height - 4 }).toBuffer();
  for (let quality = 86; quality >= 40; quality -= 4) {
    const buffer = await sharp(trimmed).resize({ width: tier.width, kernel: "lanczos3" }).webp({ quality, effort: 6 }).toBuffer();
    if (buffer.length <= tier.maxBytes) return { buffer, quality };
  }
  throw new Error(`No WebP quality from 86 to 40 fits ${tier.maxBytes} bytes at ${tier.width} px`);
}

async function capture(browser, url, name, viewer, tier) {
  const context = await browser.newContext({ viewport: tier.viewport, deviceScaleFactor: 2, reducedMotion: "reduce" });
  // Skip the arrival title page; Space is the default theme, and every default view keeps its night palette in Light.
  await context.addInitScript(() => { try { sessionStorage.setItem("mads-cosmic-arrival-v1", "done"); } catch {} });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date(CAPTURE_TIME));
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${url}/${viewer.page}`, { waitUntil: "load" });
  const stage = page.locator(viewer.stage);
  await stage.scrollIntoViewIfNeeded();
  await page.waitForSelector(viewer.ready, { timeout: 120000 });
  // Two frames for the first render to reach the screen, then hide everything on the canvas.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.addStyleTag({ content: `${viewer.stage} > :not(canvas), ${viewer.stage} > canvas ~ canvas { visibility: hidden !important; } ${viewer.stage}::after { display: none !important; } ${viewer.stage} { outline: 0 !important; }` });
  await page.waitForTimeout(600);
  if (errors.length) throw new Error(`${name} at ${tier.layout}: ${errors.join("; ")}`);
  const png = await stage.locator(viewer.canvas).screenshot({ scale: "device" });
  await context.close();
  return png;
}

if (!distBuilt()) {
  console.error("Build the site first (npm run build); the posters are captured from dist/.");
  process.exit(1);
}
const only = process.argv.slice(2);
fs.mkdirSync(outputDir, { recursive: true });
const server = await serveDist();
const browser = await launchBrowser();
const written = [];
try {
  for (const [name, viewer] of Object.entries(posterViewers)) {
    if (only.length && !only.includes(name)) continue;
    for (const tier of posterTiers) {
      const png = await capture(browser, server.url, name, viewer, tier);
      const { buffer, quality } = await encode(png, tier);
      const { width, height } = await sharp(buffer).metadata();
      fs.writeFileSync(path.join(outputDir, posterFile(name, tier.width)), buffer);
      written.push(`${posterFile(name, tier.width)} ${width}x${height}, ${buffer.length} bytes, quality ${quality}`);
      console.log(`Wrote ${posterFile(name, tier.width)}: ${width} x ${height}, ${buffer.length} bytes (quality ${quality})`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}

// The record is rebuilt from the files on disk, so a partial run keeps the other viewers' rows.
const rows = [];
for (const [name, viewer] of Object.entries(posterViewers)) {
  for (const tier of posterTiers) {
    const file = path.join(outputDir, posterFile(name, tier.width));
    if (!fs.existsSync(file)) continue;
    const buffer = fs.readFileSync(file);
    const { width, height } = await sharp(buffer).metadata();
    rows.push(`## ${posterFile(name, tier.width)}`, "", `- Subject: ${viewer.subject}`, `- Captured from: \`${viewer.page}\`, ${tier.layout} layout, the canvas alone (labels, readouts and frame hidden).`,
      `- Dimensions: ${width} x ${height}; ${buffer.length} bytes (limit ${tier.maxBytes}).`, `- SHA-256: ${crypto.createHash("sha256").update(buffer).digest("hex")}`, "");
  }
}
fs.writeFileSync(path.join(outputDir, "PROVENANCE.md"), [
  "# Scene posters",
  "",
  "Generated by `node scripts/capture-scene-posters.mjs` from the site's own 3D scenes, rendered in headless",
  `${edgeExecutable ? "Microsoft Edge" : "Chromium"} with the clock pinned to ${CAPTURE_TIME}. Each poster is a still of an illustrative`,
  "model, not an observation or a measurement, and it shows the same model the stage then renders. No outside image,",
  "download or retouching is involved; the only processing is a Lanczos resize and WebP encoding. Rerun the script",
  "after a change to a scene's first frame or its stage size.",
  "",
  ...rows
].join("\n"));
if (!written.length) console.log("No viewer matched; PROVENANCE.md rebuilt from the files on disk.");
