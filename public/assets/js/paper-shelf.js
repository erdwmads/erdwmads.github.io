(function () {
  window.__madsPaperShelfCleanup?.();
  const cards = Array.from(document.querySelectorAll("[data-paper-card]"));
  const search = document.querySelector("[data-paper-search]");
  const filters = Array.from(document.querySelectorAll("[data-paper-filter]"));

  if (!cards.length || !search || !filters.length) return;

  let activeFilter = "";
  let active = true;

  function normalise(value) {
    return String(value || "").normalize("NFKC").trim().toLowerCase()
      .replace(/ß/g, "ss").replace(/[\u2010-\u2015\u2212]/g, "-");
  }

  function matchesAllTerms(text, query) {
    const terms = normalise(query).split(/\s+/).filter(Boolean);
    return terms.every((term) => normalise(text).includes(term));
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

    filters.forEach((button) => button.setAttribute("aria-pressed", String((button.dataset.paperFilter || "") === activeFilter)));
    document.querySelector("[data-paper-count]").textContent = `${visibleCount} of ${cards.length} papers`;
    document.querySelector("[data-paper-empty]").hidden = visibleCount !== 0;
    document.querySelector("[data-paper-reset]").hidden = !query && !activeFilter;
  }

  function persist() {
    const url = new URL(location.href);
    if (search.value.trim()) url.searchParams.set("q", search.value);
    else url.searchParams.delete("q");
    if (activeFilter) url.searchParams.set("filter", activeFilter);
    else url.searchParams.delete("filter");
    history.replaceState({ ...history.state }, "", url.href);
    sync();
  }

  function restore() {
    const params = new URL(location.href).searchParams;
    search.value = params.get("q") || "";
    const requestedFilter = params.get("filter") || "";
    activeFilter = filters.some((button) => button.dataset.paperFilter === requestedFilter) ? requestedFilter : "";
    sync();
  }

  document.querySelector("[data-paper-reset]").addEventListener("click", () => {
    search.value = "";
    activeFilter = "";
    persist();
    search.focus();
  });
  search.addEventListener("input", persist, { passive: true });

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.paperFilter || "";
      persist();
    });
  });

  cards.forEach((card) => {
    const button = card.querySelector("[data-paper-copy]");
    if (!button) return;
    const status = card.querySelector("[data-paper-copy-status]");
    const fallback = card.querySelector("[data-paper-copy-fallback]");
    const textarea = card.querySelector("[data-paper-reference-text]");
    button.addEventListener("click", async () => {
      const reference = button.dataset.paperReference;
      status.textContent = "Copying reference…";
      button.disabled = true;
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
        await navigator.clipboard.writeText(reference);
        if (!active) return;
        fallback.hidden = true;
        status.textContent = "Reference copied.";
      } catch {
        if (!active) return;
        fallback.hidden = false;
        textarea.value = reference;
        status.textContent = "Clipboard unavailable. Copy the selected reference manually.";
        textarea.focus();
        textarea.select();
      } finally {
        button.disabled = false;
      }
    });
  });

  function cleanup() {
    active = false;
    window.removeEventListener("popstate", restore);
    window.removeEventListener("mads:soft-nav-before-swap", cleanup);
    if (window.__madsPaperShelfCleanup === cleanup) delete window.__madsPaperShelfCleanup;
  }
  window.__madsPaperShelfCleanup = cleanup;
  window.addEventListener("popstate", restore);
  window.addEventListener("mads:soft-nav-before-swap", cleanup);
  restore();
})();
