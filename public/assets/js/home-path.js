// Home's path below the opening (owner, 2026-11-28: the Home opening, direction A). A page script (data-page-script,
// getPageScripts("home") in src/data/site.ts), so soft navigation runs it again whenever it opens Home.
// 1. Set-ins: each block of the path (who, Current Focus, Explore, the timeline) sets in once as its top reaches the
//    window: its parts go from 35 % and 18 px low to rest in one composed move (760 ms, 70 ms apart, at most 8 steps),
//    and the caption number's hairline draws. Content is never hidden before this runs (the parts never start from 0),
//    a block already in view when the page opens is left alone, and nothing runs under reduced motion or low power.
// 2. Where scroll-driven animations do not run (reduced motion, or no support), the header's band, its orbit trace,
//    the running head and the reading beam still wait while the name is in the lower two thirds of the window: one
//    observer flips html[data-home-opening] ("in" or "out", an instant change; pages/home-opening.css and the owners
//    of those effects read it), so the band is back before the name could pass under the header.
// 3. While the opening's sky covers the whole window (fixed over it, opaque, with no feathering mask), the FX field and
//    the orrery under it pause: an observer reports it to power-manager.js (mads:cover), which pauses them as when the
//    page is idle, and they resume as soon as any of the window shows past the sky. Nothing on the sky pauses.
(() => {
  const root = document.documentElement;
  const state = window.madsHomePath || (window.madsHomePath = {});
  const cover = (covered) => {
    if (state.covered === covered) return;
    state.covered = covered;
    dispatchEvent(new CustomEvent("mads:cover", { detail: { covered } }));
  };
  const stop = () => {
    state.setIns?.disconnect();
    state.edge?.disconnect();
    state.cover?.disconnect();
    state.recheckCover = undefined;
    cover(false);
    delete root.dataset.homeOpening;
  };
  stop();
  if (!state.bound) {
    state.bound = true;
    addEventListener("mads:soft-nav-before-swap", stop);
    // After a soft navigation main has faded in: the sky may cover the window now.
    addEventListener("mads:soft-nav-end", () => state.recheckCover?.());
    // The backdrop cross-fade (legacy-navigation.js) has brought the sky up to full strength.
    addEventListener("mads:backdrop-fade-end", () => state.recheckCover?.());
  }
  if (!document.body.classList.contains("ui-page-home") || !("IntersectionObserver" in window)) return;

  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const quiet = () => reduced() || root.classList.contains("mads-power-low");
  const ease = "cubic-bezier(.2, .7, .2, 1)";
  const blocks = new Map([
    [".home-title", ".home-title .kicker, .home-title .masthead__meta, .home-lead, .home-interests, .home-keywords, .home-actions, .identity-links, .home-portrait, .home-affiliation"],
    [".current-focus-section", ".current-focus-section > :not(dl), .focus-list > div"],
    [".home-explore", ".home-explore > :not(ol), .home-explore-list > li"],
    [".home-timeline", ".home-timeline > :not(ul), .home-timeline-list > li"]
  ]);
  const partsOf = new Map();

  const sky = document.querySelector(".home-opening__sky");
  if (sky) {
    let last = null;
    const opaque = (element) => { const style = getComputedStyle(element); return style.opacity === "1" && style.visibility === "visible"; };
    state.recheckCover = () => {
      const area = last?.rootBounds, seen = last?.intersectionRect;
      const style = getComputedStyle(sky);
      cover(!!(last?.isIntersecting && area && seen.left <= area.left + 1 && seen.top <= area.top + 1 && seen.right >= area.right - 1 &&
        seen.bottom >= area.bottom - 1 && opaque(sky) && (style.maskImage || style.webkitMaskImage || "none") === "none" &&
        sky.closest("main") && opaque(sky.closest("main"))));
    };
    // Fine steps near a full window, so the pause ends within a pixel or two of the sky starting to lift.
    state.cover = new IntersectionObserver((entries) => {
      last = entries[entries.length - 1];
      state.recheckCover?.();
    }, { threshold: [0, ...Array.from({ length: 51 }, (_, index) => Math.min(1, .9 + index / 500))] });
    state.cover.observe(sky);
  }

  function setIn(block) {
    [...block.querySelectorAll(partsOf.get(block))].forEach((part, index) => {
      part.animate([{ opacity: .35, translate: "0 18px" }, { opacity: 1, translate: "0 0" }], { duration: 760, delay: Math.min(index, 7) * 70, easing: ease, fill: "backwards" });
      const number = part.matches(".kicker") && part.querySelector(".folio-section__number");
      if (number) number.animate([{ scale: "0 1" }, { scale: "1 1" }], { pseudoElement: "::after", duration: 900, delay: 160, easing: "cubic-bezier(.6, 0, .2, 1)", fill: "backwards" });
    });
  }

  if (!quiet()) {
    const seen = new WeakSet();
    state.setIns = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const first = !seen.has(entry.target);
        seen.add(entry.target);
        if (!entry.isIntersecting) continue;
        state.setIns.unobserve(entry.target);
        // Already in view when first observed (a reload part-way down, a tall window): leave it as it is.
        if (first && entry.boundingClientRect.top < innerHeight * .9) continue;
        if (!quiet()) setIn(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    for (const [selector, parts] of blocks) {
      const block = document.querySelector(selector);
      if (!block) continue;
      partsOf.set(block, parts);
      state.setIns.observe(block);
    }
  }

  const name = document.querySelector("#home-name");
  const driven = CSS.supports("animation-timeline: scroll()") && !reduced();
  if (!name || driven) return;
  state.edge = new IntersectionObserver(([entry]) => {
    root.dataset.homeOpening = entry.isIntersecting ? "in" : "out";
  }, { rootMargin: "-35% 0px 0px 0px" });
  state.edge.observe(name);
})();
