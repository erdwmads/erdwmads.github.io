
(() => {
  const list = document.querySelector('[data-mission-log-list]');
  const indexList = document.querySelector('[data-mission-index-list]');
  if (!list || !indexList) return;

  const normaliseDate = (value) => {
    const match = String(value || '').match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
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

  const entries = Array.from(list.querySelectorAll('.mission-log-entry')).map((entry) => {
    const no = logNumber(entry);
    const id = entry.id || `log-${String(no).padStart(3, '0')}`;
    entry.id = id;

    return {
      entry,
      id,
      no,
      date: normaliseDate(entry.dataset.logDate),
      sol: getSol(entry)
    };
  });

  entries.sort((a, b) => {
    const da = a.date || '0000/00/00';
    const db = b.date || '0000/00/00';
    if (da !== db) return db.localeCompare(da);
    return b.no - a.no;
  });

  const fragment = document.createDocumentFragment();
  entries.forEach(({ entry }) => fragment.appendChild(entry));
  list.appendChild(fragment);

  indexList.innerHTML = entries.map((item) => {
    const logLabel = `LOG ${String(item.no).padStart(3, '0')}`;
    const meta = [item.sol, item.date].filter(Boolean).join(' · ');
    return `
      <a class="mission-jump-card compact-jump-card" href="#${item.id}">
        <span class="mission-jump-log">${logLabel}</span>
        <span class="mission-jump-meta">${meta}</span>
      </a>
    `;
  }).join('');

  document.documentElement.classList.add('mission-index-ready');
})();
