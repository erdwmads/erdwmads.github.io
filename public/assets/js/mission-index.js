(() => {
  const list = document.querySelector('[data-mission-log-list]');
  const indexList = document.querySelector('[data-mission-index-list]');
  const dataEl = document.getElementById('mission-log-data');
  if (!list || !indexList || !dataEl) return;

  let started = false;

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

  const decodeTargetId = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const shouldReduceMotion = () => {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  };

  const missionEntries = (() => {
    try {
      const parsed = JSON.parse(dataEl.textContent || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  })();

  if (!missionEntries.length) return;

  const byId = new Map(missionEntries.map((entry) => [entry.id, entry]));
  const latestEntry = [...missionEntries].sort((a, b) => {
    const scoreDiff = dateScore(b.date || b.isoDate) - dateScore(a.date || a.isoDate);
    return scoreDiff || Number(b.number || 0) - Number(a.number || 0);
  })[0];

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

  function renderMissionEntry(id, options = {}) {
    const entry = byId.get(id) || latestEntry;
    if (!entry) return false;

    const article = `
      <article
        id="${escapeAttr(entry.id)}"
        class="research-note-card mission-log-entry"
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

    list.innerHTML = article;
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
  }

  const start = () => {
    if (started) return;
    started = true;

    renderNavigator();

    indexList.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || !indexList.contains(link)) return;

      const href = link.getAttribute('href') || '';
      const targetId = decodeTargetId(href.slice(1));
      if (!targetId) {
        event.preventDefault();
        return;
      }

      if (renderMissionEntry(targetId, { scroll: true })) {
        event.preventDefault();
      }
    });

    const initialTargetId = window.location.hash ? decodeTargetId(window.location.hash.slice(1)) : '';
    const initialId = byId.has(initialTargetId) ? initialTargetId : list.dataset.initialLogId || latestEntry.id;
    renderMissionEntry(initialId, { updateHash: false, scroll: Boolean(initialTargetId) });

    const mode = document.querySelector('.mission-index-mode');
    if (mode) mode.textContent = 'Earliest first';

    document.documentElement.classList.add('mission-index-ready');
    document.documentElement.classList.add('mission-log-lazy-render');
  };

  const lockContent = document.querySelector('[data-research-lock-content]');
  const gate = document.querySelector('[data-research-lock-gate]');
  if (gate && lockContent?.hidden && !document.documentElement.classList.contains('research-log-unlocked')) {
    document.addEventListener('mads:research-log-unlocked', start, { once: true });
  } else {
    start();
  }
})();
