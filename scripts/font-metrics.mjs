// Measures the metric overrides of the local fallback face in src/styles/folio/01-fonts.css, so text set in "Sans
// Fallback" (local Arial) during the font swap takes the same width and line box as Montserrat, and the swap shifts
// as little as it can. The name face is Georgia, a system face with no swap. Runs in Edge through Playwright
// (scripts/lib/browser.mjs) and prints the @font-face block to paste into 01-fonts.css with the run date:
//   node scripts/font-metrics.mjs
// size-adjust = width of a fixed pangram at 100 px in the real face / the same width in the local face; ascent and
// descent = the real face's canvas fontBoundingBoxAscent and fontBoundingBoxDescent at 100 px, divided by
// size-adjust; line-gap-override is 0%.
import fs from "node:fs";
import { launchBrowser } from "./lib/browser.mjs";
import { abs, fontsDir } from "./lib/site-paths.mjs";

const pangram = "The quick brown fox jumps over the lazy dog. Sphinx of black quartz, judge my vow: 0123456789 Orgueil CI1 Ca–Mg";
const faces = [
  { family: "Sans Fallback", real: "Montserrat", file: "montserrat-latin.woff2", style: "normal", locals: ["Arial", "ArialMT"] }
];

const browser = await launchBrowser();
try {
  const page = await browser.newPage();
  const fontFaces = faces.map((face, index) => {
    const data = fs.readFileSync(abs(`${fontsDir}/${face.file}`)).toString("base64");
    return [
      `@font-face{font-family:"Real ${index}";font-style:${face.style};font-weight:400;src:url(data:font/woff2;base64,${data}) format("woff2")}`,
      `@font-face{font-family:"Local ${index}";font-style:${face.style};font-weight:400;src:${face.locals.map((name) => `local("${name}")`).join(",")}}`
    ].join("\n");
  });
  await page.setContent(`<!doctype html><style>${fontFaces.join("\n")}</style><body>`);
  const results = await page.evaluate(async ({ faces, pangram }) => {
    const context = document.createElement("canvas").getContext("2d");
    const measure = (family, style) => {
      context.font = `${style} 400 100px "${family}"`;
      return context.measureText(pangram);
    };
    const out = [];
    for (const [index, face] of faces.entries()) {
      const [real] = await document.fonts.load(`${face.style} 400 100px "Real ${index}"`, pangram);
      const [local] = await document.fonts.load(`${face.style} 400 100px "Local ${index}"`, pangram);
      if (!real || real.status !== "loaded") throw new Error(`${face.file} did not load`);
      if (!local || local.status !== "loaded") throw new Error(`no local ${face.locals.join(" / ")} on this machine`);
      const realMetrics = measure(`Real ${index}`, face.style);
      const localMetrics = measure(`Local ${index}`, face.style);
      out.push({ realWidth: realMetrics.width, localWidth: localMetrics.width, ascent: realMetrics.fontBoundingBoxAscent, descent: realMetrics.fontBoundingBoxDescent });
    }
    return out;
  }, { faces, pangram });

  const percent = (value) => `${(value * 100).toFixed(2)}%`;
  const date = new Date().toISOString().slice(0, 10);
  const lines = [`/* Measured by node scripts/font-metrics.mjs in Edge ${browser.version()} on ${date}. */`];
  faces.forEach((face, index) => {
    const { realWidth, localWidth, ascent, descent } = results[index];
    const sizeAdjust = realWidth / localWidth;
    lines.push(
      `@font-face { font-family: "${face.family}"; font-style: ${face.style}; font-weight: 400 800; src: ${face.locals.map((name) => `local("${name}")`).join(", ")}; ` +
        `size-adjust: ${percent(sizeAdjust)}; ascent-override: ${percent(ascent / 100 / sizeAdjust)}; descent-override: ${percent(descent / 100 / sizeAdjust)}; line-gap-override: 0%; }`
    );
  });
  console.log(lines.join("\n"));
} finally {
  await browser.close();
}
