
(() => {
  const progress = document.querySelector('[data-mission-project="graduation"]');
  const miniIndex = document.querySelector('[data-mission-mini-index]');

  const fallback = {
    latest: '2026/05/11',
    stage: 'Dry polishing and resin re-impregnation plan'
  };

  const normaliseDate = (text) => {
    const match = String(text || '').match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (!match) return '';
    return `${match[1]}/${match[2]}/${match[3]}`;
  };

  const logNumber = (entry) => {
    const text = entry.querySelector('.research-note-date')?.textContent || '';
    const match = text.match(/LOG\s*(\d+)/i);
    return match ? Number(match[1]) : 0;
  };

  const getSol = (entry) => {
    const text = entry.querySelector('.mission-entry-kicker')?.textContent || '';
    const match = text.match(/SOL\s*(\d+)/i);
    return match ? `SOL ${match[1]}` : '';
  };

  const normaliseStage = (entry) => {
    if (entry.dataset.logStage) return entry.dataset.logStage;
    const heading = entry.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    return heading.includes('·') ? heading.split('·').pop().trim() : heading;
  };

  const parseEntries = (htmlText) => {
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    const entries = Array.from(doc.querySelectorAll('.mission-log-entry')).map((entry) => ({
      no: logNumber(entry),
      id: entry.id || `log-${String(logNumber(entry)).padStart(3, '0')}`,
      latest: normaliseDate(entry.dataset.logDate || entry.querySelector('.mission-entry-kicker')?.textContent),
      stage: normaliseStage(entry),
      sol: getSol(entry)
    }));

    entries.sort((a, b) => {
      const da = a.latest || '0000/00/00';
      const db = b.latest || '0000/00/00';
      if (da !== db) return db.localeCompare(da);
      return b.no - a.no;
    });

    return entries;
  };

  const applyProgress = (latest) => {
    if (!progress || !latest) return;

    const latestEl = progress.querySelector('[data-mission-latest]');
    const stageEl = progress.querySelector('[data-mission-stage]');
    const noteEl = document.querySelector('[data-mission-sync-note]');

    if (latestEl) latestEl.textContent = latest.latest || fallback.latest;
    if (stageEl) stageEl.textContent = latest.stage || fallback.stage;
    progress.classList.remove('is-syncing');
    progress.classList.add('is-synced');

    if (noteEl) noteEl.textContent = 'Auto-synced from the latest Mission Log entry.';
  };

  const applyMiniIndex = (entries) => {
    if (!miniIndex || !entries?.length) return;

    miniIndex.innerHTML = entries.slice(0, 8).map((item) => {
      const logLabel = `LOG ${String(item.no).padStart(3, '0')}`;
      const meta = [item.sol, item.latest].filter(Boolean).join(' · ');
      return `
        <a class="research-log-index-link" href="research-graduation.html#${item.id}">
          <span>${logLabel}</span>
          <strong>${item.stage}</strong>
          <em>${meta}</em>
        </a>
      `;
    }).join('');
  };

  const sync = async () => {
    if (progress) progress.classList.add('is-syncing');

    try {
      const response = await fetch('research-graduation.html', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entries = parseEntries(await response.text());

      applyProgress(entries[0] || fallback);
      applyMiniIndex(entries);
    } catch (error) {
      if (progress) {
        const latestEl = progress.querySelector('[data-mission-latest]');
        const stageEl = progress.querySelector('[data-mission-stage]');
        if (latestEl) latestEl.textContent = fallback.latest;
        if (stageEl) stageEl.textContent = fallback.stage;
        progress.classList.remove('is-syncing');
      }
    }
  };

  sync();
})();
