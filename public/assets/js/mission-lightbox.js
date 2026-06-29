(() => {
  if (window.MadsMissionLightbox?.prepare) {
    window.MadsMissionLightbox.prepare();
    return;
  }

  const isTouch = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 760px)').matches;

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

  function prepare(scope = document) {
    scope.querySelectorAll('.mission-photo-grid figure').forEach((figure, index) => {
      const item = itemFromFigure(figure, index);
      figure.setAttribute('tabindex', '0');
      figure.setAttribute('role', 'button');
      figure.setAttribute('aria-label', `Open large image: ${item.caption}`);
    });
  }

  function show(index) {
    if (!items.length) return;
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
    if (!nextItems.length) return;
    items = nextItems;
    lastFocus = document.activeElement;
    show(index);
    overlay.classList.add('is-open');
    document.body.classList.add('mission-lightbox-open');
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('mission-lightbox-open');
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  function openFromFigure(figure) {
    const scope = figure.closest('.mission-log-entry') || document;
    const scopedFigures = Array.from(scope.querySelectorAll('.mission-photo-grid figure'));
    const scopedItems = scopedFigures.map((scopedFigure, idx) => itemFromFigure(scopedFigure, idx)).filter((item) => item.src);
    const initialIndex = scopedItems.findIndex((item) => item.figure === figure);
    if (!scopedItems.length || initialIndex < 0) return;
    open(initialIndex, scopedItems);
  }

  document.addEventListener('click', (event) => {
    const figure = event.target.closest?.('.mission-photo-grid figure');
    if (!figure) return;
    openFromFigure(figure);
  });

  document.addEventListener('keydown', (event) => {
    if (overlay.classList.contains('is-open')) {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') prev();
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') return;
    const figure = event.target.closest?.('.mission-photo-grid figure');
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

  window.MadsMissionLightbox = { prepare };
  prepare();
})();
