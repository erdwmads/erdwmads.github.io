# Origins: shared volume and mineral inspection

Approved scope: refine stages 3 and 4 without replacing the Research layout.

1. Generate a porous, irregular parent volume and matching fracture pieces offline.
   Verify: finite closed surfaces, distinct exterior/interior, conserved assembled bounds.
2. Replace the flat cut face and unrelated hero rock with the same persistent pieces.
   Verify: continuous stage boundaries, deterministic reversible transforms, no geometry allocation while scrubbing.
3. Add embedded carbonate aggregates, fluid paths and a close-up/return interaction.
   Verify: real three-dimensional cavities, same mineral object in both views, exact camera restoration.
4. Run the existing pointer-drag, lighting, lifecycle, mobile and scene tests; inspect new desktop/mobile screenshots and canvas pixels.

Scientific constraint: conceptual geometry and kinematics only, no inferred Orgueil parent, measured pores, differentiated core, quantitative chronology or simulated collision physics.
Do not commit or publish in this task.

## Completed

- Generated 12 matching porous pieces with separate exterior, fracture and cavity surfaces. CSG is a development dependency only; generated geometry is dynamically imported only for Origins.
- Replaced the former clipped disk and separate hero model. The original piece carries embedded carbonate aggregates through fragmentation; reversing progress restores the same transforms.
- Added beveled, textured rhombohedral aggregates, surface inclusions, cavity flow paths and inspect/return controls preserving camera pose.
- Fixed inspection eligibility during autoplay, stale reset/playback button state, and inspection state persisting through renderer disposal/page restoration.
- Verification: 57 Node tests passed; focused 11 geometry/state tests passed again after final mesh generation. Browser suites covered real pointer scrubbing at five widths, lifecycle/context restoration, six lighting directions, all stage/material combinations, responsive themes, and pixel-exact camera return. Final production build and site check passed for nine public pages and eleven papers.
- Inspected final desktop/mobile dark/light scene screenshots and the carbonate close-up in `.codex_tmp/origins-volume-*`.
- Remaining build advisory: Three.js and the optional geometry chunk exceed Vite's size advisory (geometry ~725 kB gzip). They remain lazy loaded. Geometry and progression are explicitly conceptual, not measured anatomy or collision physics.
- Local preview remains on port 4322. No commit or deployment performed.
