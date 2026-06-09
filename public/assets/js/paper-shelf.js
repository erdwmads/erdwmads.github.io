(function () {
  const cards = Array.from(document.querySelectorAll("[data-paper-card]"));
  const search = document.querySelector("[data-paper-search]");
  const filters = Array.from(document.querySelectorAll("[data-paper-filter]"));

  if (!cards.length || !search || !filters.length) return;

  let activeFilter = "";

  function normalise(value) {
    return String(value || "").trim().toLowerCase();
  }

  function matchesAllTerms(text, query) {
    const terms = normalise(query).split(/\s+/).filter(Boolean);
    return terms.every((term) => text.includes(term));
  }

  function sync() {
    const query = normalise(search.value);
    let visibleCount = 0;

    cards.forEach((card) => {
      const text = card.dataset.paperText || "";
      const filters = normalise(card.dataset.paperFilters).split(/\s+/).filter(Boolean);
      const matchesFilter = !activeFilter || filters.includes(activeFilter);
      const visible = matchesAllTerms(text, query) && matchesFilter;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    document.documentElement.classList.toggle("paper-filter-empty", visibleCount === 0);
  }

  search.addEventListener("input", sync, { passive: true });

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.paperFilter || "";
      filters.forEach((item) => item.setAttribute("aria-pressed", item === button ? "true" : "false"));
      sync();
    });
  });

  sync();
})();
