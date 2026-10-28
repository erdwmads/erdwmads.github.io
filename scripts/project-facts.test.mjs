// Project facts (src/data/project.mjs): one source for the question, title, methods and Analytical Pathway.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as project from "../src/data/project.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("the project label and canonical question follow CLAUDE.md", () => {
  assert.equal(project.questionShort, "Dolomite in Orgueil CI1");
  assert.equal(project.question, "What controlled dolomite formation in the Orgueil CI1 chondrite?");
  // CLAUDE.md holds the owner's local agent instructions and is not committed, so CI has no copy to compare.
  if (fs.existsSync(path.join(root, "CLAUDE.md"))) {
    assert.ok(read("CLAUDE.md").includes(project.question), "CLAUDE.md and project.mjs must state the same question");
  }
  assert.equal(project.displayTitle, "Dolomite in the Orgueil CI1 Chondrite");
  assert.match(project.formalTitle, /^Astromineralogical Study of Ca–Mg Carbonates Reported as Dolomite in the Orgueil CI1 Chondrite/);
  assert.equal(project.targetPhase, "Ca–Mg carbonates reported as dolomite");
  assert.equal(project.subQuestions.length, 3);
});

test("the Analytical Pathway keeps its seven published steps, each with calibrated scope", () => {
  assert.deepEqual(project.pathway.map((step) => step.title), [
    "Sample selection",
    "SEM / BSE",
    "EPMA mapping",
    "EBSD-guided FIB preparation",
    "Single-grain XRD",
    "TEM / EDS / diffraction",
    "Formation conditions"
  ]);
  for (const step of project.pathway) {
    assert.match(step.id, /^[a-z0-9-]+$/);
    for (const field of ["purpose", "canAnswer", "cannotEstablish"]) {
      assert.ok(typeof step[field] === "string" && step[field].length > 20, `${step.title}: ${field}`);
    }
  }
  assert.equal(new Set(project.pathway.map((step) => step.id)).size, project.pathway.length);
  assert.match(project.pathway[1].cannotEstablish, /Brightness alone cannot identify dolomite/);
  assert.match(project.pathway[2].cannotEstablish, /does not establish atomic ordering/);
});

test("no step is Completed: statuses are the owner's and date-stamped", () => {
  assert.equal(project.statusAsOf, "October 2026");
  assert.deepEqual([...project.pathwayStatuses], ["In progress", "Next", "Planned", "Interpretation"]);
  for (const step of project.pathway) {
    assert.ok(project.pathwayStatuses.includes(step.status), `${step.title}: unknown status ${step.status}`);
    assert.doesNotMatch(step.status, /complete|done|finished/i, `${step.title} must not be marked completed without the owner`);
  }
  // Planned structural work never reads as under way or done.
  const byTitle = Object.fromEntries(project.pathway.map((step) => [step.title, step.status]));
  for (const title of ["EBSD-guided FIB preparation", "Single-grain XRD", "TEM / EDS / diffraction"]) {
    assert.ok(["Next", "Planned"].includes(byTitle[title]), `${title}: ${byTitle[title]}`);
  }
  assert.equal(byTitle["Formation conditions"], "Interpretation");
  // Pinned so a status change is a deliberate edit; every status is owner-confirmed.
  assert.deepEqual(byTitle, {
    "Sample selection": "In progress",
    "SEM / BSE": "In progress",
    "EPMA mapping": "In progress",
    "EBSD-guided FIB preparation": "Next",
    "Single-grain XRD": "Planned",
    "TEM / EDS / diffraction": "Planned",
    "Formation conditions": "Interpretation"
  });
  assert.ok(Object.isFrozen(project.pathway) && project.pathway.every(Object.isFrozen));
});

test("the methods summary is derived from the step statuses", () => {
  assert.equal(project.methodsSummary, "SEM–EDS and EPMA in progress · EBSD-guided FIB preparation next · single-grain XRD and TEM planned");
  assert.doesNotMatch(project.methodsSummary, /complete/i);
});

test("the research atlas data comes from the pathway", () => {
  const atlas = project.atlasProjectData();
  assert.equal(atlas.question, project.question);
  assert.deepEqual(atlas.methods.map((method) => method.title.split(" ")[0]), ["SEM", "EPMA", "XRD", "TEM"]);
  for (const method of atlas.methods) {
    const step = project.pathway.find((item) => item.technique?.title === method.title);
    assert.equal(method.answer, step.canAnswer);
    assert.equal(method.limitation, step.cannotEstablish);
    assert.equal(method.status, step.status);
    assert.match(method.href, /^https:\/\//);
  }
  assert.deepEqual(atlas.subQuestions, project.subQuestions.map((item) => ({ ...item })));
});

test("Ryugu and Bennu stay comparison materials", () => {
  const { orgueil, returned } = project.comparisonMaterials;
  assert.equal(orgueil.title, "Orgueil CI1 chondrite");
  assert.match(orgueil.cannotShow, /parent body is unknown/);
  assert.match(returned.label, /Comparison/);
  assert.match(returned.cannotShow, /do not establish that Orgueil came from Ryugu, Bennu/);
});

test("pages read the project facts instead of carrying copies", () => {
  for (const fragment of ["research-main.html", "research-methods.html", "research-log-main.html", "research-graduation-hero.html", "research-graduation-project-info.html", "research-graduation-after-log.html"]) {
    assert.equal(fs.existsSync(path.join(root, "src", "legacy", fragment)), false, `src/legacy/${fragment} was replaced by project.mjs`);
  }
  const consumers = {
    "src/pages/research.astro": ["AnalyticalPathway", "question"],
    "src/pages/research-log.astro": ["AnalyticalPathway", "question", "formalTitle", "displayTitle"],
    "src/pages/research-graduation.astro": ["AnalyticalPathway", "formalTitle", "projectContext"],
    "src/components/CurrentFocus.astro": ["question", "formalTitle", "methodsSummary"],
    "src/components/EvidenceAtlasData.astro": ["atlasProjectData"],
    "scripts/export-ppt-data.mjs": ["formalTitle"]
  };
  // Drifted wordings of the question that must not come back in these sources or the atlas script.
  const drift = [/What conditions controlled dolomite formation/, /What controlled dolomite formation in Orgueil\?/, /dolomite formation in Orgueil CI1\?/, /What mineralogical conditions/];
  for (const [file, names] of Object.entries(consumers)) {
    const source = read(file);
    assert.match(source, /project\.mjs/, `${file} must import src/data/project.mjs`);
    for (const name of names) assert.ok(source.includes(name), `${file}: expected ${name} from project.mjs`);
    assert.ok(!source.includes(project.question), `${file}: hand-typed copy of the research question`);
    assert.ok(!source.includes(project.formalTitle), `${file}: hand-typed copy of the formal title`);
    for (const pattern of drift) assert.doesNotMatch(source, pattern, `${file}: drifted question wording`);
  }
  const atlasScript = read("public/assets/js/mineral-interactions.js");
  for (const pattern of drift) assert.doesNotMatch(atlasScript, pattern);
  assert.doesNotMatch(atlasScript, /The photograph shows/, "the atlas must not describe a photograph it does not show");
  assert.doesNotMatch(atlasScript, /Where did the crystals grow\?/, "atlas sub-questions come from project.mjs");
});
