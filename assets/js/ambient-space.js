
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function initAmbientSpace() {
    const oldLayer = document.querySelector(".ambient-space-layer");
    if (oldLayer) oldLayer.remove();

    const layer = document.createElement("div");
    layer.className = "ambient-space-layer";
    document.body.appendChild(layer);

    function makeDust() {
      const el = document.createElement("span");
      el.className = "ambient-dust";

      const size = rand(2.4, 5.2);
      el.style.left = rand(0, 100) + "vw";
      el.style.top = rand(0, 100) + "vh";
      el.style.setProperty("--dust-size", size + "px");
      el.style.setProperty("--dust-x", rand(-150, 150) + "px");
      el.style.setProperty("--dust-y", rand(-160, 130) + "px");
      el.style.animationDuration = rand(14, 30) + "s";
      el.style.animationDelay = (-rand(0, 30)) + "s";
      layer.appendChild(el);
    }

    function makePebble() {
      const el = document.createElement("span");
      el.className = "ambient-pebble";

      const w = rand(7, 16);
      const h = w * rand(0.65, 1.05);
      el.style.left = rand(0, 100) + "vw";
      el.style.top = rand(0, 100) + "vh";
      el.style.setProperty("--pebble-w", w + "px");
      el.style.setProperty("--pebble-h", h + "px");
      el.style.setProperty("--pebble-x", rand(-220, 220) + "px");
      el.style.setProperty("--pebble-y", rand(-160, 180) + "px");
      el.style.setProperty("--pebble-rotate", rand(140, 520) + "deg");
      el.style.animationDuration = rand(24, 48) + "s";
      el.style.animationDelay = (-rand(0, 48)) + "s";
      layer.appendChild(el);
    }

    function makeMeteor() {
      const el = document.createElement("span");
      el.className = "ambient-meteor";

      const len = rand(78, 170);
      const angle = rand(0, 360);
      const rad = angle * Math.PI / 180;

      // Movement vector follows the meteor head/trail direction.
      const travel = rand(580, 980);
      const dx = Math.cos(rad) * travel;
      const dy = Math.sin(rad) * travel;

      // Start from outside one of the four screen sides, so it enters naturally.
      const side = Math.floor(rand(0, 4));
      let x, y;

      if (side === 0) {          // left edge
        x = -28;
        y = rand(-10, 110);
      } else if (side === 1) {   // right edge
        x = 128;
        y = rand(-10, 110);
      } else if (side === 2) {   // top edge
        x = rand(-10, 110);
        y = -22;
      } else {                   // bottom edge
        x = rand(-10, 110);
        y = 122;
      }

      // Make sure the vector points into the screen from the chosen side.
      let finalAngle = angle;
      if (side === 0 && dx < 0) finalAngle += 180;
      if (side === 1 && dx > 0) finalAngle += 180;
      if (side === 2 && dy < 0) finalAngle += 180;
      if (side === 3 && dy > 0) finalAngle += 180;

      const finalRad = finalAngle * Math.PI / 180;
      const finalDx = Math.cos(finalRad) * travel;
      const finalDy = Math.sin(finalRad) * travel;

      el.style.left = x + "vw";
      el.style.top = y + "vh";
      el.style.setProperty("--meteor-len", len + "px");
      el.style.setProperty("--meteor-angle", finalAngle + "deg");
      el.style.setProperty("--meteor-x", finalDx + "px");
      el.style.setProperty("--meteor-y", finalDy + "px");
      el.style.animationDuration = rand(4.8, 8.4) + "s";

      // Negative delay keeps some meteors already moving after page load.
      // They still begin from off-screen in each animation cycle.
      el.style.animationDelay = (-rand(0, 8.4)) + "s";

      layer.appendChild(el);
    }

    for (let i = 0; i < 150; i++) makeDust();
    for (let i = 0; i < 32; i++) makePebble();
    for (let i = 0; i < 14; i++) makeMeteor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAmbientSpace);
  } else {
    initAmbientSpace();
  }
})();
