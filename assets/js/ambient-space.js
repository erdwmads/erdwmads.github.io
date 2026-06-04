
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const layer = document.createElement('div');
  layer.className = 'ambient-space-layer';
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(layer);

    function makeDust() {
      const el = document.createElement('span');
      el.className = 'ambient-dust';
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      const dx = (Math.random() - 0.5) * 90;
      const dy = -30 - Math.random() * 70;
      const dur = 16 + Math.random() * 20;
      const delay = -Math.random() * dur;
      const size = 1.8 + Math.random() * 3.2;
      el.style.left = left + '%';
      el.style.top = top + '%';
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.setProperty('--dust-x', dx + 'px');
      el.style.setProperty('--dust-y', dy + 'px');
      el.style.animationDuration = dur + 's';
      el.style.animationDelay = delay + 's';
      layer.appendChild(el);
    }

    function makePebble() {
      const el = document.createElement('span');
      el.className = 'ambient-pebble';
      const left = Math.random() * 100;
      const top = 10 + Math.random() * 80;
      const dx = (Math.random() - 0.5) * 110;
      const dy = (Math.random() - 0.5) * 90;
      const dur = 28 + Math.random() * 26;
      const delay = -Math.random() * dur;
      const size = 5 + Math.random() * 7;
      el.style.left = left + '%';
      el.style.top = top + '%';
      el.style.width = size + 'px';
      el.style.height = (size * (0.8 + Math.random() * 0.5)) + 'px';
      el.style.setProperty('--pebble-x', dx + 'px');
      el.style.setProperty('--pebble-y', dy + 'px');
      el.style.animationDuration = dur + 's';
      el.style.animationDelay = delay + 's';
      layer.appendChild(el);
    }

    function makeMeteor() {
      const el = document.createElement('span');
      el.className = 'ambient-meteor';
      const left = 70 + Math.random() * 28;
      const top = 6 + Math.random() * 36;
      const dx = -260 - Math.random() * 360;
      const dy = 150 + Math.random() * 280;
      const dur = 6 + Math.random() * 5;
      const delay = -Math.random() * dur;
      const len = 54 + Math.random() * 86;
      el.style.left = left + '%';
      el.style.top = top + '%';
      el.style.width = len + 'px';
      el.style.setProperty('--meteor-x', dx + 'px');
      el.style.setProperty('--meteor-y', dy + 'px');
      el.style.animationDuration = dur + 's';
      el.style.animationDelay = delay + 's';
      layer.appendChild(el);
    }

    for (let i = 0; i < 80; i++) makeDust();
    for (let i = 0; i < 16; i++) makePebble();
    for (let i = 0; i < 7; i++) makeMeteor();
  });
})();
