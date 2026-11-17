// Props for Section.astro: the heading id (the section's accessible name and the target of hash links) and the
// title are required. The section is labelled by its own heading unless labelledby names another element.
export function sectionProps({ id, number = "", kicker = "", title, level = 2, labelledby } = {}) {
  if (typeof id !== "string" || !/^[A-Za-z][\w-]*$/.test(id)) throw new Error(`Section: id is required and must be a valid id, not "${id}"`);
  if (typeof title !== "string" || !title.trim()) throw new Error(`Section ${id}: title is required`);
  if (![2, 3].includes(Number(level))) throw new Error(`Section ${id}: level must be 2 or 3, not ${level}`);
  return { id, number, kicker, title, level: Number(level), labelledby: labelledby || id };
}
