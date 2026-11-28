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
    name: "a Mission Log photograph under a fine pointer shows the old shadow, Open chip and scan line, rises 2 px and runs the scan only with motion allowed, FX on and the page awake; only viewer buttons answer, so phones keep plain figures; forced colours show none of it (E044; since 2026-11-28 the shadow joins the print's own and the scan line covers the 4 : 3 image, never the caption, so no card appears around the figure)",
    has: [
      rule(".mission-photo-grid figure", "position: relative"),
      rule(".mission-photo-grid [role]::before", "content: \"Open\" / \"\"", "opacity: var(--lit, 0)", { media: "(forced-colors: none)" }),
      rule(".mission-photo-grid [role]:is(:hover, :focus-visible)", "--lit: 1", { media: "(forced-colors: none)" }),
      rule(".mission-photo-grid [role]:is(:hover, :focus-visible) img", "box-shadow: var(--obs-print-shadow), var(--obs-photo-hover-shadow)", { media: "(forced-colors: none)" }),
      rule(".mission-photo-grid [role]:is(:hover, :focus-visible)", "transform: translateY(-2px)", { media: "(prefers-reduced-motion: no-preference) and (forced-colors: none)" }),
      rule(".mission-photo-grid [role]::after", "inset: 0 0 auto", "aspect-ratio: 4 / 3", "background: var(--obs-scanline) 0 0 / 100% 180%", "mix-blend-mode: screen", "opacity: calc(var(--lit, 0) * .72)", "pointer-events: none", { media: "(forced-colors: none)" }),
      rule(/:where\(html:not\(\.ambient-fx-disabled, \.mads-power-low, \.mads-power-idle, \.mads-page-hidden\)\) \.mission-photo-grid \[role\]:hover::after$/, "animation: mission-scanline 1.8s linear infinite", { media: "(prefers-reduced-motion: no-preference) and (forced-colors: none)" }),
      text(/@keyframes mission-scanline \{ from \{ background-position: 0 -80%; \} to \{ background-position: 0 120%; \} \}/)
    ],
    lacks: [rule(/mission-photo-grid (figure|\[role\])(:is\(:hover, :focus-visible\))?$/, "transform: translateY(-2px)", { media: null }), rule(/mission-photo-grid \[role\]:is\(:hover, :focus-visible\)$/, "box-shadow: var(--obs-photo-hover-shadow)")]
  },
  {
    name: "the current Mission Index record (its old brass edge and glow, 2026-11-26) reads in brass beside a 2 px brass rule on a warm pool, with a glowing bead on its rule, and the index scrolls on a thin brass bar (E046)",
    has: [
      rule(".mission-jump-card[aria-current=\"true\"]", "position: relative", "border-left-color: var(--obs-accent)", "color: var(--obs-accent)", "background: var(--obs-fade-start) 0 100% / 100% 1px no-repeat, radial-gradient(closest-side, var(--obs-pool-warm), transparent)"),
      rule(".mission-jump-card[aria-current=\"true\"]::before", "width: 8px", "height: 8px", "border-radius: 50%", "background: var(--obs-accent)", "box-shadow: 0 0 10px var(--obs-accent)"),
      rule(".mission-jump-grid", "scrollbar-width: thin", "scrollbar-color: var(--obs-accent) var(--obs-paper)", { media: "(min-width: 1200px)" })
    ]
  },
  {
    name: "unlocked, the project context and the pathway lie on the sheet (2026-11-26): each under a head hairline with a resting light pool (in Light with the old face's faint brass sheen, 2026-11-28), no frame, corner or face, their words on the column's edge; under a hovering pointer the pool warms to the record glow and the head lights brass to steel (E105); the session line and the lock section between fading lines; forced colours and print keep plain rules",
    has: [
      rule(".ui-page-research-graduation :is(.graduation-context, .graduation-pathway)", "padding: 22px 0", "background: var(--obs-head-line) 0 0 / 100% 1px no-repeat, var(--obs-sheen-pool) 50% 50% / 100% 100% no-repeat, radial-gradient(closest-side, var(--obs-pool), transparent) 50% 50% / 100% 100% no-repeat", { media: null }),
      rule(".ui-page-research-graduation :is(.graduation-context, .graduation-pathway):hover", "background: linear-gradient(90deg, var(--obs-accent), var(--obs-edge-cool) 45%, transparent) 0 0 / 100% 1px no-repeat, radial-gradient(closest-side, var(--obs-row-glow), transparent) 50% 50% / 100% 100% no-repeat", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".ui-page-research-graduation .research-unlocked-session", "background: var(--obs-fade-line) 0 0 / 100% 1px no-repeat, var(--obs-fade-line) 0 100% / 100% 1px no-repeat", { media: null }),
      rule(".ui-page-research-graduation .research-lock-section", "background: var(--obs-fade-line) 0 0 / 100% 1px no-repeat", { media: null }),
      rule(".ui-page-research-graduation :is(.research-lock-section, .graduation-context, .graduation-pathway)", "border-top: 1px solid var(--obs-line)", "background: none", { media: "(forced-colors: active), print" })
    ],
    lacks: [rule(/graduation-(context|pathway)\)$/, "border-radius"), rule(/graduation-(context|pathway)\)$/, "border"), rule(/graduation-(context|pathway)\)$/, "background-image")]
  },
  {
    name: "an entry's record brief divides its columns with vertical fading lines, its terms in the one label style in the accent (owner, 2026-11-28); the comparison lies between two fading lines; forced colours and print keep the hairlines",
    has: [
      rule(".mission-progress > div + div", "background: var(--obs-fade-line-v) 0 0 / 1px 100% no-repeat", { media: "@container entry (min-width: 700px)" }),
      rule(".mission-progress dt", "color: var(--obs-accent)", "font-size: var(--label-size)", "font-weight: var(--label-weight)", "letter-spacing: var(--label-track)", "text-transform: uppercase", { media: null }),
      rule("[data-mission-comparison]", "background: var(--obs-fade-line) 0 0 / 100% 1px no-repeat, var(--obs-fade-line) 0 100% / 100% 1px no-repeat", { media: null }),
      rule("[data-mission-comparison]", "border-block: 1px solid var(--obs-hairline)", { media: "(forced-colors: active), print" }),
      rule(".mission-progress > div + div", "border-left: 1px solid var(--obs-hairline)", "background: none", { media: "(forced-colors: active), print" })
    ]
  },
  {
    name: "the graduation title keeps version 1's one line in its 960 px measure: at most 4.4rem from 1200 px",
    has: [rule(".ui-page-research-graduation .masthead > h1", "font-size: min(var(--ed-display), 4.4rem)", { media: "(min-width: 1200px)" })]
  },
  {
    name: "the graduation title never breaks inside words",
    lacks: [rule(/ui-page-research-graduation.*h1$/, "overflow-wrap: anywhere")]
  }
];
