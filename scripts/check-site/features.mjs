// check-site/features.mjs (owner WP4): Ryugu & Bennu, Origins and the 3D viewers.
// Moved verbatim from scripts/check-site.mjs; scripts/check-site.mjs runs every module in order.
export default async function checkFeatures({ fail, readDistPage }) {
  const comparisonPage = readDistPage("ryugu-bennu.html");
  const originsPage = readDistPage("origins-study.html");
  if (!/<dialog\b(?=[^>]*\bid="sources")(?=[^>]*\baria-labelledby="sources-title")/.test(originsPage) || !originsPage.includes('id="sources-title"')) {
    fail("origins-study.html: the scientific-context dialog must be named by its heading");
  }
  // Ids are never style hooks (spec §2.3): the scene and the dialog carry the classes the stylesheet uses.
  if (!/<div id="viewport" class="scene-viewport on-night"/.test(originsPage) || !/<dialog id="sources" class="sources-dialog"/.test(originsPage)) {
    fail("origins-study.html: #viewport needs .scene-viewport (a night plate, .on-night) and #sources needs .sources-dialog");
  }
  // The mineral budget is a literature table with its evidence tag and source (spec §4.5).
  const budget = originsPage.match(/<section id="mineral-budget"[\s\S]*?<\/section>/)?.[0] || "";
  if (!/<table class="data-table mineral-budget-table">/.test(budget) || !/data-evidence-status="literature"/.test(budget) || !/doi\.org\/10\.1038\/s41550-022-01745-5/.test(budget)) {
    fail("origins-study.html: the mineral budget must be a table.data-table with a Literature status and its source link");
  }
  if (!/<div class="planetary-stage\b[^"]*" data-stage[^>]*aria-describedby="planetary-stage-hint"/.test(comparisonPage) || !comparisonPage.includes('id="planetary-stage-hint"')) {
    fail("ryugu-bennu.html: the planetary viewer must describe its keyboard controls");
  }
  // Every 3D stage carries its scene poster (spec §7.2 WP4 phase B): the phone capture by media, the desktop capture as
  // the image, lazy below the fold and eager for the Origins hero.
  const poster = (name, loading) => new RegExp(`<picture class="scene-poster" data-scene-poster><source media="\\(max-width: 760px\\)" srcset="/assets/img/posters/${name}-640\\.webp"[^>]*><img src="/assets/img/posters/${name}-1600\\.webp"[^>]*alt=""[^>]*loading="${loading}"`);
  for (const [page, html, stage, name, loading] of [
    ["ryugu-bennu.html", comparisonPage, /<div class="mission-viewport" data-mission-viewport[^>]*>\s*<picture class="scene-poster"/, "missions", "lazy"],
    ["ryugu-bennu.html", comparisonPage, /data-stage[^>]*aria-describedby="planetary-stage-hint">\s*<picture class="scene-poster"/, "planetary", "lazy"],
    ["origins-study.html", originsPage, /<canvas tabindex="0" id="scene"[^>]*><\/canvas><picture class="scene-poster"/, "origins", "eager"]
  ]) {
    if (!poster(name, loading).test(html) || !stage.test(html)) fail(`${page}: the ${name} stage needs its scene poster (${name}-640/1600.webp, alt="", loading="${loading}") as its first overlay`);
  }
  // The scene and the Orgueil note are night plates in both themes: the renderer draws the night palette there.
  for (const part of ["planetary-stage", "planetary-ci"]) {
    if (!new RegExp(`<div class="${part}\\b[^"]*\\bon-night\\b`).test(comparisonPage)) fail(`ryugu-bennu.html: .${part} must be a night plate (.on-night)`);
  }
}
