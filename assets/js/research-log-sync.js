
(() => {
  const progress = document.querySelector('[data-mission-project="graduation"]');
  if (!progress) return;

  const latestEl = progress.querySelector('[data-mission-latest]');
  const stageEl = progress.querySelector('[data-mission-stage]');
  const noteEl = document.querySelector('[data-mission-sync-note]');

  const fallback = {
    latest: '2026/05/01',
    stage: 'IsoMet cutting and polishing test'
  };

  const normaliseDate = (text) => {
    const match = String(text || '').match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (!match) return fallback.latest;
    return `${match[1]}/${match[2]}/${match[3]}`;
  };

  const normaliseStage = (text) => {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return fallback.stage;
    const afterDot = clean.includes('·') ? clean.split('·').pop().trim() : clean;
    return afterDot || fallback.stage;
  };

  const apply = ({ latest, stage, synced = false }) => {
    if (latestEl) latestEl.textContent = latest || fallback.latest;
    if (stageEl) stageEl.textContent = stage || fallback.stage;
    progress.classList.remove('is-syncing');
    progress.classList.toggle('is-synced', synced);
    if (noteEl) {
      noteEl.textContent = synced
        ? 'Auto-synced from the latest Mission Log entry.'
        : 'Showing the latest saved Mission Log summary.';
    }
  };

  const parse = (htmlText) => {
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    const entries = Array.from(doc.querySelectorAll('.mission-log-entry'));
    if (!entries.length) return fallback;

    const latestEntry = entries[entries.length - 1];
    const kicker = latestEntry.querySelector('.mission-entry-kicker')?.textContent || '';
    const heading = latestEntry.querySelector('h3')?.textContent || '';

    return {
      latest: normaliseDate(kicker),
      stage: normaliseStage(heading)
    };
  };

  const sync = async () => {
    progress.classList.add('is-syncing');

    try {
      const response = await fetch('research-graduation.html', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const htmlText = await response.text();
      apply({ ...parse(htmlText), synced: true });
    } catch (error) {
      apply({ ...fallback, synced: false });
    }
  };

  sync();
})();
