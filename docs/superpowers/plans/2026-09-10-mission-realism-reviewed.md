# Source-backed mission realism review — 10 September 2026

Scope: the user authorized continued local iteration toward a 9.5-quality mission experience, including parallel agents. The score is a subjective design target; the acceptance criteria below are observable. No deployment, commit or push is included.

## Implemented

- Earth, launchers, spacecraft and capsules use one kilometre coordinate system and published physical sizes. Camera framing changes without enlarging the models.
- Launch and return use source-anchored explanatory positions, event times, altitude and entry-speed profiles. Hayabusa2 launch chronology is postflight; OSIRIS-REx launch chronology is nominal. Parking coast is distinct from later heliocentric cruise and Earth flyby.
- Source orbit vectors remain the basis for flyby, rendezvous and departure. Position dots and travelled/ahead paths replace the misleading oversized directional arrow.
- Actual spacecraft geometry stays attached, with folded solar arrays, throughout exposed upper-stage flight; arrays unfold only after release. Stage debris recedes and leaves the view.
- Detail views keep geographic/distance context in a named inset. Annotations avoid the inset and one another. The return capsule is visible beside its mother ship; it no longer hides behind Hayabusa2's solar panel.
- Capsule separation and atmospheric entry share an exact physical position at their boundary. Heat-shield orientation follows the airflow; parachute descent is vertical and ends at the regional surface locator.
- Hayabusa2 uses a cruciform canopy and recovered inner capsule. OSIRIS-REx uses a triconic main canopy and reflects the reported drogue anomaly. The capsule remains stationary while the canopy settles continuously after touchdown.
- Ground texture uses filtered, low-contrast variation. The inset reuses the main shadow map. Paused rendering settles and stops; manual orbit/zoom and reversible scrubbing remain supported.
- Launch, return and entry chapters play over 28, 22 and 26 seconds, respectively. Displayed progress does not reach 100% before completion.

## Evidence and boundaries

- 71 unit/integration checks pass, including actual NASA spacecraft geometry, physical dimensions, event order, contact, source track continuity, retained payload, solar deployment, capsule/canopy geometry, camera continuity and annotation layout.
- Browser checks cover 56 Earth-flight frames and 36 physical-proximity views at desktop/mobile widths, plus 20 final visual frames after texture/annotation refinements.
- Camera checks cover automatic settling, idle rendering, manual control preservation and reduced-motion scrub coalescing.
- Source details: `docs/earth-physics-sources.md`, `docs/mission-ephemeris-sources.md`, and `public/assets/data/missions/SPACECRAFT-CREDITS.md`.
- These are educational visualizations, not a reconstructed flight telemetry product. Interpolated launch/entry trajectories, spacecraft attitudes, local terrain, canopy deformation and Hayabusa2 canopy span are illustrative. NASA's 7.3 m canopy diameter is nominal. Recovery markers identify regions, not surveyed touchdown coordinates.
- The legacy geography demo and its required motion helper are retained: automatic approval review rejected removing them. The new renderer does not use those legacy paths; retention does not block this iteration.

Final browser interaction and whole-site verification results are recorded below after execution.

Final verification completed:
- Playback, pause/scrub, automatic chapter advance, keyboard tabs, offscreen pause, reduced motion, mobile touch, rapid switches, navigation cleanup and BFCache restoration passed at four widths in both themes.
- Whole-site navigation, focus and Back restoration; source links; search empty/reset states; CV content; email copy/fallback; photography descriptions; and archive access boundary passed.
- Production build and site checks passed for 9 public pages, protected Mission Log, assets, metadata and Paper Shelf. Presentation-data export retained 11 papers.
- Local preview revision: `research.html?revision=mission-realism-reviewed-20260910#missions-title`. No publication, commit or push.
