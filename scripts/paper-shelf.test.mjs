import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/assets/js/paper-shelf.js', import.meta.url), 'utf8');
class Element {
  constructor(dataset = {}) { this.dataset = dataset; this.value = ''; this.hidden = false; this.textContent = ''; this.listeners = new Map(); this.attributes = {}; this.isConnected = true; }
  addEventListener(type, fn) { this.listeners.set(type, [...(this.listeners.get(type) || []), fn]); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== fn)); }
  async emit(type) { for (const fn of this.listeners.get(type) || []) await fn({}); }
  setAttribute(key, value) { this.attributes[key] = value; }
  focus() { this.focused = true; }
  select() { this.selected = true; }
  querySelector(selector) { return this.children?.[selector] || null; }
}
function setup({ url = 'https://example.test/paper-shelf.html', clipboard } = {}) {
  const search = new Element(), count = new Element(), empty = new Element(), reset = new Element();
  const filters = ['', 'ci-orgueil', 'methods'].map(paperFilter => new Element({ paperFilter }));
  const cards = [new Element({ paperText: 'Endreß & Bischoff Parent-body evolution', paperFilters: 'ci-orgueil' }), new Element({ paperText: 'King X–ray diffraction', paperFilters: 'methods' })];
  const button = new Element({ paperReference: 'Endreß & Bischoff (1996). Parent-body evolution. https://doi.org/10.1234/example' });
  const status = new Element(), fallback = new Element(), textarea = new Element();
  fallback.hidden = true;
  cards[0].children = { '[data-paper-copy]': button, '[data-paper-copy-status]': status, '[data-paper-copy-fallback]': fallback, '[data-paper-reference-text]': textarea };
  const single = { '[data-paper-search]': search, '[data-paper-count]': count, '[data-paper-empty]': empty, '[data-paper-reset]': reset };
  const document = { querySelector: key => single[key] || null, querySelectorAll: key => ({ '[data-paper-card]': cards, '[data-paper-filter]': filters, '[data-paper-copy]': [button] })[key] || [] };
  const window = new Element();
  const location = new URL(url);
  const history = { state: { madsScrollY: 420, madsSoftNav: true }, replaceState(state, _, href) { this.state = state; location.href = href; } };
  const context = vm.createContext({ document, window, location, history, navigator: { clipboard }, URL });
  vm.runInContext(source, context);
  return { search, filters, cards, count, empty, reset, button, status, fallback, textarea, location, history, window, context };
}

test('search folds sharp s and dash variants without changing displayed query', async () => {
  const page = setup();
  for (const query of ['Endress', 'ENDREẞ', 'parent–body', 'parent—body', 'parent‑body']) {
    page.search.value = query;
    await page.search.emit('input');
    assert.equal(page.cards[0].hidden, false, query);
    assert.equal(page.search.value, query);
  }
  page.search.value = 'x-ray';
  await page.search.emit('input');
  assert.equal(page.cards[1].hidden, false);
});

test('restores initial URL query and filter, and persists changes without losing navigation state', async () => {
  const page = setup({ url: 'https://example.test/paper-shelf.html?source=reading&q=Endress&filter=ci-orgueil#paper-1' });
  assert.equal(page.search.value, 'Endress');
  assert.equal(page.cards[1].hidden, true);
  assert.equal(page.filters[1].attributes['aria-pressed'], 'true');
  page.search.value = 'X-ray';
  await page.search.emit('input');
  await page.filters[2].emit('click');
  assert.equal(page.location.searchParams.get('q'), 'X-ray');
  assert.equal(page.location.searchParams.get('filter'), 'methods');
  assert.equal(page.location.searchParams.get('source'), 'reading');
  assert.equal(page.location.hash, '#paper-1');
  assert.equal(page.history.state.madsScrollY, 420);
  assert.equal(page.history.state.madsSoftNav, true);
  await page.reset.emit('click');
  assert.equal(page.location.searchParams.has('q'), false);
  assert.equal(page.location.searchParams.has('filter'), false);
  assert.equal(page.cards.every(card => !card.hidden), true);
});

test('popstate restores controls and new shelf instance restores URL after soft navigation', async () => {
  const page = setup();
  page.location.href = 'https://example.test/paper-shelf.html?q=x-ray&filter=methods';
  await page.window.emit('popstate');
  assert.equal(page.search.value, 'x-ray');
  assert.equal(page.cards[0].hidden, true);
  await page.window.emit('mads:soft-nav-before-swap');
  assert.equal((page.window.listeners.get('popstate') || []).length, 0);
  const next = setup({ url: page.location.href });
  assert.equal(next.search.value, 'x-ray');
  assert.equal(next.cards[1].hidden, false);
});

test('copies existing reference text and announces success', async () => {
  let copied;
  const page = setup({ clipboard: { async writeText(value) { copied = value; } } });
  await page.button.emit('click');
  assert.equal(copied, page.button.dataset.paperReference);
  assert.match(page.status.textContent, /copied/i);
  assert.equal(page.fallback.hidden, true);
});

for (const clipboard of [undefined, { async writeText() { throw new Error('NotAllowedError'); } }]) {
  test(`offers selected manual reference when clipboard is ${clipboard ? 'denied' : 'unavailable'}`, async () => {
    const page = setup({ clipboard });
    await page.button.emit('click');
    assert.equal(page.fallback.hidden, false);
    assert.equal(page.textarea.value, page.button.dataset.paperReference);
    assert.equal(page.textarea.focused, true);
    assert.equal(page.textarea.selected, true);
    assert.match(page.status.textContent, /copy.*manually/i);
  });
}
