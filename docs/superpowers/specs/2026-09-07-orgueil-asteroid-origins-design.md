# Orgueil and Asteroid Origins

Status: approved by the user on 2026-09-07; implemented and verified locally.

## Purpose

Add a cinematic, interactive scientific illustration to the existing Research
Planetary Field Guide. Explain how primitive Solar System material can undergo
accretion, parent-body alteration, fragmentation and reassembly, then connect
those concepts to Orgueil specimens and present-day Bennu/Ryugu observations.

Preserve the existing page layout, navigation, luminous identity, real orbital
viewer, public shape models, specimen photography and mineral models. Do not
replace the site with another Research redesign or publish changes automatically.

## Scientific Boundaries

- Orgueil is a CI1 meteorite. Primitive bulk chemistry does not mean its minerals
  have remained unchanged since Solar System formation.
- The proposed parent-body shape, pore geometry, ice distribution, fluid paths,
  accretion and fragmentation sequences are conceptual illustrations, not a scan,
  dynamical calculation or reconstruction of a uniquely established Orgueil history.
- Do not assign Orgueil a known parent asteroid, an invented orbit, a precise
  formation radius, a measured parent-body diameter, or an unsupported chronology.
- Do not identify Bennu or Ryugu as Orgueil's parent. They are separate comparison
  branches with independent histories and public observational evidence.
- Carbonates may record aqueous processes. A growing rhombohedron in this scene
  illustrates a process; it is not evidence that a particular experimental grain
  is dolomite. Link to the existing explicitly illustrative mineral view.
- Do not depict a differentiated metallic core, magma ocean or terrestrial-style
  layered planet as the default CI parent body.
- Colors encode conceptual materials and processes, not measured mineral maps.
- The final transition to a museum photograph is an evidence change, not a
  continuous zoom through a measured specimen.

## Entry and Navigation

Add an Origins view alongside the existing Orbits, Shapes, Samples and Minerals
views. Keep it inside the same Field Guide surface rather than adding another
large page section. The existing material selector remains Bennu / Ryugu /
CI - Orgueil and determines the final comparison branch.

The current default view remains unchanged. Origins is explicitly selectable.
Do not replace existing valid deep links. Extend the observation-link whitelist
only with validated Origins fields, and restore shared observations paused.

Within Origins, provide four directly selectable stages:

1. Dust and ice: a local patch of solids in the early protoplanetary environment.
2. Accretion: porous aggregates assembling into an illustrative parent body.
3. Water and rock: a cutaway of a porous body, localized fluid paths, altered
   matrix and carbonate examples.
4. Fragments and records: conceptual fragmentation and reassembly, followed by
   distinct links to the selected body's existing observational views.

Orgueil's final branch emphasizes a meteorite fragment and laboratory evidence.
Bennu/Ryugu emphasize rubble-pile comparison and their published shape models.
Neither branch draws an asserted physical journey from one named object to another.

## Scene and Visual Language

Use the installed Three.js and OrbitControls rather than a new 3D stack. Present
a large unframed scene with no decorative card around the model. Reuse the site's
typography, restrained blue/cyan and gold accents, fine rules and icon controls.

The main body is visibly irregular and porous, with rough neutral rock surfaces.
Use directional illumination to reveal relief and restrained illuminated edges.
Dust particles serve the accretion explanation, not a second decorative starfield.
No pulsating overlays, heavy bloom, lens flare, gratuitous grids or pseudo-data.

A cutaway is the principal close-up: rock remains legible, blue traces communicate
fluid-bearing pores, and a few distinct mineral forms explain alteration. Avoid
uniform onion-like colored shells, which would suggest unsupported stratigraphy.
Use three short material/process labels at most, with stable screen positions.

Maintain readable light and dark themes. The light theme needs dark text and
adequate contrast, not pale glowing labels. Screen-space annotations must remain
stable while the camera moves and must not cover controls or leave the viewport.

## Controls

- Four stage tabs name the process, with one short scientific explanation per stage.
- A play/pause icon advances a clearly illustrative progression, not physical time.
- A progress slider supports scrubbing and stops playback when manipulated.
- A cutaway slider appears only where the parent-body interior is meaningful.
- Reuse zoom in/out, reset, keyboard rotation and touch-interaction conventions.
- Dragging or zooming never resets the chosen stage. Manual input cancels camera
  travel without exiting the view, matching the latest interaction fixes.
- On mobile, normal page scrolling remains available until model interaction is
  enabled. Switching views restores page scrolling.
- Selecting another view/material cancels stale animation and async model work.
- Reduced-motion and FX-off modes show complete still stages without automatic
  movement. Explicit stage selection and the explanatory controls remain usable.
- Pause when hidden/offscreen. Dispose GPU resources on soft navigation and page exit.

## Connections to Existing Evidence

At the final stage use clear destination actions, not another nested viewer:

- Orgueil: View specimen / Examine dolomite.
- Bennu or Ryugu: View public shape / View returned sample.

These actions open the existing corresponding Field Guide view and preserve the
selected material. Do not make a texture-matched dissolve imply that the synthetic
fragment is the photographed specimen. Keep public image credits unchanged.

## Implementation Boundaries

- Add a focused Origins content module for stages, branches and source links.
- Add a focused deterministic Three.js scene module, separate from orbital and
  mineral geometry. It exposes scene construction and normalized progression;
  do not turn the existing controller into a general animation framework.
- Extend PlanetaryExplorer markup/controller and planetary-renderer dispatch only
  where necessary for the new view, controls, lifecycle and scene animation.
- Extend the existing URL codec with bounded, explicitly named Origins fields.
- Reuse the existing CSS theme/control conventions with scoped Origins selectors.
- No new package is needed for an explicitly illustrative animation. It must not
  claim to solve accretion dynamics, thermal transport or mineral crystallization.
- On WebGL failure, show the stage's scientific explanation and a real specimen
  photograph with attribution and a retry action, not an empty canvas.

## Acceptance Checks

1. Unit tests: deterministic finite geometry, bounded stage/progression/cutaway
   inputs, distinct branches, valid source metadata and URL round trips/rejections.
2. Browser tests: all stages and three material branches, scrubbing, play/pause,
   cutaway, zoom/reset/rotation, keyboard and touch input, cancel/re-enter,
   offscreen pause, reduced motion, FX toggle and context-loss fallback/retry.
3. Pixel checks: each scene is nonblank, visibly distinct, fits at reset, responds
   to stage/progression changes and animates when explicitly playing.
4. Screenshots: 320/390/760/1440-pixel viewports, both themes, no horizontal
   overflow, clipped labels, overlapping controls or disproportionate empty space.
5. Regression: existing orbital clock, public model loading, guide journeys,
   mineral controls, observation-link restore races and soft navigation still pass.
6. Production build, public asset/site checks and diff whitespace checks pass.
7. Preview remains local on the existing development server. No publish or push.

## Source Basis

The initial references below are already used or inspected for this Research
page. Before implementation, check any additional explanatory claims against
primary publications and record stage-specific provenance. Do not copy numerical
constraints from Ryugu or Bennu into the Orgueil branch.

- MNHN Orgueil collection record: chemical primitiveness, classification and
  specimen context. Its proposed cometary origin is not treated as a confirmed
  identification: https://www.mnhn.fr/fr/meteorite-d-orgueil
- JAXA/ISAS initial Ryugu chemical analysis and linked Yokoyama et al. paper:
  https://www.isas.jaxa.jp/en/topics/003094.html
- Bennu initial sample analysis, Lauretta, Connolly et al. (2024):
  https://doi.org/10.1111/maps.14227
- Public Bennu mesh: https://science.nasa.gov/resource/bennu-3d-model/
- Public Ryugu shape-model archive:
  https://data.darts.isas.jaxa.jp/pub/hayabusa2/paper/Watanabe_2019/
- Orgueil specimen photograph, Chip Clark / Smithsonian, USNM 388:
  https://naturalhistory.si.edu/object/nmnhmineralsciences_1017941

## Review

The scope is one new interpretive view, not a site redesign. The factual,
observational and illustrative evidence types remain separate. Controls have
named states, bounded values and explicit cancellation behavior. No physical
simulation, inferred orbit, measured internal structure or unsupported temporal
precision is promised.
