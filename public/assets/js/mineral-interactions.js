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
    atlas.classList.remove('atlas-public');
    map.setAttribute('role', 'group');
    map.setAttribute('aria-label', 'Source relationships');
    map.removeAttribute('aria-orientation');
    detail.removeAttribute('role');
    detail.removeAttribute('aria-labelledby');
    detail.removeAttribute('id');
    detail.setAttribute('aria-label', 'Selected sources');
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
  atlas.addEventListener('keydown', event => {
    if (privateAtlas || event.key !== 'Tab') return;
    const controls = [...atlas.querySelectorAll('button, a[href], [tabindex]')].filter(node => node.tabIndex >= 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
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
    if (group.id === 'material' && !privateAtlas) {
      const figure = element('figure', 'atlas-specimen');
      const img = element('img');
      img.src = 'assets/img/research-scale/orgueil-smithsonian.jpg';
      img.alt = 'Orgueil meteorite specimen USNM 388 in the Smithsonian collection.';
      img.width = 1200;
      img.height = 800;
      const caption = element('figcaption', '', 'Orgueil, USNM 388. Chip Clark / Smithsonian, CC0. A reference specimen, not the author\'s experimental sample. ');
      const credit = element('a', '', 'Specimen record');
      credit.href = 'https://naturalhistory.si.edu/object/nmnhmineralsciences_1017941';
      caption.append(credit);
      figure.append(img, caption);
      detail.append(figure);
    }
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
        if (item.answer) {
          const answer = element('p');
          answer.append(element('strong', '', 'Answers: '), item.answer);
          const limitation = element('p');
          limitation.append(element('strong', '', 'Limitations: '), item.limitation);
          row.append(answer, limitation);
        }
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
    if (!privateAtlas) {
      map.querySelectorAll('[role="tab"]').forEach(button => {
        const selected = button.dataset.group === id;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      detail.setAttribute('aria-labelledby', `atlas-step-${id}`);
    }
    map.querySelectorAll('.atlas-node').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.group === id)));
    map.querySelectorAll('[data-connection]').forEach(path => path.classList.toggle('is-selected', path.dataset.connection === id));
    renderDetail(group);
    linkAnimation?.cancel();
    const line = map.querySelector(`[data-connection="${id}"]`);
    if (line && fxAllowed()) linkAnimation = line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, easing: 'ease-out' });
  }
  function renderPublicWorkflow(data, papers) {
    atlas.classList.add('atlas-public');
    map.setAttribute('role', 'tablist');
    map.setAttribute('aria-label', 'Research workflow');
    map.setAttribute('aria-orientation', 'vertical');
    detail.id = 'atlas-workflow-detail';
    detail.setAttribute('role', 'tabpanel');
    detail.removeAttribute('aria-label');
    groups = [
      { id: 'material', label: 'Material', summary: 'Orgueil CI1 meteorite', kind: '01 / Material', title: 'Orgueil CI1', text: 'A meteorite record of water-rock interaction. This project studies dolomite and its relationship to the surrounding clay-rich material.', items: [
        { title: 'From specimen to mineral', text: 'The photograph shows the meteorite, not an identified dolomite grain. Mineral identity requires chemical and structural evidence.' }
      ] },
      { id: 'question', label: 'Question', summary: 'How did dolomite form?', kind: '02 / Question', title: 'How did dolomite form in Orgueil?', text: data.question, items: [
        { title: 'Where did the crystals grow?', text: 'Do dolomite grains touch clay minerals, fill spaces, or replace earlier material? Textures help test these possibilities.' },
        { title: 'What can the crystals tell us about water?', text: 'Can their chemical composition and crystal structure constrain the conditions of water-rock interaction on the parent body?' },
        { title: 'Did clay surfaces influence growth?', text: 'Do mineral contacts preserve evidence of a relationship between clay surfaces and dolomite growth? A nearby grain alone does not establish how it formed.' }
      ] },
      { id: 'methods', label: 'Methods', summary: 'SEM / EPMA / XRD / TEM', kind: '03 / Methods', title: 'Connect texture, chemistry and structure', text: 'Each method addresses a different part of the question. This analytical pathway is not a claim that every measurement has been completed.', items: [
        { title: 'SEM / Scanning electron microscopy', answer: 'Where are the grains, what shapes do they have, and how do they meet the surrounding material? Electron images reveal textures; EDS can screen elemental composition.', limitation: 'Brightness alone cannot identify dolomite. EDS signals can mix adjacent phases and do not establish crystal structure.', href: 'https://serc.carleton.edu/research_education/geochemsheets/techniques/SEM.html', linkLabel: 'SEM method reference' },
        { title: 'EPMA / Electron probe microanalysis', answer: 'How much Ca, Mg, Fe and other measured elements are present, and how does composition vary across a grain?', limitation: 'Small grains or inclusions can yield mixed analyses. Quantitative chemistry needs standards and corrections; chemistry alone does not establish atomic ordering.', href: 'https://www.dal.ca/sites/electron-microprobe-lab/analysis/drg4.html', linkLabel: 'EPMA method reference' },
        { title: 'XRD / X-ray diffraction', answer: 'Which crystal structure is present? Single-grain diffraction can test lattice parameters and atomic ordering.', limitation: 'A suitable crystalline grain and usable diffraction are required. Mixed phases or weak diffraction complicate interpretation, and diffraction does not by itself explain a growth history.', href: 'https://serc.carleton.edu/research_education/geochemsheets/techniques/SXD.html', linkLabel: 'XRD method reference' },
        { title: 'TEM / Transmission electron microscopy', answer: 'What happens at the nanometre-scale contact between minerals? Imaging and electron diffraction can examine local structure and orientation.', limitation: 'An electron-transparent specimen requires preparation. The observed region is very small, so it must be related back to the wider texture.', href: 'https://www.nlr.gov/materials-science/transmission-electron-microscopy', linkLabel: 'TEM method reference' }
      ] },
      { id: 'evidence', label: 'Evidence', summary: 'Public reading / locked records', kind: '04 / Evidence', title: 'What is public, and what is protected?', text: 'Public references provide research context, not this project\'s experimental results.', items: [
        { title: 'Public references', text: 'Published studies from the Paper Shelf. These are project background, not entry-specific citations or proof of a result in this project.' },
        { title: 'Locked experiments', text: 'Experimental images, measurements and interpretations remain in the password-protected Mission Log. They are not loaded into this public atlas.', href: 'research-graduation.html', linkLabel: 'Open protected archive' },
        ...papers
      ] }
    ];
    groups.forEach((group, i) => {
      const tab = element('button', 'atlas-step');
      tab.type = 'button';
      tab.id = `atlas-step-${group.id}`;
      tab.dataset.group = group.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', detail.id);
      tab.setAttribute('aria-selected', 'false');
      tab.tabIndex = -1;
      const number = element('span', 'atlas-step-number', `0${i + 1}`);
      number.setAttribute('aria-hidden', 'true');
      const label = element('span', 'atlas-step-label');
      label.append(element('strong', '', group.label), element('small', '', group.summary));
      tab.append(number, label);
      tab.addEventListener('click', () => selectGroup(group.id));
      tab.addEventListener('keydown', event => {
        if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? groups.length - 1 : (i + (event.key === 'ArrowDown' ? 1 : -1) + groups.length) % groups.length;
        selectGroup(groups[index].id);
        map.querySelectorAll('[role="tab"]')[index].focus();
      });
      map.append(tab);
    });
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
      renderPublicWorkflow(data, papers);
    }
    if (source) {
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
    }
    root.classList.add('mineral-atlas-open');
    window.dispatchEvent(new CustomEvent('mads:power-state', { detail: window.__madsPowerState }));
    atlas.showModal();
    selectGroup(source ? 'question' : 'material');
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
      (source.querySelector('.mission-record-actions') || source.querySelector('.research-note-body')).append(button);
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
