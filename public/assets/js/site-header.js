(function () {
  const COLLAPSIBLE_NAVIGATION_MEDIA = "(max-width: 760px)";
  window.__madsSiteHeaderAbort?.abort();
  const controller = new AbortController();
  const signal = controller.signal;
  window.__madsSiteHeaderAbort = controller;

  const toggle = document.querySelector("[data-nav-toggle]");
  const navigation = document.querySelector("[data-mobile-nav]");
  if (!toggle || !navigation) return;
  const collapsibleNavigationMedia = window.matchMedia(COLLAPSIBLE_NAVIGATION_MEDIA);

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
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      close();
      toggle.focus();
    }
  }, { signal });

  function syncNavigationMode() {
    if (!collapsibleNavigationMedia.matches) close();
  }

  window.addEventListener("resize", syncNavigationMode, { signal });
  collapsibleNavigationMedia.addEventListener("change", syncNavigationMode, { signal });
  window.addEventListener("pageshow", close, { signal });
  window.addEventListener("mads:soft-nav-ready", close, { signal });
  close();
})();
