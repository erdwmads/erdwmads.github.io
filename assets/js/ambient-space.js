
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function choose(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function initAmbientSpace() {
    const existing = document.querySelector(".ambient-space-layer");
    if (existing) existing.remove();

    const layer = document.createElement("div");
    layer.className = "ambient-space-layer";
    document.body.appendChild(layer);

    function makeDust() {
      const el = document.createElement("span");
      el.className = "ambient-dust";

      const size = rand(2.4, 5.0);
      el.style.left = rand(0, 100) + "vw";
      el.style.top = rand(0, 100) + "vh";
      el.style.setProperty("--dust-size", size + "px");
      el.style.setProperty("--dust-x", rand(-120, 120) + "px");
      el.style.setProperty("--dust-y", rand(-120, 120) + "px");
      el.style.setProperty("--dust-duration", rand(14, 26) + "s");
      el.style.animationDelay = (-rand(0, 26)) + "s";

      layer.appendChild(el);
    }

    function makePebble() {
      const el = document.createElement("span");
      el.className = "ambient-pebble";

      const w = rand(8, 16);
      const h = w * rand(0.65, 1.05);
      el.style.left = rand(0, 100) + "vw";
      el.style.top = rand(0, 100) + "vh";
      el.style.setProperty("--pebble-w", w + "px");
      el.style.setProperty("--pebble-h", h + "px");
      el.style.setProperty("--pebble-x", rand(-150, 150) + "px");
      el.style.setProperty("--pebble-y", rand(-120, 140) + "px");
      el.style.setProperty("--pebble-rotate", rand(120, 420) + "deg");
      el.style.setProperty("--pebble-duration", rand(24, 42) + "s");
      el.style.animationDelay = (-rand(0, 42)) + "s";

      layer.appendChild(el);
    }

    function spawnMeteor() {
      const el = document.createElement("span");
      el.className = "ambient-meteor";

      const width = window.innerWidth || document.documentElement.clientWidth || 1200;
      const height = window.innerHeight || document.documentElement.clientHeight || 800;

      // Eight-direction trajectories, but always enter from outside the viewport.
      const directions = [
        { name: "left-to-right", angle: 0, start: () => [-180, rand(0, height)], vec: [1, 0] },
        { name: "right-to-left", angle: 180, start: () => [width + 180, rand(0, height)], vec: [-1, 0] },
        { name: "top-to-bottom", angle: 90, start: () => [rand(0, width), -180], vec: [0, 1] },
        { name: "bottom-to-top", angle: 270, start: () => [rand(0, width), height + 180], vec: [0, -1] },
        { name: "nw-se", angle: 45, start: () => [rand(-220, width * 0.45), -180], vec: [1, 1] },
        { name: "ne-sw", angle: 135, start: () => [rand(width * 0.55, width + 220), -180], vec: [-1, 1] },
        { name: "sw-ne", angle: 315, start: () => [rand(-220, width * 0.45), height + 180], vec: [1, -1] },
        { name: "se-nw", angle: 225, start: () => [rand(width * 0.55, width + 220), height + 180], vec: [-1, -1] }
      ];

      const d = choose(directions);
      const start = d.start();
      const len = rand(90, 190);
      const travel = Math.max(width, height) * rand(0.75, 1.15);
      const jitter = rand(-10, 10);
      const angle = d.angle + jitter;
      const rad = angle * Math.PI / 180;

      // Use angle vector, so the visual trail and movement match.
      const dx = Math.cos(rad) * travel;
      const dy = Math.sin(rad) * travel;
      const duration = rand(1250, 2300);

      el.style.setProperty("--meteor-len", len + "px");
      el.style.left = start[0] + "px";
      el.style.top = start[1] + "px";
      el.style.transform = "translate3d(0,0,0) rotate(" + angle + "deg)";

      layer.appendChild(el);

      // Force a layout read so the transition always starts.
      void el.offsetWidth;

      el.style.transition = "transform " + duration + "ms linear, opacity 220ms ease";
      el.classList.add("is-flying");

      requestAnimationFrame(function () {
        el.style.transform = "translate3d(" + dx + "px," + dy + "px,0) rotate(" + angle + "deg)";
      });

      window.setTimeout(function () {
        el.style.opacity = "0";
      }, Math.max(500, duration - 260));

      window.setTimeout(function () {
        el.remove();
      }, duration + 420);
    }

    // Reduced counts, but visible.
    for (let i = 0; i < 95; i++) makeDust();
    for (let i = 0; i < 18; i++) makePebble();

    // Make meteors immediately visible after load, then continuously spawn.
    spawnMeteor();
    setTimeout(spawnMeteor, 450);
    setTimeout(spawnMeteor, 1050);
    setInterval(spawnMeteor, 1400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAmbientSpace);
  } else {
    initAmbientSpace();
  }
})();
