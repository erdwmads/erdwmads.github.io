# Spacecraft models and decoder credits

## OSIRIS-REx

The source spacecraft mesh is **NASA / Christopher R. Meaney**, distributed by NASA's 3D Resources collection:

- Source page: https://science.nasa.gov/3d-resources/origins-spectral-interpretation-resource-identification-and-security-regolith-explorer-osiris-rex/
- Original GLB: https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/osiris-rex/OSIRIS-REx.glb
- Retrieved: 2026-09-10
- Local file: `osiris-rex-nasa.glb` (original compressed model, unchanged).

Display modifications in `src/scripts/sample-missions/spacecraft.js`: material roughness/metalness, authored solar-cell grids on the front surfaces, spatially restricted thermal-foil shading, coordinate rotation and scale, return-capsule grouping, and an authored illustrative animated TAGSAM arm and head. The original sampling-head material primitives are hidden to allow continuous deployment. Other stowed-arm detail remains embedded in NASA's shared spacecraft meshes. The animation depicts the concept of TAGSAM deployment; it does not reconstruct joint telemetry or engineering kinematics. No NASA endorsement is implied.

## Hayabusa2 and return-capsule illustrations

Geometry authored for this website from JAXA's public spacecraft diagrams and component descriptions. These are illustrative display models, not JAXA CAD data or exact engineering reconstructions. Individual features and their proportions have been simplified for interactive viewing.

- JAXA Hayabusa2 spacecraft overview: https://www.hayabusa2.jaxa.jp/mission/orbiter/
- JAXA Hayabusa2 fact sheet (annotated spacecraft diagrams): https://www.hayabusa2.jaxa.jp/en/enjoy/material/factsheet/FactSheet_en_v2.31s.pdf
- JAXA Hayabusa2 antennas FAQ: https://global.jaxa.jp/projects/sat/hayabusa2/faq.html
- JAXA sampler-horn photographs: https://www.hayabusa2.jaxa.jp/en/galleries/spacecraft/pages/samplerhorn.html

The model distinguishes Hayabusa2's two flat high-gain antennas, twin solar-array paddles, four ion thrusters and permanently deployed sampler horn. Capsule geometries are authored illustrations; the attached OSIRIS-REx capsule remains the NASA source mesh.

Capsule outer height/diameter proportions follow JAXA's 400 × 200 mm Hayabusa2 envelope and NASA's 810 × 500 mm OSIRIS-REx envelope. Hayabusa2's attached capsule is scaled to 0.4 m relative to the 6 m deployed array span. The NASA source capsule is preserved, including its source proportions (approximately 0.816 m diameter when the full source span is calibrated to 6.2 m). The standalone capsule is an authored substitute, not a detached copy of the NASA mesh. Hayabusa2's recovered instrument module replaces both shed heatshields during parachute descent; its small fittings and internal envelope are illustrative.

- JAXA capsule dimensions and construction, p. 19: https://www.hayabusa2.jaxa.jp/enjoy/material/press/Hayabusa2_Press_20210305_ver5_en2.pdf
- NASA spacecraft and capsule dimensions, p. 13: https://science.nasa.gov/wp-content/uploads/2023/09/osirisrexpresskit-2023.pdf
- JAXA heatshield separation and instrument-module recovery: https://www.hayabusa2.jaxa.jp/en/topics/20201204_ts3/

## Draco decoder

`draco/draco_wasm_wrapper.js` and `draco/draco_decoder.wasm` are the glTF decoder distributed with the installed Three.js package (0.185.1). Draco is copyright Google and contributors, distributed under the Apache License 2.0, included at `draco/LICENSE.txt`.

- Project: https://github.com/google/draco
- License: https://github.com/google/draco/blob/main/LICENSE

The decoder is hosted locally; rendering does not depend on a third-party CDN.

## Cinematic mission illustrations

The H-IIA 202 and Atlas V 411 models, staging, exhaust, recovery canopies and entry wake are authored visual explanations. The launch airframe height-to-core-diameter ratios follow JAXA's 53 m / 4 m H-IIA and ULA's 189 ft / 12.5 ft Atlas V. Stage section lengths, small fittings, exhaust shape, and separation drift remain simplified. When mission state is supplied, launch event order and engine-on intervals follow the sourced elapsed-time schedule; the legacy standalone demo still uses illustrative progress timing.

- JAXA H-IIA Flight 26 / Hayabusa2 launch: https://global.jaxa.jp/press/2014/12/20141203_h2af26.html
- NASA Atlas V 411 configuration: https://science.nasa.gov/blogs/osiris-rex/2016/09/08/atlas-v-osiris-rexs-ride-to-orbit/
- JAXA H-IIA dimensions: https://global.jaxa.jp/projects/rockets/h2a/index.html
- ULA OSIRIS-REx mission vehicle dimensions: https://www.ulalaunch.com/docs/default-source/default-document-library/av_osirisrex_mob.pdf

Recovery geometry distinguishes JAXA's polyester **cruciform** Hayabusa2 parachute from OSIRIS-REx's round **triconic** main parachute. NASA's 7.3 m value is the nominal canopy diameter, not a measurement of the projected inflated width. No primary numeric span was established for Hayabusa2's canopy in this audit. Inflated/collapsed cloth shape, gore layout, colors, suspension-line lengths and Hayabusa2 canopy span remain illustrative; they are not engineering reconstructions or a fabric simulation.

- JAXA recovered parachute construction and heatshields, pp. 7–8: https://www.isas.jaxa.jp/topics/files/HY2-CPSL-TENJI_2022.pdf
- NASA OSIRIS-REx entry/descent/landing description (7.3 m triconic main canopy): https://ntrs.nasa.gov/api/citations/20240014280/downloads/OREX_FM_SciTech2025_v2.pdf

The global asteroid shapes retain their existing JAXA / NASA mesh geometry. Added surface boulders, albedo variation, local sampling terrain and crater geometry are procedural illustrations, not measured surface maps. The model explicitly separates historical mission milestones from these authored presentation details.
