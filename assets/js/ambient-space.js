
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

  // Stable gold assignment.
  // Classes are assigned once at creation so a meteor cannot start gold and
  // turn white later when previous meteor nodes are removed.
  const GOLD_DUST_RATIO = 0.18;
  const GOLD_METEOR_RATIO = 0.07;


  function initAmbientSpace() {
    const existing = document.querySelector(".ambient-space-layer");
    if (existing) existing.remove();

    const layer = document.createElement("div");
    layer.className = "ambient-space-layer";
    document.body.appendChild(layer);

    function resetDustMotion(el, initial) {
      const isGoldDust = el.classList.contains("is-gold-dust");
      const size = isGoldDust ? rand(3.1, 5.6) : rand(2.2, 4.8);
      const duration = rand(28, 50);

      // On every new cycle, move the particle to a fresh viewport position.
      // This prevents the loop-reset from reappearing near the previous/initial point.
      el.style.left = rand(0, 100) + "vw";
      el.style.top = rand(0, 100) + "vh";
      el.style.setProperty("--dust-size", size + "px");
      el.style.setProperty("--dust-x", rand(-118, 118) + "px");
      el.style.setProperty("--dust-y", rand(-108, 108) + "px");
      el.style.setProperty("--dust-duration", duration + "s");
      el.style.setProperty("--dust-opacity", (isGoldDust ? rand(0.72, 0.96) : rand(0.46, 0.88)).toFixed(2));
      el.style.animationDuration = duration + "s";
      el.style.animationDelay = initial ? (-rand(0, duration * 0.64)) + "s" : "0s";
    }

    function makeDust() {
      const el = document.createElement("span");
      el.className = "ambient-dust";
      const isGoldDust = Math.random() < GOLD_DUST_RATIO;
      if (isGoldDust) el.classList.add("is-gold-dust");

      resetDustMotion(el, true);

      el.addEventListener("animationiteration", function () {
        resetDustMotion(el, false);
      });

      layer.appendChild(el);
    }

    function resetPebbleMotion(el, initial) {
      const w = rand(8, 16);
      const h = w * rand(0.65, 1.05);
      const duration = rand(42, 74);

      // Re-seed position and vector at each cycle so a pebble does not jump
      // back to the same old start/end area.
      el.style.left = rand(0, 100) + "vw";
      el.style.top = rand(0, 100) + "vh";
      el.style.setProperty("--pebble-w", w + "px");
      el.style.setProperty("--pebble-h", h + "px");
      el.style.setProperty("--pebble-x", rand(-138, 138) + "px");
      el.style.setProperty("--pebble-y", rand(-116, 132) + "px");
      el.style.setProperty("--pebble-rotate", rand(130, 390) + "deg");
      el.style.setProperty("--pebble-duration", duration + "s");
      el.style.setProperty("--pebble-opacity", rand(0.52, 0.82).toFixed(2));
      el.style.animationDuration = duration + "s";
      el.style.animationDelay = initial ? (-rand(0, duration * 0.48)) + "s" : "0s";
    }

    function makePebble() {
      const el = document.createElement("span");
      el.className = "ambient-pebble";

      resetPebbleMotion(el, true);

      el.addEventListener("animationiteration", function () {
        resetPebbleMotion(el, false);
      });

      layer.appendChild(el);
    }

    function spawnMeteor() {
      const el = document.createElement("span");
      el.className = "ambient-meteor";
      if (Math.random() < GOLD_METEOR_RATIO) el.classList.add("is-gold-meteor");

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
      const jitter = rand(-10, 10);
      const angle = d.angle + jitter;
      const rad = angle * Math.PI / 180;

      // Compute a full cross-screen flight so meteors never stop and fade
      // in the middle of the viewport. The endpoint is pushed beyond the
      // opposite extended bounds of the screen.
      const vx = Math.cos(rad);
      const vy = Math.sin(rad);
      const exitMargin = 240;

      function positiveTimeToBoundary(component, startCoord, minBound, maxBound) {
        if (component > 0.0001) return (maxBound - startCoord) / component;
        if (component < -0.0001) return (minBound - startCoord) / component;
        return 0;
      }

      const tx = positiveTimeToBoundary(vx, start[0], -exitMargin, width + exitMargin);
      const ty = positiveTimeToBoundary(vy, start[1], -exitMargin, height + exitMargin);
      const travel = Math.max(tx, ty) + len + rand(40, 120);

      // Use the same vector for both the visual trail and the motion.
      const dx = vx * travel;
      const dy = vy * travel;

      // Speed cap:
      // keep a varied meteor speed distribution, but prevent occasional
      // absurdly fast meteors on large/diagonal trajectories.
      const distance = Math.hypot(dx, dy);
      const targetSpeed = rand(260, 390); // px/s; varied, but hard-capped against flash meteors

      // True speed cap:
      // Do NOT clamp with a short maximum duration. A max-duration clamp was the
      // reason very long cross-screen routes could still become absurdly fast.
      // The meteor now keeps its assigned px/s speed until it exits the screen.
      const duration = Math.max(2800, (distance / targetSpeed) * 1000);

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

    // Keep the scene rich, but slightly reduce micro-meteorite density.
    for (let i = 0; i < 146; i++) makeDust();
    for (let i = 0; i < 26; i++) makePebble();

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
