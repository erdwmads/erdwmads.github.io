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
  querySelectorAll(selector) { return this.lists?.[selector] || []; }
}
function setup({ url = 'https://example.test/paper-shelf.html', clipboard } = {}) {
  const search = new Element(), count = new Element(), empty = new Element(), reset = new Element();
  const filters = ['', 'ci-orgueil', 'methods'].map(paperFilter => new Element({ paperFilter }));
  const cards = [new Element({ paperText: 'Endreß & Bischoff Parent-body evolution', paperFilters: 'ci-orgueil' }), new Element({ paperText: 'King X–ray diffraction', paperFilters: 'methods' })];
  const button = new Element({ paperReference: 'Endreß & Bischoff (1996). Parent-body evolution. https://doi.org/10.1234/example' });
  const status = new Element(), fallback = new Element(), textarea = new Element();
  fallback.hidden = true;
  cards[0].children = { '[data-paper-copy]': button, '[data-paper-copy-status]': status, '[data-paper-copy-fallback]': fallback, '[data-paper-reference-text]': textarea };
  const groups = [[cards[0]], [cards[1]]].map((groupCards, i) => { const group = new Element({ paperGroup: ["ci-orgueil", "methods"][i] }), groupCount = new Element(); group.lists = { "[data-paper-card]": groupCards }; group.children = { "[data-paper-group-count]": groupCount }; group.countNode = groupCount; return group; });
  const single = { '[data-paper-search]': search, '[data-paper-count]': count, '[data-paper-empty]': empty, '[data-paper-reset]': reset };
  const document = { querySelector: key => single[key] || null, querySelectorAll: key => ({ '[data-paper-card]': cards, '[data-paper-filter]': filters, '[data-paper-copy]': [button], '[data-paper-group]': groups })[key] || [] };
  const window = new Element();
  const location = new URL(url);
  const history = { state: { madsScrollY: 420, madsSoftNav: true }, replaceState(state, _, href) { this.state = state; location.href = href; } };
  const context = vm.createContext({ document, window, location, history, navigator: { clipboard }, URL });
  vm.runInContext(source, context);
  return { search, filters, cards, groups, count, empty, reset, button, status, fallback, textarea, location, history, window, context };
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

test('filters hide empty topic groups and count the papers that still match', async () => {
  const page = setup();
  assert.deepEqual(page.groups.map(group => [group.hidden, group.countNode.textContent]), [[false, '1 paper'], [false, '1 paper']]);
  await page.filters[2].emit('click');
  assert.deepEqual(page.groups.map(group => group.hidden), [true, false]);
  assert.equal(page.groups[1].countNode.textContent, '1 of 1');
  assert.match(page.count.textContent, /1 of 2 papers/);
  page.search.value = 'qzxnomatch';
  await page.search.emit('input');
  assert.deepEqual(page.groups.map(group => group.hidden), [true, true]);
  assert.equal(page.empty.hidden, false);
  await page.reset.emit('click');
  assert.deepEqual(page.groups.map(group => [group.hidden, group.countNode.textContent]), [[false, '1 paper'], [false, '1 paper']]);
});

// Shelf data: read the JSON literal the export script also parses, then check the
// rendering helpers by importing the TypeScript module (Node strips the types).
const paperSource = fs.readFileSync(new URL('../src/data/papers.ts', import.meta.url), 'utf8');
const records = JSON.parse(paperSource.match(/export const papers = ([\s\S]*?) as const;/)[1]);
const filterIds = ['dolomite', 'ci-orgueil', 'ryugu-bennu', 'methods', 'chronology'];

test('every paper has a stable id, a primary category and verifiable citation fields', () => {
  assert.equal(new Set(records.map(paper => paper.id)).size, records.length, 'ids must be unique');
  for (const paper of records) {
    assert.match(paper.id, /^[a-z]+(?:-[a-z]+)*-\d{4}$/, paper.id);
    assert.ok(paper.filters.length > 0 && paper.filters.every(filter => filterIds.includes(filter)), `${paper.id}: filters`);
    assert.ok(paper.filters.includes(paper.primaryFilter), `${paper.id}: primaryFilter must be one of its filters`);
    assert.ok(Number.isInteger(paper.year) && paper.year > 1900, `${paper.id}: year`);
    assert.ok(paper.authors.length >= 1 && paper.authors.length <= Math.min(2, paper.authorCount), `${paper.id}: authors`);
    for (const author of paper.authors) assert.match(author.initials, /^(?:[A-Z]\.(?:-[A-Z]\.)? ?)+$/u, `${paper.id}: initials`);
    assert.ok(paper.journal && paper.volume && (paper.pages || paper.articleNumber), `${paper.id}: journal, volume and pages or article number`);
    assert.match(paper.doi, /^10\.\d{4,9}\/\S+$/, `${paper.id}: doi`);
    assert.ok(paper.relevance && paper.summary, `${paper.id}: summary and relevance`);
    assert.equal('status' in paper || 'url' in paper, false, `${paper.id}: status became relevance; url comes from the doi`);
  }
  for (const filter of filterIds) assert.ok(records.some(paper => paper.primaryFilter === filter), `no group for ${filter}`);
});

test('old #paper-N anchors keep pointing at the papers they named before stable ids', () => {
  const legacy = ['king-2015', 'gregg-2015', 'fujiya-2023', 'johnson-prinz-1993', 'endress-bischoff-1996', 'nakamura-2023', 'zega-2025', 'fujiya-2013', 'singerling-2025', 'pilorget-2025', 'lee-nicholson-2009'];
  legacy.forEach((id, index) => assert.equal(records.find(paper => paper.legacyAnchor === `paper-${index + 1}`)?.id, id));
  assert.equal(records.filter(paper => paper.legacyAnchor).length, legacy.length);
});

test('author labels, copied references and groups are generated from the structured fields', async () => {
  const shelf = await import('../src/data/papers.ts');
  const byId = id => shelf.papers.find(paper => paper.id === id);
  assert.equal(shelf.paperAuthorLabel(byId('zega-2025')), 'Zega et al.');
  // McCoy (second of 73 in Crossref) is listed so the search finds him; the label and reference stay "et al.".
  assert.deepEqual(byId('zega-2025').authors.map(author => author.family), ['Zega', 'McCoy']);
  assert.match(shelf.paperReference(byId('zega-2025')), /^Zega, T\. J\. et al\. \(2025\)\. /);
  // Crossref drops the ß; a re-sync must keep the published spelling.
  assert.equal(byId('endress-bischoff-1996').authors[0].family, 'Endreß');
  assert.equal(shelf.paperAuthorYear(byId('endress-bischoff-1996')), 'Endreß & Bischoff (1996)');
  assert.equal(shelf.paperAuthorYear(byId('johnson-prinz-1993')), 'Johnson & Prinz (1993)');
  assert.equal(shelf.paperReference(byId('king-2015')), 'King, A. J. et al. (2015). Modal mineralogy of CI and CI-like chondrites by X-ray diffraction. Geochimica et Cosmochimica Acta 165, 148–160. https://doi.org/10.1016/j.gca.2015.05.038');
  assert.equal(shelf.paperReference(byId('lee-nicholson-2009')), 'Lee, M. R. & Nicholson, K. (2009). Ca-carbonate in the Orgueil (CI) carbonaceous chondrite: Mineralogy, microstructure and implications for parent body history. Earth and Planetary Science Letters 280, 268–275. https://doi.org/10.1016/j.epsl.2009.01.038');
  assert.match(shelf.paperReference(byId('nakamura-2023')), /Science 379, eabn8671\. https:\/\/doi\.org\/10\.1126\/science\.abn8671$/);
  const groups = shelf.paperGroups();
  assert.deepEqual(groups.map(group => group.id), filterIds);
  assert.equal(groups.reduce((sum, group) => sum + group.papers.length, 0), records.length);
  for (const group of groups) assert.deepEqual(group.papers.map(paper => paper.year), group.papers.map(paper => paper.year).sort((a, b) => a - b), `${group.id} is ordered by year`);
});
