// Style contract, research reading (WP3): the contents bar and its offset maths, the Analytical Pathway grid hook,
// the comparison table on phones, the Home emblem and the print rules of the Research pages (inventory §4), as written
// in components/{research-guide,pathway,comparison}.css and pages/home.css.
import { rule } from "./matchers.mjs";

export const owner = "WP3";

const phone = "(max-width: 760px)";

export const contract = [
  {
    name: "the contents bar sticks once its script is ready, on an opaque ground above the reading column",
    has: [rule(".research-guide[data-ready]", "position: sticky", "top: 0", "z-index: var(--z-guide)"), rule(".research-guide", "background: var(--obs-paper)")]
  },
  {
    name: "headings reached from the contents bar clear it: the script's offset is every target's scroll margin",
    has: [rule("html[data-research-reading]", "scroll-padding-top: 0"), rule(":where(main *)", "scroll-margin-top: var(--research-guide-offset, 1rem)")]
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
    name: "the current section's underline is a border that changes colour only, so marking it moves nothing; it is ink, as the bar is not one of the concept's brass places",
    has: [rule(".research-guide a::after", "position: absolute", "border-top: 2px solid transparent"), rule(".research-guide a[aria-current]::after", "border-color: var(--obs-text)")]
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
    name: "print leaves out the contents bar and prints the pathway scope expanded",
    has: [
      rule(".research-guide", "display: none", { media: "print" }),
      rule(".pathway-detail > summary", "display: none", { media: "print" }),
      rule(".pathway-detail::details-content", "content-visibility: visible", { media: "print" })
    ]
  }
];
