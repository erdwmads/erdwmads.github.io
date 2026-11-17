// Props for Masthead.astro: a page title is required; the heading level and the size (the page display size, or the
// larger name size for Home) are checked.
export const mastheadSizes = Object.freeze(["display", "name"]);

export function mastheadProps({ kicker = "", title, level = 1, size = "display", id } = {}) {
  if (typeof title !== "string" || !title.trim()) throw new Error("Masthead: title is required");
  if (![1, 2].includes(Number(level))) throw new Error(`Masthead: level must be 1 or 2, not ${level}`);
  if (!mastheadSizes.includes(size)) throw new Error(`Masthead: unknown size "${size}"; use ${mastheadSizes.join(" or ")}`);
  return { kicker, title, level: Number(level), size, id };
}
