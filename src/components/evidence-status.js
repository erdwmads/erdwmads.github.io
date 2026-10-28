// Visible tags for EvidenceStatus.astro. They keep the owner's measurements, published literature,
// illustrative models, planned work and interpretation distinct wherever a scene or figure is shown.
/** @typedef {'measured' | 'literature' | 'model' | 'planned' | 'interpretation'} EvidenceKind */
/** @type {Readonly<Record<EvidenceKind, string>>} */
export const evidenceKinds = Object.freeze({
  measured: "My measurement",
  literature: "Literature",
  model: "Illustrative model",
  planned: "Planned",
  interpretation: "Interpretation"
});
