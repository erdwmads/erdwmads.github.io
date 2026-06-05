
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

      const size = rand(2.0, 4.2);
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

      const w = rand(6, 13);
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
      const pad = 280;

      // Start and end points are both outside opposite viewport boundaries.
      // This makes the meteor cross the whole interface instead of stopping near an edge.
      const trajectories = [
        function () {
          const y = rand(-height * 0.10, height * 1.10);
          return { start: [-pad, y], end: [width + pad, y + rand(-height * 0.25, height * 0.25)] };
        },
        function () {
          const y = rand(-height * 0.10, height * 1.10);
          return { start: [width + pad, y], end: [-pad, y + rand(-height * 0.25, height * 0.25)] };
        },
        function () {
          const x = rand(-width * 0.10, width * 1.10);
          return { start: [x, -pad], end: [x + rand(-width * 0.25, width * 0.25), height + pad] };
        },
        function () {
          const x = rand(-width * 0.10, width * 1.10);
          return { start: [x, height + pad], end: [x + rand(-width * 0.25, width * 0.25), -pad] };
        },
        function () {
          return { start: [-pad, rand(-pad, height * 0.35)], end: [width + pad, rand(height * 0.65, height + pad)] };
        },
        function () {
          return { start: [width + pad, rand(-pad, height * 0.35)], end: [-pad, rand(height * 0.65, height + pad)] };
        },
        function () {
          return { start: [-pad, rand(height * 0.65, height + pad)], end: [width + pad, rand(-pad, height * 0.35)] };
        },
        function () {
          return { start: [width + pad, rand(height * 0.65, height + pad)], end: [-pad, rand(-pad, height * 0.35)] };
        }
      ];

      const t = choose(trajectories)();
      const dx = t.end[0] - t.start[0];
      const dy = t.end[1] - t.start[1];
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const len = rand(110, 220);
      const duration = Math.max(1550, Math.min(3600, distance / rand(0.82, 1.08)));

      el.style.setProperty("--meteor-len", len + "px");
      el.style.left = t.start[0] + "px";
      el.style.top = t.start[1] + "px";
      el.style.transform = "translate3d(0,0,0) rotate(" + angle + "deg)";

      layer.appendChild(el);

      void el.offsetWidth;

      el.style.transition = "transform " + duration + "ms linear, opacity 260ms ease";
      el.classList.add("is-flying");

      requestAnimationFrame(function () {
        el.style.transform = "translate3d(" + dx + "px," + dy + "px,0) rotate(" + angle + "deg)";
      });

      // Fade only after the endpoint is reached outside the viewport.
      window.setTimeout(function () {
        el.style.opacity = "0";
      }, duration);

      window.setTimeout(function () {
        el.remove();
      }, duration + 340);
    }

    for (let i = 0; i < 70; i++) makeDust();
    for (let i = 0; i < 12; i++) makePebble();

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
