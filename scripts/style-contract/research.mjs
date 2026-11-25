// Style contract, research reading (WP3): the contents bar and its offset maths, the Analytical Pathway grid hook,
// the comparison table on phones, the Home emblem and the print rules of the Research pages (inventory §4), as written
// in components/{research-guide,pathway,comparison}.css and pages/home.css.
import { rule } from "./matchers.mjs";

export const owner = "WP3";

const phone = "(max-width: 760px)";

export const contract = [
  {
    name: "the contents bar sticks once its script is ready, flush under the floating header (--header-clearance, 0 where it does not float), on an opaque ground above the reading column",
    has: [rule(".research-guide[data-ready]", "position: sticky", "top: var(--header-clearance)", "z-index: var(--z-guide)"), rule(".research-guide", "background: var(--obs-paper)")]
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
    name: "the current section is marked outside the flow, so marking it moves nothing: as on the old bar (owner, 2026-11-18), a filled cell behind the link, brass text and a short centred brass bar, a soft fill under the pointer, easing in 180 ms; on phones the bar stands at the cell's left edge (E039)",
    has: [
      rule(".research-guide", "isolation: isolate"),
      rule(".research-guide a::after", "position: absolute", "border-top: 2px solid transparent"),
      rule(".research-guide a::before", "position: absolute", "z-index: -1", "transition: background-color 180ms ease"),
      rule(".research-guide a:hover::before", "background-color: var(--obs-surface-hover)"),
      rule(".research-guide a[aria-current]", "color: var(--obs-accent)"),
      rule(".research-guide a[aria-current]::before", "background-color: var(--obs-highlight)"),
      rule(".research-guide a[aria-current]::after", "inset: auto calc(50% - 16px) -1px", "border-color: var(--obs-accent)", { media: null }),
      rule(".research-guide a[aria-current]::after", "border-left: 2px solid var(--obs-accent)", { media: phone }),
      rule(".research-guide a::before", "display: none", { media: "(forced-colors: active)" })
    ],
    lacks: [rule(".research-guide a[aria-current] > span", "opacity")]
  },
  {
    name: "on phones and touch screens the contents toggle sits on the old soft drop shadow (E043)",
    has: [rule(".research-guide button", "box-shadow: var(--obs-touch-shadow)", { media: "(max-width: 760px), (hover: none) and (pointer: coarse)" })]
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
    name: "the Home Research button carries the old tinted arrow chip, decorative to assistive technology, and not under forced colours (E053)",
    has: [
      rule(".ui-page-home .home-actions .button::after", "content: \"\\2192\" / \"\"", "width: 24px", "height: 24px", "border: 1px solid var(--obs-icon-chip-edge)", "background: var(--obs-icon-chip-face)", "opacity: .78", { media: "(forced-colors: none)" }),
      rule(".ui-page-home .home-actions .button::after", "width: 22px", "height: 22px", { media: "(max-width: 760px)" })
    ]
  },
  {
    name: "the Home keywords are the old site's pills: a wrapping row of rounded surface chips with a hairline edge, 12 px (the prose floor; old 11 px on desktop), easing in 160 ms (E052)",
    has: [
      rule(".ui-page-home .home-keywords", "display: flex", "flex-wrap: wrap", "gap: 7px", "list-style: none"),
      rule(".ui-page-home .pill", "padding: 5px 8px", "border: 1px solid var(--obs-hairline)", "border-radius: 999px", "background: var(--obs-surface)", "font-size: .75rem", "transition: color .16s, border-color .16s, box-shadow .16s, opacity .16s", { media: null })
    ]
  },
  {
    name: "the pills carry the old glass highlight band and top glint, drawn without blur (E097); a Home timeline record glows under a hovering pointer and never moves (E105)",
    has: [
      rule(".ui-page-home .pill", "background-image: var(--obs-glass-band)", "box-shadow: var(--obs-chip-glint)", { media: "(forced-colors: none)" }),
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
  }
];
