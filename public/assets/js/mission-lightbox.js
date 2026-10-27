(() => {
  if (window.MadsMissionLightbox?.prepare) {
    window.MadsMissionLightbox.prepare();
    return;
  }

  // Phones and coarse pointers keep Mission Log images as inline captioned figures, never viewer buttons
  // (docs/ui-invariants.md); html.mobile-mission-lightbox-disabled drives the matching style.css rules.
  const touchQuery = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 760px)');
  let isTouch = Boolean(touchQuery.matches);
  const figureSelector = '.mission-photo-grid figure, .mission-comparison-figure';

  function fullSrc(img) {
    if (isTouch && img?.dataset?.mobileFullSrc) {
      return img.dataset.mobileFullSrc;
    }
    return img?.dataset?.fullSrc || img?.currentSrc || img?.src || '';
  }

  function itemFromFigure(figure, index) {
    const img = figure.querySelector('img');
    const captionEl = figure.querySelector('figcaption');
    const caption = captionEl?.textContent?.trim() || img?.alt || `Image ${index + 1}`;
    const src = fullSrc(img);

    if (img) {
      img.loading = 'lazy';
      img.decoding = 'async';
      try { img.fetchPriority = 'low'; } catch (error) {}
    }

    return { figure, img, src, alt: img?.alt || caption, caption };
  }

  const overlay = document.createElement('div');
  overlay.className = 'mission-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Mission Log image viewer');

  overlay.innerHTML = `
    <div class="mission-lightbox__viewer" role="document">
      <button class="mission-lightbox__btn mission-lightbox__close" type="button" aria-label="Close image viewer">
        <span class="mission-lightbox__close-icon" aria-hidden="true"></span>
      </button>

      <button class="mission-lightbox__btn mission-lightbox__nav mission-lightbox__prev" type="button" aria-label="Previous image"></button>

      <figure class="mission-lightbox__figure">
        <div class="mission-lightbox__stage">
          <img class="mission-lightbox__img" alt="" decoding="async">
        </div>
        <figcaption class="mission-lightbox__captionbar">
          <span class="mission-lightbox__caption"></span>
          <span class="mission-lightbox__counter"></span>
        </figcaption>
      </figure>

      <button class="mission-lightbox__btn mission-lightbox__nav mission-lightbox__next" type="button" aria-label="Next image"></button>
    </div>
  `;

  document.body.appendChild(overlay);

  const viewer = overlay.querySelector('.mission-lightbox__viewer');
  const imgEl = overlay.querySelector('.mission-lightbox__img');
  const captionEl = overlay.querySelector('.mission-lightbox__caption');
  const counterEl = overlay.querySelector('.mission-lightbox__counter');
  const closeBtn = overlay.querySelector('.mission-lightbox__close');
  const prevBtn = overlay.querySelector('.mission-lightbox__prev');
  const nextBtn = overlay.querySelector('.mission-lightbox__next');

  let current = 0;
  let lastFocus = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let token = 0;
  let items = [];
  let locked = false;
  let inertNodes = [];

  function emitLightboxPowerState() {
    window.dispatchEvent(new CustomEvent('mads:power-state', {
      detail: window.__madsPowerState || {}
    }));
  }

  // While the viewer is open, everything else on the page is inert; only nodes set here are restored.
  function setBackgroundInert(active) {
    inertNodes.forEach((node) => node.removeAttribute('inert'));
    inertNodes = active
      ? Array.from(document.body.children).filter((node) => node !== overlay && node.tagName !== 'SCRIPT' && !node.hasAttribute('inert'))
      : [];
    inertNodes.forEach((node) => node.setAttribute('inert', ''));
  }

  function setFigureSemantics(figures) {
    figures.forEach((figure, index) => {
      const item = itemFromFigure(figure, index);
      if (isTouch) {
        if (figure.getAttribute('role') === 'button') ['tabindex', 'role', 'aria-label'].forEach((name) => figure.removeAttribute(name));
        return;
      }
      figure.setAttribute('tabindex', '0');
      figure.setAttribute('role', 'button');
      figure.setAttribute('aria-label', `Open large image: ${item.caption}`);
    });
  }

  function prepare(scope = document) {
    const figures = scope.querySelectorAll(figureSelector);
    if (figures.length) locked = false;
    setFigureSemantics(figures);
  }

  function show(index) {
    if (locked || !items.length) return;
    current = (index + items.length) % items.length;
    const item = items[current];
    const myToken = ++token;

    captionEl.textContent = item.caption;
    counterEl.textContent = `${String(current + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;

    imgEl.alt = item.alt;
    imgEl.classList.remove('is-ready');
    imgEl.classList.add('is-decoding');

    const reveal = () => {
      if (myToken !== token) return;
      imgEl.classList.remove('is-decoding');
      imgEl.classList.add('is-ready');
    };

    imgEl.onload = reveal;
    imgEl.onerror = reveal;
    try { imgEl.fetchPriority = isTouch ? 'auto' : 'high'; } catch (error) {}
    imgEl.src = item.src;

    if (imgEl.complete && imgEl.naturalWidth > 0) {
      reveal();
    } else if (typeof imgEl.decode === 'function') {
      imgEl.decode().then(reveal).catch(() => {});
    } else {
      window.setTimeout(reveal, 900);
    }
  }

  function open(index, nextItems) {
    if (locked || !nextItems.length) return;
    items = nextItems;
    if (!overlay.classList.contains('is-open')) lastFocus = document.activeElement;
    show(index);
    overlay.classList.add('is-open');
    document.documentElement.classList.add('mission-lightbox-open');
    document.body.classList.add('mission-lightbox-open');
    setBackgroundInert(true);
    emitLightboxPowerState();
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('mission-lightbox-open');
    document.body.classList.remove('mission-lightbox-open');
    setBackgroundInert(false);
    emitLightboxPowerState();
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function purge() {
    locked = true;
    token += 1;
    current = 0;
    items = [];
    lastFocus = null;
    touchStartX = 0;
    touchStartY = 0;
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('mission-lightbox-open');
    document.body.classList.remove('mission-lightbox-open');
    setBackgroundInert(false);
    imgEl.onload = null;
    imgEl.onerror = null;
    imgEl.src = '';
    imgEl.removeAttribute('src');
    imgEl.alt = '';
    imgEl.classList.remove('is-decoding');
    imgEl.classList.remove('is-ready');
    captionEl.textContent = '';
    counterEl.textContent = '';
    emitLightboxPowerState();
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  function openFromFigure(figure) {
    const comparison = figure.closest('[data-mission-comparison]');
    const scope = comparison || figure.closest('.mission-log-entry') || document;
    const scopedFigures = Array.from(scope.querySelectorAll(comparison ? '.mission-comparison-figure' : '.mission-photo-grid figure'));
    const scopedItems = scopedFigures.map((scopedFigure, idx) => itemFromFigure(scopedFigure, idx)).filter((item) => item.src);
    const initialIndex = scopedItems.findIndex((item) => item.figure === figure);
    if (!scopedItems.length || initialIndex < 0) return;
    open(initialIndex, scopedItems);
  }

  // Tab and Shift+Tab wrap between the viewer controls instead of leaving the page.
  function trapTab(event) {
    const controls = [closeBtn, prevBtn, nextBtn].filter((node) => !node.disabled && node.getClientRects?.().length !== 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) return;
    const active = document.activeElement;
    if (!overlay.contains(active) || (event.shiftKey ? active === first : active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
  }

  document.addEventListener('click', (event) => {
    if (locked || isTouch) return;
    const figure = event.target.closest?.(figureSelector);
    if (!figure) return;
    openFromFigure(figure);
  });

  document.addEventListener('keydown', (event) => {
    if (locked) return;
    if (overlay.classList.contains('is-open')) {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') prev();
      if (event.key === 'Tab') trapTab(event);
      return;
    }

    if (isTouch || (event.key !== 'Enter' && event.key !== ' ')) return;
    const figure = event.target.closest?.(figureSelector);
    if (!figure) return;
    event.preventDefault();
    openFromFigure(figure);
  });

  closeBtn.addEventListener('click', close);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  viewer.addEventListener('click', (event) => event.stopPropagation());

  document.addEventListener('mads:research-locked', purge);

  overlay.addEventListener('touchmove', (event) => {
    if (!overlay.classList.contains('is-open')) return;
    event.preventDefault();
  }, { passive: false });

  overlay.addEventListener('touchstart', (event) => {
    if (!overlay.classList.contains('is-open')) return;
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  overlay.addEventListener('touchend', (event) => {
    if (!overlay.classList.contains('is-open')) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) next();
      else prev();
    }
  }, { passive: true });

  function onTouchModeChange() {
    isTouch = Boolean(touchQuery.matches);
    document.documentElement.classList.toggle('mobile-mission-lightbox-disabled', isTouch);
    if (isTouch && overlay.classList.contains('is-open')) close();
    setFigureSemantics(document.querySelectorAll(figureSelector));
  }

  if (touchQuery.addEventListener) touchQuery.addEventListener('change', onTouchModeChange);
  else touchQuery.addListener?.(onTouchModeChange);
  document.documentElement.classList.toggle('mobile-mission-lightbox-disabled', isTouch);

  window.MadsMissionLightbox = { prepare };
  prepare();
})();
