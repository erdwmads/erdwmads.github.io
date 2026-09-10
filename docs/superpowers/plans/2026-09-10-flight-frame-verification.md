# Earth-relative flight frames and CV restoration

## Reported problems

Launch used a small globe behind a rocket moving on world Y; recovery likewise placed Earth behind the descending capsule. These unrelated frames made the vehicles appear to pass beside Earth. Transfer-overview bodies overpowered their paths. Earlier CV restructuring had removed the original photo element while retaining its asset.

## Changes

- Shared local surface frames put the Earth's curved horizon below launch and recovery. Ascent starts along the local vertical, curves downrange and keeps rocket attitude tangent to the path. The camera follows the same pose and transformed payload position.
- Entry approaches the surface obliquely, aligns the heat shield and wake with travel, then becomes vertical before parachute deployment. Existing final touchdown and canopy ground attachment remain intact.
- Earth meshes no longer cast an erroneous globe/cloud-shell shadow on the local recovery terrain during the scale transition.
- Transfer overview uses smaller Earth, asteroid and spacecraft models. Labels state that body sizes are not to scale; the route remains an authored schematic.
- Original `public/assets/img/CV.jpg` restored next to the CV introduction on desktop, below it on mobile. Full landscape composition and intrinsic image dimensions retained.

The general vertical-ascent/pitch-over ordering follows [NASA Glenn's Flight to Orbit explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-to-orbit/). This is still a compressed educational visualization; coordinates, scale and timing are not launch telemetry or a numerically integrated reentry trajectory.

## Evidence

- New ascent/entry regressions reproduced missing shared flight-frame behavior before implementation. All 21 mission unit tests now pass: outward/inward altitude, tangent attitude, camera framing and continuity, mechanisms and touchdown.
- Production build, PPT data export and site check pass.
- `scripts/flight-frames.browser.test.mjs` renders ten moments for each mission at 1440 and 390 px; no page/shader console errors. CV image loading and full aspect ratio pass at 1440/768/390 in both themes.
- Actual screenshots reviewed: initial ascent, pitch-over, flyby, oblique entry, terrain transition and restored CV. The large recovery shadow was caught visually and removed before final capture.
- Independent read-only code review found no actionable issue; 21 unit tests independently passed.

Screenshots: `%TEMP%/flight-frame-*.png`, `%TEMP%/cv-restored-*.png`. Logs: `%TEMP%/flight-frame-unit.log`, `%TEMP%/flight-frame-build.log`, `%TEMP%/flight-frames-browser.log`.

Local preview only; no commit, push or deployment.

Final browser regressions passed: mission play/pause/scrub, automatic chapters, keyboard controls, offscreen pause, reduced motion, navigation cleanup, rapid switching, BFCache, four widths in two themes and mobile touch. Whole-site navigation/focus/history, Paper Shelf controls, CV, contact actions and archive boundary also passed. git diff --check passed.
