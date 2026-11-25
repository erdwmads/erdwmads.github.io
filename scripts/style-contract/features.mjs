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
    name: "the planetary buttons rest on the old metal face, ease their edge in 180 ms and shadow in 140 ms, edge in steel under the pointer and take the darker active face under brass when chosen (E033)",
    has: [
      rule(".planetary :is(.planetary-materials, .planetary-toolbar, .planetary-mineral-tabs) :is(.button, .icon-button)", "background-image: var(--obs-control-face)", "transition: border-color 180ms ease-out, box-shadow 140ms ease-out"),
      rule('.planetary .button[aria-pressed="true"]', "border-color: var(--obs-accent)", "background-image: var(--obs-control-active-face)", "text-decoration: underline 2px"),
      rule(/:is\(\.button, \.icon-button\):hover:not\(\[aria-pressed="true"\], :disabled\)$/, "border-color: var(--obs-edge-cool)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".planetary-toolbar .icon-button:active:not(:disabled)", "box-shadow: var(--obs-control-pressed)"),
      rule(".planetary-ci", "background-image: none", { media: "(forced-colors: active), print" })
    ]
  },
  {
    name: "with the effects on, the chosen planetary label glows brass and the chosen mineral tab steel; the Planetary CI panel is glazed (E034, E042)",
    has: [
      rule('.planetary[data-focus-fx="on"] .planetary-label[aria-pressed="true"]', "border-left-color: var(--obs-accent)", "box-shadow: inset 1px 0 var(--obs-accent), 0 0 12px color-mix(in srgb, var(--obs-accent) 24%, transparent)"),
      rule('.planetary[data-focus-fx="on"] .planetary-mineral-tabs > [aria-pressed="true"]', "box-shadow: var(--obs-control-shadow), 0 0 14px color-mix(in srgb, var(--obs-edge-cool) 14%, transparent)"),
      rule(".planetary-ci", "background-image: var(--obs-glass-face)", { media: null })
    ]
  },
  {
    name: "the sample missions' tabs, steps, player and secondary controls sit on glass; the chosen mission carries a brass wash under a brass rule, the current chapter a faint brass wash; Play stays the primary (E035)",
    has: [
      rule(".mission-player", "background-image: var(--obs-glass-face)", { media: null }),
      rule(".sample-missions .mission-selector [aria-selected=\"true\"]", "background-image: linear-gradient(115deg, var(--obs-gold-glow), transparent), var(--obs-glass-face)", { media: null }),
      rule(".mission-selector [aria-selected=\"true\"]::before", "border-top: 2px solid var(--obs-accent)"),
      rule(".mission-chapters [aria-current=\"step\"]", "background-color: color-mix(in srgb, var(--obs-accent) 12%, transparent)"),
      rule(".mission-player", "background-image: none", { media: "(forced-colors: active), print" })
    ],
    check(source) {
      assert.match(source, /\.sample-missions :is\(\.mission-selector button, \.mission-story li button, \.mission-transport \.icon-button, \.mission-share \.button\)\s*\{[^}]*background-image: var\(--obs-glass-face\);[^}]*transition: color 160ms ease, border-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease/, "the glazed controls ease in 160 ms");
    }
  },
  {
    name: "the Origins switch slides its highlighted block in 220 ms over two equal options; the icon buttons take the metal face under the pointer; the track fills with brass to the chapter's progress (E036, E037)",
    has: [
      rule(".segmented", "position: relative", "isolation: isolate", "display: grid", "grid-auto-columns: 1fr"),
      rule(".segmented::before", "position: absolute", "z-index: -1", "width: 50%", "background: var(--obs-highlight)", "transition: transform 220ms cubic-bezier(.2, 0, .38, .9)", { media: null }),
      rule(".segmented:has(> :last-child[aria-pressed=\"true\"])::before", "transform: translateX(100%)"),
      rule(".observatory .icon-button:hover:not(:disabled)", "background-image: var(--obs-metal)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".transport input", "appearance: none", "background: linear-gradient(to right, var(--obs-accent) calc(var(--chapter-progress, 0) * 100%), var(--obs-hairline) 0) center / 100% 3px no-repeat", { media: "(forced-colors: none)" }),
      rule(".transport input::-webkit-slider-thumb", "background: var(--obs-accent)", "box-shadow: 0 0 0 1px var(--obs-accent)", { media: "(forced-colors: none)" }),
      // Firefox draws the same brass bead (restored once the size limit stopped removing effects, owner 2026-11-18).
      rule(".transport input::-moz-range-thumb", "width: 10px", "height: 10px", "background: var(--obs-accent)", "box-shadow: 0 0 0 1px var(--obs-accent)", { media: "(forced-colors: none)" }),
      rule(".segmented::before", "display: none", { media: "(forced-colors: active), print" })
    ],
    lacks: [rule(".observatory .icon-button:active", "transform")]
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
    name: "the image inspector's chosen region reads in brass and a hovered one edges in brass; a gold beam stands at the chosen region and slides in 240 ms only with the effects on, motion allowed and from 761 px (E041, E108)",
    has: [
      rule('.inspector-regions [aria-pressed="true"]', "color: var(--obs-accent)"),
      rule(".inspector-regions button:hover", "box-shadow: inset 0 0 0 1px var(--obs-accent)", { media: "(hover: hover) and (forced-colors: none)" }),
      rule(".research-scale .inspector-regions::after", "position: absolute", "top: calc(var(--i) * 44px)", "width: 2px", "background: var(--obs-accent)", "box-shadow: 0 0 9px var(--obs-gold-glow)", "pointer-events: none", { media: null }),
      rule(".research-scale .inspector-regions::after", "transition: top 240ms cubic-bezier(.2, .7, .2, 1), left 240ms cubic-bezier(.2, .7, .2, 1)", { media: "(prefers-reduced-motion: no-preference) and (min-width: 761px)" }),
      rule(".research-scale .inspector-regions::after", "display: none", { media: "(forced-colors: active), print" })
    ],
    check(source) {
      assert.match(source, /:where\(html:not\(\.ambient-fx-disabled, \.mads-power-low\)\) \.research-scale \.inspector-regions::after/, "the beam slides only with the effects on and outside low power");
    }
  }
];
