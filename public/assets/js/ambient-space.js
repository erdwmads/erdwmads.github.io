
(function () {
  const AMBIENT_STORAGE_KEY = "madsAmbientFxEnabled";
  const MOBILE_AMBIENT_MEDIA = "(max-width: 760px), (pointer: coarse)";
  const mobileAmbientQuery = window.matchMedia ? window.matchMedia(MOBILE_AMBIENT_MEDIA) : null;

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function isMobileAmbientView() {
    return !!mobileAmbientQuery?.matches;
  }

  function isAmbientEnabled() {
    if (prefersReducedMotion()) return false;
    if (isMobileAmbientView()) return false;
    return window.localStorage.getItem(AMBIENT_STORAGE_KEY) === "1";
  }

  function setAmbientEnabled(enabled) {
    window.localStorage.setItem(AMBIENT_STORAGE_KEY, enabled ? "1" : "0");
  }

  function emitAmbientState() {
    window.dispatchEvent(new CustomEvent("mads:fx-state", {
      detail: { enabled: isAmbientEnabled() }
    }));
  }

  function updateAmbientToggle(button) {
    const enabled = isAmbientEnabled();
    button.classList.toggle("is-on", enabled);
    button.setAttribute("aria-pressed", enabled ? "true" : "false");
    button.setAttribute("title", enabled ? "Background FX: on" : "Background FX: off");
    button.innerHTML = enabled
      ? '<span class="ambient-fx-toggle__dot"></span><span class="ambient-fx-toggle__text">FX On</span>'
      : '<span class="ambient-fx-toggle__dot"></span><span class="ambient-fx-toggle__text">FX Off</span>';
  }

  function removeAmbientLayer() {
    const existing = document.querySelector(".ambient-space-layer");
    if (existing) existing.remove();
    document.documentElement.classList.add("ambient-fx-disabled");
    document.body.classList.add("ambient-fx-disabled");
  }

  function createAmbientToggle() {
    if (document.querySelector(".ambient-fx-toggle")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ambient-fx-toggle";
    button.setAttribute("aria-label", "Toggle background stardust and meteor effects");
    updateAmbientToggle(button);

    button.addEventListener("click", function () {
      const next = !isAmbientEnabled();
      setAmbientEnabled(next);
      updateAmbientToggle(button);

      if (next) {
        document.documentElement.classList.remove("ambient-fx-disabled");
        document.body.classList.remove("ambient-fx-disabled");
        initAmbientSpace();
      } else {
        removeAmbientLayer();
      }

      emitAmbientState();
    });

    document.body.appendChild(button);
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

    if (isMobileAmbientView()) {
      // mobile ambient disabled: the mobile lightweight interface should not
      // create particle nodes even when the desktop FX preference is on.
      removeAmbientLayer();
      return;
    }

    if (!isAmbientEnabled()) {
      removeAmbientLayer();
      return;
    }

    document.documentElement.classList.remove("ambient-fx-disabled");
    document.body.classList.remove("ambient-fx-disabled");

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

    function shouldPauseAmbient() {
      const state = window.__madsPowerState || {};
      return document.hidden || state.hidden || state.idle || state.lowPower || document.body.classList.contains("mission-lightbox-open") || document.documentElement.classList.contains("mission-lightbox-open");
    }

    function spawnMeteorIfVisible() {
      if (!shouldPauseAmbient()) spawnMeteor();
    }

    function stopMeteorTimer() {
      if (meteorTimer) {
        window.clearInterval(meteorTimer);
        meteorTimer = null;
      }
    }

    function startMeteorTimer() {
      if (!meteorTimer && !shouldPauseAmbient()) {
        meteorTimer = window.setInterval(spawnMeteorIfVisible, meteorInterval);
      }
    }

    function syncAmbientPowerState() {
      if (shouldPauseAmbient()) {
        stopMeteorTimer();
        layer.classList.add("ambient-paused");
      } else {
        layer.classList.remove("ambient-paused");
        startMeteorTimer();
      }
    }

    // Make meteors visible after load, then spawn at a slightly calmer cadence.
    let meteorTimer = null;

    spawnMeteorIfVisible();
    setTimeout(spawnMeteorIfVisible, isMobileAmbient ? 900 : 550);
    setTimeout(spawnMeteorIfVisible, isMobileAmbient ? 1850 : 1200);
    startMeteorTimer();
    syncAmbientPowerState();

    document.addEventListener("visibilitychange", syncAmbientPowerState, { passive: true });
    window.addEventListener("mads:power-state", syncAmbientPowerState);
    window.addEventListener("pagehide", syncAmbientPowerState, { passive: true });
    window.addEventListener("pageshow", syncAmbientPowerState, { passive: true });
  }

  function bootAmbientSystem() {
    createAmbientToggle();

    if (isAmbientEnabled()) {
      initAmbientSpace();
    } else {
      removeAmbientLayer();
    }

    emitAmbientState();
  }

  function syncMobileAmbientState() {
    const button = document.querySelector(".ambient-fx-toggle");
    if (button) updateAmbientToggle(button);

    if (isMobileAmbientView()) {
      removeAmbientLayer();
    } else if (isAmbientEnabled()) {
      initAmbientSpace();
    }

    emitAmbientState();
  }

  if (mobileAmbientQuery?.addEventListener) {
    mobileAmbientQuery.addEventListener("change", syncMobileAmbientState);
  } else if (mobileAmbientQuery?.addListener) {
    mobileAmbientQuery.addListener(syncMobileAmbientState);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootAmbientSystem);
  } else {
    bootAmbientSystem();
  }
})();
