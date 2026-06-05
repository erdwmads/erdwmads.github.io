
(() => {
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

    <div class="ui2046-solar-system">
      <span class="ui2046-kuiper-belt"></span>
      <span class="ui2046-system-core"></span>

      <span class="ui2046-system-orbit inner" style="--w:18%;--h:11%;--px:45%;--py:-2%;"></span>
      <span class="ui2046-system-orbit inner" style="--w:25%;--h:16%;--px:-43%;--py:4%;"></span>
      <span class="ui2046-system-orbit earth" style="--w:33%;--h:22%;--px:37%;--py:-12%;"></span>
      <span class="ui2046-system-orbit inner" style="--w:42%;--h:29%;--px:-34%;--py:-14%;"></span>
      <span class="ui2046-system-orbit giant" style="--w:56%;--h:39%;--px:47%;--py:6%;--planet:4.5px;"></span>
      <span class="ui2046-system-orbit giant" style="--w:68%;--h:49%;--px:-45%;--py:9%;--planet:4px;"></span>
      <span class="ui2046-system-orbit giant" style="--w:79%;--h:59%;--px:30%;--py:23%;--planet:3.5px;"></span>
      <span class="ui2046-system-orbit giant" style="--w:89%;--h:68%;--px:-29%;--py:-24%;--planet:3.5px;"></span>

      <span class="ui2046-system-orbit dwarf" style="--w:98%;--h:80%;--px:42%;--py:-31%;"></span>
    </div>

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
