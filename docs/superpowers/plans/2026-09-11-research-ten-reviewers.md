# Research model review and refinement — 11 September 2026

User authorization: audit Research from ten independent planetary-science/product perspectives and fix the concrete issues. Local revision first. No score substitutes for verification.

## Plan
- [x] Capture current mission and planetary-model states as a reproducible visual baseline.
- [x] Collect ten independent reviews: flight dynamics; spacecraft hardware; sampling mechanisms; asteroid geology; mineralogy; scientific evidence; interaction/product flow; visual legibility; performance/lifecycle; accessibility/responsiveness.
- [x] Consolidate findings into a severity/evidence/fix/verification register. Prioritize misleading physical relationships, missing/penetrating models, incorrect chronology and blocked interactions.
- [x] Assign non-overlapping implementation scopes; add regression checks for substantive behavior bugs before fixing them. Avoid speculative features and unsupported precision.
- [x] Rebuild once changes are integrated; inspect actual desktop/mobile scenes in both themes, not just passing math tests.
- [x] Have the relevant reviewers recheck their acceptance criteria. Record resolved issues and scientific/visual limitations; leave a local preview for user review.

## Current architecture
`SampleMissions.astro` and `src/scripts/sample-missions/` own the two sample-return demonstrations. `PlanetaryExplorer.astro`, `planetary-explorer.js`, `planetary-renderer.js` and `planetary-orbit-bodies.js` own orbital context, asteroid shapes, samples and illustrative minerals. Keep these entry points and shared-site navigation stable.

## Acceptance
Every high-impact finding must be fixed or explicitly resolved with evidence. Validate unit outcomes (dimensions, clearance, contact, event continuity) and browser outcomes (visible model, correct context, camera framing, labels, controls, no shader/runtime failures). Do not imply independent real experts unanimously certified the site: the ten agents provide critical review perspectives.

## Independent reviews and fixes

All ten independent reviewers completed: 01 flight dynamics, 02 spacecraft hardware, 03 sampling mechanisms, 04 asteroid geology, 05 mineralogy, 06 scientific evidence, 07 interaction, 08 visual legibility, 09 lifecycle/performance, 10 accessibility. Mineralogy established no additional P1/P2 defect; optional aesthetic suggestions were not treated as scientific errors.

| Review | Confirmed finding | Implemented correction | Verification |
| --- | --- | --- | --- |
| 01 | UTC seconds treated as milliseconds; flyby globe had arbitrary fixed terrestrial orientation | Correct UTC interpolation; mean sidereal rotation and inverse precession followed by the trajectory display rotation | UTC knot continuity; independent orientation fixtures; interpolated flyby geographic regions |
| 02 | Four Hayabusa2 engines face inward | Reverse cluster orientation | Actual nozzle geometry and normals |
| 02 | Folded spacecraft floats above adapter | Match structural mounting anchors and support rings | Physical interface geometry and integrated launch poses |
| 02 | TAGSAM links telescope; Hayabusa2 horn stays deployed during launch | Fixed-length articulated deployment; reversible horn stow | 101-pose geometry sweeps and bus clearance |
| 03 | Retained source hardware intersects TAGSAM during stow | Narrowly retain but hide interfering source geometry replaced by the moving mechanism | Source triangle preservation; centerline and arm-radius collision probes |
| 03 | Bennu contact behaves as rigid ground | Yielding local terrain and head penetration | Actual decoded head footprint, contact and reverse playback |
| 03 | Projectile hidden; ejecta precedes impact | Sampling-only open horn cutaway; one impact event; inlet particle paths | Camera-directed rays, event continuity, collection paths |
| 04 | Mean diameter used as longest mesh span; added boulders change physical size | Preserve source metre/kilometre conversion before augmentation | Actual GLB/OBJ dimensional integration and augmentation invariance |
| 06 | UTC hidden; illustrative parachute receives blanket physical-scale claim; synthetic altitude reads like telemetry | Visible UTC; capsule/parachute scale exception; Model altitude label | Browser visible text and slider accessible values |
| 07 | Photo deep links require WebGL/data; model failure blocks mission descriptions | Immediate photo restoration/sharing; renderer-independent chapter navigation | Blocked-data/WebGL and failed-model browser scenarios |
| 07 | Retry reuses lost context; asteroid selection resets orbital camera | Recreate renderer with independent listener lifetime; retain orbit camera | Repeated real context loss and shared camera snapshots |
| 08 | Return close-up shrinks both vehicles to subpixels; stow labels identify the wrong object/phase | Follow released capsule at capsule scale with distant-spacecraft direction; phase-specific moving-head annotation | Physical camera tests and rendered-frame inspection |
| 09 | Pending load overwrites context-loss error with ready state | Invalidate version and guard asynchronous commits | Actual loader/handler race replay during load and compile |
| 10 | Pointer-only mission rotation; continuous live-region flood | Arrow-key rotation; non-live telemetry during playback plus bounded phase announcements | Browser keyboard/progress and live-region assertions |

Hardware cross-review by reviewer 03 found no remaining substantive defect in the requested geometry scope. Source retirement is narrow and explicitly does not assert the unknown identity of the original fitting. Mount interface details, hinge choreography, terrain and sampling motion remain authored illustrations; the corrected physical dimensions and source trajectories must not be described as attitude telemetry or a measured reconstruction.

## Validation log
- Final combined CPU run: 124/124 passed, including geometry, contact, articulation, physical scale, globe orientation, timestamps, lifecycle, orbital data and observation serialization.
- Flight orientation reviewer: six new regressions passed; interpolated closest-approach regions agree with source metadata within 0.11 degrees. UTC approximates UT1; nutation, polar motion, frame bias and terrestrial flattening are not included.
- Astro build, PPT export, and site check passed.
- Browser regressions passed: failed-model chapter reading, no-WebGL sample photographs, repeated real context-loss recovery, keyboard rotation, live announcements, UTC, viewpoint preservation, restoration races, playback, ordinary scrolling, four mission widths in both themes, touch and navigation lifecycle.
- Captured 52 desktop mission/planetary states and 20 additional desktop/mobile mission frames without runtime errors. Reviewer 08 accepted revised return, stowage, sampling, rendezvous and size-comparison desktop views; root inspected mobile launch and capsule frames.
- Broader pixel checks found the correctly rescaled comparison too close to the right edge at 320 px. The comparison camera now derives horizontal framing from actual geometry bounds with a 16% margin; physical sizes remain unchanged. The final full model pixel suite passed: model loading, comparison/wireframe, mineral forms, mobile interaction, both themes, source boundaries and navigation cleanup.
- Updated one pre-existing playback test to use the established Ctrl+wheel zoom gesture; normal wheel continues scrolling the page. No production gesture was changed.
- One initial browser attempt raced the unfinished build and is excluded from product findings; subsequent runs use completed builds.

## Delivery
Local preview: http://127.0.0.1:52523/research.html?revision=ten-reviewers-20260911#missions-title
No deployment was performed in this revision. No unresolved P1/P2 finding remains in the scoped reviews and completed checks. These checks do not certify an exact spacecraft engineering reconstruction.


## Follow-up: continuous motion feedback (2026-09-11)

The previous delivery's scoped acceptance did not cover the animation and explanatory failures reported next by the user. Its tests are historical evidence, not a statement that these later findings were absent. This follow-up covers BOTH Hayabusa2 and OSIRIS-REx.

- Replace authored solar cruise/transfer with independently retrieved JPL heliocentric vectors, same UTC boundaries around the Earth flyby. Explain different source solutions at the local asteroid approach.
- Compare Earth-relative and Sun-relative velocities at the same instant, render moving Earth in the Sun frame and show vector addition.
- Fix near-camera zoom limits, remove unrequested cruise camera drift, pause playback on manual interaction, and preserve local up axes. Keep physical spacecraft sizes with separately labelled contextual close-ups.
- Show source range histories and approach/recession speeds to distinguish arrival, station-keeping and Earthbound departure.
- Restore complete Hayabusa2 horn by default; cutaway is optional. Correct SCI projectile flight, common crater/target geometry and ejecta deposition at the actual terrain height. Second touchdown is about20m north of the crater, not inside it. Check Bennu contact and TAGSAM framing equally.
- Correct capsule relative release direction, finite divert acceleration and return-to-entry handoff. Refine both illustrative recovery terrains and final capsule framing.

Validation in progress: source/vector tests; complete-pose sweeps; real-browser controls in both missions; desktop and mobile screenshot inspection. No publication in this follow-up.

### Follow-up verification
- Final combined CPU run:153/153 passed.
- Both missions passed12 browser control/continuity groups: fixed solar cameras, same-UTC reference switching, correct velocity addition, bounded close-ups and pause-on-interaction.
- Final build inspected12 desktop states and36 responsive checks across320/390/760px, two themes and both missions. Full-horn toggle, readable velocity SVG and no visible control overflow passed.
- Failed-model chapter reading, keyboard control, live-region bounds and actual WebGL-loss retry remain passing.
- Additional image inspection led to SCI terrain self-shadow/NW lighting, precise particle endpoint ground heights and replacement of coarse camouflage-like recovery texture with restrained continuous grain.
- The final preview remains local; no deployment or claims of perfect scientific reconstruction.
