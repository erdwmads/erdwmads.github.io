// The validators behind the Folio primitives (spec §3.1, §6.5): Plate.astro refuses a figure without its label,
// caption, credit or a known evidence kind, as EvidenceStatus.astro refuses an unknown kind; Marker, Masthead,
// Section, Figure and Ledger check their props the same way. The validators are plain modules next to their
// components, so these tests need no Astro build.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { evidenceKinds } from "../src/components/evidence-status.js";
import { figureProps } from "../src/components/figure.js";
import { ledgerItems } from "../src/components/ledger.js";
import { markerProps, markerValues } from "../src/components/marker.js";
import { mastheadProps } from "../src/components/masthead.js";
import { plateProps } from "../src/components/plate.js";
import { sectionProps } from "../src/components/section.js";

const plate = { label: "Plate I", caption: "(162173) Ryugu · Hayabusa2 ONC-T, 26 June 2018", credit: "Image: JAXA, University of Tokyo and collaborators", evidence: "literature" };

test("a plate needs a label, a caption, a credit and an evidence kind", () => {
  assert.deepEqual(plateProps(plate), { ...plate, evidenceText: "", ground: "specimen", model: false, width: "text", id: undefined });
  for (const name of ["label", "caption", "credit", "evidence"]) {
    assert.throws(() => plateProps({ ...plate, [name]: undefined }), new RegExp(`Plate: ${name} is required`));
    assert.throws(() => plateProps({ ...plate, [name]: "  " }), new RegExp(`Plate: ${name} is required`));
  }
});

test("a plate accepts only the EvidenceStatus kinds, and model corners only for a model", () => {
  for (const evidence of Object.keys(evidenceKinds)) assert.equal(plateProps({ ...plate, evidence }).evidence, evidence);
  assert.throws(() => plateProps({ ...plate, evidence: "completed" }), /unknown evidence kind "completed"/);
  assert.throws(() => plateProps({ ...plate, evidence: "measured", model: true }), /evidence must be "model"/);
  assert.equal(plateProps({ ...plate, evidence: "model", model: true }).model, true);
  assert.throws(() => plateProps({ ...plate, ground: "glass" }), /unknown ground/);
  assert.throws(() => plateProps({ ...plate, width: "bleed" }), /unknown width/);
});

test("markers name only pathway statuses and evidence kinds, never a completed state", () => {
  assert.deepEqual([...markerValues.status], ["in-progress", "next", "planned", "interpretation"]);
  assert.deepEqual([...markerValues.evidence], Object.keys(evidenceKinds));
  assert.deepEqual(markerProps({ kind: "status", value: "planned" }), { kind: "status", value: "planned" });
  assert.throws(() => markerProps({ kind: "status", value: "completed" }), /unknown status value "completed"/);
  assert.throws(() => markerProps({ kind: "evidence", value: "in-progress" }), /unknown evidence value/);
  assert.throws(() => markerProps({ kind: "badge", value: "next" }), /unknown kind "badge"/);
  // Every pathway status in the project data has a marker.
  const project = fs.readFileSync(new URL("../src/data/project.mjs", import.meta.url), "utf8");
  for (const [, status] of project.matchAll(/^\s*status: '([^']+)'/gm)) {
    assert.ok(markerValues.status.includes(status.toLowerCase().replace(/\s+/g, "-")), `no marker for the pathway status ${status}`);
  }
});

test("a masthead needs a title; a section needs its heading id and title", () => {
  assert.deepEqual(mastheadProps({ title: "Astromineralogy", kicker: "Research" }), { kicker: "Research", title: "Astromineralogy", level: 1, size: "display", id: undefined });
  assert.throws(() => mastheadProps({ kicker: "Research" }), /Masthead: title is required/);
  assert.throws(() => mastheadProps({ title: "I. Mads Lieu", size: "poster" }), /unknown size/);
  assert.deepEqual(sectionProps({ id: "research-focus-title", title: "Research question", number: "01" }), { id: "research-focus-title", number: "01", kicker: "", title: "Research question", level: 2, labelledby: "research-focus-title" });
  assert.throws(() => sectionProps({ title: "Research question" }), /Section: id is required/);
  assert.throws(() => sectionProps({ id: "comparison-title" }), /title is required/);
  assert.equal(sectionProps({ id: "a", title: "A", labelledby: "b" }).labelledby, "b");
});

test("a figure ratio reads as a CSS aspect ratio; ledger rows need a title and one key", () => {
  assert.equal(figureProps({ ratio: "4:5" }).aspectRatio, "4 / 5");
  assert.equal(figureProps({ ratio: "4 / 5" }).aspectRatio, "4 / 5");
  assert.equal(figureProps({}).aspectRatio, undefined);
  assert.throws(() => figureProps({ ratio: "portrait" }), /ratio "portrait"/);
  assert.deepEqual(ledgerItems([{ date: "2026/04", title: "Started graduation research" }, { number: "01", title: "Ryugu & Bennu", href: "ryugu-bennu.html" }]), [
    { key: "2026/04", title: "Started graduation research", href: undefined, detail: undefined },
    { key: "01", title: "Ryugu & Bennu", href: "ryugu-bennu.html", detail: undefined }
  ]);
  assert.throws(() => ledgerItems([]), /non-empty array/);
  assert.throws(() => ledgerItems([{ date: "2026" }]), /item 1 has no title/);
  assert.throws(() => ledgerItems([{ date: "2026", number: "01", title: "x" }]), /both a date and a number/);
});
