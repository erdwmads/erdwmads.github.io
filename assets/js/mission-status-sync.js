
(() => {
  const grid = document.querySelector('[data-mission-status-grid]');
  if (!grid) return;

  const entries = Array.from(document.querySelectorAll('.mission-log-entry'));
  if (!entries.length) return;

  const latestEntry = entries[entries.length - 1];

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
    'latest-date': get('logDate', dateFromText() || '2026/05/01'),
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
