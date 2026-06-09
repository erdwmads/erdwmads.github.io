
(() => {
  const root = document.documentElement;
  const body = document.body;
  const ua = navigator.userAgent || "";
  const isEdge = /\bEdgA?\/|\bEdgiOS\/|\bEdg\//.test(ua);

  if (body.dataset.interface2046 === 'ready') return;
  body.dataset.interface2046 = 'ready';

  if (isEdge) {
    root.classList.add("is-edge-browser");
  }

  function beginEdgeTeardown() {
    if (!isEdge) return;
    root.classList.add("is-edge-page-exiting");
    body.classList.add("is-edge-page-exiting");
    document
      .querySelectorAll(".entry-gate, .ambient-space-layer, .ui2046-layer, .ui2046-progress")
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

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      beginEdgeTeardown();
    } else {
      restoreEdgeTeardown();
    }
  }, { passive: true });

  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) beginEdgeTeardown();
  }, { passive: true });

  window.addEventListener("pageshow", restoreEdgeTeardown, { passive: true });

  const rawPath = window.location.pathname.split('/').pop() || 'index.html';
  const page = rawPath.replace('.html', '') || 'index';
  const pageClass = {
    'index': 'ui-page-home',
    'research': 'ui-page-research',
    'research-log': 'ui-page-research-log',
    'research-graduation': 'ui-page-research-graduation',
    'paper-shelf': 'ui-page-paper-shelf',
    'cv': 'ui-page-cv',
    'photography': 'ui-page-photography',
    'contact': 'ui-page-contact'
  }[page] || `ui-page-${page.replace(/[^a-z0-9-]/gi, '').toLowerCase()}`;

  body.classList.add(pageClass);

  const pageTitle = (document.title || 'Mads LIU YONG').split('|')[0].trim() || 'Mission File';
  const h1 = document.querySelector('main h1, .hero h1, .page-title');
  const rawRoute = (h1?.textContent || pageTitle).replace(/\s+/g, ' ').trim();

  const shortRouteMap = {
    'index': 'Home',
    'research': 'Research',
    'research-log': 'Research Log',
    'research-graduation': 'Undergraduate Research',
    'paper-shelf': 'Paper Shelf',
    'cv': 'CV',
    'photography': 'Photography',
    'contact': 'Contact'
  };

  const shortenRoute = (value) => {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 'Mission File';
    if (clean.length <= 34) return clean;
    return clean.slice(0, 31).trim() + '…';
  };

  const route = shortRouteMap[page] || shortenRoute(rawRoute);

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
        <span class="ui2046-planet" data-angle="${o.angle}" data-period="${period.toFixed(3)}" data-index="${index}"
          style="--size:${o.size}px;--color:${o.color};"></span>
        <span class="ui2046-planet-label is-${o.labelMode}" data-label-index="${index}">${o.label}</span>
      </span>
    `;
  }).join('');

  const layer = document.createElement('div');
  layer.className = 'ui2046-layer';
  layer.setAttribute('aria-hidden', 'true');

  layer.innerHTML = `
    <div class="ui2046-solar-system">
      <span class="ui2046-kuiper-belt"></span>
      <span class="ui2046-planet sun-marker" style="--left:50%;--top:50%;--size:6px;--color:rgba(255,217,154,.74);"></span>
      ${orbitMarkup}
      <span class="ui2046-system-label" style="--label-left:84%;--label-top:22%;">Kuiper Belt</span>
    </div>

    <aside class="ui2046-rail ui2046-right">
      <strong>${route}</strong>
      <div class="ui2046-rail-line"></div>
      <span>INTERFACE 2046</span>
    </aside>
  `;

  body.appendChild(layer);

  // The scroll progress beam must live outside .ui2046-layer.
  // If it is nested inside the interface/background layer, mobile stacking
  // contexts can place it under cards even with a high child z-index.
  const progress = document.createElement('div');
  progress.className = 'ui2046-progress';
  progress.setAttribute('aria-hidden', 'true');
  progress.innerHTML = '<span></span>';
  body.appendChild(progress);

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

    const max = Math.max(1, scrollHeight - viewportHeight);
    const nearBottom = Math.ceil(scrollTop + viewportHeight) >= scrollHeight - 2;
    const pct = nearBottom ? 100 : Math.min(100, Math.max(0, (scrollTop / max) * 100));

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

  const planets = Array.from(layer.querySelectorAll('.ui2046-system-orbit .ui2046-planet'));
  const labels = Array.from(layer.querySelectorAll('.ui2046-planet-label'));
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const placePlanets = (timeMs = 0) => {
    planets.forEach((planet) => {
      const index = planet.dataset.index;
      const baseAngle = Number(planet.dataset.angle || 0);
      const period = Math.max(1, Number(planet.dataset.period || 18));
      const direction = -1;
      const angle = reduceMotion ? baseAngle : baseAngle + direction * (timeMs / 1000) * (360 / period);
      const rad = angle * Math.PI / 180;
      const left = 50 + Math.cos(rad) * 50;
      const top = 50 + Math.sin(rad) * 50;

      planet.style.setProperty('--left', `${left.toFixed(3)}%`);
      planet.style.setProperty('--top', `${top.toFixed(3)}%`);

      labels
        .filter(label => label.dataset.labelIndex === index)
        .forEach(label => {
          const labelLeft = Math.max(5, Math.min(95, left + 2.2));
          const labelTop = Math.max(5, Math.min(95, top));
          label.style.setProperty('--label-left', `${labelLeft.toFixed(3)}%`);
          label.style.setProperty('--label-top', `${labelTop.toFixed(3)}%`);
        });
    });
  };

  const shouldPausePlanetMotion = () => {
    const state = window.__madsPowerState || {};
    return document.hidden || state.hidden || state.idle || state.lowPower;
  };

  let planetAnimationRunning = false;

  const animatePlanets = (timeMs) => {
    if (shouldPausePlanetMotion()) {
      planetAnimationRunning = false;
      return;
    }

    placePlanets(timeMs);
    if (!reduceMotion) {
      requestAnimationFrame(animatePlanets);
    }
  };

  const startPlanetAnimation = () => {
    if (reduceMotion || planetAnimationRunning || shouldPausePlanetMotion()) return;
    planetAnimationRunning = true;
    requestAnimationFrame(animatePlanets);
  };

  updateProgress();
  placePlanets(0);
  startPlanetAnimation();

  window.addEventListener('mads:power-state', startPlanetAnimation);
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


/* Astromaterials Archive Entry Gate
   Plays once per browser session. */
(() => {
  const KEY = 'mads-entry-gate-v1';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hasPlayed = () => {
    try {
      return sessionStorage.getItem(KEY) === 'done';
    } catch (error) {
      return false;
    }
  };

  const markPlayed = () => {
    try {
      sessionStorage.setItem(KEY, 'done');
    } catch (error) {
      // Ignore private-mode storage failures.
    }
  };

  const init = () => {
    const body = document.body;
    if (!body || body.dataset.entryGate === 'ready') return;

    if (reduceMotion || hasPlayed()) {
      markPlayed();
      return;
    }

    body.dataset.entryGate = 'ready';
    body.classList.add('entry-gate-active');

    const gate = document.createElement('div');
    gate.className = 'entry-gate';
    gate.setAttribute('aria-hidden', 'true');
    gate.innerHTML = `
      <div class="entry-gate__constellation" aria-hidden="true">
        <span style="--x:12%;--y:18%;--d:.1s"></span>
        <span style="--x:26%;--y:72%;--d:.35s"></span>
        <span style="--x:70%;--y:20%;--d:.55s"></span>
        <span style="--x:84%;--y:66%;--d:.25s"></span>
      </div>
      <div class="entry-gate__frame">
        <div class="entry-gate__corner is-tl"></div>
        <div class="entry-gate__corner is-br"></div>
        <div class="entry-gate__orbit" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="entry-gate__panel">
          <div class="entry-gate__topline">
            <p class="entry-gate__kicker">Astromaterials Research Archive</p>
            <p class="entry-gate__code">CI-ORGUEIL / 2046</p>
          </div>
          <h2 class="entry-gate__name">
            <span>MADS</span>
            <span>LIU YONG</span>
          </h2>
          <p class="entry-gate__archive">Cosmic mineralogy / primitive Solar System materials</p>
          <div class="entry-gate__meta">
            <span>CI Chondrite</span>
            <span>Orgueil</span>
            <span>Dolomite</span>
            <span>SEM · EPMA · TEM</span>
          </div>
          <div class="entry-gate__sequence" aria-hidden="true">
            <span>MINERAL RECORD</span>
            <span>AQUEOUS ALTERATION</span>
            <span>PRIMITIVE MATERIAL</span>
          </div>
          <div class="entry-gate__line"></div>
          <div class="entry-gate__footer">
            <p class="entry-gate__mode">Entering Interface 2046</p>
            <p class="entry-gate__status">Archive online</p>
          </div>
        </div>
      </div>
    `;

    body.appendChild(gate);

    requestAnimationFrame(() => {
      gate.classList.add('is-visible');
    });

    let isExiting = false;
    const exit = ({ instant = false } = {}) => {
      if (isExiting) return;
      isExiting = true;
      gate.classList.add('is-exiting');
      markPlayed();

      const removeGate = () => {
        gate.remove();
        body.classList.remove('entry-gate-active');
      };

      if (instant) {
        removeGate();
        return;
      }

      window.setTimeout(removeGate, 520);
    };

    gate.addEventListener('click', () => exit({ instant: true }), { once: true });
    window.setTimeout(() => exit(), 1800);
    window.setTimeout(() => {
      if (document.body?.contains(gate)) {
        gate.remove();
        body.classList.remove('entry-gate-active');
        markPlayed();
      }
    }, 3400);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();


