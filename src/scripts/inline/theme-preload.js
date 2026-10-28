// Inline in <head> before the stylesheets (LegacyShell.astro), so the saved theme applies before first paint.
(function () {
  try {
    var savedTheme = localStorage.getItem("mads-theme");
    if (savedTheme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.removeAttribute("data-theme-space");
      document.documentElement.classList.remove("theme-preloaded-space");
      document.documentElement.style.backgroundColor = "#edf3f7";
    } else {
      document.documentElement.setAttribute("data-theme", "space");
      document.documentElement.setAttribute("data-theme-space", "");
      document.documentElement.classList.add("theme-preloaded-space");
      document.documentElement.style.backgroundColor = "#040910";
    }
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "space");
    document.documentElement.setAttribute("data-theme-space", "");
    document.documentElement.classList.add("theme-preloaded-space");
    document.documentElement.style.backgroundColor = "#040910";
  }
})();
