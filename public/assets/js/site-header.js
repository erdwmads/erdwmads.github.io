(function () {
  window.__madsSiteHeaderAbort?.abort();
  const controller = new AbortController();
  const signal = controller.signal;
  window.__madsSiteHeaderAbort = controller;

  const toggle = document.querySelector("[data-nav-toggle]");
  const navigation = document.querySelector("[data-mobile-nav]");
  if (!toggle || !navigation) return;

  function close() {
    document.documentElement.classList.remove("mobile-nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation");
  }

  toggle.addEventListener("click", () => {
    const open = !document.documentElement.classList.contains("mobile-nav-open");
    document.documentElement.classList.toggle("mobile-nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  }, { signal });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) close();
  }, { signal });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      toggle.focus();
    }
  }, { signal });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) close();
  }, { signal });
  window.addEventListener("pageshow", close, { signal });
  document.addEventListener("mads:soft-nav-ready", close, { signal });
  close();
})();
