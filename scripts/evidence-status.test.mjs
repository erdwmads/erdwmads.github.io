// Evidence status lines (src/components/EvidenceStatus.astro): the five kinds keep their visible tags, the
// comparison pages use only those kinds in the agreed places, and their meta descriptions stay within 155 characters.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evidenceKinds } from "../src/components/evidence-status.js";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const statuses = (text) => [...text.matchAll(/<EvidenceStatus kind="([^"]+)">([\s\S]*?)<\/EvidenceStatus>/g)].map(([, kind, sentence]) => ({ kind, sentence }));

test("each evidence kind has its visible tag", () => {
  assert.deepEqual(evidenceKinds, {
    measured: "My measurement",
    literature: "Literature",
    model: "Illustrative model",
    planned: "Planned",
    interpretation: "Interpretation"
  });
  assert.ok(Object.isFrozen(evidenceKinds));
});

test("the component renders the tag as text and the sentence from its slot", async () => {
  const component = await source("src/components/EvidenceStatus.astro");
  assert.match(component, /data-evidence-status=\{kind\}/);
  assert.match(component, /<span class="evidence-status__tag">\{tag\}/);
  assert.match(component, /<slot \/>/);
  assert.match(component, /throw new Error/, "an unknown kind must fail the build, not render an empty tag");
});

test("Ryugu & Bennu label each scene: mission records, the ephemeris model and published microscopy", async () => {
  const lines = [
    ...statuses(await source("src/components/SampleMissions.astro")),
    ...statuses(await source("src/components/PlanetaryExplorer.astro")),
    ...statuses(await source("src/components/ResearchScaleJourney.astro"))
  ];
  assert.deepEqual(lines.map((line) => line.kind), ["model", "model", "literature"]);
  assert.match(lines[0].sentence, /^Illustrative reconstruction from published mission records:/);
  assert.match(lines[1].sentence, /ephemerides/);
  assert.match(lines[1].sentence, /not to scale/);
  assert.match(lines[2].sentence, /not my Orgueil results/);
  for (const { kind } of lines) assert.ok(Object.hasOwn(evidenceKinds, kind));
});

test("Origins keeps its calibrated wording in the status lines", async () => {
  const page = await source("src/pages/origins-study.astro");
  const lines = statuses(page);
  assert.deepEqual(lines.map((line) => line.kind), ["model", "literature"]);
  assert.match(lines[0].sentence, /not a measured reconstruction/);
  assert.match(lines[0].sentence, /Nakamura et al\. \(2023\)/);
  assert.match(lines[1].sentence, /Ryugu sample C0068 \(Ito et al\., 2022\)/);
  assert.match(lines[1].sentence, /not a measurement of Orgueil/);
  assert.match(page, /Orgueil’s parent body is unknown/);
});

test("comparison page meta descriptions stay within 155 characters", async () => {
  for (const path of ["src/pages/ryugu-bennu.astro", "src/pages/origins-study.astro"]) {
    const description = (await source(path)).match(/<LegacyShell\b[^>]*?\bdescription=(["'])(.*?)\1/)?.[2];
    assert.ok(description, `${path}: description`);
    assert.ok(description.length <= 155, `${path}: ${description.length} characters`);
  }
});
