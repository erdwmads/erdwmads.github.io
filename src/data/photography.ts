const dimensions = [
  [1683, 1280], [1280, 853], [1706, 1280], [1280, 1905],
  [1280, 1706], [1728, 1280], [1280, 1720], [1706, 1280],
  [1706, 1280], [1706, 1280], [3125, 1280], [1705, 1280],
  [1706, 1280], [2275, 1280], [1706, 1280], [1436, 960],
  [1707, 1280], [1706, 1280], [1280, 1706], [1500, 844],
  [2143, 1280]
];

const descriptions = [
  "Friends gathered around a wooden block tower at a table",
  "Four friends sitting beside a tree-lined walkway",
  "A person standing on a rocky shoreline in warm evening light",
  "Three people on a rocky slope surrounded by greenery",
  "Portrait beside a waterfall descending between cliffs",
  "Friends talking in a dim room with drawings on the walls",
  "Two people reflected in a tall mirror",
  "A person resting beside a bicycle on a waterfront",
  "A person standing on coastal rocks above breaking waves",
  "A silhouette beside a large sign overlooking the sea",
  "A person at a snowy lakeside lookout with mountains beyond",
  "Railway crossing lights glowing beneath a bridge at night",
  "A red torii gate at the foot of a steep rocky outcrop",
  "A person on a waterfront promenade with skyscrapers across the river",
  "A smiling person in front of illuminated historic buildings at night",
  "Two people riding a chairlift above a hillside",
  "A person sitting in front of an ornate red and gold gate",
  "A lone figure facing waves from a rocky shoreline",
  "A person leaning over a meal at a narrow table",
  "A person beside a waterfront building with a welcome sign",
  "A person on a boardwalk across open grassland beneath mountains"
];

// WebP srcset tiers come from scripts/generate-image-derivatives.mjs. Panoramas (wider than 2.3:1)
// span the whole photo wall, so they also get 1600w. The original JPEG stays the largest
// candidate, the link target and the presentation-view source.
export const photographs = dimensions.map(([width, height], index) => {
  const number = index + 1;
  const name = `photo-${String(number).padStart(2, "0")}.webp`;
  const wide = width / height > 2.3;
  const full = `assets/img/photo%20%28${number}%29.jpg`;
  const thumb = `assets/img/thumbs/photography/${name}`;
  const tiers = (wide ? [640, 960, 1600] : [640, 960]).map((tier) => `assets/img/photography/w${tier}/${name} ${tier}w`);
  return {
    number,
    width,
    height,
    wide,
    full,
    thumb,
    srcset: [`${thumb} 480w`, ...tiers, `${full} ${width}w`].join(", "),
    alt: descriptions[index]
  };
});
