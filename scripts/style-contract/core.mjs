// Style contract, core (WP1): the global mechanics the reset, utilities and state files carry (spec §2.1, §6.1).
// Every row holds for the Folio bundle (src/styles/folio: 02-reset, 05-utilities, 03-base and states/*).
import assert from "node:assert/strict";
import { rule, text } from "./matchers.mjs";

export const owner = "WP1";

const phoneMedia = "(max-width: 760px)";

export const contract = [
  {
    name: "[hidden] always hides",
    has: [rule("[hidden]", "display: none !important", { media: null })]
  },
  {
    name: "visually hidden text keeps its place in the accessibility tree",
    has: [".visually-hidden", ".planetary-sr-only", ".mission-sr-only", ".orcid-new-tab"].map((name) => rule(name, "position: absolute", "overflow: hidden", "clip-path: inset(50%)", "white-space: nowrap"))
  },
  {
    name: "the entrance, lightbox, presentation and atlas lock page scrolling",
    has: ["html.cosmic-arrival-active", "html.mission-lightbox-open", "body.mission-lightbox-open", "html.obs-presenting", "html.mineral-atlas-open"].map((name) => rule(name, "overflow: hidden"))
  },
  {
    name: "a closed dialog never displays",
    has: [rule("dialog:not([open])", "display: none")]
  },
  {
    name: "soft navigation swaps the page without smooth scrolling",
    has: [rule(/(^|\s)(html)?\.mads-soft-nav-active$/, "scroll-behavior: auto")]
  },
  {
    name: "the phone breakpoint is the one the header script uses",
    has: [text(`@media ${phoneMedia}`)],
    check(_source, { read }) {
      const media = read("public/assets/js/site-header.js").match(/const COLLAPSIBLE_NAVIGATION_MEDIA = "([^"]+)"/)?.[1];
      assert.equal(media, phoneMedia, "site-header.js COLLAPSIBLE_NAVIGATION_MEDIA");
    }
  },
  {
    name: "controls revealed by scripts reserve their space before the scripts run",
    has: [rule("[hidden][data-reserve-space]", "display: var(--reserve-display, flex) !important", "visibility: hidden", { media: "(scripting: enabled)" })]
  },
  {
    name: "the page never scrolls sideways",
    has: [rule("html", "overflow-x: clip"), rule("body", "overflow-x: clip")]
  },
  {
    name: "the skip link waits off-screen until it is focused",
    has: [rule(".site-skip-link", "position: fixed", "z-index"), rule(/(^|\s)\.site-skip-link:focus(-visible)?$/)]
  },
  {
    name: "reduced motion stops CSS motion, on the pseudo-elements the universal selector misses too",
    has: [
      text(/@media\s*\(prefers-reduced-motion:\s*reduce\)/),
      rule("::backdrop", "transition-duration: 0s !important", "animation-duration: 0s !important", { media: "(prefers-reduced-motion: reduce)" }),
      rule("::details-content", "transition-duration: 0s !important", { media: "(prefers-reduced-motion: reduce)" })
    ]
  },
  {
    name: "an open disclosure stops clipping once it has opened, so focus outlines are drawn whole",
    has: [rule(":where(details[open])::details-content", "overflow: visible", { media: "selector(::details-content)" })]
  },
  {
    name: "a night box sets its own text colour from the Space tokens",
    has: [rule(".on-night", "color: var(--obs-text)", { media: null })]
  },
  {
    name: "under forced colours every marker, whatever its value, paints in the system text colour",
    has: [".marker[data-value]", ".pathway-chip[data-status]::before", "[data-evidence-status] > .evidence-status__tag::before"].map((name) => rule(name, "forced-color-adjust: none", "color: canvastext", { media: "(forced-colors: active)" }))
  },
  {
    name: "smooth scrolling only without a reduced-motion preference",
    has: [rule("html", "scroll-behavior: smooth", { media: "(prefers-reduced-motion: no-preference)" })]
  }
];
