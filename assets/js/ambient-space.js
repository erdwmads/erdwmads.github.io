
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  function initAmbientSpace() {
    if (document.querySelector(".ambient-space-layer")) return;

    const layer = document.createElement("div");
    layer.className = "ambient-space-layer";
    document.body.appendChild(layer);

    function makeDust() {
      const el = document.createElement("span");
      el.className = "ambient-dust";

      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const dx = (Math.random() - 0.5) * 120;
      const dy = -40 - Math.random() * 90;
      const dur = 18 + Math.random() * 20;
      const delay = -Math.random() * dur;
      const size = 2 + Math.random() * 2.5;

      el.style.left = left + "%";
      el.style.top = top + "%";
      el.style.width = size + "px";
      el.style.height = size + "px";
      el.style.setProperty("--dust-x", dx + "px");
      el.style.setProperty("--dust-y", dy + "px");
      el.style.animationDuration = dur + "s";
      el.style.animationDelay = delay + "s";
      layer.appendChild(el);
    }

    function makePebble() {
      const el = document.createElement("span");
      el.className = "ambient-pebble";

      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const dx = (Math.random() - 0.5) * 150;
      const dy = (Math.random() - 0.5) * 120;
      const dur = 34 + Math.random() * 28;
      const delay = -Math.random() * dur;
      const size = 5 + Math.random() * 8;

      el.style.left = left + "%";
      el.style.top = top + "%";
      el.style.width = size + "px";
      el.style.height = (size * (0.75 + Math.random() * 0.45)) + "px";
      el.style.setProperty("--pebble-x", dx + "px");
      el.style.setProperty("--pebble-y", dy + "px");
      el.style.animationDuration = dur + "s";
      el.style.animationDelay = delay + "s";
      layer.appendChild(el);
    }

    function makeMeteor() {
      const el = document.createElement("span");
      el.className = "ambient-meteor";

      const fromTop = Math.random() < 0.55;
      const len = 70 + Math.random() * 90;
      const dur = 6 + Math.random() * 4;

      let startX, startY, dx, dy;

      // Meteors move in the same direction as the visible head/trail logic:
      // from upper-left toward lower-right, entering from outside the screen.
      if (fromTop) {
        startX = -18 + Math.random() * 118;   // spread across the whole width
        startY = -12 - Math.random() * 14;    // above the screen
      } else {
        startX = -20 - Math.random() * 16;    // left of the screen
        startY = -8 + Math.random() * 78;     // spread across the whole height
      }

      dx = 260 + Math.random() * 420;
      dy = 170 + Math.random() * 280;

      el.style.left = startX + "vw";
      el.style.top = startY + "vh";
      el.style.width = len + "px";
      el.style.setProperty("--meteor-x", dx + "px");
      el.style.setProperty("--meteor-y", dy + "px");
      el.style.animationDuration = dur + "s";

      // Use positive delays so meteors don't pop into existence near an edge on first paint.
      el.style.animationDelay = (Math.random() * 9).toFixed(2) + "s";

      layer.appendChild(el);
    }

    for (let i = 0; i < 90; i++) makeDust();
    for (let i = 0; i < 18; i++) makePebble();
    for (let i = 0; i < 8; i++) makeMeteor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAmbientSpace);
  } else {
    initAmbientSpace();
  }
})();
