// Row breaks for the justified photo wall, chosen at build time by PhotographyGallery.astro.
//
// Every row is scaled to the wall width, and the breaks are chosen together (a linear partition) so each
// row height stays close to the target height. A greedy fill, which is what plain CSS flex wrapping does,
// would leave a short last row that either stretches into one oversized photograph or leaves a hole.
//
// The target row height is a fixed share of the wall width in each band below, so one partition holds for
// every width in a band: the row heights scale with the wall. observatory-experience.css repeats these
// bands as container queries on the wall (max-width and rowShare as cqw) and computes each row height from
// the ratio sum and gap count that rowProperties() gives every tile.
export const MIN_ROW_SCALE = 0.6;
export const MAX_ROW_SCALE = 1.75;
export const WALL_BANDS = [
  // Phones: one or two photographs per row.
  { name: "narrow", maxWidth: 520, sampleWidth: 390, rowShare: 0.36, gap: 10, maxPerRow: 2 },
  { name: "medium", maxWidth: 720, sampleWidth: 620, rowShare: 0.26, gap: 10, maxPerRow: Infinity },
  { name: "wide", maxWidth: 1200, sampleWidth: 960, rowShare: 0.215, gap: 16, maxPerRow: Infinity }
];

// ratios: width / height of each photograph in reading order; width: the usable wall width in CSS px;
// gap: the gap between tiles; target: the target row height; maxPerRow: the most photographs in one row.
// Returns rows in order as { start, end, height }, where end is exclusive and height fills the width exactly.
export function partitionRows(ratios, width, gap, target, maxPerRow = Infinity) {
  const cost = [0];
  const first = [0];
  for (let end = 1; end <= ratios.length; end += 1) {
    cost[end] = Infinity;
    let sum = 0;
    for (let start = end - 1; start >= 0 && end - start <= maxPerRow; start -= 1) {
      sum += ratios[start];
      const scale = (width - gap * (end - start - 1)) / sum / target;
      const outside = scale < MIN_ROW_SCALE || scale > MAX_ROW_SCALE;
      const total = cost[start] + Math.log(scale) ** 2 + (outside ? 10 : 0);
      if (total < cost[end]) { cost[end] = total; first[end] = start; }
      // Adding photographs only shortens the row further.
      if (scale < MIN_ROW_SCALE) break;
    }
  }
  const rows = [];
  for (let end = ratios.length; end > 0; end = first[end]) {
    const start = first[end];
    const sum = ratios.slice(start, end).reduce((total, ratio) => total + ratio, 0);
    rows.unshift({ start, end, height: (width - gap * (end - start - 1)) / sum });
  }
  return rows;
}

// One inline style per photograph: its ratio, and for each band the ratio sum (--photo-sum-<band>) and gap
// count (--photo-gaps-<band>) of its row. A last row that would have to grow far past the target gets
// --photo-grow-<band>: 0 instead, so it keeps the target height and leaves the rest of the row empty.
export function rowProperties(ratios) {
  const properties = ratios.map((ratio) => [`--photo-ratio: ${ratio}`]);
  for (const band of WALL_BANDS) {
    const target = band.rowShare * band.sampleWidth;
    const rows = partitionRows(ratios, band.sampleWidth - 1, band.gap, target, band.maxPerRow);
    rows.forEach((row, index) => {
      const open = index === rows.length - 1 && row.height / target > MAX_ROW_SCALE;
      const sum = ratios.slice(row.start, row.end).reduce((total, ratio) => total + ratio, 0);
      const value = open
        ? `--photo-grow-${band.name}: 0`
        : `--photo-sum-${band.name}: ${Number(sum.toFixed(4))}; --photo-gaps-${band.name}: ${row.end - row.start - 1}`;
      for (let tile = row.start; tile < row.end; tile += 1) properties[tile].push(value);
    });
  }
  return properties.map((list) => list.join("; "));
}
