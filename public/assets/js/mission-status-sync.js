(() => {
  const grid = document.querySelector('[data-mission-status-grid]');
  if (!grid) return;

  const normaliseDate = (text) => {
    const match = String(text || '').match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
  };

  const dateScore = (value) => {
    const normalised = normaliseDate(value);
    return normalised ? Number(normalised.replaceAll('/', '')) : 0;
  };

  const dataEl = document.getElementById('mission-log-data');
  const entries = (() => {
    try {
      const parsed = JSON.parse(dataEl?.textContent || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  })();

  const latestEntry = entries.sort((a, b) => {
    const scoreDiff = dateScore(b.date || b.isoDate) - dateScore(a.date || a.isoDate);
    return scoreDiff || Number(b.number || 0) - Number(a.number || 0);
  })[0];

  if (!latestEntry) return;

  const values = {
    'latest-date': latestEntry.date || normaliseDate(latestEntry.isoDate),
    'latest-note': latestEntry.latestNote || 'Latest Mission Log entry added.',
    'current-stage': latestEntry.stage || 'Mission Log updated',
    'stage-note': latestEntry.stageNote || 'Current sample preparation stage updated from the latest Mission Log entry.',
    'current-question': latestEntry.question || 'Dolomite in Orgueil CI1',
    'question-note': latestEntry.questionNote || 'What mineralogical conditions controlled dolomite formation in primitive CI1 chondritic material?',
    'next-step': latestEntry.nextStep || 'Next preparation step',
    'next-note': latestEntry.nextNote || 'Continue the next sample-preparation step based on the latest Mission Log entry.'
  };

  Object.entries(values).forEach(([field, value]) => {
    const el = grid.querySelector(`[data-status-field="${field}"]`);
    if (el) el.textContent = value;
  });

  grid.classList.add('is-status-synced');
})();
