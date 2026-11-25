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
    name: "Photography keeps the old light (owner, 2026-11-18): a brass inner bar marks the chosen layout, and a tile takes a steel outline and a soft glow under the pointer; forced colours keep the underline (E047, E048)",
    has: [
      rule(".ui-page-photography .photo-layout-switch [aria-pressed=\"true\"]", "text-decoration-color: transparent", "box-shadow: inset 0 -2px var(--obs-accent)", { media: "(forced-colors: none)" }),
      rule(".ui-page-photography .photo-tile:is(:hover, :focus-visible)", "box-shadow: 0 0 18px var(--obs-glow)"),
      rule(".ui-page-photography .photo-tile:hover", "outline: 2px solid var(--obs-edge-cool)", "outline-offset: 3px", { media: "(forced-colors: none)" })
    ]
  },
  {
    name: "the presentation's full-screen button names itself under the pointer or focus, as on the old site (E049)",
    has: [
      rule(".obs-present-fullscreen", "position: relative"),
      rule(".obs-present-fullscreen::after", "content: attr(aria-label)", "opacity: 0", "pointer-events: none", { media: "(forced-colors: none)" }),
      rule(".obs-present-fullscreen:is(:hover, :focus-visible)::after", "opacity: 1", { media: "(forced-colors: none)" })
    ]
  },
  {
    name: "on screen the CV portrait floats on the old shadow and the education dates on the one backdrop blur of 2f20d7e; neither prints (E050, E051)",
    has: [
      rule(".ui-page-cv .cv-photo .figure__media", "box-shadow: var(--obs-photo-shadow)", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-cv .cv-edu-card > .ledger__key", "align-self: start", "backdrop-filter: blur(12px) saturate(1.04)", { media: "screen and (forced-colors: none)" })
    ]
  },
  {
    name: "the 404 index lies on the old glazed card under the old glass highlight band and glint (E097), drawn behind it so nothing moves, its depth softening under the pointer in 180 ms (E055)",
    has: [
      rule(".ui-page-not-found .archive-index", "position: relative", "isolation: isolate", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index::before", "inset: -24px", "z-index: -1", "background: var(--obs-glass-glint) 50% 0 / calc(100% - 40px) 1px no-repeat, var(--obs-glass-band), var(--obs-glass-face)", "box-shadow: var(--obs-record-depth)", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index::before", "transition: box-shadow .18s", "pointer-events: none", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index:hover::before", "border-color: var(--obs-glass-edge)", "box-shadow: var(--obs-record-depth-hover)", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index::before", "inset: -18px", { media: "(max-width: 760px)" })
    ]
  },
  {
    name: "the Paper Shelf filters are the old flat boxes: a brass edge under the pointer, the pressed one a highlight face behind a brass border that sinks while held, 140 and 180 ms; the search box rings in brass; forced colours keep the underline and the system ring (E056)",
    has: [
      rule(".ui-page-paper-shelf .paper-filter", "border: 1px solid var(--obs-control-border)", "border-radius: var(--radius-control)", "background: var(--obs-surface)", "transition: border-color .18s ease-out, box-shadow .14s ease-out, color .14s ease-out", { media: null }),
      rule(".ui-page-paper-shelf .paper-filter:hover", "border-color: var(--obs-accent)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".ui-page-paper-shelf .paper-filter[aria-pressed=\"true\"]", "border-color: var(--obs-accent)", "background: var(--obs-highlight)", "text-decoration-color: transparent", { media: "(forced-colors: none)" }),
      rule(".ui-page-paper-shelf .paper-filter:active", "box-shadow: var(--obs-control-pressed)", { media: "(forced-colors: none)" }),
      rule(".ui-page-paper-shelf .paper-search:focus-visible", "outline-color: var(--obs-accent)", { media: "(forced-colors: none)" })
    ]
  },
  {
    name: "a CV or Paper Shelf record under a hovering pointer takes the old record glow, easing in over 180 ms; a paper's rule turns to the glass edge; nothing moves (E105)",
    has: [
      rule(".ui-page-paper-shelf .paper-card:hover", "border-top-color: var(--obs-glass-edge)", "box-shadow: var(--obs-record-depth-hover)", "transition: box-shadow .18s", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".ui-page-cv .cv-edu-card:hover", "box-shadow: var(--obs-record-depth-hover)", "transition: box-shadow .18s", { media: "(hover: hover) and (forced-colors: none)" })
    ],
    lacks: [rule(/\.(paper-card|cv-edu-card):hover$/, "transform"), rule(/\.(paper-card|cv-edu-card):hover$/, "translate")]
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
