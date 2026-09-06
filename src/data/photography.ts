const dimensions = [
  [1683, 1280], [1280, 853], [1706, 1280], [1280, 1905],
  [1280, 1706], [1728, 1280], [1280, 1720], [1706, 1280],
  [1706, 1280], [1706, 1280], [3125, 1280], [1705, 1280],
  [1706, 1280], [2275, 1280], [1706, 1280], [1436, 960],
  [1707, 1280], [1706, 1280], [1280, 1706], [1500, 844],
  [2143, 1280]
];

export const photographs = dimensions.map(([width, height], index) => {
  const number = index + 1;
  return {
    number,
    width,
    height,
    full: `assets/img/photo%20%28${number}%29.jpg`,
    thumb: `assets/img/thumbs/photography/photo-${String(number).padStart(2, "0")}.webp`,
    alt: `Photograph ${number}`
  };
});
