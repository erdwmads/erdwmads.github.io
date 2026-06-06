(function () {
  const root = document.documentElement;
  const storageKey = "mads-theme";

  function getSavedTheme() {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      // localStorage may be blocked; the visual toggle should still work.
    }
  }

  function applyTheme(theme) {
    const useSpace = theme === "space";

    root.toggleAttribute("data-theme-space", useSpace);
    root.setAttribute("data-theme", useSpace ? "space" : "light");
    root.classList.toggle("theme-preloaded-space", useSpace);

    if (document.body) {
      document.body.classList.toggle("space-mode", useSpace);
    }

    document.querySelectorAll(".theme-toggle").forEach((button) => {
      button.textContent = useSpace ? "Light Mode" : "Space Mode";
      button.setAttribute("aria-pressed", String(useSpace));
    });
  }

  function currentTheme() {
    return root.getAttribute("data-theme") === "space" ? "space" : "light";
  }

  function initialTheme() {
    const saved = getSavedTheme();
    if (saved === "space" || saved === "light") return saved;
    return root.getAttribute("data-theme") === "space" ? "space" : "light";
  }

  function toggleTheme() {
    const next = currentTheme() === "space" ? "light" : "space";
    applyTheme(next);
    saveTheme(next);
  }

  applyTheme(initialTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyTheme(currentTheme());
    }, { once: true });
  } else {
    applyTheme(currentTheme());
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest(".theme-toggle");
    if (!button) return;
    event.preventDefault();
    toggleTheme();
  });
})();
