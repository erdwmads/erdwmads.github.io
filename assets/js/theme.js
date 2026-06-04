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

  function toggleTheme() {
    const next = currentTheme() === "space" ? "light" : "space";
    applyTheme(next);
    saveTheme(next);
  }

  // Apply saved theme immediately.
  applyTheme(getSavedTheme() === "space" ? "space" : "light");

  // Robust event delegation for all pages.
  document.addEventListener("click", function (event) {
    const button = event.target.closest(".theme-toggle");
    if (!button) return;
    event.preventDefault();
    toggleTheme();
  });

  // Re-apply labels after DOM is fully available.
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(currentTheme());
  });
})();
