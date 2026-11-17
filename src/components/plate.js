// Props for Plate.astro. Every evidence figure is a plate: it refuses to build without a label ("Fig. 3",
// "Plate I"), a caption, a credit and an evidence kind, the way EvidenceStatus.astro refuses an unknown kind. The
// corner brackets of an illustrative model only go with the model evidence kind.
import { evidenceKinds } from "./evidence-status.js";

export const plateGrounds = Object.freeze(["specimen", "night"]);
export const plateWidths = Object.freeze(["text", "wide", "full"]);

export function plateProps({ label, caption, credit, evidence, evidenceText = "", ground = "specimen", model = false, width = "text", id } = {}) {
  for (const [name, value] of Object.entries({ label, caption, credit, evidence })) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`Plate: ${name} is required`);
  }
  if (!Object.hasOwn(evidenceKinds, evidence)) throw new Error(`Plate: unknown evidence kind "${evidence}"; use ${Object.keys(evidenceKinds).join(", ")}`);
  if (!plateGrounds.includes(ground)) throw new Error(`Plate: unknown ground "${ground}"; use ${plateGrounds.join(" or ")}`);
  if (!plateWidths.includes(width)) throw new Error(`Plate: unknown width "${width}"; use ${plateWidths.join(", ")}`);
  if (model && evidence !== "model") throw new Error(`Plate: model marks an illustrative model, so evidence must be "model", not "${evidence}"`);
  return { label, caption, credit, evidence, evidenceText, ground, model: Boolean(model), width, id };
}
