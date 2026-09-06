(function () {
  if (window.__madsResearchScale) {
    window.__madsResearchScale.init();
    return;
  }

  function select(section, tab, focus = false) {
    section.querySelectorAll('[role="tab"]').forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      const panel = section.querySelector(`#${item.getAttribute('aria-controls')}`);
      panel.hidden = !active;
      panel.inert = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });
    if (focus) tab.focus({ preventScroll: true });
  }

  function syncFx(event) {
    const enabled = typeof event?.detail?.enabled === 'boolean'
      ? event.detail.enabled
      : document.querySelector('.ambient-fx-toggle')?.getAttribute('aria-pressed') === 'true';
    document.querySelectorAll('[data-research-scale]').forEach(section => {
      section.toggleAttribute('data-scale-fx', enabled);
    });
  }

  function init() {
    document.querySelectorAll('[data-research-scale]').forEach(section => {
      const active = section.querySelector('[role="tab"][aria-selected="true"]') || section.querySelector('[role="tab"]');
      select(section, active);
      section.setAttribute('data-scale-ready', '');
      section.querySelector('[data-scale-tabs]').hidden = false;
    });
    syncFx();
  }

  // Document delegation retains no replaced main/panel nodes across soft navigation.
  document.addEventListener('click', event => {
    const tab = event.target.closest?.('[data-research-scale] [role="tab"]');
    if (tab) select(tab.closest('[data-research-scale]'), tab);
  });
  document.addEventListener('keydown', event => {
    const tab = event.target.closest?.('[data-research-scale] [role="tab"]');
    if (!tab || event.altKey || event.ctrlKey || event.metaKey) return;
    const section = tab.closest('[data-research-scale]');
    const tabs = [...section.querySelectorAll('[role="tab"]')];
    let index = tabs.indexOf(tab);
    if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else return;
    event.preventDefault();
    select(section, tabs[index], true);
  });
  window.addEventListener('mads:soft-nav-ready', init);
  window.addEventListener('pageshow', init);
  window.addEventListener('mads:fx-state', syncFx);
  window.__madsResearchScale = { init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
