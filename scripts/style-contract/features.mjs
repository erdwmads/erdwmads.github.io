// Style contract, Ryugu & Bennu, Origins and the 3D viewers (WP4): definite canvas sizes, scene overlays, touch modes
// and the breakpoints the loaders share (inventory §4). The renderers only set the drawing buffer, so a host without
// a definite size renders at 0 x 0. components/{planetary,sample-missions,origins,scene,image-inspector}.css carry
// them: the planetary explorer (WP4b), the sample missions and the image inspector (WP4a) and Origins (WP4c).
import assert from "node:assert/strict";
import { rule, text } from "./matchers.mjs";

export const owner = "WP4";

export const contract = [
  // WP4b: the planetary explorer.
  {
    // The plate height is a custom property on the section, so the Orgueil note and the sample photographs match it.
    name: "the planetary stage has a definite size and its canvas fills it",
    has: [
      rule(".planetary", "--planetary-plate: 460px", { media: null }),
      rule(".planetary", "--planetary-plate: 340px", { media: "(max-width: 760px)" }),
      rule(".planetary-stage", "position: relative", "overflow: hidden", "height: var(--planetary-plate)", { media: null }),
      rule(".planetary-stage canvas", "width: 100%", "height: 100%")
    ]
  },
  {
    name: "planetary overlays sit on the canvas, and only the object labels take its input",
    has: [
      rule(".planetary-labels", "position: absolute", "inset: 0", "pointer-events: none"),
      rule(".planetary-label", "position: absolute", "pointer-events: auto"),
      rule("span.planetary-label", "pointer-events: none"),
      rule(".planetary-stage::after", "position: absolute", "pointer-events: none"),
      rule(".planetary-status", "position: absolute")
    ]
  },
  {
    // A failed scene shows a licensed reference image; the status strip and Retry never cover it.
    name: "the planetary reference image sits above the status strip and Retry, never under them",
    has: [
      rule(".planetary-stage:has(> [data-fallback]:not([hidden]))", "display: grid", "grid-template: minmax(0, 1fr) / minmax(0, 1fr) auto"),
      rule(".planetary-stage:has(> [data-fallback]:not([hidden])) .planetary-status", "position: static"),
      rule(".planetary-fallback", "grid-area: 1 / 1 / 2 / -1", "object-fit: contain")
    ]
  },
  {
    name: "the planetary stage lets the page scroll on touch until Explore is pressed",
    has: [
      rule(".planetary-stage", "touch-action: pan-y", { media: "pointer: coarse" }),
      rule(".planetary-stage[data-touch-active]", "touch-action: none", { media: "pointer: coarse" })
    ],
    check(_source, { read }) {
      // OrbitControls writes touch-action:none inline on the stage; the renderer has to write the scroll state back.
      assert.match(read("src/scripts/planetary-renderer.js"), /stage\.style\.touchAction\s*=\s*coarse\.matches\s*&&\s*!touch\s*\?\s*'pan-y'\s*:\s*'none'/, "planetary-renderer.js mirrors touch mode on the stage");
    }
  },
  {
    name: "the planetary share status keeps its line, so a message moves nothing",
    has: [rule(".planetary-sharing > p", "min-height: 1lh")]
  },
  {
    // The space-reserving utility (05-utilities.css) keeps a hidden box that opts in with data-reserve-space. Phones
    // move the shape tools under the scene and reserve their row only in the shape view (--reserve-display: none
    // elsewhere). The interaction bar exists on coarse pointers only, so it reserves its row only there.
    name: "the Orgueil shape and camera tools keep their space while hidden",
    has: [
      rule("[hidden][data-reserve-space]", "visibility: hidden", { media: "scripting: enabled" }),
      rule(".planetary [data-shape-tools]", "--reserve-display: none", { media: "(max-width: 760px)" }),
      rule('.planetary[data-mode="shape"] [data-shape-tools]', "--reserve-display: grid", { media: "(max-width: 760px)" }),
      rule(".planetary-interaction-bar", "--reserve-display: none", "display: none", { media: null }),
      rule(".planetary-interaction-bar", "--reserve-display: flex", { media: "pointer: coarse" })
    ],
    check(_source, { read }) {
      const markup = read("src/components/PlanetaryExplorer.astro");
      assert.doesNotMatch(read("src/styles/folio/components/planetary.css"), /\.planetary-ci\s*\{[^}]*height:\s*calc/, "planetary.css: the Orgueil note stays stage-sized (the reserved bar keeps the row)");
      for (const hook of ["data-shape-tools", "data-camera-tools", "planetary-interaction-bar"]) {
        assert.match(markup, new RegExp(`<div\\b(?=[^>]*\\b${hook}\\b)(?=[^>]*\\bdata-reserve-space\\b)`), `PlanetaryExplorer.astro: ${hook} reserves its space`);
      }
    }
  },
  // WP4a: the sample missions and the image inspector.
  {
    name: "the mission viewport has a definite size and its canvas fills it",
    has: [rule(".mission-viewport", "position: relative", "overflow: hidden", "isolation: isolate", "aspect-ratio", "min-height"), rule(".mission-viewport canvas", "position: absolute", "inset: 0")]
  },
  {
    name: "mission readouts sit on the canvas without taking its input",
    has: [
      rule(".mission-labels", "position: absolute", "inset: 0", "pointer-events: none"),
      rule(".mission-labels span", "position: absolute"),
      rule(".mission-leader", "position: absolute", "transform-origin: left center"),
      rule(".mission-inset", "position: absolute", "pointer-events: none"),
      rule(".mission-loading", "position: absolute", "inset: 0")
    ]
  },
  {
    name: "the mission viewport and the image inspector let the page scroll until the reader opts in",
    has: [
      rule(".mission-viewport", "touch-action: pan-y"),
      rule(".mission-viewport canvas", "touch-action: pan-y"),
      rule(".mission-viewport[data-touch-active]", "touch-action: none"),
      rule(".inspector-stage", "touch-action: pan-y"),
      rule(".inspector-stage[data-moving]", "touch-action: none"),
      rule(".mission-chapters", "touch-action: pan-x pan-y pinch-zoom")
    ]
  },
  {
    name: "the chapter strip fades the edge that has more chapters",
    has: [rule(".mission-chapters[data-overflow~=end]", "mask-image"), rule(".mission-chapters[data-overflow~=start]", "mask-image"), rule(".mission-chapters", "scroll-padding-inline: 48px")]
  },
  {
    name: "the mission notebook breakpoint is the one the loader uses",
    has: [text(/@media\s*\(max-width:\s*960px\)/)],
    check(_source, { read }) {
      assert.match(read("src/scripts/sample-missions/loader.js"), /\(max-width:\s*960px\)/, "sample-missions/loader.js notebook media query");
    }
  },
  {
    name: "the inspector stage has a definite size and the ready image moves inside it",
    has: [
      rule(".inspector-stage", "position: relative", "overflow: hidden", "aspect-ratio"),
      rule("[data-inspector-ready] .inspector-stage img", "position: absolute", "max-width: none", "pointer-events: none")
    ]
  },
  {
    name: "the inspector controls and hint keep their boxes until the figure is ready",
    has: [rule(".inspector-controls", "--reserve-display: grid")],
    check(_source, { read }) {
      const markup = read("src/components/ResearchScaleJourney.astro");
      assert.match(markup, /data-inspector-controls data-reserve-space hidden/, "inspector controls reserve their space");
      assert.match(markup, /data-inspector-hint data-reserve-space hidden/, "inspector hint reserves its space");
    }
  },
  {
    name: "mission icons hold their slot and touch mode is offered to coarse pointers only",
    has: [
      rule(".sample-missions [data-mission-icon]", "width: 18px", "height: 18px"),
      rule(".mission-scene .mission-touch", "display: none", { media: null }),
      rule(".mission-scene .mission-touch", "display: inline-flex", { media: "(pointer: coarse)" })
    ]
  },
  // WP4c: Origins.
  {
    name: "the Origins viewport (.scene-viewport on #viewport) has a definite size and its canvas fills it",
    has: [
      rule(".scene-viewport", "position: relative", "overflow: hidden", "isolation: isolate", "aspect-ratio: 4 / 5", { media: null }),
      rule(".scene-viewport", "aspect-ratio: 16 / 9", { media: "(min-width: 761px)" }),
      rule(".scene-viewport > canvas", "position: absolute", "inset: 0", "width: 100%", "height: 100%")
    ]
  },
  {
    name: "Origins overlays sit on the scene without taking its input",
    has: [
      rule("canvas.study-dissolve", "pointer-events: none"),
      rule(".scene-load-state", "inset: 0"),
      rule(/^:is\([^)]*\.section-locator[^)]*\.scene-load-state\)$/, "position: absolute", "pointer-events: none"),
      rule(".scene-load-state .button", "pointer-events: auto")
    ]
  },
  {
    name: "Origins: the page scrolls over the scene on touch screens until Explore",
    has: [
      rule(".scene-viewport > canvas", "touch-action: pan-y", { media: "(pointer: coarse)" }),
      rule(".scene-viewport[data-exploring] > canvas", "touch-action: none", { media: "(pointer: coarse)" })
    ]
  },
  {
    name: "Origins render states: the load state leaves when ready; a failed scene hides its canvas, hint and Explore",
    has: [
      rule(/data-render-state="ready"\]\) \.scene-load-state$/, "display: none"),
      rule(/data-render-state="error"\]\) \.scene-viewport > canvas$/, "visibility: hidden"),
      rule(/data-render-state="error"\]\) \.scene-viewport :is\(\.scene-hint, \.scene-explore\)$/, "display: none")
    ]
  },
  {
    name: "the Origins sources dialog sets display only while open",
    has: [rule(".sources-dialog[open]", "max-height: 85svh", "overflow: auto")],
    lacks: [rule(".sources-dialog", "display")]
  },
  {
    name: "scene posters cover the stage under its readouts, take no input and fade out when the scene is ready",
    has: [
      rule(".scene-poster", "position: absolute", "inset: 0", "z-index: 0", "pointer-events: none", "transition: opacity 240ms ease-out", "--motion-fade: 120ms"),
      rule(".scene-poster > img", "width: 100%", "height: 100%", "object-fit: cover"),
      rule(":where([data-ready=\"true\"], [data-render-state=\"ready\"]) .scene-poster", "opacity: 0"),
      rule(".scene-poster[data-scene-poster=\"done\"]", "opacity: 0")
    ]
  },
  // The second effects pass (owner, 2026-11-18: "all of my previous effects"): the workspaces' light at 2f20d7e.
  {
    name: "the planetary text controls rest on a pool in the old metal face's tones, ease their beam in 180 ms and glow in 140 ms, light brass to steel under the pointer and hold a 2 px brass beam over a warm pool when chosen (E033, 2026-11-26)",
    has: [
      rule(".planetary :is(.planetary-materials, .planetary-toolbar, .planetary-mineral-tabs) :is(.button, .icon-button)", "background-image: radial-gradient(closest-side, var(--obs-pool), transparent)", "transition: border-color 180ms ease-out, box-shadow 140ms ease-out, background-color 180ms ease-out"),
      rule('.planetary .button[aria-pressed="true"]', "border-bottom-color: var(--obs-accent)", "background-image: radial-gradient(closest-side, var(--obs-pool-warm), transparent)", "box-shadow: inset 0 -1px var(--obs-accent)", "color: var(--obs-accent)"),
      rule(/^\.button:hover:not\(:disabled, \[aria-disabled="true"\], \[aria-pressed="true"\], \[aria-current="page"\], \[aria-selected="true"\]\)$/, "background: var(--obs-beam-lit) 0 100% / 100% 1px no-repeat border-box, radial-gradient(closest-side, var(--obs-pool-warm), transparent)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".planetary-ci", "background-image: none", { media: "(forced-colors: active), print" })
    ],
    lacks: [rule(".planetary .button", "border-radius: var(--radius-control)")]
  },
  {
    name: "with the effects on, the chosen planetary label glows brass under its 2 px brass beam (no frame since 2026-11-28) and the chosen mineral tab's beam glows steel; the Planetary CI panel keeps its glaze on a layer feathered 40 px in from every edge, with a glint hairline and no border (E034, E042, 2026-11-26)",
    has: [
      rule(".planetary-label[aria-pressed=\"true\"]", "border-bottom-color: var(--obs-accent)", "box-shadow: inset 0 -1px var(--obs-accent)", "color: var(--obs-accent)", { media: null }),
      rule('.planetary[data-focus-fx="on"] .planetary-label[aria-pressed="true"]', "box-shadow: inset 0 -1px var(--obs-accent), 0 6px 12px -4px color-mix(in srgb, var(--obs-accent) 40%, transparent)"),
      rule('.planetary[data-focus-fx="on"] .planetary-mineral-tabs > [aria-pressed="true"]', "box-shadow: inset 0 -1px var(--obs-accent), 0 7px 14px -7px color-mix(in srgb, var(--obs-edge-cool) 40%, transparent)"),
      rule(".planetary-ci::before", "background: var(--obs-glass-face), var(--obs-plate-night)", "mask-composite: intersect", { media: null }),
      rule(".planetary-ci::after", "background: var(--obs-glass-glint) 50% 0 / calc(100% - 80px) 1px no-repeat", { media: null }),
      rule(".planetary-ci::before", "display: none", { media: "(forced-colors: active), print" })
    ],
    lacks: [rule(".planetary-ci", "border: 1px solid var(--obs-hairline)", { media: null }), rule(".planetary-stage", "border-radius: var(--radius-cell)"), rule(".planetary-label[aria-pressed=\"true\"]", "border-color: var(--obs-text)", { media: null })]
  },
  {
    // The lab site's language (2026-11-26): the old glass face is a resting pool on each control, the chosen mission's
    // brass wash a warm pool and its full brass edge a 2 px brass beam; the player has no frame and its plate is a print.
    name: "the sample missions' tabs, steps and secondary controls rest on pools in the glass tones; the chosen mission carries a warm pool over a 2 px brass beam, the current chapter a warm pool over its ink rule; the scene is a mounted print; Play stays the primary (E035)",
    has: [
      rule(".sample-missions .mission-selector [aria-selected=\"true\"]", "border-bottom-color: var(--obs-accent)", "background-image: radial-gradient(closest-side, var(--obs-pool-warm), transparent)", "box-shadow: inset 0 -1px var(--obs-accent)", { media: null }),
      rule(".mission-selector button", "border-bottom-color: var(--obs-control-border)", "border-radius: 0", "transition: color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease"),
      rule(".mission-chapters [aria-current=\"step\"]", "background: radial-gradient(closest-side, var(--obs-pool-warm), transparent)", "box-shadow: inset 0 -2px var(--obs-text)"),
      rule(".mission-scene", "box-shadow: var(--obs-print-drop)", { media: null }),
      text("--obs-print-drop: var(--obs-print-shadow)"),
      rule(".sample-missions .mission-selector [aria-selected=\"true\"]", "background-image: none", { media: "(forced-colors: active), print" })
    ],
    lacks: [rule(".mission-player", "border"), rule(".mission-player", "background-image")],
    check(source) {
      assert.match(source, /\.sample-missions :is\(\.mission-selector button, \.mission-story li button, \.mission-transport \.icon-button, \.mission-share \.button\)\s*\{[^}]*background-image: radial-gradient\(closest-side, var\(--obs-pool\), transparent\);[^}]*transition: color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease/, "the controls' pools ease in 160 ms");
    }
  },
  {
    name: "the Origins switch slides its old highlighted block as a 2 px brass beam with its glow in 220 ms under two equal text options; the icon buttons ease their beam and glow in 160 ms (the old metal hover face is the warm pool of surface-light); the track fills with brass to the chapter's progress (E036, E037, 2026-11-26)",
    has: [
      rule(".segmented", "position: relative", "isolation: isolate", "display: grid", "grid-auto-columns: 1fr", "background: linear-gradient(var(--obs-control-border), var(--obs-control-border)) 0 100% / 100% 1px no-repeat"),
      rule(".segmented::before", "position: absolute", "inset: auto auto 0 0", "width: 50%", "height: 2px", "background: var(--obs-accent)", "box-shadow: 0 0 9px var(--obs-gold-glow)", "transition: transform 220ms cubic-bezier(.2, 0, .38, .9)", { media: null }),
      rule(".segmented:has(> :last-child[aria-pressed=\"true\"])::before", "transform: translateX(100%)"),
      rule(".observatory .icon-button", "transition: color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease, background-color 160ms ease"),
      rule(".transport input", "appearance: none", "background: linear-gradient(to right, var(--obs-accent) calc(var(--chapter-progress, 0) * 100%), var(--obs-hairline) 0) center / 100% 3px no-repeat", { media: "(forced-colors: none)" }),
      rule(".transport input::-webkit-slider-thumb", "background: var(--obs-accent)", "box-shadow: 0 0 0 1px var(--obs-accent)", { media: "(forced-colors: none)" }),
      // Firefox draws the same brass bead (restored once the size limit stopped removing effects, owner 2026-11-18).
      rule(".transport input::-moz-range-thumb", "width: 10px", "height: 10px", "background: var(--obs-accent)", "box-shadow: 0 0 0 1px var(--obs-accent)", { media: "(forced-colors: none)" }),
      rule(".segmented::before", "display: none", { media: "(forced-colors: active), print" })
    ],
    lacks: [rule(".observatory .icon-button:active", "transform"), rule(".segmented", "border-radius")]
  },
  {
    name: "the Origins sources open over the old dark screen (no blur: not on the blur list), the scene hint keeps its legibility shadow, and Explore sits on the old soft shadow on phones and touch screens (E038, E135, E043)",
    has: [
      rule(".sources-dialog::backdrop", "background: var(--obs-scrim-deep)"),
      rule(".scene-hint", "text-shadow: var(--obs-hint-shadow)", { media: null }),
      rule(".scene-hint", "text-shadow: none", { media: "(forced-colors: active), print" }),
      rule(".scene-viewport .scene-explore", "box-shadow: var(--obs-touch-shadow)", { media: "(max-width: 760px), (hover: none) and (pointer: coarse)" })
    ],
    lacks: [rule(".sources-dialog::backdrop", "backdrop-filter")]
  },
  {
    name: "the image inspector's chosen region reads in brass on a warm pool and a hovered one lights a pool (its old brass edge, 2026-11-26); a gold beam stands at the chosen region and slides in 240 ms only with the effects on, motion allowed and from 761 px (E041, E108)",
    has: [
      rule('.inspector-regions [aria-pressed="true"]', "color: var(--obs-accent)"),
      rule('.inspector-regions button:hover:not([aria-pressed="true"])', "background: var(--obs-fade-start) 0 100% / 100% 1px no-repeat, radial-gradient(closest-side, var(--obs-pool-hover), transparent) 0 50% / min(100%, 8rem) 100% no-repeat", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".research-scale .inspector-regions::after", "position: absolute", "top: calc(var(--i) * 44px)", "width: 2px", "background: var(--obs-accent)", "box-shadow: 0 0 9px var(--obs-gold-glow)", "pointer-events: none", { media: null }),
      rule(".research-scale .inspector-regions::after", "transition: top 240ms cubic-bezier(.2, .7, .2, 1), left 240ms cubic-bezier(.2, .7, .2, 1)", { media: "(prefers-reduced-motion: no-preference) and (min-width: 761px)" }),
      rule(".research-scale .inspector-regions::after", "display: none", { media: "(forced-colors: active), print" })
    ],
    check(source) {
      assert.match(source, /:where\(html:not\(\.ambient-fx-disabled, \.mads-power-low\)\) \.research-scale \.inspector-regions::after/, "the beam slides only with the effects on and outside low power");
    }
  },
  {
    name: "the 3-D mission scene's caption lies in the print's top margin on the night ground, with no rule or face under it (not a title bar; 2026-11-28)",
    has: [rule(".mission-scene-bar", "display: flex", "color: var(--obs-muted)", { media: null })],
    lacks: [rule(".mission-scene-bar", "border-bottom: 1px solid var(--obs-hairline)")]
  },
  {
    name: "a mission tab's agency stays muted under the kicker's restored accent (2026-11-28)",
    has: [rule(".mission-selector .mission-agency", "color: var(--obs-muted)", { media: null })]
  }
];
