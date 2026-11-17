// Style contract, shell (WP2): the non-visual mechanics of the header, the FX layers, Interface 2046 and the entrance
// (inventory §4), as written in components/{header,fx-dock,ambient,interface-2046,mineral-fx,arrival,footer}.css, and
// the script edits of spec §3.4 that the stylesheets depend on. Global states are written in :where(), so the rows that
// name them match by pattern.
import assert from "node:assert/strict";
import { rule, text } from "./matchers.mjs";

export const owner = "WP2";

const phoneMedia = "(max-width: 760px)";

// The last @keyframes block with this name (the one that applies), braces matched; "" when there is none.
function lastKeyframes(source, name) {
  const start = source.lastIndexOf(`@keyframes ${name}`);
  if (start < 0) return "";
  let depth = 0, index = source.indexOf("{", start);
  for (; index < source.length; index++) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) break;
  }
  return source.slice(start, index + 1);
}

export const contract = [
  {
    name: "the phone menu opens in the page flow, never over the content",
    lacks: [rule(/mobile-nav-open\b.*\.header-actions$/, "position: absolute"), rule(/\.header-actions$/, "position: fixed")]
  },
  {
    name: "the phone menu button exists only on phones",
    has: [rule(".nav-toggle", "display: none", { media: null }), rule(".nav-toggle", "display: inline-flex", { media: phoneMedia })]
  },
  {
    name: "without the header controller, phones show the menu open and no button",
    has: [
      rule(/html:not\(\[data-nav-ready\]\).*\.nav-toggle$/, "display: none", { media: phoneMedia }),
      rule(/html:not\(\[data-nav-ready\]\).*\.header-actions$/, "display: block", { media: phoneMedia })
    ]
  },
  {
    name: "the navigation marker is positioned inside the navigation, and the resting rule keeps only a short fade",
    has: [rule(".nav", "position: relative"), rule(".obs-nav-beam", "position: absolute"), rule(".nav__links a::before", "--motion-fade: .1s")]
  },
  {
    name: "the Research Log gate is a positioned box of its own",
    has: [rule(".nav-log-gate", "position: relative")]
  },
  {
    name: "the theme toggle keeps one width in both themes and at every width",
    has: [rule(/\.theme-toggle$/, "width: 112px", { media: null })]
  },
  {
    name: "fixed FX layers never take input, and the Interface 2046 layer is never transformed",
    has: [
      rule(".ambient-space-layer", "position: fixed", "pointer-events: none"),
      rule(".ui2046-layer", "pointer-events: none"),
      rule(".ui2046-solar-system", "position: fixed", "pointer-events: none"),
      rule(".ui2046-rail", "position: fixed", "pointer-events: none"),
      rule(".ui2046-progress", "position: fixed", "pointer-events: none"),
      rule(".mineral-cleavage", "position: fixed", "pointer-events: none")
    ],
    lacks: [rule(".ui2046-layer", "transform"), rule(".ui2046-layer", "z-index")]
  },
  {
    name: "ambient particles keep continuous positions at animation boundaries",
    has: [text("@keyframes ambientDustMove"), text("@keyframes ambientPebbleMove"), rule(".ambient-dust", "animation-direction: alternate"), rule(".ambient-pebble", "animation-direction: alternate")],
    check(source) {
      for (const name of ["ambientDustMove", "ambientPebbleMove"]) {
        assert.doesNotMatch(lastKeyframes(source, name), /opacity:\s*0\s*;/, `${name} must not fade to 0 at a boundary`);
      }
    }
  },
  {
    name: "ambient-space.js restarts no particle at an iteration boundary",
    source: "public/assets/js/ambient-space.js",
    lacks: [text(/animationiteration/)]
  },
  {
    name: "Edge keeps the ambient layer mounted on its own compositing layer",
    has: [rule(/is-edge-browser\b.*\.ambient-space-layer$/, "transform: translate3d(0, 0, 0)", "backface-visibility: hidden")],
    lacks: [text(/is-edge-page-exiting\)?\s*\.ambient-space-layer/)]
  },
  {
    name: "Edge teardown never removes the ambient layer, and a visibility change never starts it",
    source: "public/assets/js/interface-2046.js",
    lacks: [text(/visibilitychange[\s\S]{0,240}beginEdgeTeardown/)],
    check(source, { read }) {
      const start = source.indexOf("function beginEdgeTeardown"), end = source.indexOf("function restoreEdgeTeardown");
      assert.ok(start >= 0 && end > start, "missing Edge teardown functions");
      assert.doesNotMatch(source.slice(start, end), /ambient-space-layer/);
      assert.match(read("public/assets/js/ambient-space.js"), /function initAmbientSpace\(\)[\s\S]*?if \(existing && existing\.querySelector\("\.ambient-dust"\)\) \{[\s\S]*?return;[\s\S]*?\}/);
    }
  },
  {
    name: "Edge page exit hides the Interface 2046 layer",
    has: [rule(/is-edge-page-exiting\b.*\.ui2046-layer\b/, "visibility: hidden")]
  },
  {
    name: "hidden pages, idle and low power pause the FX animations",
    has: [
      rule(/mads-page-hidden\b.*\.ambient-space-layer > \*$/, "animation-play-state: paused"),
      rule(/mads-power-idle\b.*\.ambient-space-layer > \*$/, "animation-play-state: paused"),
      rule(/mads-power-low\b.*\.ambient-space-layer > \*$/, "animation-play-state: paused"),
      rule(".ambient-space-layer.ambient-paused > *", "animation-play-state: paused"),
      rule(/ambient-fx-disabled\b.*\.ambient-space-layer$/, "display: none")
    ]
  },
  {
    name: "the lightbox, atlas and presentation pause or hide the FX layers",
    has: [
      rule(/mission-lightbox-open\b.*\.ambient-space-layer > \*$/, "animation: none"),
      rule(/mission-lightbox-open\b.*\.ambient-space-layer\b/, "visibility: hidden"),
      rule(/mineral-atlas-open\b.*\.ambient-space-layer\b/, "visibility: hidden"),
      rule(/obs-presenting\b.*\.ambient-space-layer\b/, "visibility: hidden")
    ]
  },
  {
    name: "phones show no HUD, effects dock or fixed Replay, and the spine is desktop only",
    has: [
      rule(/\.research-coordinates$/, "display: none", { media: phoneMedia }),
      rule(/\.obs-fx-dock$/, "display: none", { media: phoneMedia }),
      rule(/\.arrival-replay$/, "display: none", { media: phoneMedia }),
      rule(/\.footer-replay$/, "display: none", { media: "(min-width: 761px)" }),
      rule(/\.ui2046-progress$/, "display: none", { media: "(max-width: 1199px)" }),
      rule(/\.ui2046-rail$/, "display: none", { media: "(max-width: 1199px)" })
    ]
  },
  {
    name: "the spine tick is placed from --scroll-progress alone and drawn as an ink border, which forced colours keep",
    has: [
      text(/\.ui2046-progress > span\s*\{[^}]*translate:\s*0 calc\(var\(--scroll-progress, 0\) \* \(100vh - 20rem - 24px\)\)/),
      rule(".ui2046-progress > span", "border-left: 2px solid var(--obs-rule)")
    ],
    lacks: [rule(".ui2046-progress > span", "background"), rule(".ui2046-progress > span", "opacity")],
    check(_source, { read }) {
      const script = read("public/assets/js/interface-2046.js");
      assert.match(script, /bar\.style\.setProperty\('--scroll-progress'/);
      assert.doesNotMatch(script, /bar\.style\.(width|transform)\b/, "interface-2046.js writes only --scroll-progress (spec §3.4)");
    }
  },
  {
    name: "the closed entrance dialog never displays and its canvas fills it",
    has: [
      rule("dialog:not([open])", "display: none", { media: null }),
      rule(".arrival-universe canvas", "position: absolute", "inset: 0"),
      rule(".celestial-labels", "position: absolute", "pointer-events: none")
    ],
    lacks: [rule(/\.arrival$/, "display")]
  },
  {
    name: "the polarising cleavage path is not drawn with reduced motion",
    has: [rule(".mineral-cleavage", "display: none", { media: "(prefers-reduced-motion: reduce)" })]
  },
  {
    name: "the pointer edge light is retired and the effects panel stays in its dock (R2, R3)",
    source: "public/assets/js/observatory-interactions.js",
    lacks: [text("obs-edge-light"), text("data-edge-active"), text(/appendChild\(panel\)/), text("[data-mobile-nav]")]
  }
];
