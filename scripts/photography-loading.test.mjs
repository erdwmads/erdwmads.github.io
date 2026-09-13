import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/assets/js/observatory-interactions.js', import.meta.url), 'utf8');
const presentation = source.slice(source.indexOf("  const dialog = document.createElement('dialog');"), source.indexOf('  function enhancePage()'));
class Element {
  constructor() {
    this.listeners = {}; this.style = {}; this.dataset = {}; this.hidden = false;
    this.textContent = ''; this.alt = ''; this.src = ''; this.children = new Map();
    this.classList = { add() {}, remove() {}, contains() { return false; } };
  }
  querySelector(selector) {
    if (!this.children.has(selector)) this.children.set(selector, new Element());
    return this.children.get(selector);
  }
  setAttribute(name, value) { this[name] = value; }
  removeAttribute(name) { this[name] = ''; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  emit(type, event = {}) { for (const listener of this.listeners[type] || []) listener(event); this[`on${type}`]?.(event); }
  replaceWith(next) { this.replacedWith = next; }
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
  focus() {}
  appendChild() {}
}
function setup() {
  const root = new Element(); const body = new Element(); const document = new Element(); const window = new Element();
  document.documentElement = root; document.body = body; document.createElement = () => new Element();
  const loads = [];
  class Image extends Element { constructor() { super(); loads.push(this); } }
  const context = vm.createContext({ document, window, root, body, Image,
    reduced: { matches: true, addEventListener() {} }, desktop: { matches: true },
    icon: () => '', innerHeight: 1000, CustomEvent: class {},
  });
  window.dispatchEvent = () => {};
  vm.runInContext(`${presentation}\n globalThis.viewer = { showImage, closePresentation, present, dialog, caption, counter, get image() { return image; }, open(items) { images = items; presentationVersion += 1; dialog.showModal(); showImage(0); } };`, context);
  return { ...context.viewer, viewer: context.viewer, loads, document };
}
const items = [{ src: '/one.jpg', caption: 'One' }, { src: '/two.jpg', caption: 'Two' }];

test('slide caption and counter wait for the requested image to load', () => {
  const { viewer, loads } = setup();
  viewer.open(items);
  assert.equal(viewer.caption.textContent, '');
  assert.equal(viewer.counter.textContent, '');
  loads[0].emit('load');
  assert.equal(viewer.image.src, '/one.jpg');
  assert.equal(viewer.caption.textContent, 'One');
  assert.equal(viewer.counter.textContent, '01 / 02');
});

test('late image load cannot replace a newer slide', () => {
  const { viewer, loads } = setup();
  viewer.open(items); viewer.showImage(1);
  assert.equal(loads.length, 2);
  loads[1].emit('load'); loads[0].emit('load');
  assert.equal(viewer.image.src, '/two.jpg');
  assert.equal(viewer.caption.textContent, 'Two');
});

test('failure provides retry and a native original image link', () => {
  const { viewer, loads } = setup();
  viewer.open(items);
  assert.equal(loads.length, 1);
  loads[0].emit('error');
  const retry = viewer.dialog.querySelector('.obs-present-retry');
  const original = viewer.dialog.querySelector('.obs-present-original');
  assert.equal(retry.hidden, false);
  assert.equal(original.href, '/one.jpg');
  assert.equal(viewer.caption.textContent, '');
  retry.emit('click');
  assert.equal(loads.length, 2);
  loads[1].emit('load');
  assert.equal(viewer.caption.textContent, 'One');
  assert.equal(viewer.dialog.querySelector('.obs-presentation-feedback').hidden, true);
});

test('load and error callbacks from a closed session cannot alter a reopened session', () => {
  const { viewer, loads } = setup();
  viewer.open(items); viewer.closePresentation(); viewer.open([items[1]]);
  assert.equal(loads.length, 2);
  loads[1].emit('load'); loads[0].emit('load'); loads[0].emit('error');
  assert.equal(viewer.image.src, '/two.jpg');
  assert.equal(viewer.caption.textContent, 'Two');
  assert.equal(viewer.dialog.querySelector('.obs-presentation-feedback').hidden, true);
});

test('photography launch is progressive enhancement and individual originals stay links', () => {
  const gallery = fs.readFileSync(new URL('../src/components/PhotographyGallery.astro', import.meta.url), 'utf8');
  assert.match(gallery, /<button[^>]*data-present-photos[^>]*hidden/);
  assert.match(gallery, /<a\s[\s\S]*?href=\{photo.full\}/);
});

test('a late error cannot replace the current loading or loaded state', () => {
  const { viewer, loads } = setup();
  viewer.open(items); viewer.showImage(1);
  const status = viewer.dialog.querySelector('.obs-image-status');
  loads[0].emit('error');
  assert.match(status.textContent, /Loading image 2/);
  assert.equal(viewer.dialog.querySelector('.obs-present-retry').hidden, true);
  loads[1].emit('load');
  assert.equal(viewer.caption.textContent, 'Two');
});

test('the old photograph and its description are cleared while the next loads', () => {
  const { viewer, loads } = setup();
  viewer.open(items); loads[0].emit('load'); viewer.showImage(1);
  assert.equal(viewer.image.style.opacity, '0');
  assert.equal(viewer.image.alt, '');
  assert.equal(viewer.caption.textContent, '');
  assert.equal(viewer.counter.textContent, '');
});

test('unsupported dialog and modified clicks preserve native photograph links', () => {
  const { viewer, document } = setup();
  let prevented = false;
  const event = { target: { closest: () => ({}) }, button: 0, preventDefault() { prevented = true; } };
  document.emit('click', { ...event, ctrlKey: true });
  assert.equal(prevented, false);
  viewer.dialog.showModal = undefined;
  document.emit('click', event);
  assert.equal(prevented, false);
});

test('page enhancement reveals presentation controls only with dialog support', () => {
  const enhancement = source.slice(source.indexOf('  function enhancePage()'), source.indexOf('  let entrance;'));
  const launch = new Element(); launch.hidden = true;
  const context = vm.createContext({ route: '', routeOf() {}, activeLink() {}, lightOrbit() {}, moveBeam() {},
    document: { querySelector() { return null; }, querySelectorAll() { return [launch]; } },
    dialog: new Element(), icon() { return ''; }
  });
  vm.runInContext(`${enhancement}\nenhancePage();`, context);
  assert.equal(launch.hidden, false);
  context.dialog.showModal = undefined;
  vm.runInContext('enhancePage();', context);
  assert.equal(launch.hidden, true);
});

test('caption and counter remain loading until the image finishes decoding', async () => {
  const { viewer, loads } = setup();
  viewer.open(items);
  let finishDecode;
  const decoded = new Promise(resolve => { finishDecode = resolve; });
  loads[0].decode = () => decoded;
  loads[0].emit('load');
  assert.equal(viewer.caption.textContent, '');
  assert.equal(viewer.counter.textContent, '');
  assert.equal(viewer.dialog.querySelector('.obs-presentation-feedback').hidden, false);
  finishDecode();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(viewer.image.src, '/one.jpg');
  assert.equal(viewer.caption.textContent, 'One');
  assert.equal(viewer.counter.textContent, '01 / 02');
});

test('decoding from an earlier slide cannot replace the next image', async () => {
  const { viewer, loads } = setup();
  viewer.open(items);
  let finishDecode;
  loads[0].decode = () => new Promise(resolve => { finishDecode = resolve; });
  loads[0].emit('load');
  viewer.showImage(1);
  loads[1].emit('load');
  finishDecode();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(viewer.image.src, '/two.jpg');
  assert.equal(viewer.caption.textContent, 'Two');
});

test('decoding from a closed session cannot replace a reopened image', async () => {
  const { viewer, loads } = setup();
  viewer.open(items);
  let finishDecode;
  loads[0].decode = () => new Promise(resolve => { finishDecode = resolve; });
  loads[0].emit('load');
  viewer.closePresentation();
  viewer.open([items[1]]);
  loads[1].emit('load');
  finishDecode();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(viewer.image.src, '/two.jpg');
  assert.equal(viewer.caption.textContent, 'Two');
  assert.equal(viewer.counter.textContent, '01 / 01');
  assert.equal(viewer.dialog.querySelector('.obs-presentation-feedback').hidden, true);
});

test('a decode failure exposes image recovery instead of a blank completed slide', async () => {
  const { viewer, loads } = setup();
  viewer.open(items);
  loads[0].decode = () => Promise.reject(new Error('Image decoding failed'));
  loads[0].emit('load');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(viewer.caption.textContent, '');
  assert.equal(viewer.counter.textContent, '');
  assert.equal(viewer.dialog.querySelector('.obs-present-retry').hidden, false);
  assert.equal(viewer.dialog.querySelector('.obs-present-original').href, '/one.jpg');
});
