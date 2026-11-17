// Style contract, collections (WP5): the justified photo wall, the space-reserving photo, CV and Contact controls,
// the presentation dialog, Paper Shelf spacing under filters and the CV print rules (inventory §4, spec §4.6–§4.9).
// components/presentation.css and pages/{paper-shelf,photography,cv,contact}.css carry them.
import assert from "node:assert/strict";
import { WALL_BANDS } from "../../src/lib/photo-rows.js";
import { rule, text } from "./matchers.mjs";

export const owner = "WP5";

export const contract = [
  {
    name: "the photo wall repeats the row bands of src/lib/photo-rows.js as container queries, with the gaps it writes",
    has: [
      rule(".photo-experience", "container: photo-wall / inline-size"),
      rule(".photo-wall", "--photo-gap: var(--photo-gap-wide)", "gap: var(--photo-gap)"),
      rule(".photo-wall", "--photo-gap: var(--photo-gap-medium)", { media: "@container photo-wall (max-width: 720px)" }),
      rule(".photo-wall", "--photo-gap: var(--photo-gap-narrow)", { media: "@container photo-wall (max-width: 520px)" }),
      text("var(--photo-sum-narrow)"), text("var(--photo-sum-medium)"), text("var(--photo-sum-wide)")
    ],
    check(source) {
      // Each band's container query uses its own width limit; the gap numbers live only in WALL_BANDS.
      for (const band of WALL_BANDS.slice(0, -1)) assert.ok(source.includes(`@container photo-wall (max-width: ${band.maxWidth}px)`), `no container query for the ${band.name} band`);
      assert.doesNotMatch(source, /--photo-gap-(?:narrow|medium|wide)\s*:/, "the CSS must read the band gaps, never set them");
    }
  },
  {
    name: "the view switch and the Present button keep their space until their scripts reveal them",
    source: "src/components/PhotographyGallery.astro",
    has: [text(/data-photo-layout-controls[^>]*hidden data-reserve-space/), text(/data-present-photos hidden data-reserve-space/)]
  },
  {
    name: "the Present and Print buttons reserve their inline-flex box",
    has: [rule(".obs-present-launch", "--reserve-display: inline-flex"), rule(".cv-print-action", "--reserve-display: inline-flex")]
  },
  {
    name: "the Contact email actions keep their space until contact.js reveals them",
    source: "src/pages/contact.astro",
    has: [text(/data-email-actions hidden data-reserve-space/)]
  },
  {
    name: "the presentation dialog sets its box only when open, contains its image and keeps the flight above it",
    has: [
      rule(".obs-presentation[open]", "width: 100%", "height: 100%", "background: var(--obs-screen)"),
      rule(".obs-presentation-stage > img", "object-fit: contain"),
      rule(".obs-presentation-stage", "position: relative"),
      rule(".obs-photo-flight", "position: absolute", "pointer-events: none")
    ],
    lacks: [rule(".obs-presentation", "display: block"), rule(".obs-presentation", "display: grid"), rule(".obs-presentation", "display: flex")]
  },
  {
    name: "Paper Shelf spacing skips filtered-out groups and cards",
    has: [text(/\.paper-group:not\(\[hidden\]\) ~ :where\(\.paper-group:not\(\[hidden\]\)\)/), text(/\.paper-card:not\(\[hidden\]\) ~ :where\(\.paper-card:not\(\[hidden\]\)\)/)]
  },
  {
    name: "the CV print identity appears only in print, and only main prints, on A4 with 20 mm margins",
    has: [
      rule(".cv-print-identity", "display: none", { media: null }),
      rule(".cv-print-identity", "display: block", { media: "print" }),
      rule(".ui-page-cv main", "page: cv", { media: "print" }),
      text(/@page cv \{\s*size: A4;\s*margin: 20mm;\s*\}/)
    ]
  }
];
