// Style contract, shell (WP2): the non-visual mechanics of the header, the FX layers, Interface 2046 and the entrance
// (inventory §4), as written in components/{header,fx-dock,ambient,interface-2046,mineral-fx,arrival,footer}.css, and
// the script edits of spec §3.4 that the stylesheets depend on. Global states are written in :where(), so the rows that
// name them match by pattern.
import assert from "node:assert/strict";
import { cssRules } from "../lib/css-rules.mjs";
import { rule, text } from "./matchers.mjs";

export const owner = "WP2";

const phoneMedia = "(max-width: 760px)";
// Where the header floats (R1); written identically in 00-tokens.css, components/header.css and components/backdrop.css.
const floatMedia = "(min-width: 761px) and (min-height: 600px) and (forced-colors: none)";
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    name: "the theme toggle keeps one width in both themes and at every width (a text control, 2026-11-26: one minimum width for both labels)",
    has: [rule(/\.theme-toggle$/, "min-width: 6.75rem", "justify-content: center", { media: null })]
  },
  {
    name: "the header floats only in the float media, at the height --header-clearance names (R1, owner 2026-11-18; version 1's 120 and 109 px bands, owner 2026-11-25)",
    has: [
      rule(".site-header", "position: relative", "background: var(--obs-header-surface)", { media: null }),
      rule(".site-header", "position: sticky", "top: 0", "z-index: var(--z-header)", { media: floatMedia })
    ],
    check(_source, { read }) {
      const at = `@media ${floatMedia} {`;
      for (const file of ["00-tokens.css", "components/header.css", "components/backdrop.css"]) {
        assert.ok(read(`src/styles/folio/${file}`).includes(at), `${file} must write the float media exactly as ${at}`);
      }
      const tokens = read("src/styles/folio/00-tokens.css");
      assert.match(tokens, new RegExp(`${escapeRegExp(at)}\\s*:root\\s*\\{\\s*--header-clearance:\\s*120px;`), "the tokens set --header-clearance: 120px in the float media (version 1's two rows)");
      assert.match(tokens, new RegExp(`${escapeRegExp(at.replace("761px", "1200px"))}\\s*:root\\s*\\{\\s*--header-clearance:\\s*109px;`), "the tokens set --header-clearance: 109px from 1200 px in the float media (version 1's one row)");
    }
  },
  {
    name: "the backdrops are fixed, take no input and sit under the content; the band only where the header floats",
    has: [
      rule("body::before", "position: fixed", "pointer-events: none", "z-index: var(--z-backdrop)", { media: null }),
      rule("body::after", "position: fixed", "pointer-events: none", "height: var(--header-clearance)", "z-index: var(--z-header-band)", { media: floatMedia })
    ],
    lacks: [rule("body::after", "content", { media: null })]
  },
  {
    name: "forced colours and print show no backdrop; more contrast shows no page picture",
    has: [
      rule("body::before", "display: none", { media: "(forced-colors: active), print" }),
      rule("body::after", "display: none", { media: "(forced-colors: active), print" }),
      rule("body::before", "display: none", { media: "(prefers-contrast: more)" })
    ]
  },
  {
    name: "each page draws its own picture as a luminance mask in the far ink (2026-11-28); phones load its upright 800 px tier, lighter",
    has: [
      rule("body::before", "background: var(--obs-far-ink)", "opacity: calc(var(--obs-far-opacity) * var(--bd-k, 1))", "mask-image: var(--bd-mask, linear-gradient(transparent, transparent))", "mask-mode: luminance", "mask-size: cover", { media: null }),
      rule(".ui-page-home", "--bd-mask: url(\"../img/backdrops/comet-west-mask-1600.webp\")", "--bd-at: calc(min(max(0px, 50vw - var(--sheet-half)) + var(--sheet-fade) * .4, max(var(--page-pad), 50vw - var(--page-max) / 2) - 60 * var(--bd-s)) - 260 * var(--bd-s)) 100%", { media: null }),
      rule(".ui-page-research", "--bd-mask: url(\"../img/asteroid-bennu-1280.webp\")", { media: null }),
      rule(".ui-page-ryugu-bennu", "--bd-mask: url(\"../img/backdrops/asteroid-ryugu-mask-1600.webp\")", { media: null }),
      rule(".ui-page-origins", "--bd-mask: url(\"../img/backdrops/cosmic-cliffs-mask-1600.webp\")", { media: null }),
      rule(".ui-page-research-log", "--bd-mask: url(\"../img/backdrops/comet-neowise-mask-1600.webp\")", { media: null }),
      rule(".ui-page-paper-shelf", "--bd-mask: url(\"../img/backdrops/trouvelot-orion-nebula-mask-1600.webp\")", { media: null }),
      rule(".ui-page-cv", "--bd-mask: url(\"../img/backdrops/trouvelot-milky-way-mask-1600.webp\")", { media: null }),
      rule(".ui-page-photography", "--bd-mask: url(\"../img/backdrops/milky-way-panorama-mask-1600.webp\")", { media: null }),
      rule(".ui-page-contact", "--bd-mask: url(\"../img/backdrops/comet-pons-brooks-mask-1600.webp\")", { media: null }),
      rule(".ui-page-not-found", "--bd-mask: url(\"../img/backdrops/dark-cloud-b68-mask-1600.webp\")", { media: null }),
      rule(".ui-page-research-graduation", "--bd-mask: url(\"../img/backdrops/trouvelot-november-meteors-mask-1600.webp\")", { media: null }),
      rule("html.research-unlocked .ui-page-research-graduation::before", "opacity: 0", { media: null }),
      rule("body::before", "opacity: calc(var(--obs-far-opacity-phone) * var(--bd-k, 1))", "mask-position: 50% 0", { media: phoneMedia }),
      rule(".ui-page-home", "--bd-mask: url(\"../img/backdrops/comet-west-mask-800.webp\")", "--bd-k: 1.4", { media: phoneMedia }),
      rule(".ui-page-research", "--bd-mask: url(\"../img/asteroid-bennu-800.webp\")", { media: phoneMedia }),
      rule(".ui-page-not-found", "--bd-mask: url(\"../img/backdrops/dark-cloud-b68-mask-800.webp\")", { media: phoneMedia })
    ],
    lacks: [rule("body::before", "background-image", { media: null }), rule("body::before", "filter", { media: null }), text(/far-plate/), text(/comet-mcnaught-mask/)]
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
      // A live layer is reused; it is rebuilt only when the window crosses 760 px into the other density (E103).
      assert.match(read("public/assets/js/ambient-space.js"), /function buildAmbientSpace\(\)[\s\S]*?if \(existing && existing\.querySelector\("\.ambient-dust"\) && existing\.classList\.contains\("is-lite"\) === lite\) \{[\s\S]*?return;[\s\S]*?\}/);
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
    name: "phones show no HUD or effects dock; no width shows the fixed Replay, which the footer's Replay entrance takes over at every width (one persistent control, 2026-11-26); the spine shows from 901 px and the reading beam from 761 px, as on the old site (E134, E029, E077)",
    has: [
      rule(/html\[data-nav-ready\]\) \.obs-fx-dock$/, "display: none", { media: phoneMedia }),
      rule(/\.arrival-replay$/, "display: none", { media: null }),
      rule(".footer-replay", "display: inline-flex", "min-height: 44px", { media: null }),
      rule(/\.ui2046-rail$/, "display: none", { media: "(max-width: 900px)" }),
      rule(/\.ui2046-progress > span::after$/, "display: none", { media: "(max-width: 900px)" }),
      rule(/\.ui2046-progress > span::before$/, "display: none", { media: phoneMedia })
    ],
    lacks: [rule(/\.ui2046-(rail|progress)$/, "display: none", { media: "(max-width: 1199px)" }), rule(/\.footer-replay$/, "display: none")]
  },
  {
    name: "calmer chrome: the spine and its tick come in over the first 160 px of scroll where scroll-driven animations exist, and rest visible under reduced motion; during the entrance the page, the effects dock and the spine wait under the dialog and rise in 700 ms after it (2026-11-26)",
    has: [
      rule(".ui2046-rail", "animation: rail-in linear both", "animation-timeline: scroll(root)", "animation-range: 0 160px", { media: "(animation-timeline: scroll())" }),
      rule(".ui2046-rail", "animation: none", { media: "(prefers-reduced-motion: reduce)" }),
      rule(/html\.cosmic-arrival-active\) :is\(main, \.obs-fx-dock, \.ui2046-rail\)$/, "opacity: 0"),
      text("@keyframes rail-in")
    ]
  },
  {
    name: "on phones the one effects panel lies in the navigation sheet as a flat ruled block, the FX switch beside its legend and the coordinates below (R3 amended, E136); docked, it carries the old glass band and glint without blur, as does the Research Log card (E097; since 2026-11-28 the band rises from nothing over 56 px and the glint, at its old .4 peak, fades out over 30 % at each end, so neither draws a hard top edge)",
    has: [
      rule(".header-actions > .obs-fx-panel", "position: static", "display: grid", "border: 0", "background: var(--obs-fade-line) 0 0 / 100% 1px no-repeat", "box-shadow: none", { media: phoneMedia }),
      rule(".header-actions > .obs-fx-panel[hidden]", "display: none", { media: phoneMedia }),
      rule(".header-actions > .obs-fx-panel .ambient-fx-toggle", "grid-column: 2 / -1", "width: auto", { media: phoneMedia }),
      rule(".header-actions > .obs-fx-panel .research-coordinates", "grid-column: 1 / -1", { media: phoneMedia }),
      // The docked panel: its face on a layer feathered 12 px on every side; the band and glint on that face, the glint
      // as the hairline under the legend.
      rule(".obs-fx-dock > .obs-fx-panel::before", "z-index: -1", "background: var(--obs-surface)", "mask-composite: intersect", { media: null }),
      rule(".obs-fx-dock > .obs-fx-panel::before", "background: var(--obs-glass-glint-soft) 50% 42px / calc(100% - 32px) 1px no-repeat, var(--obs-glass-rise), var(--obs-surface)", { media: "(forced-colors: none)" }),
      // The lock card: band and glint on a layer under its text, as the old ::before; none in forced colours or print.
      rule(".research-lock-card::after", "z-index: -1", "background: var(--obs-glass-glint-soft) 50% 18px / calc(100% - 40px) 1px no-repeat, var(--obs-glass-rise)", { media: null }),
      text("--obs-glass-glint-soft: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, .4) 30% 70%, rgba(255, 255, 255, 0))"),
      text("--obs-glass-rise: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, .12) 56px"),
      text("--obs-glass-rise: linear-gradient(rgba(255, 255, 255, 0), rgba(255, 255, 255, .16) 56px"),
      rule(".obs-fx-panel", "border: 0", "border-radius: 0", "background: none", { media: null }),
      rule(".research-lock-card", "isolation: isolate", { media: null }),
      rule(".research-lock-card::after", "display: none", { media: "(forced-colors: active), print" })
    ],
    lacks: [rule(/\.research-coordinates$/, "display: none", { media: phoneMedia }), rule(/obs-fx-panel$/, "backdrop-filter"), rule(/obs-fx-panel$/, "border-radius: var(--radius-record)")]
  },
  {
    name: "the effects button is a borderless icon on a lens, casting the deep glazed shadow Chromium drew on the old site, and Edge's 0 7px 16px in Edge, as shade pools at the same offset, reach and alpha (E139, E130, 2026-11-26)",
    has: [
      rule(".obs-fx-settings", "border: 0", "border-radius: 50%", { media: null }),
      rule(".obs-fx-settings::after", "inset: -32px", "z-index: -1", "background: radial-gradient(closest-side at 50% calc(50% + 14px), var(--obs-fx-shade), transparent)", { media: null }),
      rule(":where(html.is-edge-browser) .obs-fx-settings::after", "inset: -16px", "background: radial-gradient(closest-side at 50% calc(50% + 7px), var(--obs-fx-shade-edge), transparent)", { media: null }),
      rule(".obs-fx-settings::after", "display: none", { media: "(forced-colors: active)" })
    ],
    lacks: [rule(".obs-fx-settings", "box-shadow", { media: null })],
    check(_source, { read }) {
      const tokens = read("src/styles/folio/00-tokens.css");
      assert.match(tokens, /--obs-fx-shade: rgba\(0, 0, 0, \.18\);/, "Chromium's shade keeps .18");
      assert.match(tokens, /--obs-fx-shade-edge: rgba\(0, 0, 0, \.16\);/, "Edge's shade keeps .16");
    }
  },
  {
    name: "the spine tick is placed from --scroll-progress alone and drawn as an ink border, which forced colours keep",
    has: [
      text(/\.ui2046-progress > span::after\s*\{[^}]*translate:\s*0 calc\(var\(--scroll-progress, 0\) \* \(100vh - 20rem - 24px\)\)/),
      rule(".ui2046-progress > span::after", "border-left: 2px solid var(--obs-rule)")
    ],
    lacks: [rule(".ui2046-progress > span::after", "background"), rule(".ui2046-progress > span::after", "opacity"), rule(/\.ui2046-progress > span::after$/, "display: none", { media: "(forced-colors: active)" })],
    check(_source, { read }) {
      const script = read("public/assets/js/interface-2046.js");
      assert.match(script, /bar\.style\.setProperty\('--scroll-progress'/);
      assert.doesNotMatch(script, /bar\.style\.(width|transform)\b/, "interface-2046.js writes only --scroll-progress (spec §3.4)");
    }
  },
  {
    name: "the reading beam is a fixed 2 px line across the window on a faint track, scaled from --scroll-progress alone; the span is never transformed, and forced colours show neither (E029)",
    has: [
      rule(".ui2046-progress > span::before", "position: fixed", "top: 0", "left: 0", "width: 100vw", "height: 2px", "background: var(--obs-progress-beam)", "box-shadow: var(--obs-progress-glow)",
        "transform: scaleX(var(--scroll-progress, 0))", "transform-origin: left center"),
      rule(".ui2046-progress::before", "position: fixed", "height: 2px", "background: var(--obs-progress-track)"),
      rule(/\.ui2046-progress > span::before$/, "display: none", { media: "(forced-colors: active)" }),
      rule(/\.ui2046-progress::before$/, "display: none", { media: "(forced-colors: active)" })
    ],
    lacks: [rule(".ui2046-progress > span", "transform"), rule(".ui2046-progress > span", "translate"), rule(".ui2046-progress", "transform"), rule(".ui2046-progress", "contain")]
  },
  {
    name: "the FX field glows as the old site's did: haloed dust and gold specks, shaded pebbles, glowing meteors with a 7 px head (E022, E023, E024)",
    has: [
      rule(".ambient-dust", "background: var(--fx-dust-face)", "box-shadow: var(--fx-dust-glow)"),
      rule(".ambient-dust.is-gold-dust", "background: var(--fx-gold-face)", "box-shadow: var(--fx-gold-shine)"),
      rule(".ambient-dust.is-gold-dust::after", "position: absolute", "inset: -2px", "background: var(--fx-gold-halo-face)"),
      rule(".ambient-pebble", "border: 1px solid var(--fx-pebble-edge)", "background: var(--fx-pebble-face)", "box-shadow: var(--fx-pebble-shade)"),
      rule(".ambient-meteor", "height: 3px", "background: var(--fx-meteor-trail)", "filter: var(--fx-meteor-glow)"),
      rule(".ambient-meteor::after", "width: 7px", "height: 7px", "background: var(--fx-meteor-core)", "box-shadow: var(--fx-meteor-head)"),
      rule(".ambient-meteor.is-gold-meteor", "background: var(--fx-gold-trail)", "filter: var(--fx-gold-trail-glow)"),
      rule(".ambient-meteor.is-gold-meteor::after", "background: var(--fx-gold-core)", "box-shadow: var(--fx-gold-core-glow)"),
      rule(".ambient-meteor.is-flying", "opacity: .95")
    ]
  },
  {
    name: "the orrery glows (planets in their own colour, Sun, Kuiper belt, labels) and Immersive shows it at .9 at every width from 901 px; Standard keeps .36, .25 to 1120 px (E025, E026, E134)",
    has: [
      rule(".ui2046-solar-system", "opacity: calc(var(--fx-orbit-alpha) * .5)", "filter: var(--obs-orrery-glow)", { media: null }),
      rule(".ui2046-solar-system", "opacity: .25", { media: "(max-width: 1120px)" }),
      rule(/data-fx-intensity="immersive"\]\) \.ui2046-solar-system$/, "opacity: var(--fx-orbit-alpha)", { media: null }),
      rule(".ui2046-planet", "opacity: var(--obs-planet-opacity)"),
      text(/\.ui2046-planet \{[^}]*box-shadow: 0 0 calc\(var\(--size, 3px\) \* 2\.8\) color-mix\(in srgb, var\(--color, var\(--obs-muted\)\) 58%, transparent\), var\(--obs-planet-rim\)/),
      rule(".ui2046-planet.sun-marker", "box-shadow: var(--obs-sun-glow)"),
      rule(".ui2046-kuiper-belt", "box-shadow: var(--obs-kuiper-glow)"),
      rule(".ui2046-planet-label", "text-shadow: var(--obs-label-glow)")
    ],
    check(source) {
      // The Immersive rule follows the medium-width one, so it wins there by order at equal weight.
      assert.ok(source.indexOf("opacity: var(--fx-orbit-alpha)") > source.indexOf("@media (max-width: 1120px)"), "Immersive opacity must come after the 1120 px rule");
    }
  },
  {
    name: "a route under the pointer lights its orbit, planet and label in steel; Research Log routes circle the diagram with a dashed brass ring (E027, E028)",
    has: [
      rule(".ui2046-system-orbit.is-route-active", "border-color: var(--obs-edge-cool)", "box-shadow: 0 0 12px var(--obs-glow), inset 0 0 8px var(--obs-glow)"),
      rule(".is-route-active .ui2046-planet", "box-shadow: 0 0 8px var(--obs-edge-cool), 0 0 20px var(--obs-glow)"),
      rule(".is-route-active .ui2046-planet-label", "color: var(--obs-edge-cool)", "opacity: 1"),
      rule(/data-orbit-route="research-log"\]\) \.ui2046-solar-system::after$/, "border: 1px dashed var(--obs-accent)", "box-shadow: 0 0 14px var(--obs-gold-glow)", "width: 48%", "height: 34%")
    ]
  },
  {
    name: "the cleavage glows steel, and polarising lights a line under the navigation in the interference colour with the old 18 px glow and gives the page's buttons that colour on their beams over a pool (E030, 2026-11-26: no outlines)",
    has: [
      rule(".mineral-cleavage path", "stroke-width: 1.3", "filter: drop-shadow(0 0 3px var(--obs-edge-cool))"),
      rule(".header-actions .nav::after", "position: absolute", "height: 1px", "box-shadow: 0 0 18px color-mix(in srgb, var(--mineral-colour, transparent) 26%, transparent)", "opacity: 0", "pointer-events: none"),
      rule(/data-polarising\]\) \.header-actions \.nav::after$/, "opacity: 1"),
      rule(/data-polarising\]\) main :is\(\.button, \.button\.secondary\)$/, "border-bottom-color: var(--mineral-colour)", "background-image: radial-gradient(closest-side, color-mix(in srgb, var(--mineral-colour) 26%, transparent), transparent)")
    ]
  },
  {
    name: "the entrance title and sky labels carry the old dark legibility shadows, and Skip, a text control over its beam, keeps its old glass face as a pool of the surface at 80 % behind the words (E032, 2026-11-26), on a layer of its own reaching 44 px past them, so no box clips it into a slab (2026-11-28); its keyboard focus is one treatment, the beam lit 2 px in the focus colour over the warmed pool, with no outline rectangle outside forced colours (owner, 2026-11-28)",
    has: [
      rule(".arrival-signature", "text-shadow: var(--obs-arrival-shadow)"),
      rule(".celestial-labels span", "text-shadow: var(--obs-arrival-label-shadow)"),
      rule(".arrival-skip", "background: none", "border-bottom-color: var(--obs-control-border)", "border-radius: 0", "isolation: isolate"),
      rule(".arrival-skip::after", "inset: -18px -44px", "z-index: -1", "background: radial-gradient(closest-side, color-mix(in srgb, var(--obs-surface) 80%, transparent) 55%, transparent)"),
      rule(".arrival-skip:focus-visible", "outline: none", "border-bottom-color: transparent", "background: linear-gradient(var(--obs-focus), var(--obs-focus)) 0 100% / 100% 2px no-repeat border-box", "box-shadow: none", { media: "(forced-colors: none)" }),
      rule(".arrival-skip:focus-visible::after", "background: radial-gradient(closest-side, color-mix(in srgb, var(--obs-accent) 18%, color-mix(in srgb, var(--obs-surface) 80%, transparent)) 55%, transparent)", { media: "(forced-colors: none)" }),
      rule(/#cosmic-arrival\):is\(:not\(\[data-progress\]\), \[data-progress="0"\], \[data-progress\^="0\.0"\]\) \.arrival-sequence$/, "opacity: 0")
    ],
    check(_source, { read }) {
      // In the instruments, text carries a shadow only where the old site's did: orrery planet labels and the entrance.
      const allowed = [".ui2046-planet-label", ".arrival-signature", ".celestial-labels span"];
      for (const file of ["ambient", "interface-2046", "mineral-fx", "atlas", "arrival"]) {
        const shadowed = cssRules(read(`src/styles/folio/components/${file}.css`)).filter((entry) => entry.declarations.some((declaration) => declaration.property === "text-shadow" && declaration.value !== "none"));
        for (const entry of shadowed) assert.ok(entry.selectors.every((selector) => allowed.includes(selector)), `${file}.css: ${entry.selectors.join(", ")} gives text a shadow`);
      }
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
    name: "surface light changes no box and stays off where it must (R2, owner 2026-11-18)",
    has: [
      rule("[data-edge-active]::before", "position: absolute", "pointer-events: none"),
      rule("[data-edge-active]::before", "display: none", { media: "(prefers-reduced-motion: reduce), (pointer: coarse)" }),
      rule("[data-edge-active]::before", "display: none", { media: "(forced-colors: active), print" }),
      rule(".button", "border: 1px solid transparent", "border-bottom-color: var(--obs-control-border)", "border-radius: 0", "background-color: transparent", { media: null }),
      rule('.button:focus-visible:not(:disabled, [aria-disabled="true"], [aria-pressed="true"], [aria-current="page"], [aria-selected="true"])', "border-bottom-color: transparent", "box-shadow: var(--obs-beam-glow)", { media: "(forced-colors: none)" }),
      // The hover light only for hover-capable pointers, so a tap never leaves a control lit.
      rule('.button:hover:not(:disabled, [aria-disabled="true"], [aria-pressed="true"], [aria-current="page"], [aria-selected="true"])', "border-bottom-color: transparent", "box-shadow: var(--obs-beam-glow)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule("[data-edge-active]::before", "mask: linear-gradient(#000 0 0) bottom / 100% 1px no-repeat")
    ],
    lacks: [rule(".button", "box-shadow", { media: null })],
    check(_source, { read }) {
      // Hover light is paint only: no :hover rule of surface-light.css may move or size anything.
      const hovers = cssRules(read("src/styles/folio/components/surface-light.css")).filter((entry) => entry.selectors.some((selector) => selector.includes(":hover")));
      assert.ok(hovers.length, "surface-light.css has its hover rules");
      for (const entry of hovers) {
        const moving = entry.declarations.find((declaration) => /^(transform|translate|scale|margin|padding|width|height|inset)(-|$)/.test(declaration.property));
        assert.ok(!moving, `${entry.selectors.join(", ")} sets ${moving?.property} on hover`);
      }
    }
  },
  {
    name: "the edge light is one throttled pointer handler; the one effects panel moves into the phone sheet and back, never copied (R2; R3 amended, E136)",
    source: "public/assets/js/observatory-interactions.js",
    has: [text("data-edge-active"), text("--edge-angle"), text("requestAnimationFrame(paintEdge)"), text("const placePanel = () => {"), text("compactDock.addEventListener('change', placePanel);")],
    lacks: [text("obs-edge-light"), text("cloneNode")],
    check(source) {
      assert.equal(source.split("addEventListener('pointermove'").length - 1, 1, "exactly one pointermove listener");
      // The frame callback writes the angle only; the box is read on entry, in the pointermove handler.
      const start = source.indexOf("function paintEdge");
      assert.ok(start >= 0, "observatory-interactions.js defines paintEdge");
      let depth = 0, index = source.indexOf("{", start);
      for (; index < source.length; index++) {
        if (source[index] === "{") depth += 1;
        if (source[index] === "}" && --depth === 0) break;
      }
      assert.ok(!source.slice(start, index).includes("getBoundingClientRect"), "paintEdge reads no layout");
    }
  },
  // The rest of the old site's shell light (second effects pass, owner 2026-11-18: "all of my previous effects"):
  // each row keeps one restored effect from disappearing silently, with its off states.
  {
    name: "the orbit trace runs only for fine pointers with motion allowed, clipped by the header, paused with the field (E001)",
    has: [
      rule(".site-header::after", "position: absolute", "width: 160px", "height: 2px", "opacity: 0", "pointer-events: none", { media: null }),
      rule(/html:not\(\.ambient-fx-disabled\).*\.site-header::after$/, "animation: orbit-trace 12s linear infinite", { media: "(min-width: 761px) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)" }),
      rule(".site-header", "overflow-x: clip", { media: "(min-width: 761px) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)" }),
      rule(/mads-page-hidden.*mads-power-idle.*mads-power-low.*mission-lightbox-open.*mineral-atlas-open.*obs-presenting.*\.site-header::after$/, "animation-play-state: paused"),
      text("@keyframes orbit-trace")
    ],
    lacks: [rule(".site-header::after", "animation", { media: null })],
    check(source) {
      const frames = lastKeyframes(source, "orbit-trace");
      assert.match(frames, /transform:\s*translateX\(-160px\)/, "the trace starts off the left edge");
      assert.doesNotMatch(frames.replace(/translateX/g, ""), /\b(left|width|top|margin)\s*:/, "the trace moves by transform only");
    }
  },
  {
    name: "the navigation lights a pool under the current link and a hovered or focused one (the old lit face, 2026-11-26), and a hovered link rises 1 px only with motion allowed (E002); the links are words on the band, 42 px in a 44 px row, no box",
    has: [
      rule(".nav__links a", "min-height: 42px"),
      rule(".nav", "position: relative", "min-height: 44px", { media: null }),
      rule(".nav__links a::after", "inset: 4px -6px", "z-index: -1", "background: radial-gradient(closest-side, var(--obs-pool-hover), transparent)", "pointer-events: none", "opacity: 0", { media: "(min-width: 761px)" }),
      rule('.nav__links a:is([aria-current="page"], :focus-visible)::after', "opacity: 1", { media: "(min-width: 761px)" }),
      rule(".nav__links a:hover::after", "opacity: 1", { media: "(min-width: 761px) and (hover: hover)" }),
      rule(".nav__links a:hover", "transform: translateY(-1px)", { media: "(min-width: 761px) and (hover: hover) and (prefers-reduced-motion: no-preference)" })
    ],
    lacks: [rule(".nav__links a:hover", "transform", { media: null }), rule(/^\.nav$/, "border"), rule(/^\.nav$/, "border-radius")]
  },
  {
    name: "each header text cluster lies on a pool of the band's own ground on a layer of its own, feathered on every side, so the band's planets never pass behind the words; the gate's and the toggle's pool warms with brass under the pointer (2026-11-26)",
    has: [
      rule(".nav::before", "position: absolute", "z-index: -1", "background: var(--obs-band-pool)", "mask-composite: intersect", { media: "(min-width: 761px) and (forced-colors: none)" }),
      rule(".nav-log-gate:focus-visible::after", "background: color-mix(in srgb, var(--obs-accent) 14%, var(--obs-band-pool))", { media: "(min-width: 761px) and (forced-colors: none)" }),
      rule(".nav-log-gate:hover::after", "background: color-mix(in srgb, var(--obs-accent) 14%, var(--obs-band-pool))", { media: "(min-width: 761px) and (hover: hover) and (forced-colors: none)" })
    ]
  },
  {
    name: "the gate sweeps a pale light across its words on hover and focus (clipped to the letters, 2026-11-26), so its ::before stays the edge ring; the gate and the toggle are text controls whose beam lights brass to steel (E003, E104)",
    has: [
      rule(".nav-log-gate:is(:hover, :focus-visible) .nav-log-gate__copy > strong", "background-clip: text", "color: transparent", "animation: gate-sweep 580ms ease both", { media: "(forced-colors: none)" }),
      text("@keyframes gate-sweep"),
      rule(".nav-log-gate", "border: 1px solid transparent", "border-bottom-color: var(--obs-control-border)", "border-radius: 0", { media: null }),
      rule(".theme-toggle:focus-visible", "background: var(--obs-beam-lit) 0 100% / 100% 1px no-repeat border-box, radial-gradient(closest-side, var(--obs-pool-warm), transparent)", { media: "(forced-colors: none)" }),
      rule(".theme-toggle:hover", "background: var(--obs-beam-lit) 0 100% / 100% 1px no-repeat border-box, radial-gradient(closest-side, var(--obs-pool-warm), transparent)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule('.nav-log-gate[aria-current="page"]', "border-bottom-color: var(--obs-accent)", "box-shadow: inset 0 -1px var(--obs-accent)", { media: null })
    ],
    lacks: [rule(".nav-log-gate::before", "content"), rule(".nav-log-gate", "animation", { media: null })],
    check(_source, { read }) {
      // Every stop of the sweep keeps the words legible: white on the dark band, brass on paper.
      const tokens = read("src/styles/folio/00-tokens.css");
      assert.match(tokens, /--obs-sweep-text: #fff;/);
      assert.match(tokens, /--obs-sweep-text: #765725;/);
    }
  },
  {
    name: "the gate signal, the navigation beam and the header carry the old glows; the band keeps the steel line (E004, E005, E007)",
    has: [
      rule(".nav-log-gate__signal", "box-shadow: 0 0 7px var(--obs-gold-glow)"),
      rule(".obs-nav-beam", "box-shadow: 0 0 9px var(--obs-gold-glow), 0 0 3px var(--obs-accent)"),
      rule(".site-header", "box-shadow: 0 1px 18px var(--obs-glow), inset 0 -1px var(--obs-header-line)", { media: null }),
      rule(".site-header", "box-shadow: none", { media: floatMedia }),
      rule("body::after", "box-shadow: 0 1px 18px var(--obs-glow), inset 0 -1px var(--obs-header-line)", { media: floatMedia })
    ],
    check(source) {
      assert.match(source, /\.obs-nav-beam\s*\{[^}]*transition:\s*transform 300ms/, "the beam glides in 300 ms");
    }
  },
  {
    name: "text glows only where the old site's did: the Light brand line, the footer, the kickers (E006, E013, E015), and the headings in main and the site name (E116)",
    has: [
      rule(".brand > strong + span", "text-shadow: var(--obs-text-halo)"),
      rule(".brand > strong", "text-shadow: var(--obs-heading-glow)"),
      rule(":where(main) :where(h1)", "text-shadow: var(--obs-heading-glow)"),
      rule(":where(main) :where(h2, h3)", "text-shadow: var(--obs-subheading-glow)"),
      rule(".footer-inner", "text-shadow: var(--obs-footer-halo)"),
      rule(".kicker", "text-shadow: 0 0 14px var(--obs-gold-glow)"),
      rule(".kicker::before", "width: 5.5px", "height: 5.5px", "background: var(--obs-bead)", "box-shadow: var(--obs-bead-glow)"),
      rule(".kicker::before", "display: none", { media: "(forced-colors: active)" })
    ],
    check(_source, { read }) {
      // Nowhere else in the shell: body text, links and controls never glow.
      const allowed = [".brand > strong + span", ".brand > strong", ":where(main) :where(h1)", ":where(main) :where(h2, h3)", ".footer-inner", ".kicker"];
      for (const file of ["03-base.css", "components/header.css", "components/footer.css", "components/masthead.css", "components/button.css", "components/form.css", "components/continue-reading.css", "components/fx-dock.css", "components/surface-light.css", "components/backdrop.css"]) {
        const glowing = cssRules(read(`src/styles/folio/${file}`)).filter((entry) => entry.declarations.some((declaration) => declaration.property === "text-shadow" && declaration.value !== "none"));
        for (const entry of glowing) assert.ok(entry.selectors.every((selector) => allowed.includes(selector)), `${file}: ${entry.selectors.join(", ")} gives text a glow`);
      }
    }
  },
  {
    name: "the phone menu icon turns into a cross in 180 ms (E008)",
    has: [rule(".nav-toggle__icon::after", "transition: transform 180ms ease, opacity 180ms ease", { media: phoneMedia })]
  },
  {
    name: "the FX switch keeps its old glazed face as a pool behind its words (warm while on) and its gold dot, as a text control over a 1 px beam that turns into a 2 px brass beam while on and lights brass to steel under the pointer; the panel its glow, an oval pool 24 px past it; the coordinates their resting dim (E009, E010, E011; 2026-11-28)",
    has: [
      rule(".ambient-fx-toggle", "border: 1px solid transparent", "border-bottom-color: var(--obs-control-border)", { media: null }),
      rule(".ambient-fx-toggle", "background: radial-gradient(closest-side, var(--obs-pool), transparent) 0 50% / 8rem 100% no-repeat", "color: var(--obs-fx-text)", { media: "(forced-colors: none)" }),
      rule(".ambient-fx-toggle.is-on", "border-bottom-color: var(--obs-accent)", "background: radial-gradient(closest-side, var(--obs-pool-warm), transparent) 0 50% / 8rem 100% no-repeat", "box-shadow: inset 0 -1px var(--obs-accent)", "color: var(--obs-fx-text-on)", { media: "(forced-colors: none)" }),
      rule(/\.ambient-fx-toggle:is\(:hover, :focus-visible\):not\(\.is-on\)$/, "background: var(--obs-beam-lit) 0 100% / 100% 1px no-repeat border-box, radial-gradient(closest-side, var(--obs-pool-warm), transparent) 0 50% / 8rem 100% no-repeat", "box-shadow: var(--obs-beam-glow)", { media: "(forced-colors: none)" }),
      rule(".ambient-fx-toggle", "border-bottom-color: ButtonText", { media: "(forced-colors: active)" }),
      rule(".ambient-fx-toggle.is-on", "border-bottom: 3px double Highlight", { media: "(forced-colors: active)" }),
      rule(".ambient-fx-toggle.is-on .ambient-fx-toggle__dot", "background: var(--obs-fx-dot-on)", "box-shadow: var(--obs-fx-dot-on-glow)", { media: "(forced-colors: none)" }),
      rule(".obs-fx-dock > .obs-fx-panel::after", "inset: -24px", "z-index: -2", "background: radial-gradient(closest-side, var(--obs-glow) 70%, transparent)"),
      rule(".obs-fx-panel .research-coordinates", "opacity: var(--obs-coord-rest)"),
      rule(".obs-fx-panel .research-coordinates:hover", "opacity: 1")
    ]
  },
  {
    name: "the graticule is one fixed, inert layer over Bennu, hidden where Bennu is (E012)",
    has: [
      rule("html::after", "position: fixed", "inset: 0", "z-index: var(--z-backdrop)", "background-image: var(--obs-graticule)", "opacity: var(--obs-graticule-opacity)", "pointer-events: none", { media: null }),
      rule("html::after", "display: none", { media: "(forced-colors: active), print" }),
      rule("html::after", "display: none", { media: "(prefers-contrast: more)" })
    ],
    // The graticule paints normal-blend colours, never a blend mode on the fixed layer (the hover-only scan line of a
    // Mission Log photograph keeps its old screen blend, E044).
    lacks: [text(/html::afters*{[^}]*mix-blend-mode/)]
  },
  {
    name: "the page's picture and the band's planets wait for the page to load when a script runs; the picture fades in (director, LCP)",
    has: [
      rule("html:not(.backdrop-ready) body::before", "visibility: hidden", "opacity: 0", "mask-image: none", { media: "(scripting: enabled)" }),
      rule("html:not(.backdrop-ready) body::after", "background-image: var(--obs-band-veil)", { media: "(scripting: enabled)" }),
      rule("body::before", "transition: opacity 600ms var(--ed-ease-out)", { media: null })
    ],
    check(_source, { read }) {
      const script = read("public/assets/js/observatory-interactions.js");
      assert.match(script, /classList\.add\('backdrop-ready'\)/, "observatory-interactions.js sets html.backdrop-ready");
      assert.match(script, /addEventListener\('load', showBackdrop/, "after the load event");
    }
  },
  {
    name: "Onward arrows nudge, selections are brass, sliders brass, a pressed control holds a 2 px brass beam over a press pool without moving (E014, E016, E017, E018; the old inner shadow, 2026-11-26)",
    has: [
      rule(".continue-reading a:hover .continue-reading-arrow", "transform: translate(3px, -3px)", "color: var(--obs-accent)"),
      rule("::selection", "background: var(--obs-selection)"),
      rule(/:where\(input\[type="range"\]\)$/, "accent-color: var(--obs-accent)"),
      rule('.button:active:not(:disabled, [aria-disabled="true"])', "border-bottom-color: var(--obs-accent)", "background: radial-gradient(closest-side, var(--obs-pool-press), transparent)", "box-shadow: inset 0 -1px var(--obs-accent)", { media: "(forced-colors: none)" })
    ],
    check(_source, { read }) {
      const actives = cssRules(read("src/styles/folio/components/surface-light.css")).filter((entry) => entry.selectors.some((selector) => selector.includes(":active")));
      assert.ok(actives.length, "surface-light.css has its pressed rules");
      for (const entry of actives) assert.ok(entry.declarations.every((declaration) => ["border-bottom-color", "background", "box-shadow"].includes(declaration.property)), "a pressed control changes paint only (beam, pool), never its box");
    }
  },
  {
    name: "the reading column lies on the lab's lifted sheet with feathered sides (no border, corner or drop shadow), which reaches full strength 440 px down, 280 px on phones, 380 px on the Research Log (E020, 2026-11-26): main's background draws the middle with its rise, ::before the feathered edges over the rise (the only masked part), ::after the edges below it, so no page-tall layer is masked and the shade under the edges never lies on an ancestor of the text",
    has: [
      rule(/^:where\(main\)$/, "--sheet-colour: var(--obs-sheet)", "background: linear-gradient(180deg, transparent, var(--sheet-colour) var(--sheet-rise)) 50% 0 / max(0px, calc(min(100%, calc(2 * var(--sheet-half))) - 2 * var(--sheet-fade))) 100% no-repeat", { media: null }),
      rule(/^:where\(main\)::before$/, "position: absolute", "z-index: -1", "left: max(0px, calc(50% - var(--sheet-half)))", "right: max(0px, calc(50% - var(--sheet-half)))", "background: var(--sheet-edges)", "pointer-events: none", { media: null }),
      rule(/^:where\(main\)::before$/, "height: var(--sheet-rise)", "mask-image: linear-gradient(180deg, transparent, #000)", { media: null }),
      rule(/^:where\(main\)::after$/, "position: absolute", "top: var(--sheet-rise)", "bottom: 0", "background: var(--sheet-edges)", { media: null }),
      rule(/^:where\(main\)$/, "background-size: 100% 100%", { media: phoneMedia }),
      rule(/^:where\(main\)::after$/, "display: none", { media: phoneMedia }),
      rule(".ui-page-research-log .research-log-main", "--sheet-rise: 380px"),
      rule(/^:where\(main\)::before$/, "mask-composite: add, intersect, add", { media: "(min-width: 1600px)" })
    ],
    lacks: [rule(/^:where\(main\)$/, "border-radius"), rule(/^:where\(main\)$/, "box-shadow"), rule(/^:where\(main\)::(before|after)$/, "border-radius"), rule(/^:where\(main\)::(before|after)$/, "box-shadow"), rule(/^:where\(main\)::after$/, "mask-image", { media: null })],
    check(_source, { read }) {
      const tokens = read("src/styles/folio/00-tokens.css");
      assert.match(tokens, /--sheet-rise: 440px;/, "440 px down");
      assert.match(tokens, /--sheet-rise: 280px;/, "280 px on phones");
      assert.match(read("src/styles/folio/states/print.css"), /main::before,\s*main::after\s*\{\s*display: none;/, "print shows no sheet");
    }
  },
  {
    name: "the edge light also lights the planetary explorer's buttons, as the old site did (E021)",
    source: "public/assets/js/observatory-interactions.js",
    has: [text(".planetary-materials button, .planetary-toolbar button, .planetary-mineral-tabs button")]
  },
  {
    name: "the default intensity, Immersive, carries the old glow strength (E019)",
    check(_source, { read }) {
      const tokens = read("src/styles/folio/00-tokens.css");
      assert.match(tokens, /:root\[data-fx-intensity="immersive"\],\s*:root\[data-fx-intensity="immersive"\] :is\(\.on-night, \.obs-presentation\) \{\s*--obs-glow: rgba\(236, 226, 206, \.2\);\s*--obs-gold-glow: rgba\(222, 199, 152, \.24\);/, "Space Immersive glows .2 / .24");
      assert.match(tokens, /\[data-fx-intensity="immersive"\] \{\s*--obs-glow: rgba\(92, 72, 40, \.14\);\s*--obs-gold-glow: rgba\(118, 87, 37, \.16\);/, "Light Immersive glows .14 / .16");
    }
  },
  {
    // The fix stage (2026-11-28): no scrolled line of text lies on the orbits, the opening view keeps them whole.
    name: "after the opening view the orrery settles out of the reading column: over the scroll from 35 to 95 % of the window the part over the text column fades to 30 % behind a 64 px feather, the part in the margin keeps its full strength; without scroll-driven animations and under reduced motion it stays at rest (E025-E028 unchanged)",
    has: [
      text("@property --orrery-settle"),
      text("@keyframes orrery-settle"),
      rule(".ui2046-solar-system", "animation: orrery-settle linear both", "animation-timeline: scroll(root)", "animation-range: 35vh 95vh", "mask-image: linear-gradient(90deg, rgb(0 0 0 / var(--orrery-settle)) var(--orrery-column), #000 calc(var(--orrery-column) + 64px))", { media: "(animation-timeline: scroll())" }),
      rule(".ui2046-solar-system", "animation: none", { media: "(prefers-reduced-motion: reduce)" }),
      rule(/html\.mission-lightbox-open, html\.mineral-atlas-open, html\.obs-presenting, html\.mads-page-hidden, html\.mads-power-idle, html\.mads-power-low\) \.ui2046-solar-system$/, "animation-play-state: paused")
    ]
  },
  {
    name: "each page's picture keeps its anchor (Home's Comet West since 2026-11-28: from 761 px in the left margin, the head two fifths into the sheet's soft edge at the cover scale, the file's cut at least 10 px short of the column, so it shows at laptop widths and never under the column; phones keep the 1.4 strength; the others from the top of the window), and from 1800 px the pictures are quieter (2026-11-28)",
    has: [
      rule(".ui-page-home", "--bd-s: max(100vw / 1600, 100vh / 1000)", "--bd-at: calc(min(max(0px, 50vw - var(--sheet-half)) + var(--sheet-fade) * .4, max(var(--page-pad), 50vw - var(--page-max) / 2) - 60 * var(--bd-s)) - 260 * var(--bd-s)) 100%", "--bd-k: 1.6", { media: null }),
      rule(".ui-page-ryugu-bennu", "--bd-at: 100% 0"),
      rule(".ui-page-research-log", "--bd-at: 0 0"),
      rule(".ui-page-contact", "--bd-at: 100% 0"),
      rule(":root", "--obs-far-opacity: .34", { media: "(min-width: 1800px)" })
    ]
  },
  {
    name: "the brand, the gate and the toggle lie on oval pools that fade on every side; the row of links on a field feathered 40 px at its ends and 18 px above and below (no slab edges, 2026-11-28; E058 unchanged)",
    has: [
      rule(".brand::after", "inset: -16px -48px", "mask-image: radial-gradient(closest-side, #000 70%, transparent)", { media: "(min-width: 761px) and (forced-colors: none)" }),
      rule(".theme-toggle::after", "mask-image: radial-gradient(closest-side, #000 52%, transparent)", { media: "(min-width: 761px) and (forced-colors: none)" }),
      rule(".nav::before", "inset: -14px -40px", "mask-composite: intersect", { media: "(min-width: 761px) and (forced-colors: none)" })
    ]
  },
  {
    name: "the footer ends the lifted sheet rather than starting a slab: the sheet's column and feathered sides run on under its words and the desk shows in the margins; phones keep the flat sheet, more contrast the opaque one; the footer glow stays (E013; 2026-11-28)",
    has: [
      rule(".site-footer", "z-index: var(--z-content)", { media: null }),
      rule(".footer-inner", "text-shadow: var(--obs-footer-halo)"),
      rule(".site-footer", "background: var(--obs-fade-line) 0 0 / 100% 1px no-repeat, var(--obs-sheet)", { media: "(max-width: 760px)" }),
      rule(".footer-credits a", "color: inherit", "white-space: nowrap")
    ],
    lacks: [rule(".site-footer", "background: var(--obs-fade-line) 0 0 / 100% 1px no-repeat, var(--obs-paper)", { media: null })]
  },
  {
    name: "a night plate keeps the Space colours inside, but the shadow it casts falls on the page's own ground (--obs-print-drop, set on :root alone, which .on-night never redefines; 2026-11-28)",
    has: [
      text("--obs-print-drop: var(--obs-print-shadow)"),
      rule(".plate__media", "box-shadow: var(--obs-print-drop)", { media: null }),
      rule(".planetary-stage", "box-shadow: var(--obs-print-drop)", { media: null }),
      rule(".scene-viewport", "box-shadow: var(--obs-print-drop)", { media: null })
    ]
  },
  {
    name: "the footer's question label is in the accent again, as in version 1 (owner, 2026-11-28)",
    has: [rule(".footer-question__label", "color: var(--obs-accent)", "font-size: var(--label-size)", { media: null })]
  },
  {
    name: "the backdrop cross-fade (2026-11-28): one fixed layer that takes no input, in the page picture's ink and mask mode, Home's plate layer just under main; while it holds the page's own picture waits hidden and nothing eases on its own",
    has: [
      rule(".backdrop-fade", "position: fixed", "inset: 0", "z-index: var(--z-backdrop)", "background: var(--obs-far-ink)", "mask-mode: luminance", "pointer-events: none", { media: null }),
      rule(".backdrop-fade--plate", "z-index: var(--z-content)", "mask-mode: alpha", { media: null }),
      rule("html[data-backdrop-fade] body::before", "transition: none", { media: null }),
      rule("html[data-backdrop-fade=\"hold\"] body::before", "opacity: 0", { media: null })
    ]
  },
  {
    name: "the FX field pauses while Home's opening plate covers the window (2026-11-28, power-manager.js: mads-power-covered)",
    has: [rule(".ambient-space-layer > *", "animation-play-state: paused", { media: null }), text("html.mads-power-covered")]
  }
];
