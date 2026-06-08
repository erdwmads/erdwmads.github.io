
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

    const isEdgeAmbient = /\bEdg\//.test(navigator.userAgent || "");

    function initEdgeCanvasAmbient() {
      layer.classList.add("ambient-canvas-mode");

      const canvas = document.createElement("canvas");
      canvas.className = "ambient-canvas";
      canvas.setAttribute("aria-hidden", "true");
      layer.appendChild(canvas);

      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!ctx) return false;

      const isMobileAmbient = window.matchMedia &&
        window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;

      const dustCount = isMobileAmbient ? 88 : 122;
      const pebbleCount = isMobileAmbient ? 14 : 20;
      const meteorInterval = isMobileAmbient ? 2600 : 1900;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobileAmbient ? 1.15 : 1.35);

      let width = 0;
      let height = 0;
      let running = true;
      let rafId = 0;
      let lastTime = 0;
      let lastMeteorAt = 0;
      const dust = [];
      const pebbles = [];
      const meteors = [];

      function resizeCanvas() {
        width = window.innerWidth || document.documentElement.clientWidth || 1200;
        height = window.innerHeight || document.documentElement.clientHeight || 800;

        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function resetDust(p, randomAge) {
        p.x = rand(0, width);
        p.y = rand(0, height);
        p.isGold = Math.random() < GOLD_DUST_RATIO;
        p.size = p.isGold ? rand(3.1, 5.6) : rand(2.2, 4.8);
        p.alpha = p.isGold ? rand(0.72, 0.96) : rand(0.46, 0.88);
        p.dx = rand(-118, 118);
        p.dy = rand(-108, 108);
        p.duration = rand(28, 50) * 1000;
        p.age = randomAge ? rand(0, p.duration * 0.64) : 0;
      }

      function resetPebble(p, randomAge) {
        p.x = rand(0, width);
        p.y = rand(0, height);
        p.w = rand(8, 16);
        p.h = p.w * rand(0.65, 1.05);
        p.alpha = rand(0.52, 0.82);
        p.dx = rand(-138, 138);
        p.dy = rand(-116, 132);
        p.rot = rand(130, 390) * Math.PI / 180;
        p.duration = rand(42, 74) * 1000;
        p.age = randomAge ? rand(0, p.duration * 0.48) : 0;
      }

      function seedCanvasObjects() {
        dust.length = 0;
        pebbles.length = 0;
        meteors.length = 0;

        for (let i = 0; i < dustCount; i++) {
          const p = {};
          resetDust(p, true);
          dust.push(p);
        }

        for (let i = 0; i < pebbleCount; i++) {
          const p = {};
          resetPebble(p, true);
          pebbles.push(p);
        }
      }

      function positiveTimeToBoundary(component, startCoord, minBound, maxBound) {
        if (component > 0.0001) return (maxBound - startCoord) / component;
        if (component < -0.0001) return (minBound - startCoord) / component;
        return 0;
      }

      function spawnCanvasMeteor(now) {
        const directions = [
          { angle: 0, start: () => [-180, rand(0, height)] },
          { angle: 180, start: () => [width + 180, rand(0, height)] },
          { angle: 90, start: () => [rand(0, width), -180] },
          { angle: 270, start: () => [rand(0, width), height + 180] },
          { angle: 45, start: () => [rand(-220, width * 0.45), -180] },
          { angle: 135, start: () => [rand(width * 0.55, width + 220), -180] },
          { angle: 315, start: () => [rand(-220, width * 0.45), height + 180] },
          { angle: 225, start: () => [rand(width * 0.55, width + 220), height + 180] }
        ];

        const d = choose(directions);
        const start = d.start();
        const len = rand(90, 190);
        const angle = d.angle + rand(-10, 10);
        const rad = angle * Math.PI / 180;
        const vx = Math.cos(rad);
        const vy = Math.sin(rad);
        const exitMargin = 240;

        const tx = positiveTimeToBoundary(vx, start[0], -exitMargin, width + exitMargin);
        const ty = positiveTimeToBoundary(vy, start[1], -exitMargin, height + exitMargin);
        const travel = Math.max(tx, ty) + len + rand(40, 120);
        const dx = vx * travel;
        const dy = vy * travel;
        const distance = Math.hypot(dx, dy);
        const targetSpeed = rand(260, 390);
        const duration = Math.max(2800, (distance / targetSpeed) * 1000);

        meteors.push({
          x: start[0],
          y: start[1],
          dx,
          dy,
          len,
          angle,
          isGold: Math.random() < GOLD_METEOR_RATIO,
          born: now,
          duration
        });
      }

      function drawDust(p, dt) {
        p.age += dt;
        if (p.age >= p.duration) resetDust(p, false);

        const t = Math.max(0, Math.min(1, p.age / p.duration));
        const fade = t < 0.08 ? t / 0.08 : (t > 0.88 ? (1 - t) / 0.12 : 1);
        const x = p.x + p.dx * t;
        const y = p.y + p.dy * t;
        const scale = 0.9 + 0.18 * t;
        const radius = p.size * scale * 0.5;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha * fade);

        if (p.isGold) {
          ctx.shadowBlur = 11;
          ctx.shadowColor = "rgba(255, 226, 158, .52)";
          ctx.fillStyle = "rgba(255, 222, 150, .92)";
        } else {
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(185, 226, 255, .42)";
          ctx.fillStyle = "rgba(245, 250, 255, .88)";
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function drawPebble(p, dt) {
        p.age += dt;
        if (p.age >= p.duration) resetPebble(p, false);

        const t = Math.max(0, Math.min(1, p.age / p.duration));
        const fade = t < 0.10 ? t / 0.10 : (t > 0.84 ? (1 - t) / 0.16 : 1);
        const x = p.x + p.dx * t;
        const y = p.y + p.dy * t;
        const rot = p.rot * t;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha * fade);
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.shadowBlur = 7;
        ctx.shadowColor = "rgba(170, 220, 255, .12)";

        const grad = ctx.createRadialGradient(-p.w * .18, -p.h * .22, 1, 0, 0, Math.max(p.w, p.h));
        grad.addColorStop(0, "rgba(235,242,247,.50)");
        grad.addColorStop(0.48, "rgba(130,142,154,.52)");
        grad.addColorStop(1, "rgba(55,67,80,.45)");
        ctx.fillStyle = grad;
        ctx.strokeStyle = "rgba(232,242,248,.24)";
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.ellipse(0, 0, p.w * 0.5, p.h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      function drawMeteor(m, now) {
        const t = (now - m.born) / m.duration;
        if (t >= 1) return false;

        const fadeIn = Math.min(1, t / 0.08);
        const fadeOut = t > 0.90 ? (1 - t) / 0.10 : 1;
        const alpha = Math.max(0, Math.min(1, fadeIn * fadeOut));
        const headX = m.x + m.dx * t;
        const headY = m.y + m.dy * t;
        const rad = m.angle * Math.PI / 180;
        const tailX = headX - Math.cos(rad) * m.len;
        const tailY = headY - Math.sin(rad) * m.len;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.lineCap = "round";
        ctx.lineWidth = 3;

        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        if (m.isGold) {
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(0.18, "rgba(232,197,116,.11)");
          grad.addColorStop(0.62, "rgba(244,217,152,.58)");
          grad.addColorStop(1, "rgba(255,239,198,.90)");
          ctx.shadowColor = "rgba(244,217,152,.34)";
          ctx.shadowBlur = 9;
        } else {
          grad.addColorStop(0, "rgba(255,255,255,0)");
          grad.addColorStop(0.18, "rgba(160,210,255,.18)");
          grad.addColorStop(0.68, "rgba(216,238,255,.84)");
          grad.addColorStop(1, "rgba(255,255,255,1)");
          ctx.shadowColor = "rgba(190,230,255,.55)";
          ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = m.isGold ? "rgba(255,240,202,.92)" : "rgba(255,255,255,1)";
        ctx.arc(headX, headY, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      }

      function draw(now) {
        if (!running) return;

        if (!lastTime) lastTime = now;
        const dt = Math.min(48, now - lastTime);
        lastTime = now;

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < dust.length; i++) drawDust(dust[i], dt);
        for (let i = 0; i < pebbles.length; i++) drawPebble(pebbles[i], dt);

        if (!lastMeteorAt) {
          spawnCanvasMeteor(now);
          lastMeteorAt = now;
        } else if (!document.hidden && now - lastMeteorAt > meteorInterval) {
          spawnCanvasMeteor(now);
          lastMeteorAt = now;
        }

        for (let i = meteors.length - 1; i >= 0; i--) {
          if (!drawMeteor(meteors[i], now)) meteors.splice(i, 1);
        }

        rafId = requestAnimationFrame(draw);
      }

      function startCanvasAmbient() {
        if (running) return;
        running = true;
        lastTime = 0;
        rafId = requestAnimationFrame(draw);
      }

      function stopCanvasAmbient() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      }

      resizeCanvas();
      seedCanvasObjects();

      setTimeout(function () { spawnCanvasMeteor(performance.now()); }, isMobileAmbient ? 900 : 550);
      setTimeout(function () { spawnCanvasMeteor(performance.now()); }, isMobileAmbient ? 1850 : 1200);

      rafId = requestAnimationFrame(draw);

      window.addEventListener("resize", function () {
        resizeCanvas();
        seedCanvasObjects();
      }, { passive: true });

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stopCanvasAmbient();
        else startCanvasAmbient();
      });

      window.addEventListener("pagehide", stopCanvasAmbient, { passive: true });
      window.addEventListener("pageshow", startCanvasAmbient, { passive: true });

      return true;
    }

    if (isEdgeAmbient && initEdgeCanvasAmbient()) {
      return;
    }

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
        requestAnimationFrame(function () {
          resetDustMotion(el, false);
        });
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
        requestAnimationFrame(function () {
          resetPebbleMotion(el, false);
        });
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

    // Minimal power saver:
    // keep the same visual language, but reduce always-on particle work.
    const isMobileAmbient = window.matchMedia &&
      window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;

    const dustCount = isMobileAmbient ? 88 : 122;
    const pebbleCount = isMobileAmbient ? 14 : 20;
    const meteorInterval = isMobileAmbient ? 2600 : 1900;

    for (let i = 0; i < dustCount; i++) makeDust();
    for (let i = 0; i < pebbleCount; i++) makePebble();

    // Make meteors visible after load, then spawn at a slightly calmer cadence.
    function spawnMeteorIfVisible() {
      if (!document.hidden) spawnMeteor();
    }

    spawnMeteorIfVisible();
    setTimeout(spawnMeteorIfVisible, isMobileAmbient ? 900 : 550);
    setTimeout(spawnMeteorIfVisible, isMobileAmbient ? 1850 : 1200);

    let meteorTimer = window.setInterval(spawnMeteorIfVisible, meteorInterval);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        window.clearInterval(meteorTimer);
        meteorTimer = null;
        layer.classList.add("ambient-paused");
      } else {
        layer.classList.remove("ambient-paused");
        if (!meteorTimer) {
          meteorTimer = window.setInterval(spawnMeteorIfVisible, meteorInterval);
        }
      }
    });

    window.addEventListener("pagehide", function () {
      window.clearInterval(meteorTimer);
      meteorTimer = null;
      layer.classList.add("ambient-paused");
    }, { passive: true });

    window.addEventListener("pageshow", function () {
      layer.classList.remove("ambient-paused");
      if (!meteorTimer) {
        meteorTimer = window.setInterval(spawnMeteorIfVisible, meteorInterval);
      }
    }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAmbientSpace);
  } else {
    initAmbientSpace();
  }
})();
