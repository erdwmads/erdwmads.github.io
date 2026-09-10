# Visual refinement second pass — verification

This is local, unpublished refinement of the existing site. The aesthetic target is the user's 9.99 aspiration; no claim of an objective score is made.

## Visible changes

- Home Explore/timeline, CV, Paper Shelf, Contact and Photography now use page-appropriate editorial hierarchy instead of repeating glass card stacks. Desktop and mobile share identical geometry between themes. Paper search/filter spacing was corrected after screenshot review.
- Origins rock silhouettes, roughness, geometric cut-face relief, pore-size hierarchy, mineral clusters, surface attachment, fracture size distribution and directional light were refined in two visual rounds. Large remote fragments and smaller impact-side fragments remain explicitly illustrative.
- Chapter switches retain and dissolve the outgoing rendered image. Interrupted switches composite the currently visible frame; reduced motion switches directly. Normal page navigation keeps the shared document and FX.
- Ambient layer removal now clears its interval, callbacks and listeners. Desktop progress/orbit layers reattach after mobile resizing without duplicate intervals.

## Performance

The deterministic porous matrix is baked by `node scripts/build-origins-section.mjs` into `public/assets/models/origins/porous-matrix.glb` (1368 KiB, 46,480 indexed vertices, 47,283 triangles). The browser loads this standard asset rather than running CSG. Geometry and indices were compared exactly against the generator by independent review.

Per-mesh BVH acceleration preserves surface attachment while avoiding hundreds of full triangle scans. Local Node construction measurements after optimization: accretion 287–328 ms, alteration 87–92 ms, inheritance 329–356 ms. Before acceleration, the baked alteration assembly alone measured 804 ms. These are local construction measurements, not promised frame rates on other devices.

## Verification

- Production build, PPT data export, site asset/SEO/protected-boundary check.
- Nine routes at 1440 and 390 pixels in both themes: no horizontal overflow, no theme geometry drift, no page exceptions.
- Chapter dissolve, rapid interruption, reduced motion.
- Origins readable startup, source dialog, mobile interaction, offscreen pause and context-loss retry.
- Ambient responsive remount, singleton meteor interval, FX toggle, power-state events, moving planets and reading progress.
- Whole-site content/actions, history position, focus, stable settings, archive boundary.
- Origins repeated navigation, background identity, outgoing disposal, Back/Forward and interrupted navigation.
- Independent review: all 16 Origins unit tests passed in the final local run; no remaining actionable code-review finding.

## Evidence

Fresh screenshots and audits: `%TEMP%/site-quality-20260910-final` and `%TEMP%/site-editorial-20260910`. Scene sequence screenshots cover early/late accretion, ice/reaction/cooling, and coherent/disrupted/reaccumulated states. Protected record content was not changed.

- Additional 320/768/1024/1920 checks across all nine routes: no overflow, unnamed buttons, or sub-40-pixel main buttons.
- Late visual review caught a weak inheritance finale. Corrected camera follow and editorial removal of departing ejecta, preserving fragment scale. Final direct render shows a complete centered aggregate; independent screenshot review confirmed resolution.
- Added finale regression and browser checks that manual zoom suspends automatic framing and Reset restores it.

No deployment, commit, or push was performed. Regenerate the GLB with the documented bake command whenever the offline section generator changes. The models remain illustrative; scientific uncertainty and source context stay visible.

Final integration additionally passed Photography open/return/fullscreen/reduced-motion/FX-off, Research orbital models and interactions, and both sample-return mission viewers (playback, chapters, keyboard, offscreen pause, navigation, BFCache, mobile, four widths in both themes). Final production build and site check passed after the last source change.

Review also identified an off-graph fading material after timeline rewind; it is now explicitly registered in the scene material disposal set. Final chapter dissolve and manual-camera regression passed against that build.
