(function () {
  if (window.__madsLegacyNavigationReady) return;
  window.__madsLegacyNavigationReady = true;

  const pageClassMap = {
    "index.html": "ui-page-home",
    "": "ui-page-home",
    "research.html": "ui-page-research",
    "origins-study.html": "ui-page-origins",
    "research-log.html": "ui-page-research-log",
    "research-graduation.html": "ui-page-research-log",
    "paper-shelf.html": "ui-page-paper-shelf",
    "cv.html": "ui-page-cv",
    "photography.html": "ui-page-photography",
    "contact.html": "ui-page-contact",
    "sample-cabinet.html": "ui-page-sample-cabinet"
  };

  const commonScripts = new Set([
    "assets/js/power-manager.js",
    "assets/js/site-header.js",
    "assets/js/theme.js",
    "assets/js/ambient-space.js",
    "assets/js/research-coordinates.js",
    "assets/js/interface-2046.js",
    "assets/js/observatory-interactions.js",
    "assets/js/mineral-interactions.js",
    "assets/js/legacy-navigation.js"
  ]);

  let softNavToken = 0;
  history.scrollRestoration="manual";
  let scrollFrame=0;
  window.addEventListener("scroll",()=>{
    if(scrollFrame||document.documentElement.classList.contains("mads-soft-nav-active"))return;
    scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;if(!document.documentElement.classList.contains("mads-soft-nav-active"))history.replaceState({...history.state,madsScrollY:scrollY},"",location.href);});
  },{passive:true});
  let contentAnimation;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function stopContentAnimation() {
    if (!contentAnimation) return;
    contentAnimation.commitStyles();
    contentAnimation.cancel();
    contentAnimation = undefined;
  }
  async function fadeContent(main, opacity, duration) {
    stopContentAnimation();
    if (reducedMotion.matches) { main.style.opacity = String(opacity); return; }
    const animation = main.animate([{ opacity: getComputedStyle(main).opacity }, { opacity }], {
      duration, easing: 'cubic-bezier(.2,0,.3,1)', fill: 'forwards'
    });
    contentAnimation = animation;
    await animation.finished.catch(() => {});
    if (contentAnimation === animation) {
      main.style.opacity = String(opacity);
      animation.cancel();
      contentAnimation = undefined;
    }
  }
  const documentKey = url => {
    const parsed = new URL(url, window.location.href);
    return parsed.pathname + parsed.search;
  };
  let renderedDocument = documentKey(window.location.href);

  function dispatchSoftNavEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function beginSoftNav(url) {
    softNavToken += 1;
    stopContentAnimation();
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
      if (linkPage === (pageName === "research-graduation.html" ? "research-log.html" : pageName)) {
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
      if (script.type === "module") {
        fresh.type = "module";
        if (src && Array.from(document.scripts).some(item => item.type === "module" && item.src === new URL(src, window.location.href).href)) return;
      }
      if (src) {
        const normalizedSrc = src.split(/[?#]/, 1)[0];
        if (commonScripts.has(normalizedSrc)) return;
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

  async function navigate(url, pushState, restoreY) {
    const token = beginSoftNav(url);
    let pageName = pageNameFromUrl(url);

    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (token !== softNavToken) return;
      if (!response.ok) {
        window.location.href = url;
        return;
      }

      const html = await response.text();
      if (token !== softNavToken) return;
      const nextDoc = new DOMParser().parseFromString(html, "text/html");
      const nextMain = nextDoc.querySelector("main");
      const currentMain = document.querySelector("main");
      if (!nextMain || !currentMain) {
        window.location.href = url;
        return;
      }

      document.title = nextDoc.title || document.title;
      for(const selector of ['link[rel="canonical"]','meta[property^="og:"]','meta[name^="twitter:"]']) {
        nextDoc.querySelectorAll(selector).forEach(next=>{const key=next.getAttribute('property')||next.getAttribute('name');const current=key?document.head.querySelector('meta['+(next.hasAttribute('property')?'property':'name')+'="'+key+'"]'):document.head.querySelector(selector);if(current)current.replaceWith(next.cloneNode(true));});
      }
      const nextDescription = nextDoc.querySelector('meta[name="description"]');
      const currentDescription = document.querySelector('meta[name="description"]');
      if (nextDescription && currentDescription) {
        currentDescription.setAttribute("content", nextDescription.getAttribute("content") || "");
      }

      await fadeContent(currentMain, 0, 140);
      if (token !== softNavToken) return;
      dispatchSoftNavEvent("mads:soft-nav-before-swap", { url, pageName });
      nextMain.style.opacity = "0";
      currentMain.replaceWith(nextMain);
      renderedDocument = documentKey(url);
      pageName = pageNameFromUrl(url);
      setCurrentNav(pageName);
      setBodyPageClass(pageName);
      if (pushState) {
        history.pushState({ madsSoftNav: true }, "", url);
      }
      runPageScripts(nextDoc);
      const hash=new URL(url).hash;
      let target;try{target=hash&&!hash.startsWith('#observe=')?document.getElementById(decodeURIComponent(hash.slice(1))):null;}catch{}
      window.scrollTo({ top: restoreY ?? 0, behavior: "instant" });
      if(pushState&&target)target.scrollIntoView({block:'start',behavior:'instant'});
      const heading=nextMain.querySelector('h1')||nextMain;heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
      dispatchSoftNavEvent("mads:soft-nav-ready", { url, pageName });
      await fadeContent(nextMain, 1, 260);
    } catch {
      if (token === softNavToken) window.location.href = url;
    } finally {
      endSoftNav(token, { url, pageName });
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest && event.target.closest(".site-header a[href], main a[href], .site-footer a[href]");
    if (!link || link.hasAttribute("data-full-nav")) return;
    if (event.defaultPrevented || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

    const target = new URL(link.getAttribute("href"), window.location.href);
    if (target.origin !== window.location.origin) return;
    if (!target.pathname.endsWith(".html") && target.pathname !== "/" && target.pathname !== window.location.pathname) return;

    if(documentKey(target.href)===renderedDocument){
      if(!target.hash){event.preventDefault();window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});}
      return;
    }
    if(!pageClassMap[pageNameFromUrl(target.href)])return;
    event.preventDefault();
    history.replaceState({...history.state,madsScrollY:scrollY},"",location.href);
    navigate(target.href, true);
  });

  window.addEventListener("popstate", (event) => {
    if (documentKey(window.location.href) === renderedDocument) {
      softNavToken += 1;
      stopContentAnimation();
      const main = document.querySelector("main");
      if (main) main.style.opacity = "1";
      if(!location.hash.startsWith("#observe="))window.scrollTo({top:event.state?.madsScrollY ?? 0,behavior:"instant"});
      document.documentElement.classList.remove("mads-soft-nav-active");
      document.body.classList.remove("mads-soft-nav-active");
      dispatchSoftNavEvent("mads:soft-nav-end", { url: location.href, pageName: pageNameFromUrl(location.href) });
      return;
    }
    navigate(window.location.href, false, event.state?.madsScrollY ?? 0);
  });
})();
