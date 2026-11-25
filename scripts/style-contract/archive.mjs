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
    name: "the open lightbox keeps touch and overscroll inside itself, on the veil of the page's theme (E045)",
    has: [rule(".mission-lightbox", "touch-action: none", "overscroll-behavior: contain", "background: var(--obs-lightbox-veil)")]
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
    name: "the Mission Index ledger is sticky 24 px under the floating header and scrolls inside itself from 1200 px, never taller than the window below the header, with 48 px rows",
    has: [
      rule(".mission-index-section", "position: sticky", "top: calc(var(--header-clearance) + var(--ed-space-5))", { media: "min-width: 1200px" }),
      rule(".mission-index-panel", "max-height: calc(100vh - var(--ed-space-7) - var(--header-clearance))", { media: "min-width: 1200px" }),
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
    name: "the atlas opens on the old deep shadow and dark scrim, over a 64 px grid map with steel selected paths and nodes; the public steps keep no grid (E031)",
    has: [
      rule(".evidence-atlas", "box-shadow: var(--obs-atlas-shadow)"),
      rule(".evidence-atlas::backdrop", "background: var(--obs-atlas-scrim)"),
      rule(".atlas-map", "background-size: 64px 64px"),
      rule(".atlas-public .atlas-map", "background: none"),
      rule(".atlas-map path.is-selected", "stroke: var(--obs-edge-cool)", "stroke-width: 2"),
      rule(".atlas-node[aria-pressed=\"true\"]", "box-shadow: 0 8px 16px -12px var(--obs-edge-cool)"),
      rule(".atlas-step[aria-selected=\"true\"]", "background: color-mix(in srgb, var(--obs-edge-cool) 7%, transparent)")
    ]
  },
  {
    name: "the Mission Log viewer keeps the old light (owner, 2026-11-18): glass buttons that glow under the pointer, and the image dimmed while it decodes, with no blur and no lift (E045)",
    has: [
      rule(".mission-lightbox__btn", "background: var(--obs-lightbox-button)", "box-shadow: var(--obs-touch-shadow)", "transition: box-shadow .16s"),
      rule(".mission-lightbox__btn:is(:hover, :focus-visible)", "background: var(--obs-lightbox-button-hover)", "box-shadow: var(--obs-lightbox-button-glow)"),
      rule(".mission-lightbox__img.is-decoding", "opacity: .72", "filter: saturate(.9) contrast(.94)")
    ],
    lacks: [rule(/mission-lightbox__btn/, "transform: translateY(-1px)")]
  },
  {
    name: "a Mission Log photograph under a fine pointer shows the old shadow, Open chip and scan line, rises 2 px and runs the scan only with motion allowed, FX on and the page awake; only viewer buttons answer, so phones keep plain figures; forced colours show none of it (E044)",
    has: [
      rule(".mission-photo-grid figure", "position: relative"),
      rule(".mission-photo-grid [role]::before", "content: \"Open\" / \"\"", "opacity: var(--lit, 0)", { media: "(forced-colors: none)" }),
      rule(".mission-photo-grid [role]:is(:hover, :focus-visible)", "--lit: 1", "box-shadow: var(--obs-photo-hover-shadow)", { media: "(forced-colors: none)" }),
      rule(".mission-photo-grid [role]:is(:hover, :focus-visible)", "transform: translateY(-2px)", { media: "(prefers-reduced-motion: no-preference) and (forced-colors: none)" }),
      rule(".mission-photo-grid [role]::after", "background: var(--obs-scanline) 0 0 / 100% 180%", "mix-blend-mode: screen", "opacity: calc(var(--lit, 0) * .72)", "pointer-events: none", { media: "(forced-colors: none)" }),
      rule(/:where\(html:not\(\.ambient-fx-disabled, \.mads-power-low, \.mads-power-idle, \.mads-page-hidden\)\) \.mission-photo-grid \[role\]:hover::after$/, "animation: mission-scanline 1.8s linear infinite", { media: "(prefers-reduced-motion: no-preference) and (forced-colors: none)" }),
      text(/@keyframes mission-scanline \{ from \{ background-position: 0 -80%; \} to \{ background-position: 0 120%; \} \}/)
    ],
    lacks: [rule(/mission-photo-grid (figure|\[role\])(:is\(:hover, :focus-visible\))?$/, "transform: translateY(-2px)", { media: null })]
  },
  {
    name: "the current Mission Index record glows brass, with a glowing bead on its rule, and the index scrolls on a thin brass bar (E046)",
    has: [
      rule(".mission-jump-card[aria-current=\"true\"]", "position: relative", "box-shadow: 0 0 16px var(--obs-gold-glow)"),
      rule(".mission-jump-card[aria-current=\"true\"]::before", "width: 8px", "height: 8px", "border-radius: 50%", "background: var(--obs-accent)", "box-shadow: 0 0 10px var(--obs-accent)"),
      rule(".mission-jump-grid", "scrollbar-width: thin", "scrollbar-color: var(--obs-accent) var(--obs-paper)", { media: "(min-width: 1200px)" })
    ]
  },
  {
    name: "the graduation title never breaks inside words",
    lacks: [rule(/ui-page-research-graduation.*h1$/, "overflow-wrap: anywhere")]
  }
];
