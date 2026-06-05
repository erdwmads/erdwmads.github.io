
(() => {
  const root = document.documentElement;
  const body = document.body;

  if (body.dataset.interface2046 === 'ready') return;
  body.dataset.interface2046 = 'ready';

  const pageTitle = (document.title || 'Mads LIU YONG').split('|')[0].trim() || 'Mission File';
  const h1 = document.querySelector('main h1, .hero h1, .page-title');
  const route = (h1?.textContent || pageTitle).replace(/\s+/g, ' ').trim();

  const layer = document.createElement('div');
  layer.className = 'ui2046-layer';
  layer.setAttribute('aria-hidden', 'true');

  layer.innerHTML = `
    <div class="ui2046-progress"><span></span></div>
    <div class="ui2046-corner ui2046-corner-tl"></div>
    <div class="ui2046-corner ui2046-corner-br"></div>
    <div class="ui2046-orbit"></div>

    <aside class="ui2046-rail ui2046-left">
      <strong>ASTROMATERIALS</strong>
      <div class="ui2046-rail-line"></div>
      <span>CI1 · ORGUEIL · DOLOMITE</span>
    </aside>

    <aside class="ui2046-rail ui2046-right">
      <strong>${route}</strong>
      <div class="ui2046-rail-line"></div>
      <span>INTERFACE 2046</span>
    </aside>
  `;

  body.appendChild(layer);

  const bar = layer.querySelector('.ui2046-progress span');

  const updateProgress = () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || body.scrollTop;
    const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const pct = Math.min(100, Math.max(0, (scrollTop / max) * 100));
    bar.style.width = `${pct}%`;
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateProgress();
      ticking = false;
    });
  };

  updateProgress();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', updateProgress);
})();
