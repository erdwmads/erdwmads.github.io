// Style contract, protected archive and overlays (WP6): the non-visual mechanics of the Mission Log lightbox, the phone
// figures, the sealed panel, the Mission Index ledger, the entry body and the atlas dialog (inventory §4, spec §4.11),
// as written in components/{lightbox,atlas,mission-log}.css and pages/graduation.css.
import { rule, text } from "./matchers.mjs";

export const owner = "WP6";

export const contract = [
  {
    name: "the lightbox stays invisible and inert until it opens",
    has: [rule(".mission-lightbox", "position: fixed", "visibility: hidden", "pointer-events: none"), rule(".mission-lightbox.is-open", "visibility: visible", "pointer-events: auto")]
  },
  {
    name: "the open lightbox keeps touch and overscroll inside itself, on the screen ground in both themes",
    has: [rule(".mission-lightbox", "touch-action: none", "overscroll-behavior: contain", "background: var(--obs-screen)")]
  },
  {
    name: "the lightbox caption takes layout space below the image and wraps in its own column",
    has: [rule(".mission-lightbox__captionbar", "grid-template-columns: minmax(0, 1fr) auto"), rule(".mission-lightbox__caption", "min-width: 0")],
    lacks: [rule(".mission-lightbox__captionbar", "position: fixed")]
  },
  {
    name: "phone Mission Log figures stay inline figures",
    // docs/ui-invariants.md cites this block by name.
    has: [text(/\/\*[^*]*Mobile Mission Log: Disable Large Image Lightbox/), rule("html.mobile-mission-lightbox-disabled .mission-lightbox", "display: none"), rule(/html\.mobile-mission-lightbox-disabled .*img$/, "pointer-events: none")]
  },
  {
    name: "the entry kicker is hidden after the record header",
    has: [rule(".mission-record-header ~ .mission-original-record > .mission-entry-kicker", "display: none")]
  },
  {
    name: "an entry body never keeps a desktop width on phones",
    has: [rule(".mission-log-entry .research-note-body", "min-width: 0", "width: 100%", "max-width: 100%")]
  },
  {
    name: "scientific figures in entries and comparisons are never cropped",
    has: [rule(".mission-log-entry .mission-photo-grid img", "object-fit: contain"), rule(".mission-comparison-figure img", "object-fit: contain")]
  },
  {
    name: "the passkey block keeps its space from the first paint, so revealing it moves nothing",
    has: [rule(".research-passkey-controls", "--reserve-display: grid"), rule(".research-passkey-slot > *", "grid-area: 1 / 1"), rule(".research-passkey-status::before", "content: attr(data-reserve-text)", "float: left", "visibility: hidden")],
    lacks: [rule(/research-passkey-actions:has/, "display: none")]
  },
  {
    name: "the sealed panel opts its late controls into the space-reserving utility",
    source: "src/pages/research-graduation.astro",
    has: [text(/data-passkey-controls data-reserve-space hidden/), text(/data-passkey-setup data-reserve-space hidden/), text(/data-passkey-unlock data-reserve-space hidden/), text(/data-reserve-text="[^"]+"/)]
  },
  {
    name: "the Mission Index ledger is sticky and scrolls inside itself from 1200 px, with 48 px rows",
    has: [
      rule(".mission-index-section", "position: sticky", { media: "min-width: 1200px" }),
      rule(".mission-jump-grid", "overflow-y: auto", { media: "min-width: 1200px" }),
      rule(".mission-ledger__summary", "display: none", { media: "min-width: 1200px" }),
      rule(".mission-jump-card", "min-height: 48px"),
      rule(".mission-ledger__summary", "min-height: 48px")
    ]
  },
  {
    name: "the atlas dialog lays out only while open",
    has: [rule(".evidence-atlas[open]", "display: grid")],
    lacks: [rule(".evidence-atlas", "display: grid")]
  },
  {
    name: "the graduation title never breaks inside words",
    lacks: [rule(/ui-page-research-graduation.*h1$/, "overflow-wrap: anywhere")]
  }
];
