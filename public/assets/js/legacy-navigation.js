(function () {
  if (window.__madsLegacyNavigationReady) return;
  window.__madsLegacyNavigationReady = true;

  // Pages opened in place. Their body ui-page-* classes and header state come from the fetched page.
  const softNavPages = new Set([
    "index.html",
    "research.html",
    "ryugu-bennu.html",
    "origins-study.html",
    "research-log.html",
    "research-graduation.html",
    "paper-shelf.html",
    "cv.html",
    "photography.html",
    "contact.html"
  ]);

  let softNavToken = 0;
  history.scrollRestoration="manual";
  // Save the scroll position once scrolling settles (not every frame: Safari throttles history.replaceState).
  let scrollTimer=0;
  const saveScroll=()=>{clearTimeout(scrollTimer);scrollTimer=0;if(!document.documentElement.classList.contains("mads-soft-nav-active"))history.replaceState({...history.state,madsScrollY:scrollY},"",location.href);};
  window.addEventListener("scroll",()=>{
    if(document.documentElement.classList.contains("mads-soft-nav-active"))return;
    clearTimeout(scrollTimer);scrollTimer=setTimeout(saveScroll,150);
  },{passive:true});
  window.addEventListener("pagehide",()=>{if(scrollTimer)saveScroll();});
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
  // Backdrop cross-fade (owner, 2026-11-28): every page has its own picture (body::before, components/backdrop.css) and
  // Home its opening plate. On a soft navigation the old picture moves onto one layer of its own (.backdrop-fade),
  // which dissolves while the new page's picture develops; the sheet and the text swap as before. Only opacity
  // changes, nothing moves, and nothing waits for it. Reduced motion, FX off, low power, more contrast and forced
  // colours swap at once.
  const FADE_MS = 760, FADE_EASE = 'cubic-bezier(.4,0,.2,1)';
  const root = document.documentElement;
  let fade = null;
  const instantBackdrop = () => reducedMotion.matches || root.classList.contains('ambient-fx-disabled') ||
    root.classList.contains('mads-power-low') || !root.classList.contains('backdrop-ready') ||
    matchMedia('(prefers-contrast: more), (forced-colors: active)').matches || typeof Element.prototype.animate !== 'function';
  function endFade() {
    if (!fade) return;
    const ended = fade;
    fade = null;
    // One frame with the page's picture at rest and no transition, so it does not ease back in on its own.
    root.dataset.backdropFade = 'run';
    ended.animations.forEach(animation => animation.cancel());
    ended.layer.remove();
    requestAnimationFrame(() => { if (!fade) delete root.dataset.backdropFade; });
    dispatchSoftNavEvent('mads:backdrop-fade-end', {});
  }
  // The old picture: Home's opening plate while any of it shows, else the page's backdrop.
  function captureBackdrop(main) {
    endFade();
    if (instantBackdrop()) return;
    const layer = document.createElement('div');
    layer.className = 'backdrop-fade';
    layer.setAttribute('aria-hidden', 'true');
    const style = layer.style;
    const sky = main.querySelector('.home-opening__sky');
    const box = sky && sky.getBoundingClientRect();
    const skyStyle = sky && getComputedStyle(sky);
    let from;
    if (sky && skyStyle.display !== 'none' && box.bottom > 0 && box.top < innerHeight && parseFloat(skyStyle.opacity) > 0) {
      const print = getComputedStyle(sky, '::before');
      const layers = print.backgroundImage !== 'none' && parseFloat(print.opacity) >= .5 ? [print, skyStyle] : [skyStyle];
      layer.classList.add('backdrop-fade--plate');
      for (const property of ['backgroundImage', 'backgroundPosition', 'backgroundSize', 'backgroundRepeat']) style[property] = layers.map(item => item[property]).join(', ');
      style.backgroundColor = skyStyle.backgroundColor;
      style.maskImage = skyStyle.maskImage;
      if (skyStyle.position === 'fixed') {
        style.translate = skyStyle.translate;
        style.scale = skyStyle.scale;
        style.transformOrigin = skyStyle.transformOrigin;
      } else {
        style.inset = `${box.top}px auto auto ${box.left}px`;
        style.width = `${box.width}px`;
        style.height = `${box.height}px`;
      }
      from = parseFloat(skyStyle.opacity);
      main.before(layer);
    } else {
      const picture = getComputedStyle(document.body, '::before');
      if (picture.display === 'none' || picture.visibility !== 'visible' || picture.maskImage === 'none') return;
      style.maskImage = picture.maskImage;
      style.maskPosition = picture.maskPosition;
      from = parseFloat(picture.opacity);
      document.body.prepend(layer);
    }
    style.opacity = String(from);
    root.dataset.backdropFade = 'hold';
    fade = { layer, animations: [] };
  }
  // After the swap: the new page's picture (and Home's plate) develops from nothing while the old layer dissolves. All
  // three start paused at their first frame and run once the new picture has decoded (at most 400 ms later).
  async function developBackdrop(main) {
    const current = fade;
    if (!current) return;
    root.dataset.backdropFade = 'run';
    const timing = { duration: FADE_MS, easing: FADE_EASE };
    const sky = main.querySelector('.home-opening__sky');
    try {
      current.animations.push(document.body.animate([{ opacity: 0, offset: 0 }], { ...timing, pseudoElement: '::before' }));
      if (sky) current.animations.push(sky.animate([{ opacity: 0, offset: 0 }], timing));
    } catch {}
    const out = current.layer.animate([{ opacity: 0 }], { ...timing, fill: 'forwards' });
    current.animations.push(out);
    current.animations.forEach(animation => animation.pause());
    const url = (getComputedStyle(document.body, '::before').maskImage.match(/url\("?([^")]+)"?\)/) || [])[1];
    if (url) {
      const image = new Image();
      image.src = url;
      await Promise.race([image.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 400))]);
    }
    if (fade !== current) return;
    current.animations.forEach(animation => animation.play());
    await out.finished.catch(() => {});
    if (fade === current) endFade();
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
    document.querySelector('main')?.setAttribute('aria-busy', 'true');
    dispatchSoftNavEvent("mads:soft-nav-start", detail);
    return token;
  }

  function endSoftNav(token, detail) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (token !== softNavToken) return;
        document.documentElement.classList.remove("mads-soft-nav-active");
        document.body.classList.remove("mads-soft-nav-active");
        document.querySelector('main')?.removeAttribute('aria-busy');
        history.replaceState({...history.state,madsScrollY:scrollY}, '', location.href);
        dispatchSoftNavEvent("mads:soft-nav-end", detail);
      });
    });
  }

  function restorePosition(url, savedY) {
    const hash = new URL(url, location.href).hash;
    if (savedY !== undefined) { window.scrollTo({top:savedY,behavior:'instant'}); return; }
    let target;
    try { target = hash.startsWith('#mission-view=') ? document.getElementById('missions-title') : hash && !hash.startsWith('#observe=') ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch {}
    if (target) target.scrollIntoView({block:'start',behavior:'instant'});
    else if (!hash.startsWith('#observe=')) window.scrollTo({top:0,behavior:'instant'});
  }

  function cancelPendingNavigation() {
    softNavToken += 1;
    stopContentAnimation();
    endFade();
    const main = document.querySelector('main');
    if (main) { main.style.opacity = '1'; main.removeAttribute('aria-busy'); }
    document.documentElement.classList.remove('mads-soft-nav-active');
    document.body.classList.remove('mads-soft-nav-active');
    dispatchSoftNavEvent('mads:soft-nav-end', {url:location.href,pageName:pageNameFromUrl(location.href)});
  }

  function pageNameFromUrl(url) {
    const name = new URL(url, window.location.href).pathname.split("/").pop();
    return name || "index.html";
  }

  function setCurrentNav(nextDoc) {
    const nextLinks = Array.from(nextDoc.querySelectorAll(".nav a, .nav-log-gate"));
    document.querySelectorAll(".nav a, .nav-log-gate").forEach((link) => {
      const next = nextLinks.find((item) => item.getAttribute("href") === link.getAttribute("href"));
      const current = next && next.getAttribute("aria-current");
      if (current) {
        link.setAttribute("aria-current", current);
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function setBodyPageClass(nextDoc) {
    const isPageClass = (className) => className.indexOf("ui-page-") === 0;
    const nextClasses = Array.from(nextDoc.body.classList).filter(isPageClass);
    Array.from(document.body.classList).filter(isPageClass).forEach((className) => {
      if (!nextClasses.includes(className)) document.body.classList.remove(className);
    });
    document.body.classList.add(...nextClasses);
  }

  // Lifecycle contract: the shell (header, entrance dialog, shared scripts, theme preload) stays in place and
  // runs once per document. Only scripts the fetched page marks data-page-script (src/data/site.ts) run again,
  // so the header controller and the entrance opener can never re-run over another page. A bundled module
  // (Astro cannot mark it) loads only if this document does not have it yet, and then listens for the
  // mads:soft-nav-* events itself. The list is taken before the swap, because swapping moves the fetched <main>
  // (and a marked script inside it, such as research.html's forwarder) out of nextDoc.
  function pageScripts(nextDoc) {
    return Array.from(nextDoc.querySelectorAll('body script[data-page-script], body script[type="module"][src]'));
  }
  function runPageScripts(scripts) {
    scripts.forEach((script) => {
      const src = script.getAttribute("src");
      const fresh = document.createElement("script");
      if (script.type === "module") {
        fresh.type = "module";
        if (src && Array.from(document.scripts).some(item => item.type === "module" && item.src === new URL(src, window.location.href).href)) return;
      }
      if (src) {
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

  // The shell module and stylesheets in a page's <head>, as absolute URLs. Every page shares them and their names
  // carry content hashes, so a fetched page that names one this document lacks comes from a deploy made after this
  // tab loaded: the lazy chunks this document's shell would import are gone from the server.
  function shellAssets(doc, base) {
    return Array.from(doc.head ? doc.head.querySelectorAll('script[type="module"][src], link[rel~="stylesheet"][href]') : [])
      .map(element => new URL(element.getAttribute(element.tagName === "LINK" ? "href" : "src"), base).href);
  }
  function fromNewerDeploy(nextDoc, url) {
    const loaded = new Set(shellAssets(document, document.baseURI));
    return shellAssets(nextDoc, url).some(href => !loaded.has(href));
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
      // After a deploy, load the page in full instead of swapping <main> into a shell that is out of date. A Back or
      // Forward step has already moved to url, so that case reloads.
      if (fromNewerDeploy(nextDoc, url)) {
        if (pushState) window.location.href = url;
        else window.location.reload();
        return;
      }

      captureBackdrop(currentMain);
      await fadeContent(currentMain, 0, 140);
      if (token !== softNavToken) return;
      document.title = nextDoc.title || document.title;
      for(const selector of ['link[rel="canonical"]','meta[property^="og:"]','meta[name^="twitter:"]']) {
        nextDoc.querySelectorAll(selector).forEach(next=>{const key=next.getAttribute('property')||next.getAttribute('name');const current=key?document.head.querySelector('meta['+(next.hasAttribute('property')?'property':'name')+'="'+key+'"]'):document.head.querySelector(selector);if(current)current.replaceWith(next.cloneNode(true));});
      }
      const nextDescription = nextDoc.querySelector('meta[name="description"]');
      const currentDescription = document.querySelector('meta[name="description"]');
      if (nextDescription && currentDescription) {
        currentDescription.setAttribute("content", nextDescription.getAttribute("content") || "");
      }

      dispatchSoftNavEvent("mads:soft-nav-before-swap", { url, pageName });
      const scripts = pageScripts(nextDoc);
      nextMain.style.opacity = "0";
      currentMain.replaceWith(nextMain);
      // The footer credits the pictures of its own page (SiteFooter.astro): swap the line with main.
      const nextCredits = nextDoc.querySelector("[data-footer-credits]");
      const currentCredits = document.querySelector("[data-footer-credits]");
      if (nextCredits && currentCredits) currentCredits.replaceWith(nextCredits);
      renderedDocument = documentKey(url);
      pageName = pageNameFromUrl(url);
      setCurrentNav(nextDoc);
      setBodyPageClass(nextDoc);
      developBackdrop(nextMain);
      if (pushState) {
        history.pushState({ madsSoftNav: true }, "", url);
      }
      runPageScripts(scripts);
      dispatchSoftNavEvent("mads:soft-nav-content", { url, pageName });
      restorePosition(url, restoreY);
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
      cancelPendingNavigation();
      if(!target.hash){
        event.preventDefault();
        if(location.hash) history.pushState({madsSoftNav:true,madsScrollY:0},'',target.href);
        window.scrollTo({top:0,behavior:reducedMotion.matches?'instant':'smooth'});
        const heading=document.querySelector('main h1');
        heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});
      }
      return;
    }
    if(!softNavPages.has(pageNameFromUrl(target.href)))return;
    event.preventDefault();
    history.replaceState({...history.state,madsScrollY:scrollY},"",location.href);
    navigate(target.href, true);
  });

  window.addEventListener("popstate", (event) => {
    if (documentKey(window.location.href) === renderedDocument) {
      cancelPendingNavigation();
      restorePosition(location.href,event.state?.madsScrollY);
      return;
    }
    navigate(window.location.href, false, event.state?.madsScrollY);
  });
})();
