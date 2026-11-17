// Items for Ledger.astro: each row has a title, an optional link and detail, and a key that hangs in the first
// column, a date or a number but not both.
export function ledgerItems(items) {
  if (!Array.isArray(items) || !items.length) throw new Error("Ledger: items must be a non-empty array");
  return items.map((item, index) => {
    if (!item || typeof item.title !== "string" || !item.title.trim()) throw new Error(`Ledger: item ${index + 1} has no title`);
    if (item.date && item.number) throw new Error(`Ledger: item ${index + 1} has both a date and a number`);
    return { key: String(item.date || item.number || ""), title: item.title, href: item.href, detail: item.detail };
  });
}
