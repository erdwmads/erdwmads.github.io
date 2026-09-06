(() => {
  if (window.__madsMineralReady) return;
  window.__madsMineralReady = true;
  const root = document.documentElement;
  const desktop = matchMedia('(min-width: 761px) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fxAllowed = () => desktop.matches && !reduced.matches && !document.hidden &&
    !root.classList.contains('ambient-fx-disabled') && !window.__madsPowerState?.idle && !window.__madsPowerState?.lowPower;
  const svgNS = 'http://www.w3.org/2000/svg';
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  // Lucide share-2 and x, under the existing Lucide ISC licence.
  const networkIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98m-.01-10.98-6.82 3.98"/></svg>';

  const cleavage = document.createElementNS(svgNS, 'svg');
  cleavage.classList.add('mineral-cleavage');
  cleavage.setAttribute('aria-hidden', 'true');
  const fracture = document.createElementNS(svgNS, 'path');
  fracture.setAttribute('pathLength', '1');
  cleavage.append(fracture);
  document.body.append(cleavage);
  let fractureAnimation;
  function stopCleavage() {
    fractureAnimation?.cancel();
    fractureAnimation = null;
    cleavage.classList.remove('is-running');
  }
  function runCleavage() {
    stopCleavage();
    if (!fxAllowed()) return;
    const target = document.querySelector('.site-header [aria-current="page"]');
    if (!target) return;
    const box = target.getBoundingClientRect();
    const w = innerWidth, h = innerHeight;
    const x = box.left + box.width / 2, y = Math.min(box.bottom + 4, h - 70);
    cleavage.setAttribute('viewBox', `0 0 ${w} ${h}`);
    fracture.setAttribute('d', `M ${x} ${y} L ${x + 24} ${y + 24} L ${w - 38} ${y + 24} L ${w - 18} ${y + 44} L ${w - 18} ${h - 64} L ${w - 58} ${h - 24} L 40 ${h - 24}`);
    fractureAnimation = fracture.animate([
      { strokeDashoffset: 1, opacity: 0 },
      { strokeDashoffset: .75, opacity: .85, offset: .18 },
      { strokeDashoffset: 0, opacity: .6, offset: .7 },
      { strokeDashoffset: 0, opacity: 0 }
    ], { duration: 620, easing: 'ease-out' });
    cleavage.classList.add('is-running');
    fractureAnimation.onfinish = stopCleavage;
  }

  let polarTarget = null;
  let angle = 0;
  let pointerId = null;
  function setPolarisation(value) {
    angle = ((value % 360) + 360) % 360;
    root.style.setProperty('--mineral-angle', `${angle}deg`);
    root.style.setProperty('--mineral-colour', `hsl(${190 + angle * .7} 78% 66%)`);
    root.style.setProperty('--mineral-extinction', String(.08 + .92 * Math.pow(Math.sin(angle * Math.PI / 90), 2)));
    root.setAttribute('data-polarising', '');
    polarTarget?.setAttribute('aria-pressed', 'true');
  }
  function stopPolarisation() {
    root.removeAttribute('data-polarising');
    polarTarget?.setAttribute('aria-pressed', 'false');
    if (polarTarget?.hasPointerCapture?.(pointerId)) polarTarget.releasePointerCapture(pointerId);
    polarTarget = null;
    pointerId = null;
  }
  document.addEventListener('pointerdown', event => {
    const control = event.target.closest('[data-polarisation]');
    if (!control || event.button !== 0 || !fxAllowed()) return;
    polarTarget = control;
    pointerId = event.pointerId;
    control.setPointerCapture(pointerId);
    control.focus({ preventScroll: true });
    setPolarisation(angle || 30);
    event.preventDefault();
  });
  document.addEventListener('pointermove', event => {
    if (!polarTarget || pointerId !== event.pointerId) return;
    if (!fxAllowed()) return stopPolarisation();
    const box = polarTarget.getBoundingClientRect();
    setPolarisation(Math.atan2(event.clientY - box.top - box.height / 2, event.clientX - box.left - box.width / 2) * 180 / Math.PI + 90);
  }, { passive: true });
  document.addEventListener('pointerup', stopPolarisation);
  document.addEventListener('pointercancel', stopPolarisation);
  document.addEventListener('keydown', event => {
    if (!event.target.matches('[data-polarisation]') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key) || !fxAllowed()) return;
    event.preventDefault();
    polarTarget = event.target;
    setPolarisation(angle + (['ArrowLeft', 'ArrowDown'].includes(event.key) ? -12 : 12));
  });
  document.addEventListener('keyup', event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) stopPolarisation(); });
  document.addEventListener('focusout', event => { if (event.target === polarTarget) stopPolarisation(); });

  const atlas = element('dialog', 'evidence-atlas');
  atlas.setAttribute('aria-labelledby', 'atlas-title');
  atlas.innerHTML = '<header class="atlas-header"><div><p class="atlas-kicker">Orgueil / CI1</p><h2 id="atlas-title">Research atlas</h2></div><button type="button" class="atlas-close" aria-label="Close research atlas" title="Close"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg></button></header><div class="atlas-layout"><div class="atlas-map" role="group" aria-label="Source relationships"></div><section class="atlas-detail" aria-label="Selected sources" tabindex="0"></section></div><footer class="atlas-footer">Research context and source relationships; not a mineral identification.</footer>';
  document.body.append(atlas);
  const map = atlas.querySelector('.atlas-map');
  const detail = atlas.querySelector('.atlas-detail');
  let groups = [];
  let opener = null;
  let privateAtlas = false;
  let linkAnimation;
  function clearAtlas() {
    linkAnimation?.cancel();
    linkAnimation = null;
    groups = [];
    privateAtlas = false;
    map.replaceChildren();
    detail.replaceChildren();
    const wasOpen = root.classList.contains('mineral-atlas-open');
    root.classList.remove('mineral-atlas-open');
    if (wasOpen) window.dispatchEvent(new CustomEvent('mads:power-state', { detail: window.__madsPowerState }));
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  }
  function closeAtlas() {
    if (atlas.open) atlas.close();
    clearAtlas();
  }
  atlas.querySelector('.atlas-close').addEventListener('click', closeAtlas);
  atlas.addEventListener('close', () => { if (!atlas.open) clearAtlas(); });
  atlas.addEventListener('cancel', event => { event.preventDefault(); closeAtlas(); });
  atlas.addEventListener('click', event => { if (event.target === atlas) closeAtlas(); });
  function sourceAction(source, label, image = false) {
    const button = element('button', image ? 'atlas-image-source' : 'atlas-source-button');
    button.type = 'button';
    if (image) {
      const original = source.querySelector('img');
      const thumbnail = element('img');
      thumbnail.src = original.currentSrc || original.src;
      thumbnail.alt = '';
      thumbnail.loading = 'lazy';
      thumbnail.decoding = 'async';
      button.append(thumbnail);
    }
    button.append(element('span', '', label));
    button.addEventListener('click', () => {
      closeAtlas();
      if (source.isConnected && root.classList.contains('research-unlocked')) {
        if (!source.hasAttribute('tabindex')) {
          source.tabIndex = -1;
          source.addEventListener('blur', () => source.removeAttribute('tabindex'), { once: true });
        }
        source.scrollIntoView({ block: 'center', behavior: 'instant' });
        source.focus({ preventScroll: true });
        if (image) source.click();
      }
    });
    return button;
  }
  function renderDetail(group) {
    detail.replaceChildren(element('p', 'atlas-kicker', group.kind), element('h3', '', group.title));
    if (group.text) detail.append(element('p', 'atlas-description', group.text));
    for (const item of group.items || []) {
      const row = element('article', 'atlas-source');
      if (item.figure) row.append(sourceAction(item.figure, item.title, true));
      else if (item.table) {
        row.append(element('h4', '', item.title));
        const scroll = element('div', 'atlas-table-scroll');
        const table = item.table.cloneNode(true);
        table.removeAttribute('id');
        table.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        scroll.append(table);
        row.append(scroll, sourceAction(item.table, 'View in Mission Log'));
      } else {
        if (item.title) row.append(element('h4', '', item.title));
        if (item.text) row.append(element('p', '', item.text));
        if (item.href) {
          const link = element('a', '', item.linkLabel || 'Open source');
          link.href = item.href;
          row.append(link);
        }
        if (item.source) row.append(sourceAction(item.source, 'View original record'));
      }
      detail.append(row);
    }
    if (!group.items?.length && !group.text) detail.append(element('p', '', 'No source of this type is recorded in this entry.'));
    detail.scrollTop = 0;
  }
  const locations = [[50, 50], [19, 23], [81, 23], [81, 77], [19, 77]];
  function selectGroup(id) {
    const group = groups.find(item => item.id === id);
    if (!group) return;
    map.querySelectorAll('.atlas-node').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.group === id)));
    map.querySelectorAll('[data-connection]').forEach(path => path.classList.toggle('is-selected', path.dataset.connection === id));
    renderDetail(group);
    linkAnimation?.cancel();
    const line = map.querySelector(`[data-connection="${id}"]`);
    if (line && fxAllowed()) linkAnimation = line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, easing: 'ease-out' });
  }
  function openAtlas(button, source) {
    const dataNode = document.querySelector('[data-public-atlas-data]');
    if (!dataNode) return;
    const data = JSON.parse(dataNode.content.textContent);
    if (source && (!root.classList.contains('research-unlocked') || !window.MadsProtectedArchive)) return;
    closeAtlas();
    opener = button;
    privateAtlas = Boolean(source);
    const papers = data.literature.map(paper => ({ title: paper.title, text: `${paper.authors}. ${paper.summary}`, href: paper.href, linkLabel: 'Paper Shelf record' }));
    const question = source?.dataset.logQuestion || data.question;
    const rootGroup = { id: 'question', label: source ? source.querySelector('.research-note-date').textContent : 'Orgueil CI1', kind: 'Working question', title: question, text: source?.dataset.logQuestionNote || 'Formation conditions investigated through texture, chemistry and crystal structure.', items: source ? [
      { title: 'Current stage', text: source.dataset.logStage },
      { title: 'Next step', text: source.dataset.logNextStep }
    ] : [
      { title: 'Research scope', text: 'Carbonate formation, clay-mineral surfaces and aqueous alteration in a primitive asteroidal parent body.' },
      { title: 'Analytical approach', text: 'Mineralogical, chemical and crystallographic observations from micro- to nanometre scales.' }
    ] };
    if (source) {
      const figures = [...source.querySelectorAll('.mission-photo-grid figure')].filter(figure => figure.querySelector('img'));
      const tables = [...source.querySelectorAll('table')];
      groups = [rootGroup,
        { id: 'images', label: 'Figures', kind: 'Recorded observations', title: 'Images from this entry', items: figures.map((figure, i) => ({ figure, title: figure.querySelector('figcaption')?.textContent.trim() || `Figure ${i + 1}` })) },
        { id: 'tables', label: 'Tables', kind: 'Recorded data', title: 'Tables from this entry', items: tables.map((table, i) => ({ table, title: table.querySelector('caption')?.textContent || `Table ${i + 1}` })) },
        { id: 'record', label: 'Record', kind: 'Mission Log', title: source.querySelector('h3, h2')?.textContent || 'Original record', items: [{ title: 'Current stage', text: source.dataset.logStage }, { title: 'Latest note', text: source.dataset.logLatestNote }, { title: 'Next step', text: source.dataset.logNextStep, source }] },
        { id: 'literature', label: 'Background', kind: 'Project bibliography / not entry-specific citations', title: 'Related reading', items: papers }
      ];
    } else {
      groups = [rootGroup,
        { id: 'methods', label: 'Methods', kind: 'Planned analytical pathway', title: 'Texture, chemistry, structure', items: data.methods },
        { id: 'material', label: 'Material', kind: 'Research context', title: 'Dolomite in Orgueil CI1', text: 'The project connects carbonate formation, clay-mineral surfaces and parent-body aqueous alteration. Mineral identity requires chemical and structural evidence.' },
        { id: 'archive', label: 'Mission Log', kind: 'Protected source', title: 'Experimental records', items: [{ text: 'Observations and data remain in the password-protected graduation research archive.', href: 'research-graduation.html', linkLabel: 'Open protected archive' }] },
        { id: 'literature', label: 'Background', kind: 'Project bibliography', title: 'Related reading', items: papers }
      ];
    }
    const lines = document.createElementNS(svgNS, 'svg');
    lines.setAttribute('viewBox', '0 0 1000 640');
    lines.setAttribute('preserveAspectRatio', 'none');
    lines.setAttribute('aria-hidden', 'true');
    groups.slice(1).forEach((group, i) => {
      const [x, y] = locations[i + 1];
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', `M 500 320 L ${x * 10} 320 L ${x * 10} ${y * 6.4}`);
      path.setAttribute('pathLength', '1');
      path.dataset.connection = group.id;
      lines.append(path);
    });
    map.append(lines);
    groups.forEach((group, i) => {
      const node = element('button', `atlas-node${i === 0 ? ' atlas-core' : ''}`);
      node.type = 'button';
      node.dataset.group = group.id;
      node.setAttribute('aria-pressed', 'false');
      node.style.left = `${locations[i][0]}%`;
      node.style.top = `${locations[i][1]}%`;
      if (i === 0) {
        const img = element('img');
        img.src = 'assets/img/affiliation/mineralogy-laboratory-logo.png';
        img.alt = '';
        node.append(img);
      } else node.append(element('span', 'atlas-node-index', `0${i}`));
      node.append(element('strong', '', group.label));
      if (group.items && i !== 0) node.append(element('small', '', `${group.items.length} ${group.items.length === 1 ? 'source' : 'sources'}`));
      node.addEventListener('click', () => selectGroup(group.id));
      map.append(node);
    });
    root.classList.add('mineral-atlas-open');
    window.dispatchEvent(new CustomEvent('mads:power-state', { detail: window.__madsPowerState }));
    atlas.showModal();
    selectGroup('question');
    atlas.querySelector('.atlas-close').focus();
  }
  function enhance() {
    document.querySelectorAll('[data-polarisation]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    document.querySelectorAll('[data-public-atlas]').forEach(button => { if (!button.querySelector('svg')) button.insertAdjacentHTML('afterbegin', networkIcon); });
    const source = document.querySelector('.mission-log-entry:not(.mission-log-entry-placeholder)');
    if (source && root.classList.contains('research-unlocked') && !source.querySelector('[data-private-atlas]')) {
      const button = element('button', 'button atlas-launch', 'Evidence atlas');
      button.type = 'button';
      button.setAttribute('data-private-atlas', '');
      button.insertAdjacentHTML('afterbegin', networkIcon);
      source.querySelector('.research-note-body').prepend(button);
    }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-public-atlas], [data-private-atlas]');
    if (button) openAtlas(button, button.hasAttribute('data-private-atlas') ? button.closest('.mission-log-entry') : null);
  });
  function stopEffects() { stopCleavage(); stopPolarisation(); linkAnimation?.cancel(); }
  window.addEventListener('mads:soft-nav-start', () => { stopEffects(); closeAtlas(); });
  window.addEventListener('mads:soft-nav-ready', () => { enhance(); runCleavage(); });
  document.addEventListener('mads:mission-log-rendered', () => { if (privateAtlas) closeAtlas(); enhance(); });
  document.addEventListener('mads:research-locked', closeAtlas);
  window.addEventListener('pagehide', () => { stopEffects(); closeAtlas(); });
  window.addEventListener('blur', stopEffects);
  window.addEventListener('mads:fx-state', () => { if (!fxAllowed()) stopEffects(); });
  window.addEventListener('mads:power-state', () => { if (!fxAllowed()) stopEffects(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopEffects(); });
  desktop.addEventListener('change', stopEffects);
  reduced.addEventListener('change', stopEffects);
  enhance();
})();
