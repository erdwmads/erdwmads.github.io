
(() => {
  const progress = document.querySelector('[data-mission-project="graduation"]');
  if (!progress) return;

  const fallback = {
    latest: '2026/05/11',
    stage: 'Dry polishing and resin re-impregnation plan'
  };

  const latestEl = progress.querySelector('[data-mission-latest]');
  const stageEl = progress.querySelector('[data-mission-stage]');
  const noteEl = document.querySelector('[data-mission-sync-note]');

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

  const normaliseStage = (entry) => {
    if (entry.dataset.logStage) return entry.dataset.logStage;
    const heading = entry.querySelector('h3')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    return heading.includes('·') ? heading.split('·').pop().trim() : heading;
  };

  const parseEntries = (htmlText) => {
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    const entries = Array.from(doc.querySelectorAll('.mission-log-entry')).map((entry) => ({
      no: logNumber(entry),
      latest: normaliseDate(entry.dataset.logDate || entry.querySelector('.mission-entry-kicker')?.textContent),
      stage: normaliseStage(entry)
    }));

    entries.sort((a, b) => {
      const da = a.latest || '0000/00/00';
      const db = b.latest || '0000/00/00';
      if (da !== db) return db.localeCompare(da);
      return b.no - a.no;
    });

    return entries;
  };

  const applyProgress = (latest, synced = false) => {
    if (latestEl) latestEl.textContent = latest.latest || fallback.latest;
    if (stageEl) stageEl.textContent = latest.stage || fallback.stage;
    progress.classList.remove('is-syncing');
    progress.classList.toggle('is-synced', synced);

    if (noteEl) {
      noteEl.textContent = synced
        ? 'Auto-synced from the latest Mission Log entry.'
        : 'Showing the latest saved Mission Log summary.';
    }
  };

  const sync = async () => {
    progress.classList.add('is-syncing');

    try {
      const response = await fetch('research-graduation.html', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const entries = parseEntries(await response.text());
      applyProgress(entries[0] || fallback, true);
    } catch (error) {
      applyProgress(fallback, false);
    }
  };

  sync();
})();
