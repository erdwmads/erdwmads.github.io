(() => {
  const cleanupKey = 'MadsMissionIndexCleanup';
  window[cleanupKey]?.();

  let list = null;
  let indexList = null;
  let started = false;
  let active = true;
  let currentId = '';
  let missionEntries = [];
  let byId = new Map();
  let latestEntry = null;

  const labels = {
    missionIndexLabel: 'Mission Index',
    quickJump: 'Quick Jump',
    navigatorTitle: 'Mission Log Navigator',
    earliestFirst: 'Earliest first',
    missionLogLabel: 'Mission Log',
    latestFirst: 'Latest first'
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const escapeAttr = (value) => escapeHtml(value).replace(/'/g, '&#39;');

  const normaliseDate = (value) => {
    const match = String(value || '').match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
  };

  const dateScore = (value) => {
    const normalised = normaliseDate(value);
    return normalised ? Number(normalised.replaceAll('/', '')) : 0;
  };

  const compareEntries = (a, b) => {
    const scoreDiff = dateScore(b.date || b.isoDate) - dateScore(a.date || a.isoDate);
    return scoreDiff || Number(b.number || 0) - Number(a.number || 0);
  };

  const decodeTargetId = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const shouldReduceMotion = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const bindCurrentNodes = () => {
    list = document.querySelector('[data-mission-log-list]');
    indexList = document.querySelector('[data-mission-index-list]');
    return Boolean(list && indexList);
  };

  const applyStaticLabels = () => {
    document.querySelectorAll('[data-i18n-key]').forEach((node) => {
      const key = node.dataset.i18nKey;
      if (!key || !(key in labels)) return;
      node.textContent = labels[key];
    });
  };

  const loadMissionEntries = async () => {
    const protectedEntries = window.MadsProtectedArchive?.entries;
    if (!Array.isArray(protectedEntries)) {
      throw new Error('Protected Mission Log is locked');
    }

    missionEntries = protectedEntries;
    byId = new Map(missionEntries.map((entry) => [entry.id, entry]));
    latestEntry = [...missionEntries].sort(compareEntries)[0] || null;
    return missionEntries;
  };

  const renderNavigator = () => {
    const navigatorEntries = [...missionEntries].sort((a, b) => {
      const numberDiff = Number(a.number || 0) - Number(b.number || 0);
      return numberDiff || dateScore(a.date || a.isoDate) - dateScore(b.date || b.isoDate);
    });

    indexList.innerHTML = navigatorEntries.map((item) => {
      const id = escapeAttr(item.id);
      const logLabel = escapeHtml(item.label || `LOG ${String(item.number || 0).padStart(3, '0')}`);
      const sol = item.sol ? `SOL ${String(item.sol).padStart(3, '0')}` : '';
      const meta = [sol, normaliseDate(item.date || item.isoDate)].filter(Boolean).join(' &middot; ');
      return `
        <a class="mission-jump-card compact-jump-card" href="#${id}" data-mission-target="${id}">
          <span class="mission-jump-log">${logLabel}</span>
          <span class="mission-jump-meta">${meta}</span>
        </a>
      `;
    }).join('');
  };

  const setActiveLink = (id) => {
    indexList.querySelectorAll('.mission-jump-card').forEach((link) => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      link.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  const renderMissionEntry = (id, options = {}) => {
    const entry = byId.get(id) || latestEntry;
    if (!entry) return false;
    currentId = entry.id;

    list.innerHTML = `
      <article
        id="${escapeAttr(entry.id)}"
        class="research-note-card mission-log-entry"
        lang="en"
        data-log-date="${escapeAttr(entry.date)}"
        data-log-stage="${escapeAttr(entry.stage)}"
        data-log-question="${escapeAttr(entry.question)}"
        data-log-next-step="${escapeAttr(entry.nextStep)}"
        data-log-latest-note="${escapeAttr(entry.latestNote)}"
        data-log-stage-note="${escapeAttr(entry.stageNote)}"
        data-log-question-note="${escapeAttr(entry.questionNote)}"
        data-log-next-note="${escapeAttr(entry.nextNote)}"
      >
        <div class="research-note-date">${escapeHtml(entry.label)}</div>
        <div class="research-note-body">${entry.bodyHtml || ''}</div>
      </article>
    `;

    setActiveLink(entry.id);
    window.MadsMissionLightbox?.prepare?.(list);
    document.dispatchEvent(new CustomEvent('mads:mission-log-rendered', { detail: { id: entry.id } }));

    if (options.updateHash !== false && window.history?.pushState) {
      window.history.pushState(null, '', `#${encodeURIComponent(entry.id)}`);
    }

    if (options.scroll) {
      window.requestAnimationFrame(() => {
        document.getElementById(entry.id)?.scrollIntoView({
          block: 'start',
          inline: 'nearest',
          behavior: shouldReduceMotion() ? 'auto' : 'smooth'
        });
      });
    }

    return true;
  };

  const onIndexClick = (event) => {
    if (!active) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || !indexList.contains(link)) return;

    const targetId = decodeTargetId((link.getAttribute('href') || '').slice(1));
    if (!targetId) return;

    if (renderMissionEntry(targetId, { scroll: true })) {
      event.preventDefault();
    }
  };

  const resetRenderer = () => {
    indexList?.removeEventListener('click', onIndexClick);
    list?.classList.remove('is-loading');
    started = false;
    currentId = '';
    missionEntries = [];
    byId = new Map();
    latestEntry = null;
    document.documentElement.classList.remove('mission-index-ready');
    document.documentElement.classList.remove('mission-log-lazy-render');
    list = null;
    indexList = null;
  };

  const start = async () => {
    if (!active || started || !bindCurrentNodes()) return;
    started = true;

    try {
      list.classList.add('is-loading');
      await loadMissionEntries();
      if (!active || !list || !indexList) return;
      if (!missionEntries.length || !latestEntry) {
        throw new Error('Mission Log data is empty');
      }

      applyStaticLabels();
      renderNavigator();
      indexList.addEventListener('click', onIndexClick);

      const initialTargetId = window.location.hash ? decodeTargetId(window.location.hash.slice(1)) : '';
      const initialId = byId.has(initialTargetId) ? initialTargetId : list.dataset.initialLogId || latestEntry.id;
      renderMissionEntry(initialId, { updateHash: false, scroll: Boolean(initialTargetId) });

      document.documentElement.classList.add('mission-index-ready');
      document.documentElement.classList.add('mission-log-lazy-render');
    } catch (error) {
      started = false;
      if (active && list) list.innerHTML = `
        <article class="research-note-card mission-log-entry mission-log-entry-placeholder">
          <div class="research-note-date">ERROR</div>
          <div class="research-note-body">
            <p>Mission Log data could not be loaded. Please refresh the page and unlock again.</p>
          </div>
        </article>
      `;
    } finally {
      list?.classList.remove('is-loading');
    }
  };

  const cleanup = () => {
    if (!active) return;
    active = false;
    resetRenderer();
    document.removeEventListener('mads:research-unlocked', start);
    document.removeEventListener('mads:research-locked', resetRenderer);
    if (window[cleanupKey] === cleanup) delete window[cleanupKey];
  };

  document.addEventListener('mads:research-unlocked', start);
  document.addEventListener('mads:research-locked', resetRenderer);
  window[cleanupKey] = cleanup;

  const autoStart = document.querySelector('[data-mission-log-list]')?.dataset.missionAutoStart !== 'false';
  if (autoStart || document.documentElement.classList.contains('research-unlocked')) {
    start();
  }
})();
