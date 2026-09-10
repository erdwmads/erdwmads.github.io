# Mission geography and transfer verification — 10 September 2026

## Scope
Local corrections to mission launch, recovery, scale presentation and pre-asteroid transfer. No publication or commit performed.

## Verified historical context
- Hayabusa2 launched from Tanegashima Space Center and its capsule was recovered in the Woomera Prohibited Area, Australia.
  - https://www.isas.jaxa.jp/en/missions/spacecraft/current/hayabusa2.html
  - https://global.jaxa.jp/press/2020/12/20201206-1_e.html
- OSIRIS-REx launched at Cape Canaveral SLC-41 and its capsule landed in the Utah Test and Training Range, USA.
  - https://svs.gsfc.nasa.gov/12716/
  - https://www.nasa.gov/news-release/nasas-first-asteroid-sample-has-landed-now-secure-in-clean-room/
- Both spacecraft first spent about a year in heliocentric flight, returning for Earth gravity assist before onward travel. This is a Sun-centered circuit, not a full Earth-centered orbit.
  - https://global.jaxa.jp/projects/sas/hayabusa2/orbit.html
  - https://www.hayabusa2.jaxa.jp/topics/20151214_02_e/
  - https://svs.gsfc.nasa.gov/vis/a010000/a011800/a011825/OSIRIS-REx_Mission_Design_Transcript.html
  - https://science.nasa.gov/mission/osiris-rex/in-depth/

## Presentation boundaries
Earth overview shows small position markers anchored by rounded geographic coordinates. Recovery markers identify publicly confirmed regions, not exact touchdown positions or surveyed boundaries. No giant spacecraft mesh is compared against a globe. Vehicle close-up uses a separate local scene without a globe. Paths, timings, close-up terrain and transfer geometry remain illustrative; they are not reconstructed telemetry or ephemerides. The overview/close-up switch preserves chapter progress and uses the existing transition renderer. Pure location metadata is separated from Three.js so the UI loader stays lightweight.

## Verification
- 34 mission unit tests passed: geography mapping, camera framing, motion, entry, solar transfer, release synchronization and globe occlusion.
- Build, PPT-data export (11 papers) and site validation passed (9 public pages).
- Geographic browser regression: both missions, launch/return/landing, both view scales, widths 1440 and 390; location text, progress preservation, default view, cruise/assist/outbound labels, label collisions, page overflow and rendering errors.
- Camera regression passed: paused settling, idle frame scheduling, manual camera persistence and reduced-motion scrubbing.
- Interaction regression passed: controls, automatic chapter advance, keyboard tabs, offscreen pause, navigation cleanup, rapid mission switches, BFCache, 4 widths x 2 themes and touch mode.
- Screenshots visually inspected: Japan/Florida launch locations, Australia/Utah recovery locations, close-up scale separation and mobile gravity-assist label arrangement.
- Independent review found premature overview capsule release and far-side location labels. Both corrected, with focused tests.
