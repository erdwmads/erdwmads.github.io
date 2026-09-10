# Mission cinematic iteration
Authorized by user: continue improving the local mission study until the work merits above 9/10. No publication authorized for this revision.

Visual acceptance:
- Readable, distinct launch vehicles, smooth component separation and translucent exhaust.
- Angular multiscale asteroid surfaces, legible contact mechanism, crater and recovery.
- Camera rails establish context, follow the vehicle, then emphasize contact or separation.
- A captured HDR frame dissolves into the next chapter; no empty flash. User can still take over the camera.
- Cinematic full-width viewport and compact narrative below, aligned with existing site themes.
- Physically restrained foil, Earth atmosphere, photosphere and glare; explanatory scales remain explicitly schematic.
- Inspect actual desktop/mobile frames and motion, seek independent review, fix concrete defects before judging quality.
- Preserve reversible scrubbing, mission changes, offscreen pause, reduced-motion behavior and navigation disposal.

Implementation ownership: launch.js and terrain.js delegated independently; parent owns cinematography, presentation, spacecraft finish, component layout and integration. Verify renderer error-free, all dated stages, interaction matrix, phase boundaries and after-navigation resource release.

## Verified local candidate — 2026-09-10

Seven visual iterations completed. Independent screenshot review: 9.0/10 for a professional interactive science illustration; parent overall assessment includes verified motion and controls.

- Improved authored launch vehicles, blanket/radiator details, sampled surface rubble, spacecraft framing, entry wake, and fabric collapse.
- Fixed exhaust UV overshoot: a paired browser experiment reproduced black launch imagery at progress 0.84 and demonstrated that clamping the fractional-power domain restores the frame.
- Fixed shader-dissolve final-frame scheduling, label placement, theme caption contrast, and global HUD overlap.
- Landed fabric uses ground height relative to the capsule attachment; most vertices rest within 0.015 model units of the ground.
- Hayabusa2 static batching reduces spacecraft meshes from 198 to 48 without changing bounds or independent capsule ownership.
- Local final checks pass: 17 model/motion tests; all 17 dated chapters render; cold and rapid chapter transitions; paused rendering idle; desktop/mobile light/dark controls; play, scrub, touch, reduced motion, offscreen pause, navigation disposal and BFCache; Research image ownership and reading order; build and site checks.
- Intel Iris Xe browser measurements during this iteration: roughly 87–97 rendered frames/second in selected warmed-up launch/sampling scenes. This is a machine-specific observation, not a universal performance guarantee.

Local preview: http://127.0.0.1:52523/research.html?revision=mission-cinema-final#missions-title
No deployment or git push performed for this iteration.
