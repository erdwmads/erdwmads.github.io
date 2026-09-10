# Physical mission scales and flight context — 2026-09-10

Local preview only. No commit, push or deployment in this batch.

## Corrections

- Flyby, rendezvous and departure use kilometres throughout: spacecraft spans 6 m / 6.2 m, asteroid diameters approximately 900 m / 500 m, Earth diameter 12,742 km. Physical mesh calibration is preserved across camera focus and spacecraft configuration changes.
- Three camera choices expose true distance, target detail or spacecraft detail. Screen-space locator dots identify subpixel objects; the arrow follows vector velocity and does not represent spacecraft size or velocity magnitude.
- Source vectors replace the earlier arbitrary circling and lateral slide. UTC and center range update with playback. See [ephemeris source record](../../mission-ephemeris-sources.md) for frame, products, provenance, interpolation and the excluded Hayabusa2 source discontinuity.
- Spacecraft focus translates the camera and its target with the vehicle, including after manual zoom/orbit. Relative camera smoothing remains; absolute tracking lag no longer loses the six-metre spacecraft during time-compressed flight.
- Logarithmic depth supports metre-scale craft and planetary backgrounds in one scene. All custom 3D effects use matching depth chunks; this removes the observed Earth/cloud polygon artifacts.
- Capsule separation and Entry & landing are distinct chapters and default to vehicle views. Separation shows mother ship and capsule parting; entry follows the capsule through atmospheric descent, parachute deployment and ground contact. Earth overview remains available. Return locations are Woomera and UTTR.
- Textured Earth context restored beneath launch and early return/entry scenes. This supersedes the prior geography verification note's decision to omit the globe from close-ups.

## Fidelity boundaries

Ephemeris positions are geometric source orbit solutions, not universal as-flown telemetry. Hayabusa2 final approach is reconstructed; departure tracks are mission predictions; other tracks are labelled mission navigation solutions. Five-minute samples are interpolated. Spacecraft attitude, body orientation, added surface detail, local launch/sampling/release/entry motion and terrain remain illustrative. Non-ephemeris close-ups compress scales and time; their Earth curvature is not a literal vehicle-to-Earth scale comparison. They must not be described as complete physical reconstructions. Recovery markers locate documented regions, not exact touchdown pins.

## Sources for dimensions and event distinction

- Hayabusa2 span: https://global.jaxa.jp/projects/sas/hayabusa2/index.html
- Ryugu diameter: https://www.hayabusa2.jaxa.jp/science/ryuugu/
- OSIRIS-REx span: https://www.nasa.gov/wp-content/uploads/2016/06/osiris_rex_factsheet5-9.pdf
- Bennu diameter: https://www.asteroidmission.org/objectives/bennu/
- Hayabusa2 capsule release roughly 220,000 km from Earth: https://www.hayabusa2.jaxa.jp/en/galleries/cpslrtn/pages/fig23.html
- OSIRIS-REx separation versus atmospheric return: https://science.nasa.gov/blogs/osiris-rex/2023/09/08/heres-how-sept-24-asteroid-sample-delivery-will-work/

## Verification

- 47 motion, camera, source-track and spacecraft mechanism unit tests passed.
- 2 additional mesh-dimension tests passed against the authored Hayabusa2 geometry and decoded NASA OSIRIS-REx GLB, including sampling/stowage/configuration history.
- 36 physical browser views passed: 2 missions × 3 phases × 3 camera choices × 2 viewport widths. Normal-motion playback and manual zoom retained the craft within 1% of its span at the camera target.
- 48 Earth/flyby phase screenshots passed: approach/pass/departure plus launch, capsule separation, early entry, parachute and landed phases at 1440 and 390 px. Screenshots inspected for Earth context, direction and depth artifacts.
- Geography, mission interactions and cinematic regression suites passed. These cover keyboard controls, scrub/play/pause, stage transitions, rapid mission changes, visibility pause, reduced motion, mobile touch, navigation cleanup and BFCache restoration.
- Independent code review identified the translating-camera defect; it was fixed and re-reviewed. No further actionable issues found.
- Astro build, 11-paper PPT data export and 9-page site/asset validation passed.
