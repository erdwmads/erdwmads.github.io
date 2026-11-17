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
  const documentPath = window.location.pathname;

  const labels = {
    missionIndexLabel: 'Mission Index',
    quickJump: 'Experiment Timeline',
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

  // The Mission Index is a sticky ledger at 1200 px and wider and a disclosure below (MissionLogShell.astro).
  const ledgerQuery = window.matchMedia?.('(min-width: 1200px)');

  const solLabel = (entry) => (entry.sol ? `SOL ${String(entry.sol).padStart(3, '0')}` : '');

  const isoDate = (value) => normaliseDate(value).replaceAll('/', '-');

  // A ledger row's title: the entry's own title, else the text of the first h3 in its record (parsed inertly, as
  // renderComparisonFigure does), else its stage.
  const entryTitle = (entry) => {
    if (entry.title) return entry.title;
    const template = document.createElement('template');
    template.innerHTML = entry.bodyHtml || '';
    return template.content.querySelector('h3')?.textContent.trim() || entry.stage || '';
  };

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

    // Ledger rows read SOL | date | title; without a SOL the LOG label takes its place, otherwise it stays as
    // hidden text so every row still names its record number.
    indexList.innerHTML = navigatorEntries.map((item) => {
      const id = escapeAttr(item.id);
      const logLabel = escapeHtml(item.label || `LOG ${String(item.number || 0).padStart(3, '0')}`);
      const sol = escapeHtml(solLabel(item));
      const date = normaliseDate(item.date || item.isoDate);
      return `
        <a class="mission-jump-card" href="#${id}" data-mission-target="${id}">
          <span class="mission-jump-sol tabular">${sol || logLabel}</span>
          <time class="mission-jump-date"${date ? ` datetime="${isoDate(date)}"` : ''}>${date}</time>
          <span class="mission-jump-title">${escapeHtml(entryTitle(item))}</span>
          ${sol ? `<span class="mission-jump-log visually-hidden">${logLabel}</span>` : ''}
        </a>
      `;
    }).join('');
  };

  // The summary of the closed ledger states the record count ("Mission Index · 11 records").
  const writeRecordCount = () => {
    const count = missionEntries.length;
    document.querySelectorAll('[data-i18n-key="missionIndexCount"]').forEach((node) => {
      node.textContent = `${count} ${count === 1 ? 'record' : 'records'}`;
    });
  };

  // Forced open at 1200 px and wider, closed by default below; the reader's own toggle is left alone until the
  // breakpoint changes. The content goes from hidden to shown in this frame, so opening it here never animates.
  const syncLedger = () => {
    const ledger = indexList?.closest?.('details');
    if (ledger) ledger.open = Boolean(ledgerQuery?.matches);
  };

  const setActiveLink = (id) => {
    indexList.querySelectorAll('.mission-jump-card').forEach((link) => {
      const active = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', active);
      link.setAttribute('aria-current', active ? 'true' : 'false');
      if (!active) return;
      // Keep the current row in view inside a list that scrolls (the sticky ledger); a list that scrolls sideways
      // centres it instead. Only the list scrolls, never the page.
      if (indexList.scrollHeight > indexList.clientHeight + 1) {
        const offset = link.getBoundingClientRect().top - indexList.getBoundingClientRect().top;
        indexList.scrollTo?.({ top: indexList.scrollTop + offset - (indexList.clientHeight - link.offsetHeight) / 2, behavior: 'instant' });
      } else if (indexList.scrollWidth > indexList.clientWidth + 1) {
        indexList.scrollTo?.({ left: link.offsetLeft - indexList.offsetLeft - (indexList.clientWidth - link.offsetWidth) / 2, behavior: 'instant' });
      }
    });
  };

  const onLedgerBreakpoint = () => {
    if (!active || !started || !indexList) return;
    syncLedger();
    if (currentId) setActiveLink(currentId);
  };

  const renderProgress = (entry) => `<dl class="mission-progress">${[
    ['Recorded', entry.latestNote || entry.stageNote || entry.stage],
    ['Still open', entry.questionNote || entry.question],
    ['Next step', entry.nextNote || entry.nextStep]
  ].map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value || 'Not specified in this record.')}</dd></div>`).join('')}</dl>`;

  const renderComparisonFigure = (entry) => {
    const template = document.createElement('template');
    template.innerHTML = entry.bodyHtml || '';
    const figure = template.content.querySelector('figure');
    const img = figure?.querySelector('img');
    if (!img) return '';
    return `<figure class="mission-comparison-figure"><img src="${escapeAttr(img.getAttribute('src'))}"
      data-full-src="${escapeAttr(img.getAttribute('data-full-src') || img.getAttribute('src'))}"
      alt="${escapeAttr(img.getAttribute('alt') || entry.label)}" loading="lazy" decoding="async">
      <figcaption>${escapeHtml(figure.querySelector('figcaption')?.textContent || '')}</figcaption></figure>`;
  };

  const renderComparison = (selectedId) => {
    const panel = list.querySelector('[data-mission-comparison]');
    const current = byId.get(currentId);
    if (!panel || !current) return;
    const ordered = [...missionEntries].sort(compareEntries);
    const alternatives = ordered.filter(entry => entry.id !== currentId);
    const previous = ordered[ordered.indexOf(current) + 1];
    const selected = alternatives.find(entry => entry.id === selectedId) || previous || alternatives[0];
    if (!selected) return;
    const pair = [selected, current].sort((a, b) => -compareEntries(a, b));
    panel.innerHTML = `<div class="mission-comparison-toolbar"><label for="mission-compare-date">Compare with</label>
      <select id="mission-compare-date" data-mission-compare-select>${alternatives.map(entry => `
        <option value="${escapeAttr(entry.id)}"${entry.id === selected.id ? ' selected' : ''}>${escapeHtml(normaliseDate(entry.date || entry.isoDate))} / ${escapeHtml(entry.label)}</option>`).join('')}</select></div>
      <div class="mission-comparison-grid">${pair.map(entry => `
        <section class="mission-comparison-record" aria-label="${escapeAttr(entry.label)} comparison">
          <h4>${escapeHtml(entry.label)} <time>${escapeHtml(normaliseDate(entry.date || entry.isoDate))}</time></h4>
          ${renderProgress(entry)}${renderComparisonFigure(entry)}</section>`).join('')}</div>
      <p class="mission-comparison-note">Records reflect what was known on each date; planned steps are not completion claims. Images show different fields of view and are not spatially registered.</p>`;
    window.MadsMissionLightbox?.prepare?.(panel);
  };

  const onComparisonClick = (event) => {
    const button = event.target.closest('[data-mission-compare-toggle]');
    if (!button || !list?.contains(button)) return;
    const panel = list.querySelector('[data-mission-comparison]');
    const opening = panel.hidden;
    if (opening) renderComparison();
    else panel.innerHTML = '';
    panel.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    button.textContent = opening ? 'Close comparison' : 'Compare records';
  };

  const onComparisonChange = (event) => {
    if (!event.target.matches('[data-mission-compare-select]')) return;
    renderComparison(event.target.value);
    list.querySelector('[data-mission-compare-select]')?.focus({ preventScroll: true });
  };

  const renderMissionEntry = (id, options = {}) => {
    const entry = byId.get(id) || latestEntry;
    if (!entry) return false;
    currentId = entry.id;
    const sol = escapeHtml(solLabel(entry));
    const date = normaliseDate(entry.date || entry.isoDate);

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
        <div class="research-note-body">
          <header class="mission-record-header">
            <div class="mission-record-meta">${sol ? `<span class="mission-record-sol tabular">${sol}</span>` : ''}<span class="research-note-date">${escapeHtml(entry.label)}</span><time${date ? ` datetime="${isoDate(date)}"` : ''}>${date}</time></div>
            <div class="mission-record-actions" role="group" aria-label="Record tools">
              ${missionEntries.length > 1 ? '<button type="button" class="button secondary mission-compare-toggle" data-mission-compare-toggle aria-expanded="false" aria-controls="mission-comparison">Compare records</button>' : ''}
            </div>
          </header>
          <div class="mission-progress-heading"><span>RECORD BRIEF</span></div>
          ${renderProgress(entry)}
          ${missionEntries.length > 1 ? '<div id="mission-comparison" data-mission-comparison hidden></div>' : ''}
          <div class="mission-original-record">${entry.bodyHtml || ''}</div>
        </div>
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
      // Below 1200 px the index is a disclosure above the entry, so focus follows the reader down to the record
      // instead of staying on a row that has scrolled away.
      const record = !ledgerQuery?.matches && document.getElementById(targetId);
      if (record) {
        record.setAttribute('tabindex', '-1');
        record.focus({ preventScroll: true });
      }
    }
  };

  const onLocationChange = () => {
    if (!active || !started || !list?.isConnected || window.location.pathname !== documentPath) return;
    const target = decodeTargetId(window.location.hash.slice(1)) || list.dataset.initialLogId || latestEntry?.id;
    if (target !== currentId && byId.has(target)) renderMissionEntry(target, { updateHash: false, scroll: true });
  };

  const resetRenderer = () => {
    indexList?.removeEventListener('click', onIndexClick);
    list?.removeEventListener('click', onComparisonClick);
    list?.removeEventListener('change', onComparisonChange);
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
      writeRecordCount();
      // Open the ledger before the first entry renders, so the current row can be scrolled into view.
      syncLedger();
      indexList.addEventListener('click', onIndexClick);
      list.addEventListener('click', onComparisonClick);
      list.addEventListener('change', onComparisonChange);

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
    window.removeEventListener('popstate', onLocationChange);
    window.removeEventListener('hashchange', onLocationChange);
    ledgerQuery?.removeEventListener?.('change', onLedgerBreakpoint);
    if (window[cleanupKey] === cleanup) delete window[cleanupKey];
  };

  document.addEventListener('mads:research-unlocked', start);
  document.addEventListener('mads:research-locked', resetRenderer);
  window.addEventListener('popstate', onLocationChange);
  window.addEventListener('hashchange', onLocationChange);
  ledgerQuery?.addEventListener?.('change', onLedgerBreakpoint);
  window[cleanupKey] = cleanup;

  const autoStart = document.querySelector('[data-mission-log-list]')?.dataset.missionAutoStart !== 'false';
  if (autoStart || document.documentElement.classList.contains('research-unlocked')) {
    start();
  }
})();
