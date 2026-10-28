# Performance And Browser Watchlist

The main technical risk in this site is rendering complexity, not JavaScript syntax. The current site uses fixed layers, backdrop filters, animations, and many CSS overrides. Refactors should reduce compositor work.

## Current Stable Ambient Baseline

Treat the current stable ambient baseline as:

```text
ambient_fx_toggle_lightmode_skin
on top of ambient_fx_toggle_stable_bottom
on top of ambient_fx_toggle_low_power
with DOM ambient restored
and mobile Mission Log lightbox disabled
```

## Ambient Rules

- FX default: see "Ambient FX" in `docs/ui-invariants.md` (on for desktop; off at 760px and below and with reduced motion).
- Create the ambient DOM layer only when enabled.
- Remove the layer when disabled.
- Pause timers when the document is hidden.
- Keep dust and pebble positions re-seeded per animation cycle.
- Meteors should enter from offscreen and exit offscreen.
- The orbital solar-system layer is part of FX and must not exist in the DOM while FX is off.
- The orbital layer moves by compositor-only transform animations (one Web Animation per planet and label track in `interface-2046.js`); do not go back to per-frame `left`/`top` or custom-property writes, which cost a style recalculation and layout every frame.
- Mobile/coarse-pointer views must not create the orbital layer, scroll HUD, or research coordinates panel.

Current particle/cadence values:

- desktop dust: 122
- desktop pebble: 20
- desktop meteor interval: 1900 ms
- mobile dust: 88
- mobile pebble: 14
- mobile meteor interval: 2600 ms

If power or heat remains a problem, reduce counts and cadence before redesigning the visual identity.

## Edge White Block History

Microsoft Edge has shown white rectangular tile artifacts around page close/teardown. Several mitigation directions are risky:

- Edge-only mask/observer logic can lock the opening screen.
- closing-frame ambient non-painting mitigations may not fully solve the issue.
- canvas fallback can make ambient dust/pebbles/meteors disappear.

Current practical policy:

- FX defaults follow `docs/ui-invariants.md` (FX has been on by default on desktop since b8ab393); changing the default is the owner's decision, not an Edge workaround
- use small, targeted Edge teardown guards
- do not let teardown guards affect the normal exit of the home arrival screen (the older entry gate is retired)
- test opening screen, normal ambient visibility, mobile image behavior, and close-frame behavior together

## Refactor Direction

The sustainable fix is to reduce rendering load:

- fewer fixed layers
- fewer `backdrop-filter` surfaces
- fewer always-running animations
- structured content rendered into static HTML
- smaller CSS: prune dead rules and consolidate owners inside the one bundle (see "Stylesheet Ownership" in `docs/ui-invariants.md` before splitting it per page)

The site already runs on Astro with TypeScript and JSON/ES module data files; keep moving content into those rather than rendering it at runtime. The goal is not a dynamic app. The goal is a cleaner static site that GitHub Pages can serve reliably.

## Asset Budget Notes

- All stylesheets, the three component stylesheets from `src/` included, ship as one render-blocking request, `assets/css/site.css` (whitespace-minified bundle, about 76 KB gzip on 2026-10-28; 117 KB gzip across 16 separate requests before bundling).
- The Ryugu shape model ships as `ryugu.glb` (0.6 MB) instead of the 2.6 MB OBJ. It is an exact float32 re-encoding; `restoreFacetedShape` rebuilds the OBJ loader's geometry bit for bit.
- The comparison workspaces (sample-return missions, planetary field guide, published microscopy) live on `ryugu-bennu.html`, and `src/scripts/feature-loader.js` imports each heavy feature only on a page that contains it, so the Research page does not load three.js or the shape models.

Run `npm run audit:css:check` when changing stylesheet ownership; it fails if `style.css` grows or a stylesheet is missing from the baseline. After an intentional change, refresh the baseline with `npm run audit:css -- --write`. Treat `docs/css-baseline.json` as a complexity ceiling: new work should not increase `style.css` size or repeated-selector count.
