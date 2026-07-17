export const photographs = Array.from({ length: 21 }, (_, index) => {
  const number = index + 1;
  return {
    number,
    full: `assets/img/photo%20%28${number}%29.jpg`,
    thumb: `assets/img/thumbs/photography/photo-${String(number).padStart(2, "0")}.webp`,
    alt: `Photograph ${number}`
  };
});
