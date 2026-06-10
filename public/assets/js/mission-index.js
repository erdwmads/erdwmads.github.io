(() => {
  const list = document.querySelector('[data-mission-log-list]');
  const indexList = document.querySelector('[data-mission-index-list]');
  if (!list || !indexList) return;

  const normaliseDate = (value) => {
    const match = String(value || '').match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
  };

  const dateScore = (value) => {
    const normalised = normaliseDate(value);
    return normalised ? Number(normalised.replaceAll('/', '')) : 0;
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

    const rawDate = entry.dataset.logDate || entry.querySelector('.mission-entry-kicker')?.textContent || '';

    return {
      entry,
      id,
      no,
      date: normaliseDate(rawDate),
      score: dateScore(rawDate),
      sol: getSol(entry)
    };
  });

  // Keep the actual Mission Log content list newest-first.
  const logEntries = [...entries].sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.no - a.no;
  });

  const fragment = document.createDocumentFragment();
  logEntries.forEach(({ entry }) => fragment.appendChild(entry));
  list.appendChild(fragment);

  // But keep the Navigator chronological: LOG001 -> LOG006.
  const navigatorEntries = [...entries].sort((a, b) => {
    if (a.no !== b.no) return a.no - b.no;
    return a.score - b.score;
  });

  indexList.innerHTML = navigatorEntries.map((item) => {
    const logLabel = `LOG ${String(item.no).padStart(3, '0')}`;
    const meta = [item.sol, item.date].filter(Boolean).join(' · ');
    return `
      <a class="mission-jump-card compact-jump-card" href="#${item.id}">
        <span class="mission-jump-log">${logLabel}</span>
        <span class="mission-jump-meta">${meta}</span>
      </a>
    `;
  }).join('');

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

  const scrollToMissionEntry = (id, options = {}) => {
    const targetId = String(id || '').replace(/^#/, '');
    if (!targetId) return false;

    const target = document.getElementById(targetId);
    if (!target) return false;

    target.scrollIntoView({
      block: 'start',
      inline: 'nearest',
      behavior: shouldReduceMotion() ? 'auto' : 'smooth'
    });

    if (options.updateHash !== false && window.history?.pushState) {
      window.history.pushState(null, '', `#${encodeURIComponent(targetId)}`);
    }

    return true;
  };

  indexList.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !indexList.contains(link)) return;

    const href = link.getAttribute('href') || '';
    const targetId = decodeTargetId(href.slice(1));
    if (!targetId) {
      event.preventDefault();
      return;
    }

    if (scrollToMissionEntry(targetId)) {
      event.preventDefault();
    }
  });

  const initialTargetId = window.location.hash ? decodeTargetId(window.location.hash.slice(1)) : '';
  if (initialTargetId) {
    window.requestAnimationFrame(() => {
      scrollToMissionEntry(initialTargetId, { updateHash: false });
    });
  }

  const mode = document.querySelector('.mission-index-mode');
  if (mode) mode.textContent = 'Earliest first';

  document.documentElement.classList.add('mission-index-ready');
})();
