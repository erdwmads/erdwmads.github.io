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

- Default FX off.
- Create the ambient DOM layer only when enabled.
- Remove the layer when disabled.
- Pause timers when the document is hidden.
- Keep dust and pebble positions re-seeded per animation cycle.
- Meteors should enter from offscreen and exit offscreen.

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

- keep FX off by default
- use small, targeted Edge teardown guards
- do not let teardown guards affect normal entry-gate exit
- test opening screen, normal ambient visibility, mobile image behavior, and close-frame behavior together

## Refactor Direction

The sustainable fix is to reduce rendering load:

- fewer fixed layers
- fewer `backdrop-filter` surfaces
- fewer always-running animations
- structured content rendered into static HTML
- smaller CSS with page-scoped sections

Recommended rewrite stack:

```text
Astro + TypeScript + Markdown/JSON content
```

The goal is not a dynamic app. The goal is a cleaner static site that GitHub Pages can serve reliably.
