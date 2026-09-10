# Mission refinement beyond the first visual pass

User authorization: continue refining the local Research mission study. No publication requested.

Use the approved site layout; improve mechanical explanation and presentation robustness rather than adding decoration or pretending that 9.99 is an objective measurement.

1. Source-backed spacecraft mechanisms (spacecraft.js and focused helpers/tests): folded solar arrays during launch, smooth deployment after separation; OSIRIS-REx head placement, release, arm clearance and capsule lid closure. Preserve reversibility, source mesh, sample-contact anchors and independent capsule ownership.
2. Cinematography and navigation (camera.js, viewer.js, presentation.js): follow the separated spacecraft closely enough to see deployment; inspect the actual stowage mechanism from above; prevent below-ground camera views; preserve the displayed frame through rapid chapter changes.
3. Control clarity (loader.js, styles): no accidental page-scroll trap over the canvas, accurate touch/keyboard hints, meaningful accessible progress text, non-overlapping labels.
4. Verify actual scenes at mechanical event boundaries, then all chapters and desktop/mobile light/dark interactions. Inspect representative frames and get an independent critique. Retain schematic disclosure and local preview.

Tests must check outcomes: contact/containment, return-to-original geometry, visible nonblank frames, settled camera, no ground penetration, uninterrupted page scrolling and control operability.


## Verified refinement outcome

- Added reversible solar-array deployment to both spacecraft; preserved the authored NASA triangles and Hayabusa2 deployed bounds.
- OSIRIS-REx now seats and releases the collector into the capsule, withdraws the arm and closes the source-model lid. An elevated camera follows the entire arm-to-capsule sequence; all 101 sampled poses retain the head in frame at desktop and portrait aspects.
- Fixed interrupted HDR dissolves by capturing the currently displayed linear-light blend. The regression reproduces the former jump and now measures identical RGB values at the interruption boundary.
- Corrected the Hayabusa2 return capsule's separation orientation and stale stowage-label transforms.
- Refined asteroid fragment sizes/patches and grounded parachute folds, with a closer final recovery shot.
- Ordinary wheel and initial touch swipes scroll the page. Explore/Done, keyboard playback, progress announcements and context-loss Retry restore matching UI/viewer states.

Verification: 21 geometry/camera tests; 17 rendered mission chapters; four viewport widths in both themes; playback/scrub/automatic chapters; touch and keyboard; reduced motion; navigation/BFCache cleanup; sample destination and no duplicated image content. Added context-loss recovery and initial physical swipe tests. Independent code and screenshot reviews identified specific issues, all of which were corrected. Local build and site checks passed. No publish, commit or push.

Visual limits: spacecraft movement, added terrain and relative scene scales remain an illustrative reconstruction, not engineering telemetry or a photogrammetric mission replay. A precise 9.99 rating is not an objective acceptance measurement. Warm headless samples on this desktop's Iris Xe ran around 28–31 fps under the current workload; that is not a cross-device performance guarantee.
