let leave = () => {};

function enter() {
  const guide = document.querySelector('[data-research-guide]');
  if (!guide || guide.hasAttribute('data-ready')) return;
  leave();
  const main = guide.closest('main');
  const toggle = guide.querySelector('[data-research-guide-toggle]');
  const current = guide.querySelector('[data-research-guide-current]');
  const links = [...guide.querySelectorAll('a[href^="#"]')];
  const targets = links.map(link => document.getElementById(link.hash.slice(1)));
  if (targets.some(target => !target)) return;
  const abort = new AbortController();
  const {signal} = abort;
  const mobile = matchMedia('(max-width: 760px)');
  let frame = 0;
  let disposed = false;

  function close() {
    guide.removeAttribute('data-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  function update() {
    frame = 0;
    if (disposed) return;
    const height = mobile.matches ? toggle.getBoundingClientRect().height : guide.getBoundingClientRect().height;
    const offset = Math.ceil(height + (mobile.matches ? 20 : 32));
    const value = offset + 'px';
    if (main.style.getPropertyValue('--research-guide-offset') !== value) main.style.setProperty('--research-guide-offset', value);
    let active = 0;
    targets.forEach((target, index) => { if (target.getBoundingClientRect().top <= offset + 5) active = index; });
    if (scrollY > 0 && scrollY + innerHeight >= document.scrollingElement.scrollHeight - 2 && targets.at(-1).getBoundingClientRect().top < innerHeight) active = targets.length - 1;
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    current.textContent = links[active].dataset.sectionLabel;
  }
  function schedule() {
    if (!disposed && !frame) frame = requestAnimationFrame(update);
  }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    guide.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }, {signal});
  guide.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    const index = links.indexOf(link);
    if (index < 0) return;
    close();
    targets[index].setAttribute('tabindex', '-1');
    targets[index].focus({preventScroll: true});
    schedule();
  }, {signal});
  guide.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !guide.hasAttribute('data-open')) return;
    event.preventDefault();
    close();
    toggle.focus({preventScroll: true});
  }, {signal});
  window.addEventListener('scroll', schedule, {passive: true, signal});
  let wasMobile = mobile.matches;
  let breakpointFocus;
  guide.addEventListener('focusout', event => {
    if (!event.relatedTarget && wasMobile !== mobile.matches) breakpointFocus = event.target;
  }, {signal});
  window.addEventListener('resize', () => {
    if (wasMobile !== mobile.matches) {
      const focused = document.activeElement === document.body ? breakpointFocus : document.activeElement;
      breakpointFocus = undefined;
      close();
      if (mobile.matches && links.includes(focused)) toggle.focus({preventScroll: true});
      else if (!mobile.matches && focused === toggle) (links.find(link => link.hasAttribute('aria-current')) || links[0]).focus({preventScroll: true});
      wasMobile = mobile.matches;
    }
    schedule();
  }, {signal});
  const observer = new ResizeObserver(schedule);
  observer.observe(guide);
  guide.setAttribute('data-ready', '');
  document.documentElement.setAttribute('data-research-reading', '');
  toggle.hidden = false;
  update();
  document.fonts.ready.then(schedule);
  leave = () => {
    disposed = true;
    abort.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    main.style.removeProperty('--research-guide-offset');
    guide.removeAttribute('data-ready');
    document.documentElement.removeAttribute('data-research-reading');
    close();
    toggle.hidden = true;
  };
}
window.addEventListener('mads:soft-nav-before-swap', () => leave());
window.addEventListener('mads:soft-nav-content', enter);
window.addEventListener('mads:soft-nav-end', enter);
window.addEventListener('pagehide', () => leave());
window.addEventListener('pageshow', enter);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enter, {once: true});
else enter();
