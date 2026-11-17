// Props for Figure.astro, the frame for images that are not evidence (the portrait, photographs). Nothing is
// required; a ratio given as "4:5", "4/5" or "4 / 5" becomes the CSS aspect-ratio "4 / 5".
export function figureProps({ caption = "", credit = "", ratio, id } = {}) {
  let aspectRatio;
  if (ratio !== undefined && ratio !== "") {
    const match = String(ratio).match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/);
    if (!match || !Number(match[1]) || !Number(match[2])) throw new Error(`Figure: ratio "${ratio}" must read like 4:5 or 4 / 5`);
    aspectRatio = `${match[1]} / ${match[2]}`;
  }
  return { caption, credit, aspectRatio, id };
}
