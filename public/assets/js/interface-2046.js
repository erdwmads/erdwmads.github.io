
(() => {
  const root = document.documentElement;
  const body = document.body;
  const ua = navigator.userAgent || "";
  const isEdge = /\bEdgA?\/|\bEdgiOS\/|\bEdg\//.test(ua);
  const MOBILE_INTERFACE_MEDIA = "(max-width: 760px)";
  const mobileInterfaceQuery = window.matchMedia ? window.matchMedia(MOBILE_INTERFACE_MEDIA) : null;

  if (body.dataset.interface2046 === 'ready') return;
  body.dataset.interface2046 = 'ready';

  if (isEdge) {
    root.classList.add("is-edge-browser");
  }

  const isMobileInterfaceView = () => !!mobileInterfaceQuery?.matches;
  let restoreInterfaceLayers = () => {};

  function removeInterfaceLayers() {
    document
      .querySelectorAll(".ui2046-layer, .ui2046-progress, .entry-gate")
      .forEach((node) => node.remove());
    body.classList.remove("entry-gate-active");
  }

  function syncMobileLiteState() {
    const mobileLite = isMobileInterfaceView();
    root.classList.toggle("mads-mobile-lite", mobileLite);
    body.classList.toggle("mads-mobile-lite", mobileLite);
    if (mobileLite) removeInterfaceLayers();
    else restoreInterfaceLayers();
  }

  syncMobileLiteState();
  if (mobileInterfaceQuery?.addEventListener) {
    mobileInterfaceQuery.addEventListener("change", syncMobileLiteState);
  } else if (mobileInterfaceQuery?.addListener) {
    mobileInterfaceQuery.addListener(syncMobileLiteState);
  }

  function beginEdgeTeardown() {
    if (!isEdge) return;
    root.classList.add("is-edge-page-exiting");
    body.classList.add("is-edge-page-exiting");
    document
      .querySelectorAll(".entry-gate, .ui2046-layer, .ui2046-progress")
      .forEach((node) => node.classList.add("is-edge-teardown"));
  }

  function restoreEdgeTeardown() {
    if (!isEdge) return;
    root.classList.remove("is-edge-page-exiting");
    body.classList.remove("is-edge-page-exiting");
    document
      .querySelectorAll(".is-edge-teardown")
      .forEach((node) => node.classList.remove("is-edge-teardown"));
  }

  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) beginEdgeTeardown();
  }, { passive: true });

  window.addEventListener("pageshow", restoreEdgeTeardown, { passive: true });

  // Body ui-page-* classes come from the server-rendered page (LegacyShell.astro) only.
  const shortRouteMap = {
    'index': 'Home',
    'research': 'Research',
    'research-log': 'Research Log',
    'paper-shelf': 'Paper Shelf',
    'cv': 'CV',
    'photography': 'Photography',
    'contact': 'Contact'
  };

  const pageKeyFromName = (name) => {
    const clean = String(name || 'index.html').split('/').pop() || 'index.html';
    return clean.replace('.html', '') || 'index';
  };

  const pageKeyFromLocation = () => pageKeyFromName(window.location.pathname.split('/').pop() || 'index.html');

  const shortenRoute = (value) => {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 'Mission File';
    if (clean.length <= 34) return clean;
    return clean.slice(0, 31).trim() + '…';
  };

  const routeForPage = (key) => {
    if (shortRouteMap[key]) return shortRouteMap[key];
    const pageTitle = (document.title || 'I. Mads Lieu').split('|')[0].trim() || 'Mission File';
    const h1 = document.querySelector('main h1, .hero h1, .page-title');
    return shortenRoute(h1?.textContent || pageTitle);
  };

  const route = routeForPage(pageKeyFromLocation());

  const orbitData = [
    { name: 'Mercury', label: 'Mercury', years: 0.241, w: 18, h: 11, angle: 26,  size: 2.0, color: 'rgba(180,190,196,.72)', cls: 'inner', alpha: .10, labelMode: 'minor' },
    { name: 'Venus',   label: 'Venus',   years: 0.615, w: 25, h: 16, angle: 142, size: 2.6, color: 'rgba(230,202,154,.68)', cls: 'inner', alpha: .11, labelMode: 'minor' },
    { name: 'Earth',   label: 'Earth',   years: 1.000, w: 33, h: 22, angle: 315, size: 3.2, color: 'rgba(143,208,255,.82)', cls: 'earth', alpha: .17, labelMode: 'major' },
    { name: 'Mars',    label: 'Mars',    years: 1.881, w: 42, h: 29, angle: 214, size: 2.7, color: 'rgba(225,145,110,.70)', cls: 'inner', alpha: .12, labelMode: 'minor' },
    { name: 'Jupiter', label: 'Jupiter', years: 11.86, w: 56, h: 39, angle: 12,  size: 5.0, color: 'rgba(232,202,166,.66)', cls: 'giant', alpha: .13, labelMode: 'major' },
    { name: 'Saturn',  label: 'Saturn',  years: 29.45, w: 68, h: 49, angle: 168, size: 4.4, color: 'rgba(220,205,158,.58)', cls: 'giant saturn', alpha: .12, labelMode: 'minor' },
    { name: 'Uranus',  label: 'Uranus',  years: 84.02, w: 79, h: 59, angle: 52,  size: 3.7, color: 'rgba(154,220,222,.56)', cls: 'giant', alpha: .105, labelMode: 'minor' },
    { name: 'Neptune', label: 'Neptune', years: 164.8, w: 89, h: 68, angle: 236, size: 3.7, color: 'rgba(126,164,235,.58)', cls: 'giant', alpha: .105, labelMode: 'major' },
    { name: 'Pluto',   label: 'Pluto',   years: 248.0, w: 98, h: 80, angle: 326, size: 2.4, color: 'rgba(212,202,190,.56)', cls: 'dwarf', alpha: .15, labelMode: 'major' }
  ];

  const earthSeconds = 18;
  const orbitMarkup = orbitData.map((o, index) => {
    const period = earthSeconds * Math.sqrt(o.years);
    return `
      <span class="ui2046-system-orbit ${o.cls}" style="--w:${o.w}%;--h:${o.h}%;--alpha:${o.alpha};">
        <span class="ui2046-orbit-track"><span class="ui2046-planet" data-angle="${o.angle}" data-period="${period.toFixed(3)}" data-index="${index}"
          style="--size:${o.size}px;--color:${o.color};"></span></span>
        <span class="ui2046-orbit-track"><span class="ui2046-planet-label is-${o.labelMode}" data-label-index="${index}">${o.label}</span></span>
      </span>
    `;
  }).join('');

  const layer = document.createElement('div');
  layer.className = 'ui2046-layer';
  layer.setAttribute('aria-hidden', 'true');

  const orbitalSystemMarkup = `
    <div class="ui2046-solar-system">
      <span class="ui2046-kuiper-belt"></span>
      <span class="ui2046-planet sun-marker" style="--left:50%;--top:50%;--size:6px;--color:rgba(255,217,154,.74);"></span>
      ${orbitMarkup}
      <span class="ui2046-system-label" style="--label-left:84%;--label-top:22%;">Kuiper Belt</span>
    </div>
  `;

  layer.innerHTML = `
    <aside class="ui2046-rail ui2046-right">
      <strong data-ui2046-route>${route}</strong>
      <div class="ui2046-rail-line"></div>
      <span>INTERFACE 2046</span>
    </aside>
  `;

  if (!isMobileInterfaceView()) body.appendChild(layer);
  const routeLabel = layer.querySelector('[data-ui2046-route]');

  const updateRouteLabel = (pageName) => {
    if (!routeLabel) return;
    routeLabel.textContent = routeForPage(pageName ? pageKeyFromName(pageName) : pageKeyFromLocation());
  };

  // The scroll progress beam must live outside .ui2046-layer.
  // If it is nested inside the interface/background layer, mobile stacking
  // contexts can place it under cards even with a high child z-index.
  const progress = document.createElement('div');
  progress.className = 'ui2046-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';
  if (!isMobileInterfaceView()) body.appendChild(progress);

  const bar = progress.querySelector('span');

  const updateProgress = () => {
    const doc = document.documentElement;
    const pageBody = document.body;

    const scrollTop = window.scrollY || doc.scrollTop || pageBody.scrollTop || 0;
    const viewportHeight = Math.max(
      1,
      window.innerHeight || 0,
      doc.clientHeight || 0
    );
    const scrollHeight = Math.max(
      doc.scrollHeight || 0,
      pageBody.scrollHeight || 0,
      doc.offsetHeight || 0,
      pageBody.offsetHeight || 0
    );

    const scrollRange = scrollHeight - viewportHeight;
    progress.hidden = scrollRange <= 2;
    const max = Math.max(1, scrollRange);
    const nearBottom = Math.ceil(scrollTop + viewportHeight) >= scrollHeight - 2;
    const pct = progress.hidden ? 0 : nearBottom ? 100 : Math.min(100, Math.max(0, (scrollTop / max) * 100));

    bar.style.width = '100%';
    bar.style.transform = `scaleX(${pct / 100})`;
    bar.style.setProperty('--scroll-progress', String(pct / 100));
  };

  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      updateProgress();
      scrollTicking = false;
    });
  };

  let planets = [];
  let labels = [];
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isOrbitalFxEnabled = () => (
    !root.classList.contains('ambient-fx-disabled') && !isMobileInterfaceView()
  );

  // Each planet and its label ride an .ui2046-orbit-track that fills the orbit box, so translate(x%, y%)
  // on the track is the same point as left/top x%/y% of the orbit (x = a cos θ, y = b sin θ). One Web
  // Animation per track turns it through the orbit on the compositor: no per-frame style, layout or paint.
  // The phase is a function of page time, as with the former per-frame loop: θ = angle − t · 360° / period.
  let orbitMotion = [];
  let orbitSystem = null;
  let orbitFrames = null;
  const ORBIT_STEPS = 360;

  const orbitPoint = (angle) => {
    const rad = angle * Math.PI / 180;
    return [50 + Math.cos(rad) * 50, 50 + Math.sin(rad) * 50];
  };
  const planetTransform = (angle) => {
    const [left, top] = orbitPoint(angle);
    return `translate(${left.toFixed(3)}%, ${top.toFixed(3)}%)`;
  };
  // Labels sit 2.2% to the right of their planet and stay inside 5-95% of the orbit box.
  const labelTransform = (angle) => {
    const [left, top] = orbitPoint(angle);
    const labelLeft = Math.max(5, Math.min(95, left + 2.2));
    const labelTop = Math.max(5, Math.min(95, top));
    return `translate(${labelLeft.toFixed(3)}%, ${labelTop.toFixed(3)}%)`;
  };
  // One turn from θ = 0 to −360° (the former direction = -1), sampled every degree.
  const turnKeyframes = (transformAt) => Array.from({ length: ORBIT_STEPS + 1 }, (_, step) => ({
    transform: transformAt(-360 * step / ORBIT_STEPS)
  }));

  // Static placement: the reduced-motion pose, and the pose before an animation exists.
  const placePlanets = (timeMs = 0) => {
    orbitMotion.forEach((motion) => {
      const angle = reduceMotion ? motion.angle : motion.angle - (timeMs / 1000) * (360 / motion.period);
      motion.planetTrack.style.transform = planetTransform(angle);
      motion.labelTrack.style.transform = labelTransform(angle);
    });
  };

  const shouldPausePlanetMotion = () => {
    const state = window.__madsPowerState || {};
    return !isOrbitalFxEnabled() || document.hidden || state.hidden || state.idle || state.lowPower || document.body.classList.contains("mission-lightbox-open") || document.documentElement.classList.contains("mission-lightbox-open") || document.documentElement.classList.contains("mineral-atlas-open");
  };

  // Runs on every power, visibility, FX and soft-navigation change: pauses the orbits in place while
  // the page is hidden, idle, low-power or behind the lightbox/atlas, and otherwise (re)starts them at
  // the phase for the current page time.
  const startPlanetAnimation = () => {
    if (reduceMotion || !orbitMotion.length || typeof Element.prototype.animate !== 'function') return;
    const paused = shouldPausePlanetMotion();
    orbitMotion.forEach((motion) => {
      if (!motion.animations.length) {
        if (paused) return;
        if (!orbitFrames) orbitFrames = { planet: turnKeyframes(planetTransform), label: turnKeyframes(labelTransform) };
        const timing = { duration: motion.period * 1000, iterations: Infinity };
        motion.animations = [
          motion.planetTrack.animate(orbitFrames.planet, timing),
          motion.labelTrack.animate(orbitFrames.label, timing)
        ];
      }
      motion.animations.forEach((animation) => {
        if (paused) {
          if (animation.playState === 'running') animation.pause();
        } else {
          animation.startTime = (motion.angle / 360 - 1) * motion.period * 1000;
        }
      });
    });
  };

  const stopOrbitMotion = () => {
    orbitMotion.forEach((motion) => motion.animations.forEach((animation) => animation.cancel()));
    orbitMotion = [];
    orbitSystem = null;
  };

  const syncOrbitalSystem = () => {
    const existingSystem = layer.querySelector('.ui2046-solar-system');

    if (!isOrbitalFxEnabled()) {
      existingSystem?.remove();
      planets = [];
      labels = [];
      stopOrbitMotion();
      return;
    }

    if (!existingSystem) {
      layer.insertAdjacentHTML('afterbegin', orbitalSystemMarkup);
    }

    const system = layer.querySelector('.ui2046-solar-system');
    if (system !== orbitSystem) {
      stopOrbitMotion();
      orbitSystem = system;
      planets = Array.from(layer.querySelectorAll('.ui2046-system-orbit .ui2046-planet'));
      labels = Array.from(layer.querySelectorAll('.ui2046-planet-label'));
      orbitMotion = planets.map((planet) => ({
        angle: Number(planet.dataset.angle || 0),
        period: Math.max(1, Number(planet.dataset.period || 18)),
        planetTrack: planet.parentElement,
        labelTrack: labels.find((label) => label.dataset.labelIndex === planet.dataset.index).parentElement,
        animations: []
      }));
      placePlanets(0);
    }
    startPlanetAnimation();
  };

  // The bar starts empty (scaleX(var(--scroll-progress, 0))); measure the page in the next frame instead of forcing a layout here.
  requestAnimationFrame(updateProgress);
  syncOrbitalSystem();
  restoreInterfaceLayers = () => {
    if (!layer.isConnected) body.appendChild(layer);
    if (!progress.isConnected) body.appendChild(progress);
    updateRouteLabel();
    updateProgress();
    syncOrbitalSystem();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncOrbitalSystem, { once: true });
  }

  window.addEventListener('mads:power-state', startPlanetAnimation);
  window.addEventListener('mads:fx-state', syncOrbitalSystem);
  window.addEventListener('mads:soft-nav-ready', (event) => {
    updateRouteLabel(event.detail?.pageName);
    updateProgress();
    placePlanets(performance.now());
    startPlanetAnimation();
  });
  document.addEventListener('visibilitychange', startPlanetAnimation, { passive: true });
  window.addEventListener('pageshow', startPlanetAnimation, { passive: true });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateProgress);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateProgress, { passive: true });
    window.visualViewport.addEventListener('scroll', updateProgress, { passive: true });
  }

  window.addEventListener('load', updateProgress, { once: true });
  setTimeout(updateProgress, 250);
})();
