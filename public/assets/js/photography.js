
(function () {
  const PHOTO_AUTOPLAY_MEDIA = window.matchMedia('(min-width: 761px)');
  const REDUCED_MOTION_MEDIA = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shell = document.querySelector(".slideshow-shell");
  if (!shell) return;

  const slides = Array.from(shell.querySelectorAll(".photo-slide"));
  const thumbs = Array.from(shell.querySelectorAll(".film-thumb"));
  const prev = shell.querySelector(".slide-control.prev");
  const next = shell.querySelector(".slide-control.next");
  const number = shell.querySelector(".slide-number");
  const total = shell.querySelector(".slide-total");

  if (!slides.length) return;

  let current = 0;
  let timer = null;
  const interval = 4200;

  function pad(num) {
    return String(num).padStart(2, "0");
  }

  function hydrate(index) {
    const normalized = (index + slides.length) % slides.length;
    const slide = slides[normalized];
    const fullSrc = slide?.dataset.fullSrc;
    if (!slide || !fullSrc || slide.dataset.fullHydrated === "true") return;
    slide.src = fullSrc;
    slide.dataset.fullHydrated = "true";
  }

  function show(index) {
    current = (index + slides.length) % slides.length;
    hydrate(current);
    hydrate(current - 1);
    hydrate(current + 1);

    const stage = shell.querySelector(".slideshow-stage");
    const currentSrc = slides[current]?.getAttribute("src");
    if (stage && currentSrc) {
      stage.style.setProperty("--current-photo", `url("${currentSrc}")`);
    }

    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === current);
    });

    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle("is-active", i === current);
    });

    if (number) number.textContent = pad(current + 1);
    if (total) total.textContent = pad(slides.length);
  }

  function start() {
    stop();
    if (window.innerWidth <= 760 || !PHOTO_AUTOPLAY_MEDIA.matches || REDUCED_MOTION_MEDIA.matches) return;
    timer = window.setInterval(() => show(current + 1), interval);
  }

  function stop() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  prev?.addEventListener("click", () => {
    show(current - 1);
    start();
  });

  next?.addEventListener("click", () => {
    show(current + 1);
    start();
  });

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener("click", () => {
      show(i);
      start();
    });
  });

  shell.addEventListener("mouseenter", stop);
  shell.addEventListener("mouseleave", start);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 760 || REDUCED_MOTION_MEDIA.matches) stop();
    else if (shell.dataset.autoplay === "true") start();
  });

  show(0);
  if (shell.dataset.autoplay === "true") window.requestAnimationFrame(start);
})();
