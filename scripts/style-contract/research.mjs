// Style contract, research reading (WP3): the contents bar and its offset maths, the Analytical Pathway grid hook,
// the comparison table on phones, the Home emblem and the print rules of the Research pages (inventory §4), as written
// in components/{research-guide,pathway,comparison}.css and pages/home.css.
import assert from "node:assert/strict";
import { rule, text } from "./matchers.mjs";

export const owner = "WP3";

const phone = "(max-width: 760px)";

export const contract = [
  {
    name: "the contents bar sticks once its script is ready, flush under the floating header (--header-clearance, 0 where it does not float), on an opaque ground above the reading column: a band of the sheet, its solid ground on its own layer feathered 64 px past the content and 12 px above and below, over a fading foot line, never a box (2026-11-26); in Light the old face's brass sheen lies on it as a flat tint feathered like the band (2026-11-28)",
    has: [
      rule(".research-guide[data-ready]", "position: sticky", "top: var(--header-clearance)", "z-index: var(--z-guide)", "margin-inline: -64px", "padding-inline: 64px"),
      rule(".research-guide", "background: var(--obs-fade-line) 0 100% / 100% 1px no-repeat, var(--obs-sheen-pool)", { media: null }),
      rule(".research-guide[data-ready]::before", "z-index: -1", "inset: -6px calc(64px - var(--obs-guide-reach)) -10px", "background: var(--obs-sheen-band), linear-gradient(90deg, transparent, var(--obs-sheet-solid) var(--obs-guide-reach), var(--obs-sheet-solid) calc(100% - var(--obs-guide-reach)), transparent)", "mask-image: linear-gradient(180deg, transparent, #000 12px, #000 calc(100% - 12px), transparent)", { media: null }),
      rule(".research-guide[data-ready]::before", "inset: -6px 0 -10px", "background: var(--obs-sheen-band), var(--obs-sheet-solid)", { media: phone })
    ],
    lacks: [rule(".research-guide", "border-radius"), rule(/\.research-guide$/, "border: 1px solid var(--obs-line)")]
  },
  {
    name: "headings reached from the contents bar clear the floating header and the bar: the root's scroll padding is the header, the script's offset is every target's scroll margin, and the Research pages do not cancel the padding",
    has: [rule("html", "scroll-padding-top: var(--header-clearance)", { media: null }), rule(":where(main *)", "scroll-margin-top: var(--research-guide-offset, 1rem)")],
    lacks: [rule("html[data-research-reading]", "scroll-padding-top")]
  },
  {
    name: "on phones the contents list folds until the reader opens it, and the toggle shows only once the script is ready",
    has: [
      rule(/\.research-guide\[data-ready\]:not\(\[data-open\]\) ol$/, "display: none", { media: phone }),
      rule(".research-guide button", "display: none", { media: null }),
      rule(".research-guide[data-ready] button", "display: flex", { media: phone })
    ]
  },
  {
    name: "the current section is marked outside the flow, so marking it moves nothing: as on the old bar (owner, 2026-11-18), a warm pool behind the link (the old filled cell, 2026-11-26), brass text and a short centred brass bar with its glow, a soft pool under the pointer, easing in 180 ms; on phones the bar stands at the cell's left edge (E039)",
    has: [
      rule(".research-guide", "isolation: isolate"),
      rule(".research-guide a::after", "position: absolute", "border-top: 2px solid transparent"),
      rule(".research-guide a::before", "position: absolute", "z-index: -1", "transition: background-color 180ms ease"),
      rule(".research-guide a:hover::before", "background: radial-gradient(closest-side, var(--obs-pool-hover), transparent)"),
      rule(".research-guide a[aria-current]", "color: var(--obs-accent)"),
      rule(".research-guide a[aria-current]::before", "background: radial-gradient(closest-side, var(--obs-pool-warm), transparent)"),
      rule(".research-guide a[aria-current]::before", "inset: -12px -25%", { media: "(min-width: 761px)" }),
      rule(".research-guide a[aria-current]::after", "inset: auto calc(50% - 16px) 5px", "border-color: var(--obs-accent)", "box-shadow: 0 0 9px var(--obs-gold-glow)", { media: null }),
      rule(".research-guide a[aria-current]::after", "border-left: 2px solid var(--obs-accent)", { media: phone }),
      rule(".research-guide a::before", "display: none", { media: "(forced-colors: active)" })
    ],
    lacks: [rule(".research-guide a[aria-current] > span", "opacity")]
  },
  {
    name: "on phones and touch screens the old soft drop shadow under the contents toggle is a 16 px shade under the band's foot at the same alpha (E043, 2026-11-26)",
    has: [rule(".research-guide[data-ready]::after", "top: 100%", "height: 16px", "background: linear-gradient(180deg, var(--obs-band-shade), transparent)", { media: "(max-width: 760px), (hover: none) and (pointer: coarse)" })],
    check(_source, { read }) {
      assert.match(read("src/styles/folio/00-tokens.css"), /--obs-band-shade: rgba\(0, 0, 0, \.16\);/, "the shade keeps the old touch shadow's .16 alpha in Space");
    }
  },
  {
    name: "the pathway detail opens with the old chevron in place of the plus: it turns down with a 2 px nudge in 180 ms and moves nothing else (E040)",
    has: [
      rule(".pathway-detail > summary::after", "content: \"\"", "width: 7px", "height: 7px", "border-right: 1.5px solid", "border-bottom: 1.5px solid", "transform: rotate(-45deg)", "transition: transform 180ms ease"),
      rule(".pathway-detail[open] > summary::after", "transform: translateY(-2px) rotate(45deg)")
    ]
  },
  {
    name: "a Research section heading's box reaches up over its kicker row to the section rule, so a contents link (offset measured on the heading) lands the rule, number and kicker below the bar and the current-section test reads the same box",
    has: [rule(".ui-page-research .folio-section > h2", "margin-top: -3.25rem", "padding-top: 3.25rem")]
  },
  {
    name: "on phones the comparison table's empty corner cell stays in the table model (collapsed, never display: none), so each cell keeps its own column header",
    has: [rule(".comparison-table thead td", "padding-block: 0")],
    lacks: [rule(/comparison-table.*td:empty$/, "display: none"), rule(/comparison-table thead td$/, "display: none")]
  },
  {
    name: "the pathway head joins the row grid, so the chip can stay the head's last child in the markup",
    has: [rule(".pathway-item-head", "display: contents")]
  },
  {
    name: "on phones the comparison rows stack under the material heads and each cell names its material",
    has: [rule(".comparison-table thead", "display: block", { media: phone }), rule(".comparison-table .comparison-table__cell-label", "display: block", { media: phone })]
  },
  {
    name: "the polarisation emblem keeps a 44 px target and vertical page panning while it is dragged",
    has: [rule(".ui-page-home .affiliation-emblem", "width: 44px", "height: 44px", "touch-action: pan-y")]
  },
  {
    name: "the Home Research control's old arrow chip is a steel arrow glyph that nudges up and right on hover, the CV control's ID box small muted capitals; decorative to assistive technology, and not under forced colours (E053, 2026-11-26)",
    has: [
      rule(".ui-page-home .home-actions .button::after", "content: \"\\2192\" / \"\"", "color: var(--obs-edge-cool)", "transition: transform 200ms var(--ed-ease-out)", { media: "(forced-colors: none)" }),
      rule(".ui-page-home .home-actions .button.secondary::after", "content: \"ID\" / \"\"", "color: var(--obs-muted)", { media: "(forced-colors: none)" }),
      rule(".ui-page-home .home-actions .button:not(.secondary):hover::after", "transform: translate(3px, -3px)", { media: "(forced-colors: none)" })
    ],
    lacks: [rule(".ui-page-home .home-actions .button::after", "border"), rule(".ui-page-home .home-actions .button::after", "border-radius")]
  },
  {
    name: "the Home keywords (the old pills, E052) are a wrapping line of small muted words at 12 px (the prose floor), no capsule, easing in 160 ms (2026-11-26: the owner's request supersedes the pill form)",
    has: [
      rule(".ui-page-home .home-keywords", "display: flex", "flex-wrap: wrap", "gap: .5rem 1.1rem", "list-style: none"),
      rule(".ui-page-home .pill", "color: var(--obs-muted)", "font-size: .75rem", "font-weight: 500", "transition: color .16s, background-color .16s, opacity .16s", { media: null })
    ],
    lacks: [rule(".ui-page-home .pill", "border"), rule(".ui-page-home .pill", "border-radius")]
  },
  {
    name: "the keywords carry the old glass highlight as a glint hairline above each word and a pool behind it, drawn without blur (E097); a Home timeline record glows under a hovering pointer and never moves (E105)",
    has: [
      rule(".ui-page-home .pill", "background: var(--obs-glass-glint) 50% 0 / 100% 1px no-repeat, radial-gradient(closest-side, var(--obs-pool), transparent)", { media: "(forced-colors: none)" }),
      rule(".ui-page-home .home-timeline-list > li:hover", "box-shadow: var(--obs-record-depth)", { media: "(hover: hover) and (forced-colors: none)" })
    ],
    lacks: [rule(/\.pill$/, "backdrop-filter"), rule(/home-timeline-list > li:hover$/, "transform")]
  },
  {
    name: "print leaves out the contents bar and prints the pathway scope expanded",
    has: [
      rule(".research-guide", "display: none", { media: "print" }),
      rule(".pathway-detail > summary", "display: none", { media: "print" }),
      rule(".pathway-detail::details-content", "content-visibility: visible", { media: "print" })
    ]
  },
  {
    name: "in forced colours the sticky contents band keeps an opaque system ground, so text scrolling under it never shows through its links (2026-11-28)",
    has: [rule(".research-guide[data-ready]", "background: Canvas", { media: "(forced-colors: active)" })]
  },
  {
    name: "the Home hero's shade pool is lighter than a masthead's (--obs-pool-shade-hero) and takes its geometry from the theme: hugging the words in Space, fading wide on the Light paper, always inside the sheet on the left (E020, E057; 2026-11-28)",
    has: [
      rule(".ui-page-home .home-title__main::after", "inset: var(--obs-hero-pool-inset)", "background: var(--obs-pool-shade-hero)", "mask-image: var(--obs-hero-pool-mask)", { media: null }),
      text("--obs-pool-shade-hero: rgba(14, 21, 35, .74)"),
      text("--obs-hero-pool-inset: -22px -44px -18px -48px")
    ]
  },
  {
    name: "the labels take the accent again (owner, 2026-11-28): the Research Log's archive terms in brass or champagne; the contents label, the contents toggle's label and the project-scope terms stay muted, as before the de-box pass",
    has: [
      rule(".ui-page-research-log .log-parts dt", "color: var(--obs-accent)", { media: null }),
      rule(".research-guide-label", "color: var(--obs-muted)", { media: null }),
      rule(".research-guide button .kicker", "color: var(--obs-muted)", { media: null }),
      rule(".ui-page-research .research-scope dt.kicker", "color: var(--obs-muted)", { media: null })
    ]
  },
  {
    name: "nothing shifts while Research streams in (2026-11-28): the project-scope note is dl + p, not a structural pseudo-class that looks back from the end (it does not match until the aside has finished parsing), and where its label shows the contents band keeps its height before its cells arrive",
    has: [
      rule(".ui-page-research .research-scope > dl + p", "margin: 0", "font-size: var(--ed-label)", { media: null }),
      rule(".research-guide", "min-height: 54px", { media: "(min-width: 1081px)" })
    ],
    lacks: [rule(/research-scope > p:last-of-type/, "margin: 0")]
  }
];
