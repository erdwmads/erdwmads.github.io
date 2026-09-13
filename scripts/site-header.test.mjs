import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/assets/js/site-header.js', import.meta.url), 'utf8');
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
  let error;
  try { vm.runInNewContext(source, { document, window, AbortController }); } catch (caught) { error = caught; }
  const clickLink = (options = {}) => listeners.get('navigation:click')({ target: { closest: () => link }, button: 0, ...options });
  return { document, toggle, link, rootAttributes, error, clickLink, listeners, open: () => listeners.get('toggle:click')(), isOpen: () => classes.has('mobile-nav-open') };
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
