
(() => {
  const body = document.body;

  if (body.dataset.interface2046 === 'ready') return;
  body.dataset.interface2046 = 'ready';

  const pageTitle = (document.title || 'Mads LIU YONG').split('|')[0].trim() || 'Mission File';
  const h1 = document.querySelector('main h1, .hero h1, .page-title');
  const route = (h1?.textContent || pageTitle).replace(/\s+/g, ' ').trim();

  const orbitData = [
    { name: 'Mercury', w: 18, h: 11, angle: 26,  size: 2.0, color: 'rgba(180,190,196,.72)', cls: 'inner', alpha: .10 },
    { name: 'Venus',   w: 25, h: 16, angle: 142, size: 2.6, color: 'rgba(230,202,154,.68)', cls: 'inner', alpha: .11 },
    { name: 'Earth',   w: 33, h: 22, angle: 315, size: 3.2, color: 'rgba(143,208,255,.82)', cls: 'earth', alpha: .17 },
    { name: 'Mars',    w: 42, h: 29, angle: 214, size: 2.7, color: 'rgba(225,145,110,.70)', cls: 'inner', alpha: .12 },
    { name: 'Jupiter', w: 56, h: 39, angle: 12,  size: 5.0, color: 'rgba(232,202,166,.66)', cls: 'giant', alpha: .13 },
    { name: 'Saturn',  w: 68, h: 49, angle: 168, size: 4.4, color: 'rgba(220,205,158,.58)', cls: 'giant', alpha: .12 },
    { name: 'Uranus',  w: 79, h: 59, angle: 52,  size: 3.7, color: 'rgba(154,220,222,.56)', cls: 'giant', alpha: .105 },
    { name: 'Neptune', w: 89, h: 68, angle: 236, size: 3.7, color: 'rgba(126,164,235,.58)', cls: 'giant', alpha: .105 },
    { name: 'Pluto',   w: 98, h: 80, angle: 326, size: 2.4, color: 'rgba(212,202,190,.56)', cls: 'dwarf', alpha: .15 }
  ];

  const orbitMarkup = orbitData.map((o) => {
    const radians = o.angle * Math.PI / 180;
    const left = 50 + Math.cos(radians) * 50;
    const top = 50 + Math.sin(radians) * 50;

    return `
      <span class="ui2046-system-orbit ${o.cls}" style="--w:${o.w}%;--h:${o.h}%;--alpha:${o.alpha};">
        <span class="ui2046-planet" style="--left:${left.toFixed(3)}%;--top:${top.toFixed(3)}%;--size:${o.size}px;--color:${o.color};"></span>
      </span>
    `;
  }).join('');

  const layer = document.createElement('div');
  layer.className = 'ui2046-layer';
  layer.setAttribute('aria-hidden', 'true');

  layer.innerHTML = `
    <div class="ui2046-progress"><span></span></div>

    <div class="ui2046-solar-system">
      <span class="ui2046-kuiper-belt"></span>
      <span class="ui2046-planet sun-marker" style="--left:50%;--top:50%;--size:6px;--color:rgba(255,217,154,.72);"></span>
      ${orbitMarkup}
      <span class="ui2046-system-label" style="--label-left:84%;--label-top:22%;">Kuiper Belt</span>
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
