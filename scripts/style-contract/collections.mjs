// Style contract, collections (WP5): the justified photo wall, the space-reserving photo, CV and Contact controls,
// the presentation dialog, Paper Shelf spacing under filters and the CV print rules (inventory §4, spec §4.6–§4.9).
// components/presentation.css and pages/{paper-shelf,photography,cv,contact,not-found}.css carry them. Since
// 2026-11-26 (the lab site's language) the filters, the layout switch and Copy reference are text controls, the
// photographs mounted prints, the 404 card a pool under a glint hairline; the old light is pinned on those forms.
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
    name: "Photography keeps the old light (owner, 2026-11-18) on the new forms (2026-11-26): the layout switch is two text controls with no group box, the chosen layout in brass over a 2 px brass beam on a warm pool (the old brass inner bar), forced colours a double border and the underline; a tile, a mounted print with 2 px corners, takes a steel outline and a soft glow under the pointer (E047, E048)",
    has: [
      rule(".ui-page-photography .photo-layout-switch", "display: flex", { media: null }),
      rule(".ui-page-photography .photo-layout-switch button", "border: 1px solid transparent", "border-bottom-color: var(--obs-control-border)", "border-radius: 0", "background: none", { media: null }),
      rule(".ui-page-photography .photo-layout-switch [aria-pressed=\"true\"]", "border-bottom-color: var(--obs-accent)", "background: radial-gradient(closest-side, var(--obs-pool-warm), transparent)", "box-shadow: inset 0 -1px var(--obs-accent)", "color: var(--obs-accent)", "text-decoration-color: transparent", { media: "(forced-colors: none)" }),
      rule(".ui-page-photography .photo-layout-switch [aria-pressed=\"true\"]", "border-bottom: 3px double Highlight", { media: "(forced-colors: active)" }),
      rule(".ui-page-photography .photo-tile", "border-radius: var(--radius-record)", { media: null }),
      rule(".ui-page-photography .photo-tile", "box-shadow: var(--obs-print-shadow)", { media: "(forced-colors: none)" }),
      rule(".ui-page-photography .photo-tile:is(:hover, :focus-visible)", "box-shadow: 0 0 18px var(--obs-glow)"),
      rule(".ui-page-photography .photo-tile:hover", "outline: 2px solid var(--obs-edge-cool)", "outline-offset: 3px", { media: "(forced-colors: none)" })
    ],
    lacks: [rule(".ui-page-photography .photo-layout-switch", "border: 1px solid var(--obs-line)"), rule(".ui-page-photography .photo-layout-switch button", "border-radius: 3px")]
  },
  {
    name: "the photo wall never draws a photograph wider than its file at 1x: it stays within 72rem in the wider column and its rows at most 270 px (section 11 of the 2026-11-26 brief)",
    has: [
      rule(".ui-page-photography .photo-experience", "max-width: 72rem", { media: null }),
      text("--photo-row-h: min(calc((100cqw - 1px - var(--photo-gaps-wide) * var(--photo-gap)) / var(--photo-sum-wide)), 270px)")
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
    name: "on screen the CV portrait is a mounted print (2 px corners, the print's contact shade and long soft drop in place of the old shadow) and the education dates sit on the one backdrop blur of 2f20d7e, masked to a frosted pool around the words; neither prints (E050, E051)",
    has: [
      rule(".ui-page-cv .cv-photo .figure__media", "border-radius: var(--radius-record)", { media: null }),
      rule(".ui-page-cv .cv-photo .figure__media", "box-shadow: var(--obs-print-shadow)", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-cv .cv-edu-card > .ledger__key", "align-self: start", "backdrop-filter: blur(12px) saturate(1.04)", "mask-image: radial-gradient(closest-side, #000 72%, transparent)", { media: "screen and (forced-colors: none)" })
    ],
    lacks: [rule(".ui-page-cv .cv-photo .figure__media", "border-radius: 22px")]
  },
  {
    name: "the 404 index lies on the sheet, the old glazed card (E055, E097) drawn behind it so nothing moves: the glint its head hairline 20 px in from each side over a resting light pool, no border, corner or depth; under the pointer a deeper pool comes in over 180 ms",
    has: [
      rule(".ui-page-not-found .archive-index", "position: relative", "isolation: isolate", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index::before", "inset: -24px", "z-index: -1", "pointer-events: none", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index::before", "background: var(--obs-glass-glint) 50% 0 / calc(100% - 40px) 1px no-repeat, radial-gradient(closest-side, var(--obs-pool), transparent) 50% 50% / 100% 100% no-repeat", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index::after", "background: radial-gradient(closest-side, var(--obs-pool-hover), transparent) 50% 50% / 100% 100% no-repeat", "opacity: 0", "transition: opacity .18s", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index:hover::after", "opacity: 1", { media: "screen and (forced-colors: none)" }),
      rule(".ui-page-not-found .archive-index::before", "inset: -18px", { media: "(max-width: 760px)" })
    ],
    lacks: [rule(/\.archive-index::before$/, "border-radius"), rule(/\.archive-index::before$/, "box-shadow"), rule(/\.archive-index::before$/, "border")]
  },
  {
    name: "the Paper Shelf filters are text controls (2026-11-26) carrying the old light (E056): a 1 px control-border beam, no face or corner; under the pointer the beam lights brass to steel over a warm pool with the gold glow (the old brass edge); the pressed one in brass over a 2 px brass beam on a warm pool (the old highlight face and brass border), over the press pool while held; 180 and 140 ms; the search field's foot turns brass with the gold glow under it beside the brass ring; forced colours keep the underline, a double border and the system ring",
    has: [
      rule(".ui-page-paper-shelf .paper-filter", "border: 1px solid transparent", "border-bottom-color: var(--obs-control-border)", "border-radius: 0", "background: none", "transition: border-color .18s ease-out, box-shadow .14s ease-out, color .14s ease-out", { media: null }),
      rule(".ui-page-paper-shelf .paper-filter:hover:not([aria-pressed=\"true\"])", "border-bottom-color: transparent", "background: var(--obs-beam-lit) 0 100% / 100% 1px no-repeat border-box, radial-gradient(closest-side, var(--obs-pool-warm), transparent)", "box-shadow: var(--obs-beam-glow)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".ui-page-paper-shelf .paper-filter[aria-pressed=\"true\"]", "border-bottom-color: var(--obs-accent)", "background: radial-gradient(closest-side, var(--obs-pool-warm), transparent)", "box-shadow: inset 0 -1px var(--obs-accent)", "color: var(--obs-accent)", "text-decoration-color: transparent", { media: "(forced-colors: none)" }),
      rule(".ui-page-paper-shelf .paper-filter:active:not(:disabled)", "background: radial-gradient(closest-side, var(--obs-pool-press), transparent)", "box-shadow: inset 0 -1px var(--obs-accent)", { media: "(forced-colors: none)" }),
      rule(".ui-page-paper-shelf .paper-search:focus-visible", "border-bottom-color: var(--obs-accent)", "box-shadow: 0 1px 0 var(--obs-accent), var(--obs-beam-glow)", "outline-color: var(--obs-accent)", { media: "(forced-colors: none)" }),
      rule(".ui-page-paper-shelf .paper-search", "transition: border-color .14s ease-out, box-shadow .14s ease-out", { media: null }),
      rule(".ui-page-paper-shelf .paper-filter[aria-pressed=\"true\"]", "border-bottom: 3px double Highlight", { media: "(forced-colors: active)" })
    ],
    lacks: [rule(".ui-page-paper-shelf .paper-filter", "background: var(--obs-surface)"), rule(".ui-page-paper-shelf .paper-filter", "border-radius: var(--radius-control)")]
  },
  {
    name: "a CV or Paper Shelf record under a hovering pointer takes the old record glow on the sheet's terms (2026-11-26): on a layer behind its text, its rule lights brass to steel over the record glow as a pool, easing in over 180 ms; no depth shadow; nothing moves (E105)",
    has: [
      rule(".ui-page-paper-shelf .paper-card::after", "z-index: -1", "background: linear-gradient(90deg, var(--obs-accent), var(--obs-edge-cool) 45%, transparent) 0 0 / 100% 1px no-repeat, radial-gradient(closest-side, var(--obs-row-glow), transparent) 50% 50% / 100% 100% no-repeat", "opacity: 0", "transition: opacity .18s", "pointer-events: none", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".ui-page-paper-shelf .paper-card:hover::after", "opacity: 1", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".ui-page-cv .cv-edu-card::after", "z-index: -1", "background: linear-gradient(90deg, var(--obs-accent), var(--obs-edge-cool) 38%, transparent 72%) 0 100% / 100% 1px no-repeat, radial-gradient(farthest-side at 50% 100%, var(--obs-row-glow), transparent) 50% 100% / 100% 80% no-repeat", "opacity: 0", "transition: opacity .18s", "pointer-events: none", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".ui-page-cv .cv-edu-card:hover::after", "opacity: 1", { media: "(hover: hover) and (forced-colors: none)" })
    ],
    lacks: [rule(/\.(paper-card|cv-edu-card):hover$/, "transform"), rule(/\.(paper-card|cv-edu-card):hover$/, "translate"), rule(/\.(paper-card|cv-edu-card):hover$/, "box-shadow")]
  },
  {
    name: "Copy reference is a text control at 12 px; Contact's address is monospace on a faint pool with no box, and the ORCID iD mark rises 1 px over a warm pool under a hovering pointer, with motion allowed (E054); the 2026-11-26 forms",
    has: [
      rule(".ui-page-paper-shelf .paper-copy", "font-size: var(--ed-label)", { media: null }),
      rule(".ui-page-contact code", "background: radial-gradient(closest-side, color-mix(in srgb, var(--obs-edge-cool) 10%, transparent), transparent)", "margin-inline: -8px", "padding: 2px 14px", { media: null }),
      rule(".ui-page-contact main .orcid-link:hover img", "box-shadow: 0 0 14px 8px var(--obs-pool-warm)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".ui-page-contact main .orcid-link:hover img", "transform: translateY(-1px)", { media: "(hover: hover) and (prefers-reduced-motion: no-preference)" })
    ],
    lacks: [rule(".ui-page-contact code", "border"), rule(".ui-page-contact code", "border-radius")]
  },
  {
    name: "the CV print identity appears only in print, and only main prints, on A4 with 20 mm margins",
    has: [
      rule(".cv-print-identity", "display: none", { media: null }),
      rule(".cv-print-identity", "display: block", { media: "print" }),
      rule(".ui-page-cv main", "page: cv", { media: "print" }),
      text(/@page cv \{\s*size: A4;\s*margin: 20mm;\s*\}/)
    ]
  },
  {
    name: "one line opens each Contact row and the 404 section (2026-11-28): the labels draw none beside the row's own; the email callout's brass head and hover light lie on the row's line; the 404 glint lies on the section's line",
    has: [
      rule(".ui-page-contact .contact-row > h2", "background: none"),
      rule(".ui-page-contact .contact-email", "background: linear-gradient(90deg, var(--obs-accent), transparent) calc(10.75rem + var(--ed-space-6)) 0 / 64px 1px no-repeat, var(--obs-fade-line) 0 0 / 100% 1px no-repeat", { media: "(min-width: 861px)" }),
      rule(/\.contact-email:has\(> \.contact-callout:hover\)$/, "background: linear-gradient(90deg, var(--obs-accent), var(--obs-edge-cool) 45%, transparent) calc(10.75rem + var(--ed-space-6)) 0 / calc(100% - 10.75rem - var(--ed-space-6)) 1px no-repeat, var(--obs-fade-line) 0 0 / 100% 1px no-repeat", { media: "(hover: hover)" }),
      rule(".ui-page-not-found .two-col > h2", "background: none"),
      rule(".ui-page-not-found .archive-index::before", "top: calc(-24px - var(--section-pad))", { media: "screen and (forced-colors: none)" })
    ]
  },
  {
    name: "from 1600 px the Photography page's Camera section and Onward keep the wall's 72rem, so its blocks share one right edge; on phones the Paper Shelf frontispiece is a 56 px print beside its label (2026-11-28)",
    has: [
      rule(".ui-page-photography .photo-camera", "max-width: 72rem", { media: "(min-width: 1600px)" }),
      rule(".ui-page-paper-shelf .shelf-frontispiece", "--plate-w: 3.5rem", "align-items: center", { media: "(max-width: 760px)" })
    ]
  }
];
