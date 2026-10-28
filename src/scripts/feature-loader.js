// The heavier page features load only where their root element exists: once when the shell module runs and
// again after each soft navigation swaps in a new page. Each feature module initialises itself when it is
// imported after parsing (its own readyState check) and keeps its own soft-navigation and pageshow/pagehide
// listeners, so a later visit to its page mounts it again without another import.
const features = [
  ['[data-planetary-explorer]', () => import('./planetary-explorer.js')],
  ['.origins-study', () => import('./origins-study/loader.js')],
  ['[data-sample-missions]', () => import('./sample-missions/loader.js')],
  ['[data-image-inspector]', () => import('./image-inspector.js')]
];
const requested = new Set();

function loadFeatures() {
  for (const [selector, load] of features) {
    if (requested.has(selector) || !document.querySelector(selector)) continue;
    requested.add(selector);
    // A failed fetch is tried again on the next page that needs the feature.
    load().catch(error => { requested.delete(selector); console.error(error); });
  }
}

loadFeatures();
// mads:soft-nav-content fires right after the new <main> is in place, before the scroll position is restored.
window.addEventListener('mads:soft-nav-content', loadFeatures);
// Start fetching the Origins scene while the pointer or focus is on its header link.
for (const type of ['pointerover', 'focusin']) document.addEventListener(type, event => {
  if (event.target?.closest?.('.site-header a[href="origins-study.html"]')) import('./origins-study/main.js').catch(() => {});
});
