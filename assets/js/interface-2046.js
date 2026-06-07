
(() => {
  const body = document.body;

  if (body.dataset.interface2046 === 'ready') return;
  body.dataset.interface2046 = 'ready';

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
    <div class="ui2046-progress"><span></span></div>

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

  const bar = layer.querySelector('.ui2046-progress span');

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

  const animatePlanets = (timeMs) => {
    placePlanets(timeMs);
    if (!reduceMotion) requestAnimationFrame(animatePlanets);
  };

  updateProgress();
  placePlanets(0);

  if (!reduceMotion) requestAnimationFrame(animatePlanets);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateProgress);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateProgress, { passive: true });
    window.visualViewport.addEventListener('scroll', updateProgress, { passive: true });
  }

  window.addEventListener('load', updateProgress, { once: true });
  setTimeout(updateProgress, 250);

  /* Mission Log Navigator precise anchor alignment.
     Native hash scrolling lands inconsistently with sticky headers and mobile
     browser chrome. This uses a measured offset, then updates the hash without
     causing a second native jump. */
  const getAnchorOffset = () => {
    const header = document.querySelector('.site-header');
    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    const visualTop = window.visualViewport ? Math.max(0, Math.round(window.visualViewport.offsetTop || 0)) : 0;
    return headerHeight + visualTop + 18;
  };

  const scrollToMissionTarget = (target, behavior = 'smooth') => {
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - getAnchorOffset();
    window.scrollTo({
      top: Math.max(0, Math.round(top)),
      behavior
    });
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    const target = document.querySelector(hash);
    if (!target) return;

    if (
      hash.startsWith('#log-') ||
      hash === '#mission-log' ||
      hash === '#mission-index'
    ) {
      event.preventDefault();
      scrollToMissionTarget(target, 'smooth');
      history.pushState(null, '', hash);
    }
  });

  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target && (window.location.hash.startsWith('#log-') || window.location.hash === '#mission-log' || window.location.hash === '#mission-index')) {
      window.addEventListener('load', () => {
        setTimeout(() => scrollToMissionTarget(target, 'auto'), 80);
      }, { once: true });
    }
  }


})();
