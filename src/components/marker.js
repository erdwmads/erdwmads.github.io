// Values for Marker.astro. Status markers (circles) follow the Analytical Pathway statuses in src/data/project.mjs,
// as AnalyticalPathway.astro slugs them; evidence markers (squares, or corner brackets for a model) follow the
// EvidenceStatus kinds. A marker only repeats the text label beside it, and no "Completed" status exists.
import { evidenceKinds } from "./evidence-status.js";

export const markerValues = Object.freeze({
  status: Object.freeze(["in-progress", "next", "planned", "interpretation"]),
  evidence: Object.freeze(Object.keys(evidenceKinds))
});

export function markerProps({ kind, value } = {}) {
  const values = markerValues[kind];
  if (!values) throw new Error(`Marker: unknown kind "${kind}"; use ${Object.keys(markerValues).join(" or ")}`);
  if (!values.includes(value)) throw new Error(`Marker: unknown ${kind} value "${value}"; use ${values.join(", ")}`);
  return { kind, value };
}
