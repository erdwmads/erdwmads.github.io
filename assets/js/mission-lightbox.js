(() => {
  const figures = Array.from(document.querySelectorAll('.mission-photo-grid figure'));
  if (!figures.length) return;

  const isTouch = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 760px)').matches;
  const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 180));
  const placeholderPrefix = 'data:image/svg+xml';

  let isScrolling = false;
  let scrollTimer = 0;
  let activeLoader = false;
  const loadQueue = [];
  const queued = new Set();

  function originalSrc(img) {
    return img?.dataset?.src || img?.currentSrc || img?.src || '';
  }

  function isPlaceholder(img) {
    return !!img && img.src && img.src.startsWith(placeholderPrefix);
  }

  function markFigure(figure, state) {
    figure.classList.remove('is-lazy-pending', 'is-lazy-loading', 'is-lazy-loaded');
    if (state) figure.classList.add(state);
  }

  function queueImage(item, priority = false) {
    if (!item?.img || !item.src || item.loaded || queued.has(item)) return;
    queued.add(item);
    if (priority) loadQueue.unshift(item);
    else loadQueue.push(item);
    scheduleQueue();
  }

  function scheduleQueue() {
    if (activeLoader) return;
    const delay = isTouch && isScrolling ? 240 : 40;
    window.setTimeout(processQueue, delay);
  }

  function processQueue() {
    if (activeLoader) return;
    if (isTouch && isScrolling) {
      scheduleQueue();
      return;
    }

    const item = loadQueue.shift();
    if (!item) return;

    activeLoader = true;
    document.body.classList.add('mission-image-loading');
    markFigure(item.figure, 'is-lazy-loading');

    const img = item.img;
    const finish = () => {
      item.loaded = true;
      queued.delete(item);
      markFigure(item.figure, 'is-lazy-loaded');
      document.body.classList.remove('mission-image-loading');
      activeLoader = false;
      if (loadQueue.length) scheduleQueue();
    };

    const fail = () => {
      queued.delete(item);
      markFigure(item.figure, 'is-lazy-pending');
      document.body.classList.remove('mission-image-loading');
      activeLoader = false;
      if (loadQueue.length) scheduleQueue();
    };

    img.onload = finish;
    img.onerror = fail;

    img.loading = priority === 'high' ? 'eager' : 'lazy';
    img.decoding = 'async';
    try { img.fetchPriority = 'low'; } catch (error) {}

    if (img.src !== item.src) {
      img.src = item.src;
    }

    if (img.complete && !isPlaceholder(img)) {
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    }
  }

  const items = figures.map((figure, index) => {
    const img = figure.querySelector('img');
    const captionEl = figure.querySelector('figcaption');
    const entry = figure.closest('.mission-log-entry');
    const title = entry?.querySelector('h3')?.textContent?.trim() || 'Mission Log';
    const kicker = entry?.querySelector('.mission-entry-kicker')?.textContent?.trim() || 'Mission Image Viewer';
    const caption = captionEl?.textContent?.trim() || img?.alt || `Image ${index + 1}`;
    const src = originalSrc(img);

    if (isTouch && img && src && isPlaceholder(img)) {
      markFigure(figure, 'is-lazy-pending');
    } else if (img && src) {
      // Desktop: restore original image immediately to preserve normal behavior.
      if (img.dataset?.src && img.src !== src) img.src = src;
      markFigure(figure, 'is-lazy-loaded');
    }

    figure.setAttribute('tabindex', '0');
    figure.setAttribute('role', 'button');
    figure.setAttribute('aria-label', `Open large image: ${caption}`);

    return {
      figure,
      img,
      src,
      alt: img?.alt || caption,
      caption,
      title,
      kicker,
      loaded: !isTouch || (img && !isPlaceholder(img))
    };
  }).filter(item => item.src);

  // Track scroll idle; heavy image loads happen after scrolling settles.
  if (isTouch) {
    window.addEventListener('scroll', () => {
      isScrolling = true;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        isScrolling = false;
        scheduleQueue();
      }, 180);
    }, { passive: true });
  }

  // Queue only images close to the viewport, and load them sequentially.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const item = items.find(candidate => candidate.figure === entry.target);
        if (item) queueImage(item);
      });
    }, {
      root: null,
      rootMargin: isTouch ? '220px 0px 220px 0px' : '600px 0px',
      threshold: 0.01
    });

    items.forEach(item => observer.observe(item.figure));
  } else {
    idle(() => items.forEach(item => queueImage(item)));
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
        <button class="mission-lightbox__btn mission-lightbox__close" type="button" aria-label="Close image viewer">×</button>
      </div>

      <div class="mission-lightbox__stage">
        <button class="mission-lightbox__btn mission-lightbox__nav mission-lightbox__prev" type="button" aria-label="Previous image">‹</button>
        <img class="mission-lightbox__img" alt="" decoding="async">
        <button class="mission-lightbox__btn mission-lightbox__nav mission-lightbox__next" type="button" aria-label="Next image">›</button>
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

  const thumbs = items.map((item, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mission-lightbox__thumb';
    btn.setAttribute('aria-label', `Open image ${idx + 1}`);

    const thumbImg = document.createElement('img');
    thumbImg.alt = '';
    thumbImg.loading = 'lazy';
    thumbImg.decoding = 'async';
    thumbImg.dataset.src = item.src;

    btn.appendChild(thumbImg);
    btn.addEventListener('click', () => show(idx));
    thumbsEl.appendChild(btn);
    return btn;
  });

  function hydrateThumb(index) {
    const img = thumbs[index]?.querySelector('img');
    if (!img || img.src) return;
    img.src = img.dataset.src;
  }

  function hydrateNearbyThumbs(index) {
    const span = isTouch ? 1 : 3;
    for (let i = index - span; i <= index + span; i += 1) {
      hydrateThumb((i + thumbs.length) % thumbs.length);
    }
  }

  function hydrateRemainingThumbs() {
    idle(() => {
      thumbs.forEach((_, idx) => hydrateThumb(idx));
    });
  }

  function show(index) {
    current = (index + items.length) % items.length;
    const item = items[current];

    imgEl.classList.remove('is-ready');
    imgEl.classList.add('is-decoding');

    if (imgEl.src !== item.src) imgEl.src = item.src;
    imgEl.alt = item.alt;

    kickerEl.textContent = item.kicker;
    titleEl.textContent = item.title;
    captionEl.textContent = item.caption;
    counterEl.textContent = `${String(current + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;

    thumbs.forEach((thumb, idx) => {
      thumb.classList.toggle('is-active', idx === current);
      thumb.setAttribute('aria-current', idx === current ? 'true' : 'false');
    });

    hydrateNearbyThumbs(current);

    const reveal = () => {
      imgEl.classList.remove('is-decoding');
      imgEl.classList.add('is-ready');
    };

    if (typeof imgEl.decode === 'function') {
      imgEl.decode().then(reveal).catch(reveal);
    } else {
      reveal();
    }

    thumbs[current]?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: isTouch ? 'auto' : 'smooth'
    });
  }

  function open(index) {
    lastFocus = document.activeElement;
    document.body.classList.add('mission-lightbox-open', 'mission-lightbox-mobile-open');

    // Prioritize the tapped image for page grid replacement too, but do not wait.
    queueImage(items[index], true);

    show(index);
    overlay.classList.add('is-open');

    window.setTimeout(hydrateRemainingThumbs, isTouch ? 900 : 250);
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    overlay.classList.remove('is-open');
    document.body.classList.remove('mission-lightbox-open', 'mission-lightbox-mobile-open');
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  items.forEach((item, idx) => {
    item.figure.addEventListener('click', () => open(idx));
    item.figure.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(idx);
      }
    });
  });

  closeBtn.addEventListener('click', close);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  panel.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.addEventListener('keydown', (event) => {
    if (!overlay.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowRight') next();
    if (event.key === 'ArrowLeft') prev();
  });

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
})();
