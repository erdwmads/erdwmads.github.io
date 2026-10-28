import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/assets/js/site-header.js', import.meta.url), 'utf8');
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
function setup({ missingToggle = false, failInitialization = false } = {}) {
  const listeners = new Map();
  const rootAttributes = new Map();
  const classes = new Set();
  const document = {
    activeElement: null,
    documentElement: {
      setAttribute: (key, value) => rootAttributes.set(key, value),
      removeAttribute: (key) => rootAttributes.delete(key),
      classList: {
        contains: (name) => classes.has(name),
        remove: (name) => classes.delete(name),
        toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
      },
    },
    addEventListener: (name, callback) => listeners.set(`document:${name}`, callback),
  };
  const attributes = new Map();
  const toggle = {
    setAttribute: (key, value) => attributes.set(key, value),
    getAttribute: (key) => attributes.get(key),
    addEventListener: (name, callback) => listeners.set(`toggle:${name}`, callback),
    focus: () => { document.activeElement = toggle; },
  };
  const link = { getAttribute: () => null, hasAttribute: () => false };
  const navigation = {
    addEventListener: (name, callback) => listeners.set(`navigation:${name}`, callback),
    contains: (element) => element === link,
  };
  const media = { matches: true, addEventListener() { if (failInitialization) throw new Error('initialization interrupted'); } };
  document.querySelector = (selector) => selector === '[data-nav-toggle]' ? (missingToggle ? null : toggle) : navigation;
  const window = { matchMedia: () => media, addEventListener: (name, callback) => listeners.set(`window:${name}`, callback) };
  const context = vm.createContext({ document, window, AbortController });
  const run = () => vm.runInContext(source, context);
  let error;
  try { run(); } catch (caught) { error = caught; }
  const clickLink = (options = {}) => listeners.get('navigation:click')({ target: { closest: () => link }, button: 0, ...options });
  return { document, window, toggle, link, rootAttributes, error, run, clickLink, listeners, open: () => listeners.get('toggle:click')(), isOpen: () => classes.has('mobile-nav-open') };
}

test('navigation becomes collapsible only after successful initialization', () => {
  assert.equal(setup().rootAttributes.has('data-nav-ready'), true);
  assert.equal(setup({ missingToggle: true }).rootAttributes.has('data-nav-ready'), false);
  const interrupted = setup({ failInitialization: true });
  assert.match(interrupted.error.message, /initialization interrupted/);
  assert.equal(interrupted.rootAttributes.has('data-nav-ready'), false);
});

for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
  test(`a non-navigation click preserves the open menu: ${JSON.stringify(options)}`, () => {
    const header = setup();
    header.open();
    header.document.activeElement = header.link;
    header.clickLink(options);
    assert.equal(header.isOpen(), true);
    assert.equal(header.document.activeElement, header.link);
  });
}

test('closing a focused navigation link moves focus to the visible toggle', () => {
  const header = setup();
  header.open();
  header.document.activeElement = header.link;
  header.clickLink();
  assert.equal(header.isOpen(), false);
  assert.equal(header.document.activeElement, header.toggle);
});

test('Escape closes navigation and restores toggle focus', () => {
  const header = setup();
  header.open();
  header.listeners.get('document:keydown')({ key: 'Escape' });
  assert.equal(header.isOpen(), false);
  assert.equal(header.document.activeElement, header.toggle);
});

test('a second run replaces the first controller and leaves the navigation ready and closed', () => {
  const header = setup();
  const first = header.window.__madsSiteHeaderAbort;
  header.open();
  header.run();
  assert.equal(first.signal.aborted, true);
  assert.notEqual(header.window.__madsSiteHeaderAbort, first);
  assert.equal(header.window.__madsSiteHeaderAbort.signal.aborted, false);
  assert.equal(header.rootAttributes.has('data-nav-ready'), true);
  assert.equal(header.isOpen(), false);
});

test('the header controller is inlined right after the header and runs once per page load', () => {
  const shell = read('../src/components/LegacyShell.astro');
  assert.match(shell, /import siteHeaderSource from "\.\.\/\.\.\/public\/assets\/js\/site-header\.js\?raw";/);
  assert.match(shell, /<\/header>\s*<script is:inline data-site-header set:html=\{siteHeaderSource\}><\/script>\s*<main\b/);
  const navigation = read('../public/assets/js/legacy-navigation.js');
  // Soft navigation re-runs only data-page-script scripts; the inline header controller never carries the attribute.
  assert.ok(navigation.includes(`nextDoc.querySelectorAll('body script[data-page-script], body script[type="module"][src]')`),'soft navigation must not re-run the header controller or the entrance opener');
  assert.doesNotMatch(shell, /data-site-header[^>]*data-page-script|data-page-script[^>]*data-site-header/);
  assert.equal(navigation.includes('assets/js/site-header.js'), false, 'site-header.js is no longer a soft-navigation script');
  assert.equal(read('../src/data/site.ts').includes('assets/js/site-header.js'), false, 'site-header.js must not also load as an external script');
});
