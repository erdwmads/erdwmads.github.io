
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
      const size = rand(2.2, 4.8);
      el.style.left = rand(0, 100) + "vw";
      el.style.top = rand(0, 100) + "vh";
      el.style.setProperty("--dust-size", size + "px");
      el.style.setProperty("--dust-x", rand(-120, 120) + "px");
      el.style.setProperty("--dust-y", rand(-120, 120) + "px");
      el.style.animationDuration = rand(16, 28) + "s";
      el.style.animationDelay = (-rand(0, 28)) + "s";
      layer.appendChild(el);
    }

    function makePebble() {
      const el = document.createElement("span");
      el.className = "ambient-pebble";
      const w = rand(7, 14);
      const h = w * rand(0.65, 1.05);
      el.style.left = rand(0, 100) + "vw";
      el.style.top = rand(0, 100) + "vh";
      el.style.setProperty("--pebble-w", w + "px");
      el.style.setProperty("--pebble-h", h + "px");
      el.style.setProperty("--pebble-x", rand(-180, 180) + "px");
      el.style.setProperty("--pebble-y", rand(-140, 140) + "px");
      el.style.setProperty("--pebble-rotate", rand(120, 420) + "deg");
      el.style.animationDuration = rand(26, 42) + "s";
      el.style.animationDelay = (-rand(0, 42)) + "s";
      layer.appendChild(el);
    }

    function spawnMeteor() {
      const el = document.createElement("span");
      el.className = "ambient-meteor";

      const len = rand(70, 160);
      const duration = rand(1.7, 2.9);

      // 8-direction style sectors.
      const sectors = [0, 45, 90, 135, 180, 225, 270, 315];
      let angle = sectors[Math.floor(rand(0, sectors.length))] + rand(-12, 12);
      let rad = angle * Math.PI / 180;

      let dx = Math.cos(rad);
      let dy = Math.sin(rad);

      // Spawn from the opposite outside edge so it flies into view.
      let startX = 50, startY = 50;

      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx > 0) {
          startX = -18;
          startY = rand(-10, 110);
        } else {
          startX = 118;
          startY = rand(-10, 110);
        }
      } else {
        if (dy > 0) {
          startY = -18;
          startX = rand(-10, 110);
        } else {
          startY = 118;
          startX = rand(-10, 110);
        }
      }

      const distance = rand(420, 760);
      const moveX = dx * distance;
      const moveY = dy * distance;

      el.style.left = startX + "vw";
      el.style.top = startY + "vh";
      el.style.setProperty("--meteor-len", len + "px");
      el.style.setProperty("--meteor-angle", angle + "deg");
      el.style.setProperty("--meteor-x", moveX + "px");
      el.style.setProperty("--meteor-y", moveY + "px");
      el.style.animation = "ambientMeteorFlyFinal " + duration + "s linear forwards";

      el.addEventListener("animationend", () => el.remove(), { once: true });
      layer.appendChild(el);
    }

    // Slightly fewer than before, but still visible.
    for (let i = 0; i < 95; i++) makeDust();
    for (let i = 0; i < 18; i++) makePebble();

    // Start with a few meteors immediately, then keep spawning.
    for (let i = 0; i < 4; i++) {
      setTimeout(spawnMeteor, i * 380);
    }

    setInterval(spawnMeteor, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAmbientSpace);
  } else {
    initAmbientSpace();
  }
})();
