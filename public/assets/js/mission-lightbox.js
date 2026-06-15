(() => {
  if (window.MadsMissionLightbox?.prepare) {
    window.MadsMissionLightbox.prepare();
    return;
  }

  const isTouch = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 760px)').matches;
  const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 180));

  function gridSrc(img) {
    return img?.dataset?.thumbSrc || img?.currentSrc || img?.src || '';
  }

  function fullSrc(img) {
    if (isTouch && img?.dataset?.mobileFullSrc) {
      return img.dataset.mobileFullSrc;
    }
    return img?.dataset?.fullSrc || img?.currentSrc || img?.src || '';
  }

  function itemFromFigure(figure, index) {
    const img = figure.querySelector('img');
    const captionEl = figure.querySelector('figcaption');
    const entry = figure.closest('.mission-log-entry');
    const title = entry?.querySelector('h3')?.textContent?.trim() || 'Mission Log';
    const kicker = entry?.querySelector('.mission-entry-kicker')?.textContent?.trim() || 'Mission Image Viewer';
    const caption = captionEl?.textContent?.trim() || img?.alt || `Image ${index + 1}`;
    const thumb = gridSrc(img);
    const src = fullSrc(img);

    if (img) {
      img.loading = 'lazy';
      img.decoding = 'async';
      try { img.fetchPriority = 'low'; } catch (error) {}
    }

    return { figure, img, src, thumb, alt: img?.alt || caption, caption, title, kicker };
  }

  const overlay = document.createElement('div');
  overlay.className = 'mission-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Mission Log image viewer');

  overlay.innerHTML = `
    <div class="mission-lightbox__panel" role="document">
      <div class="mission-lightbox__topbar">
        <div>
          <p class="mission-lightbox__kicker"></p>
          <h2 class="mission-lightbox__title"></h2>
        </div>
        <button class="mission-lightbox__btn mission-lightbox__close" type="button" aria-label="Close image viewer">
          <span class="mission-lightbox__close-icon" aria-hidden="true"></span>
        </button>
      </div>

      <div class="mission-lightbox__stage">
        <button class="mission-lightbox__btn mission-lightbox__nav mission-lightbox__prev" type="button" aria-label="Previous image">&lt;</button>
        <img class="mission-lightbox__img" alt="" decoding="async">
        <button class="mission-lightbox__btn mission-lightbox__nav mission-lightbox__next" type="button" aria-label="Next image">&gt;</button>
      </div>

      <div class="mission-lightbox__captionbar">
        <p class="mission-lightbox__caption"></p>
        <span class="mission-lightbox__counter"></span>
      </div>

      <div class="mission-lightbox__thumbs" aria-label="Mission Log image thumbnails"></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const panel = overlay.querySelector('.mission-lightbox__panel');
  const imgEl = overlay.querySelector('.mission-lightbox__img');
  const kickerEl = overlay.querySelector('.mission-lightbox__kicker');
  const titleEl = overlay.querySelector('.mission-lightbox__title');
  const captionEl = overlay.querySelector('.mission-lightbox__caption');
  const counterEl = overlay.querySelector('.mission-lightbox__counter');
  const closeBtn = overlay.querySelector('.mission-lightbox__close');
  const prevBtn = overlay.querySelector('.mission-lightbox__prev');
  const nextBtn = overlay.querySelector('.mission-lightbox__next');
  const thumbsEl = overlay.querySelector('.mission-lightbox__thumbs');

  let current = 0;
  let lastFocus = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let token = 0;
  let items = [];
  let thumbs = [];

  function prepare(scope = document) {
    scope.querySelectorAll('.mission-photo-grid figure').forEach((figure) => {
      const item = itemFromFigure(figure, 0);
      figure.setAttribute('tabindex', '0');
      figure.setAttribute('role', 'button');
      figure.setAttribute('aria-label', `Open large image: ${item.caption}`);
    });
  }

  function buildThumbs(nextItems) {
    thumbsEl.replaceChildren();
    thumbs = nextItems.map((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mission-lightbox__thumb';
      btn.setAttribute('aria-label', `Open image ${idx + 1}`);

      const thumbImg = document.createElement('img');
      thumbImg.alt = '';
      thumbImg.loading = 'eager';
      thumbImg.decoding = 'async';
      try { thumbImg.fetchPriority = 'low'; } catch (error) {}
      thumbImg.src = item.thumb || item.src;
      thumbImg.dataset.src = thumbImg.src;
      thumbImg.dataset.missionThumbHydrated = '1';

      btn.appendChild(thumbImg);
      btn.addEventListener('click', () => show(idx));
      thumbsEl.appendChild(btn);
      return btn;
    });
  }

  function hydrateThumb(index) {
    const img = thumbs[index]?.querySelector('img');
    if (!img || img.src) return;
    img.src = img.dataset.src;
  }

  function hydrateNearbyThumbs(index) {
    const span = isTouch ? 2 : 4;
    for (let i = index - span; i <= index + span; i += 1) {
      hydrateThumb((i + thumbs.length) % thumbs.length);
    }
  }

  function hydrateRemainingThumbs() {
    idle(() => thumbs.forEach((_, idx) => hydrateThumb(idx)));
  }

  function show(index) {
    if (!items.length) return;
    current = (index + items.length) % items.length;
    const item = items[current];
    const myToken = ++token;

    kickerEl.textContent = item.kicker;
    titleEl.textContent = item.title;
    captionEl.textContent = item.caption;
    counterEl.textContent = `${String(current + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;

    thumbs.forEach((thumb, idx) => {
      thumb.classList.toggle('is-active', idx === current);
      thumb.setAttribute('aria-current', idx === current ? 'true' : 'false');
    });

    hydrateNearbyThumbs(current);

    imgEl.alt = item.alt;
    imgEl.classList.remove('is-ready');
    imgEl.classList.add('is-decoding');

    if (item.thumb && imgEl.src !== item.thumb) imgEl.src = item.thumb;

    const full = new Image();
    full.decoding = 'async';
    try { full.fetchPriority = isTouch ? 'auto' : 'high'; } catch (error) {}
    full.src = item.src;

    const reveal = () => {
      if (myToken !== token) return;
      imgEl.src = item.src;
      imgEl.classList.remove('is-decoding');
      imgEl.classList.add('is-ready');
    };

    if (typeof full.decode === 'function') {
      full.decode().then(reveal).catch(reveal);
    } else {
      full.onload = reveal;
      full.onerror = reveal;
    }

    thumbs[current]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: isTouch ? 'auto' : 'smooth' });
  }

  function open(index, nextItems) {
    if (!nextItems.length) return;
    items = nextItems;
    buildThumbs(items);
    lastFocus = document.activeElement;
    show(index);
    overlay.classList.add('is-open');
    document.body.classList.add('mission-lightbox-mobile-open');
    if (!isTouch) {
      document.body.classList.add('mission-lightbox-open');
      closeBtn.focus({ preventScroll: true });
    }
    window.setTimeout(hydrateRemainingThumbs, isTouch ? 900 : 250);
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('mission-lightbox-open', 'mission-lightbox-mobile-open');
    if (!isTouch && lastFocus && typeof lastFocus.focus === 'function') {
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

  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  panel.addEventListener('click', (event) => event.stopPropagation());

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
