
(() => {
  const grid = document.querySelector('[data-mission-status-grid]');
  if (!grid) return;

  const normaliseDate = (text) => {
    const match = String(text || '').match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
  };

  const logNumber = (entry) => {
    const text = entry.querySelector('.research-note-date')?.textContent || '';
    const match = text.match(/LOG\s*(\d+)/i);
    return match ? Number(match[1]) : 0;
  };

  const entries = Array.from(document.querySelectorAll('.mission-log-entry')).sort((a, b) => {
    const da = normaliseDate(a.dataset.logDate) || '0000/00/00';
    const db = normaliseDate(b.dataset.logDate) || '0000/00/00';
    if (da !== db) return db.localeCompare(da);
    return logNumber(b) - logNumber(a);
  });

  if (!entries.length) return;

  const latestEntry = entries[0];

  const get = (key, fallback = '') => {
    const value = latestEntry.dataset[key];
    return value && value.trim() ? value.trim() : fallback;
  };

  const dateFromText = () => {
    const kicker = latestEntry.querySelector('.mission-entry-kicker')?.textContent || '';
    const match = kicker.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
  };

  const stageFromHeading = () => {
    const heading = latestEntry.querySelector('h3')?.textContent || '';
    const clean = heading.replace(/\s+/g, ' ').trim();
    return clean.includes('·') ? clean.split('·').pop().trim() : clean;
  };

  const values = {
    'latest-date': get('logDate', dateFromText() || '2026/05/11'),
    'latest-note': get('logLatestNote', 'Latest Mission Log entry added.'),
    'current-stage': get('logStage', stageFromHeading() || 'Mission Log updated'),
    'stage-note': get('logStageNote', 'Current sample preparation stage updated from the latest Mission Log entry.'),
    'current-question': get('logQuestion', 'Dolomite in Orgueil CI1'),
    'question-note': get('logQuestionNote', 'What mineralogical conditions controlled dolomite formation in primitive CI1 chondritic material?'),
    'next-step': get('logNextStep', 'Next preparation step'),
    'next-note': get('logNextNote', 'Continue the next sample-preparation step based on the latest Mission Log entry.')
  };

  Object.entries(values).forEach(([field, value]) => {
    const el = grid.querySelector(`[data-status-field="${field}"]`);
    if (el) el.textContent = value;
  });

  grid.classList.add('is-status-synced');
})();
