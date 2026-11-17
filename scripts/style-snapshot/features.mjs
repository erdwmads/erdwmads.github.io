// Style snapshot, features area (owner WP4): the pages it is recorded on and the selectors whose computed styles
// scripts/style-snapshot.browser.test.mjs records in docs/style-snapshot/features.json (spec §6.3).
export const owner = "WP4";
export const pages = ["ryugu-bennu.html", "origins-study.html"];
// WP4a: the Ryugu & Bennu masthead and hero plates, the sample-mission workspace and the published-microscopy figure.
const missions = [
  ".masthead", ".masthead h1", ".plate-pair", ".plate-pair .plate__media", ".plate-pair .plate__caption",
  ".sample-missions", ".mission-selector [aria-selected=\"true\"]", ".mission-story", ".mission-chapters",
  ".mission-chapters [aria-current=\"step\"]", ".mission-scene", ".mission-viewport", ".mission-transport",
  ".mission-notebook", ".mission-share", ".mission-footnote", ".research-scale", ".inspector-stage",
  ".inspector-controls", ".research-scale__caption", ".research-scale__boundary"
];
// WP4b: the planetary explorer's toolbar, steps, materials, stage, labels and readouts.
const planetary = [
  ".planetary-toolbar", ".planetary-steps > [aria-selected=\"true\"]", ".planetary-materials > [aria-pressed=\"true\"]",
  ".planetary-stage", ".planetary-label", ".planetary-measure", ".planetary-summary", ".planetary-evidence",
  ".planetary-boundary"
];
// WP4c, Origins: the masthead's evidence line, the night plate and its caption line, the chapter rail, the timeline,
// the view tools and the chapter text.
const origins = [".study-intro .evidence-status", ".scene-viewport", ".scene-frame-bar", ".chapters", ".chapters [aria-current]", ".transport", ".scene-controls", ".chapter-copy", ".chapter-heading h2"];
export const selectors = [".mission-workspace", ".research-scale__figure", ...missions, ...planetary, ...origins];
