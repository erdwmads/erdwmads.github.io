(function () {
  if (window.__madsLegacyNavigationReady) return;
  window.__madsLegacyNavigationReady = true;

  const pageClassMap = {
    "index.html": "ui-page-home",
    "": "ui-page-home",
    "research.html": "ui-page-research",
    "research-log.html": "ui-page-research-log",
    "paper-shelf.html": "ui-page-paper-shelf",
    "cv.html": "ui-page-cv",
    "photography.html": "ui-page-photography",
    "contact.html": "ui-page-contact",
    "sample-cabinet.html": "ui-page-sample-cabinet"
  };

  const commonScripts = new Set([
    "assets/js/theme.js",
    "assets/js/ambient-space.js",
    "assets/js/research-coordinates.js",
    "assets/js/interface-2046.js",
    "assets/js/legacy-navigation.js"
  ]);

  let softNavToken = 0;

  function dispatchSoftNavEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function beginSoftNav(url) {
    softNavToken += 1;
    const token = softNavToken;
    const detail = { url };
    document.documentElement.classList.add("mads-soft-nav-active");
    document.body.classList.add("mads-soft-nav-active");
    dispatchSoftNavEvent("mads:soft-nav-start", detail);
    return token;
  }

  function endSoftNav(token, detail) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (token !== softNavToken) return;
        document.documentElement.classList.remove("mads-soft-nav-active");
        document.body.classList.remove("mads-soft-nav-active");
        dispatchSoftNavEvent("mads:soft-nav-end", detail);
      });
    });
  }

  function pageNameFromUrl(url) {
    const name = new URL(url, window.location.href).pathname.split("/").pop();
    return name || "index.html";
  }

  function setCurrentNav(pageName) {
    document.querySelectorAll(".nav a, .nav-log-gate").forEach((link) => {
      const linkPage = pageNameFromUrl(link.getAttribute("href") || "index.html");
      if (linkPage === pageName) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function setBodyPageClass(pageName) {
    document.body.classList.forEach((className) => {
      if (className.indexOf("ui-page-") === 0) {
        document.body.classList.remove(className);
      }
    });
    document.body.classList.add(pageClassMap[pageName] || "ui-page-" + pageName.replace(".html", ""));
  }

  function runPageScripts(nextDoc) {
    const scripts = Array.from(nextDoc.querySelectorAll("body script"));
    scripts.forEach((script) => {
      const src = script.getAttribute("src");
      const fresh = document.createElement("script");
      if (src) {
        if (commonScripts.has(src)) return;
        fresh.src = src;
        if (script.defer) fresh.defer = true;
      } else {
        const code = script.textContent || "";
        if (!code.trim()) return;
        fresh.textContent = code;
      }
      document.body.appendChild(fresh);
      if (src) {
        fresh.addEventListener("load", () => fresh.remove(), { once: true });
      } else {
        fresh.remove();
      }
    });
  }

  async function navigate(url, pushState) {
    const token = beginSoftNav(url);
    let pageName = pageNameFromUrl(url);

    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) {
        window.location.href = url;
        return;
      }

      const html = await response.text();
      const nextDoc = new DOMParser().parseFromString(html, "text/html");
      const nextMain = nextDoc.querySelector("main");
      const currentMain = document.querySelector("main");
      if (!nextMain || !currentMain) {
        window.location.href = url;
        return;
      }

      document.title = nextDoc.title || document.title;
      const nextDescription = nextDoc.querySelector('meta[name="description"]');
      const currentDescription = document.querySelector('meta[name="description"]');
      if (nextDescription && currentDescription) {
        currentDescription.setAttribute("content", nextDescription.getAttribute("content") || "");
      }

      currentMain.replaceWith(nextMain);
      pageName = pageNameFromUrl(url);
      setCurrentNav(pageName);
      setBodyPageClass(pageName);
      runPageScripts(nextDoc);

      if (pushState) {
        history.pushState({ madsSoftNav: true }, "", url);
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      dispatchSoftNavEvent("mads:soft-nav-ready", { url, pageName });
    } finally {
      endSoftNav(token, { url, pageName });
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest(".site-header a[href]");
    if (!link) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

    const target = new URL(link.getAttribute("href"), window.location.href);
    if (target.origin !== window.location.origin) return;
    if (!target.pathname.endsWith(".html") && target.pathname !== "/" && target.pathname !== window.location.pathname) return;

    event.preventDefault();
    navigate(target.href, true).catch(() => {
      window.location.href = target.href;
    });
  });

  window.addEventListener("popstate", () => {
    navigate(window.location.href, false).catch(() => window.location.reload());
  });
})();
