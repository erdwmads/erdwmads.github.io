// The derived pictures and their recipe agree (scripts/derive-imagery.mjs, parameters in lib/imagery-jobs.mjs): every
// committed file in the derived folders has a job and every job's files are committed, each PROVENANCE.md names
// every file, each share card draws a committed picture, and the Light opening print was made with the Light tokens the site uses now (the ink is baked into
// the file, so a token change must be followed by `npm run images:imagery -- opening`).
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { lightInk, shareConfigPath } from "./derive-imagery.mjs";
import { backdrops, opening, originals, plates } from "./lib/imagery-jobs.mjs";
import { abs } from "./lib/site-paths.mjs";

const img = (...parts) => abs(["public/assets/img", ...parts].join("/"));
const shareConfig = JSON.parse(fs.readFileSync(shareConfigPath, "utf8"));
const listed = (folder) => fs.readdirSync(img(folder)).filter((name) => name !== "PROVENANCE.md").sort();

const expected = {
  backdrops: backdrops.jobs.flatMap((job) => [`${job.name}-mask-1600.webp`, `${job.name}-mask-800.webp`]),
  opening: [...opening.space, ...opening.light].map((print) => print.file),
  plates: plates.jobs.flatMap((job) => plates.widths.map((width) => `${job.name}-${width}.webp`)),
  share: Object.values(shareConfig.cards).map((card) => card.file)
};

for (const [folder, files] of Object.entries(expected)) {
  test(`${folder}: the committed files are exactly the derived ones, each named in PROVENANCE.md`, () => {
    assert.deepEqual(listed(folder), [...files].sort());
    const provenance = fs.readFileSync(img(folder, "PROVENANCE.md"), "utf8");
    for (const file of files) assert.ok(provenance.includes(`\`${file}\``) || provenance.includes(`## ${file}`) || provenance.includes(`, ${file}`), `${folder}/PROVENANCE.md must name ${file}`);
  });
}

test("every share card draws a committed picture", () => {
  for (const card of Object.values(shareConfig.cards)) {
    const source = card.picture.opening || card.picture.mask;
    assert.ok(source && fs.existsSync(img(source)), `${card.file}: its picture ${source} is not committed`);
    assert.ok(card.title && card.alt && card.credit, `${card.file}: title, alt and credit are required`);
  }
});

test("every job's original has a recorded SHA-256", () => {
  const ids = [...backdrops.jobs, ...plates.jobs].map((job) => job.id).concat(opening.id);
  for (const id of ids) assert.match(originals[id]?.sha256 ?? "", /^[0-9a-f]{64}$/, `${id}: no SHA-256 in imagery-jobs.mjs`);
});

test("the Light opening print carries the current Light ink and paper", () => {
  const { accent, text, paper, ink } = lightInk();
  const provenance = fs.readFileSync(img("opening", "PROVENANCE.md"), "utf8");
  const line = `\`color-mix(in srgb, ${accent.value} ${Math.round(opening.inkAccentShare * 100)}%, ${text.value})\` = rgb(${ink.join(", ")})`;
  assert.ok(provenance.includes(line), `opening/PROVENANCE.md records another ink than ${line}: run npm run images:imagery -- opening`);
  assert.ok(provenance.includes(`paper ${paper.value}, the Light \`--obs-paper\``), "opening/PROVENANCE.md records another paper colour: derive the Light prints again");
});
