# Sample-return mission viewer
User-authorized scope: add Hayabusa2 and OSIRIS-REx original sample-return missions inside Research, with beautiful 3D spacecraft and scrubbable launch-to-recovery animation. Show a local preview before publication.

1. Verify agency chronology and spacecraft mechanisms. Keep dated events separate from authored path geometry.
2. Build a single mission viewer before the existing material explorer, with mission selector, dated chapter strip, explanatory sidebar, canvas, playback, scrubber and camera controls.
3. Use existing public asteroid meshes and Earth maps, official NASA OSIRIS-REx geometry where practical, and an attributed Hayabusa2 representation. Model horn/projectile versus TAGSAM/nitrogen, SCI, sample stowage, capsule separation and parachute recovery.
4. Keep paths, surface terrain, orientations, duration and relative scale explicitly schematic. Main spacecraft never lands on Earth. No claim to reproduce mission telemetry.
5. Use the persistent site shell; lazily allocate a single additional renderer, stop offscreen and dispose on soft navigation. Honor reduced motion and touch scrolling.
6. Verify reversible sampling clearance, capsule/spacecraft separation, all 17 mission stages, resource cleanup, controls, responsive layouts and distinct renders. Inspect screenshots and browser errors. Preserve the existing sample image as the sole destination for returned-material photographs.

Verified locally: production build and site check; 7 motion/model tests; 17 mission chapter renders; actual play/pause/scrub and automatic chapter progression; both sampling mechanisms; 320/390/768/1440 widths in space and light themes; mobile touch; offscreen pause; reduced-motion changes; rapid mission switches; soft-navigation disposal and BFCache restoration; Research image ownership and section order; persistent Origins header/background, fade and history navigation. Final stowage and both recovery scenes were visually rechecked after material/camera refinements. Navigation transitions and asynchronous GPU scene readiness use separate test deadlines. No production deployment performed.
