(() => {
  if (window.__madsObservatoryReady) return;
  window.__madsObservatoryReady = true;
  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 761px) and (pointer: fine)');
  const nav = document.querySelector('.header-actions .nav');
  const header = document.querySelector('.site-header');
  const fx = document.querySelector('.ambient-fx-toggle');
  const orbitMap = { home: 2, research: 3, 'paper-shelf': 5, cv: 0, photography: 7, contact: 1 };
  let intensity = 'immersive';
  try { if (localStorage.getItem('madsFxIntensity') === 'standard') intensity = 'standard'; } catch {}
  root.dataset.fxIntensity = intensity;

  // Lucide icons (ISC): sliders-horizontal, presentation, maximize, x and chevrons.
  const paths = {
    settings: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
    present: '<path d="M2 3h20M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3M7 21l5-5 5 5M12 16v5"/>',
    fullscreen: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>',
    minimise: '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3m8 0v-3a2 2 0 0 1 2-2h3"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    prev: '<path d="m15 18-6-6 6-6"/>',
    next: '<path d="m9 18 6-6-6-6"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const activeLink = () => header.querySelector('[aria-current="page"]') || header.querySelector('a[href="index.html"]');
  const routeOf = link => {
    const name = new URL(link?.href || location.href).pathname.split('/').pop().replace('.html', '');
    return name === 'index' || !name ? 'home' : name;
  };
  let route = routeOf(activeLink());

  const beam = document.createElement('span');
  beam.className = 'obs-nav-beam';
  beam.setAttribute('aria-hidden', 'true');
  beam.hidden = true;
  nav.appendChild(beam);
  nav.classList.add('obs-nav-ready');
  function moveBeam(link = activeLink(), animate = true) {
    const inside = nav.contains(link);
    if (!inside || !desktop.matches) {
      beam.hidden = true;
      return;
    }
    const snap = beam.hidden || !animate;
    const parent = nav.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    if (snap) beam.style.transition = 'none';
    beam.style.width = `${Math.max(0, box.width - 20)}px`;
    beam.style.top = `${box.bottom - parent.top - nav.clientTop - 5}px`;
    beam.style.transform = `translateX(${box.left - parent.left - nav.clientLeft + 10}px)`;
    beam.hidden = false;
    if (snap) {
      // Commit the measured position before enabling horizontal transitions.
      beam.getBoundingClientRect();
      beam.style.removeProperty('transition');
    }
  }
  function lightOrbit(nextRoute = route) {
    body.dataset.orbitRoute = nextRoute;
    document.querySelectorAll('.ui2046-system-orbit').forEach(orbit => {
      orbit.classList.toggle('is-route-active', Number(orbit.querySelector('[data-index]')?.dataset.index) === orbitMap[nextRoute]);
    });
  }
  function previewLink(event) {
    const link = event.target.closest('.nav a, .nav-log-gate');
    if (!link) return;
    moveBeam(link);
    lightOrbit(routeOf(link));
  }
  header.addEventListener('pointerover', previewLink);
  header.addEventListener('focusin', previewLink);
  header.addEventListener('pointerleave', () => { moveBeam(); lightOrbit(); });
  header.addEventListener('focusout', event => {
    if (!header.contains(event.relatedTarget)) { moveBeam(); lightOrbit(); }
  });
  new ResizeObserver(() => moveBeam(activeLink(), false)).observe(header);
  window.addEventListener('mads:fx-state', () => lightOrbit());

  // One pointer frame, no continuously running spotlight loop or moving blur layer.
  let edgeFrame = 0;
  let edgeTarget = null;
  let pointer = null;
  const edgeLight = document.createElement('span');
  edgeLight.className = 'obs-edge-light';
  edgeLight.setAttribute('aria-hidden', 'true');
  const edgeSelector = '.button, .paper-card, .card, .cv-edu-card, .pathway-step, .nav-log-gate, .theme-toggle, .planetary-materials button, .planetary-toolbar button, .planetary-mineral-tabs button';
  function clearEdge() {
    cancelAnimationFrame(edgeFrame);
    edgeFrame = 0;
    edgeTarget?.removeAttribute('data-edge-active');
    edgeTarget?.style.removeProperty('--edge-angle');
    edgeLight.remove();
    edgeTarget = null;
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !desktop.matches || reduced.matches || root.classList.contains('ambient-fx-disabled') || window.__madsPowerState?.lowPower) return clearEdge();
    const target = event.target.closest(edgeSelector);
    if (target !== edgeTarget) { clearEdge(); edgeTarget = target; }
    if (!target) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (edgeFrame) return;
    edgeFrame = requestAnimationFrame(() => {
      edgeFrame = 0;
      if (!edgeTarget?.isConnected) return clearEdge();
      const box = edgeTarget.getBoundingClientRect();
      const angle = Math.atan2(pointer.y - box.top - box.height / 2, pointer.x - box.left - box.width / 2) * 180 / Math.PI + 90;
      edgeTarget.style.setProperty('--edge-angle', `${angle}deg`);
      if (edgeLight.parentElement !== edgeTarget) edgeTarget.appendChild(edgeLight);
      edgeTarget.setAttribute('data-edge-active', '');
    });
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) clearEdge(); });
  document.addEventListener('scroll', clearEdge, { capture: true, passive: true });
  document.addEventListener('visibilitychange', clearEdge);
  window.addEventListener('blur', clearEdge);
  window.addEventListener('pagehide', clearEdge);
  window.addEventListener('mads:soft-nav-start', clearEdge);
  window.addEventListener('mads:fx-state', clearEdge);
  desktop.addEventListener('change', clearEdge);
  reduced.addEventListener('change', clearEdge);

  let dock;
  if (fx) {
    dock = document.createElement('div');
    dock.className = 'obs-fx-dock';
    dock.innerHTML = `<button class="obs-fx-settings" type="button" title="Visual effects" aria-label="Visual effects" aria-expanded="false" aria-controls="obs-fx-panel">${icon('settings')}</button>
      <fieldset id="obs-fx-panel" class="obs-fx-panel" hidden><legend>FX intensity</legend>
        <label><input type="radio" name="obs-intensity" value="standard"> Standard</label>
        <label><input type="radio" name="obs-intensity" value="immersive"> Immersive</label>
      </fieldset>`;
    dock.prepend(fx);
    body.appendChild(dock);
    const settings = dock.querySelector('.obs-fx-settings');
    const panel = dock.querySelector('fieldset');
    const closeSettings = () => { panel.hidden = true; settings.setAttribute('aria-expanded', 'false'); };
    const compactDock = matchMedia('(max-width: 760px), (pointer: coarse)');
    const resetSettings = () => {
      const restoreFocus = panel.contains(document.activeElement);
      closeSettings();
      if (restoreFocus) settings.focus({ preventScroll: true });
    };
    compactDock.addEventListener('change', resetSettings);
    dock.querySelector(`input[value="${intensity}"]`).checked = true;
    settings.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      settings.setAttribute('aria-expanded', String(!panel.hidden));
    });
    panel.addEventListener('change', event => {
      intensity = event.target.value === 'immersive' ? 'immersive' : 'standard';
      root.dataset.fxIntensity = intensity;
      try { localStorage.setItem('madsFxIntensity', intensity); } catch {}
    });
    document.addEventListener('pointerdown', event => { if (!dock.contains(event.target)) closeSettings(); });
    window.addEventListener('pagehide', closeSettings);
    window.addEventListener('mads:soft-nav-start', closeSettings);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) { closeSettings(); settings.focus(); }
    });
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'obs-presentation';
  dialog.setAttribute('aria-label', 'Image presentation');
  dialog.innerHTML = `<div class="obs-presentation-surface"><div class="obs-presentation-toolbar">
      <span class="obs-fullscreen-status" role="status" hidden></span>
      <button class="obs-present-fullscreen" type="button" title="Enter browser full screen" aria-label="Enter browser full screen" aria-pressed="false">${icon('fullscreen')}</button>
      <button class="obs-present-close" type="button" title="Close presentation" aria-label="Close presentation">${icon('close')}</button>
    </div>
    <button class="obs-present-prev" type="button" title="Previous image" aria-label="Previous image">${icon('prev')}</button>
    <figure><div class="obs-presentation-stage"><img alt="" decoding="async"></div>
      <figcaption aria-live="polite"><span class="obs-presentation-caption"></span><span class="obs-presentation-counter"></span></figcaption>
    </figure>
    <button class="obs-present-next" type="button" title="Next image" aria-label="Next image">${icon('next')}</button></div>`;
  body.appendChild(dialog);
  const surface = dialog.querySelector('.obs-presentation-surface');
  const image = dialog.querySelector('img');
  image.draggable = false;
  const caption = dialog.querySelector('.obs-presentation-caption');
  const counter = dialog.querySelector('.obs-presentation-counter');
  const fullscreen = dialog.querySelector('.obs-present-fullscreen');
  const fullscreenStatus = dialog.querySelector('.obs-fullscreen-status');
  let images = [];
  let imageIndex = 0;
  let origin = null;
  let touchStart = null;
  let ownsFullscreen = false;
  let fullscreenPending = false;
  let presentationVersion = 0;
  let photoFlight = null;
  let closingPhoto = false;
  const flightAllowed = () => !reduced.matches && !document.hidden &&
    !root.classList.contains('ambient-fx-disabled') && !window.__madsPowerState?.lowPower;
  function stopPhotoFlight() {
    photoFlight?.animation.cancel();
    photoFlight?.node.remove();
    photoFlight = null;
    closingPhoto = false;
    image.style.visibility = '';
  }
  function flyPhoto(tile, returning = false) {
    const interrupted = returning ? photoFlight?.node.getBoundingClientRect() : null;
    stopPhotoFlight();
    const thumbnail = tile?.querySelector('img');
    if (!flightAllowed() || document.fullscreenElement || !thumbnail?.isConnected) return false;
    const small = thumbnail.getBoundingClientRect();
    if (!small.width || small.bottom <= 0 || small.top >= innerHeight) return false;
    const frame = image.getBoundingClientRect();
    const ratio = Number(thumbnail.getAttribute('width')) / Number(thumbnail.getAttribute('height'));
    if (!Number.isFinite(ratio) || !frame.width || !frame.height) return false;
    const width = Math.min(frame.width, frame.height * ratio);
    const height = width / ratio;
    const left = frame.left + (frame.width - width) / 2;
    const top = frame.top + (frame.height - height) / 2;
    const bounds = surface.getBoundingClientRect();
    const node = document.createElement('img');
    node.className = 'obs-photo-flight';
    node.alt = '';
    node.setAttribute('aria-hidden', 'true');
    node.src = returning ? image.currentSrc || image.src : thumbnail.currentSrc || thumbnail.src;
    Object.assign(node.style, { left: `${left - bounds.left}px`, top: `${top - bounds.top}px`, width: `${width}px`, height: `${height}px` });
    surface.append(node);
    image.style.visibility = 'hidden';
    const collapsed = `translate(${small.left - left}px, ${small.top - top}px) scale(${small.width / width})`;
    const expanded = interrupted
      ? `translate(${interrupted.left - left}px, ${interrupted.top - top}px) scale(${interrupted.width / width})`
      : 'none';
    const frames = [{ transform: collapsed }, { transform: expanded }];
    const animation = node.animate(returning ? frames.reverse() : frames, {
      duration: returning ? 220 : 300, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both'
    });
    photoFlight = { node, animation };
    closingPhoto = returning;
    animation.onfinish = () => {
      stopPhotoFlight();
      if (returning) closePresentation();
    };
    return true;
  }
  function requestClosePresentation() {
    if (!closingPhoto && origin?.hasAttribute('data-photo-index')) {
      const tile = images[imageIndex]?.tile;
      if (tile?.isConnected) origin = tile;
      if (flyPhoto(tile, true)) return;
    }
    closePresentation();
  }
  function syncFullscreenButton() {
    const active = Boolean(document.fullscreenElement);
    const label = active ? 'Exit browser full screen' : 'Enter browser full screen';
    fullscreen.hidden = !document.fullscreenEnabled && !active;
    fullscreen.disabled = fullscreenPending;
    fullscreen.title = label;
    fullscreen.setAttribute('aria-label', label);
    fullscreen.setAttribute('aria-pressed', String(active));
    fullscreen.innerHTML = icon(active ? 'minimise' : 'fullscreen');
  }
  function powerState() { window.dispatchEvent(new CustomEvent('mads:power-state', { detail: window.__madsPowerState || {} })); }
  function showImage(index) {
    stopPhotoFlight();
    if (!images.length) return;
    imageIndex = (index + images.length) % images.length;
    const item = images[imageIndex];
    image.src = item.src;
    image.alt = item.caption;
    caption.textContent = item.caption;
    counter.textContent = `${String(imageIndex + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
    dialog.querySelector('.obs-present-prev').disabled = images.length < 2;
    dialog.querySelector('.obs-present-next').disabled = images.length < 2;
  }
  function purgePresentation() {
    stopPhotoFlight();
    presentationVersion += 1;
    const version = presentationVersion;
    const returnTarget = origin;
    if (document.fullscreenElement === surface || (ownsFullscreen && document.fullscreenElement)) {
      document.exitFullscreen().then(() => {
        if (version === presentationVersion && !dialog.open && returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
      }).catch(() => {});
    }
    ownsFullscreen = false;
    images = [];
    imageIndex = 0;
    image.removeAttribute('src');
    image.alt = '';
    caption.textContent = '';
    counter.textContent = '';
    fullscreenStatus.textContent = '';
    fullscreenStatus.hidden = true;
    touchStart = null;
    root.classList.remove('obs-presenting', 'mission-lightbox-open');
    body.classList.remove('obs-presenting', 'mission-lightbox-open');
    powerState();
    if (origin?.isConnected) origin.focus({ preventScroll: true });
    origin = null;
  }
  function closePresentation() { if (dialog.open) dialog.close(); purgePresentation(); }
  function present(button) {
    const mission = button.hasAttribute('data-present-mission');
    if (mission && !Array.isArray(window.MadsProtectedArchive?.entries)) return;
    const scope = mission ? button.closest('.mission-log-entry') : document.querySelector('.photo-wall');
    if (!scope) return;
    const nodes = [...scope.querySelectorAll(mission ? '.mission-photo-grid figure img' : '.photo-tile img')];
    images = nodes.map(img => ({
      src: (!desktop.matches && img.dataset.mobileFullSrc) || img.dataset.fullSrc || img.currentSrc || img.src,
      tile: mission ? null : img.closest('[data-photo-index]'),
      caption: img.closest('figure')?.querySelector('figcaption')?.textContent.trim() || img.alt
    })).filter(item => item.src);
    if (!images.length) return;
    origin = button;
    presentationVersion += 1;
    syncFullscreenButton();
    dialog.showModal();
    root.classList.add('obs-presenting', 'mission-lightbox-open');
    body.classList.add('obs-presenting', 'mission-lightbox-open');
    showImage(mission ? 0 : Number(button.dataset.photoIndex || 0));
    powerState();
    dialog.querySelector('.obs-present-close').focus();
    if (button.hasAttribute('data-photo-index')) flyPhoto(button);
  }
  dialog.querySelector('.obs-present-close').addEventListener('click', requestClosePresentation);
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClosePresentation(); });
  dialog.addEventListener('close', () => { if (!dialog.open && images.length) purgePresentation(); });
  dialog.querySelector('.obs-present-prev').addEventListener('click', () => showImage(imageIndex - 1));
  dialog.querySelector('.obs-present-next').addEventListener('click', () => showImage(imageIndex + 1));
  syncFullscreenButton();
  fullscreen.addEventListener('click', async () => {
    if (fullscreenPending) return;
    stopPhotoFlight();
    const version = presentationVersion;
    fullscreenPending = true;
    fullscreenStatus.hidden = true;
    syncFullscreenButton();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else {
        // Fullscreen the modal's contents, never its inert page ancestor.
        await surface.requestFullscreen();
        if (!dialog.open || version !== presentationVersion) {
          if (document.fullscreenElement === surface) await document.exitFullscreen();
        } else ownsFullscreen = true;
      }
    } catch {
      if (dialog.open && version === presentationVersion) {
        fullscreenStatus.textContent = 'Browser full screen is unavailable. Image view remains open.';
        fullscreenStatus.hidden = false;
      }
    } finally {
      fullscreenPending = false;
      syncFullscreenButton();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    stopPhotoFlight();
    if (!document.fullscreenElement) ownsFullscreen = false;
    syncFullscreenButton();
  });
  const settlePhotoFlight = () => {
    const wasClosing = closingPhoto;
    stopPhotoFlight();
    if (wasClosing) closePresentation();
  };
  window.addEventListener('resize', settlePhotoFlight);
  reduced.addEventListener('change', settlePhotoFlight);
  window.addEventListener('mads:power-state', () => { if (!flightAllowed()) settlePhotoFlight(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(imageIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showImage(imageIndex + 1); }
  });
  dialog.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') touchStart = { x: event.clientX, y: event.clientY }; });
  dialog.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) showImage(imageIndex + (dx < 0 ? 1 : -1));
  });
  dialog.addEventListener('pointercancel', () => { touchStart = null; });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-present-photos], [data-present-mission], [data-photo-index]');
    if (!button || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    present(button);
  });
  document.addEventListener('mads:research-locked', closePresentation);
  window.addEventListener('pagehide', closePresentation);

  function enhancePage() {
    route = routeOf(activeLink());
    lightOrbit();
    moveBeam();
    const scope = document.querySelector('.mission-log-entry');
    if (scope?.querySelector('.mission-photo-grid img') && !scope.querySelector('[data-present-mission]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button secondary obs-present-launch';
      button.setAttribute('data-present-mission', '');
      button.innerHTML = `${icon('present')}<span>Present images</span>`;
      scope.querySelector('.research-note-body').prepend(button);
    }
    document.querySelectorAll('[data-present-photos]').forEach(button => {
      if (!button.querySelector('svg')) button.insertAdjacentHTML('afterbegin', icon('present'));
    });
  }
  let entrance;
  window.addEventListener('mads:soft-nav-start', () => { closePresentation(); clearEdge(); entrance?.cancel(); });
  window.addEventListener('mads:soft-nav-ready', () => {
    enhancePage();
    if (!reduced.matches && !window.__madsPowerState?.lowPower) {
      entrance = document.querySelector('main').animate([{ opacity: .5 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    }
  });
  document.addEventListener('mads:mission-log-rendered', enhancePage);
  enhancePage();
})();
