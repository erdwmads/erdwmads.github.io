import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const source = await read('../src/scripts/feature-loader.js');
const tick = () => new Promise(resolve => setImmediate(resolve));

// Runs feature-loader.js against a page that contains the given root selectors; import() calls are recorded.
function run(present, failing = new Set()) {
  const window = new EventTarget(), document = new EventTarget(), imports = [], errors = [];
  document.querySelector = selector => present.has(selector) ? {} : null;
  const load = specifier => { imports.push(specifier); return failing.has(specifier) ? Promise.reject(new Error('offline')) : Promise.resolve({}); };
  vm.runInNewContext(source.replace(/\bimport\(/g, '__import('), { window, document, __import: load, console: { error: error => errors.push(error) } });
  return { window, document, imports, errors, softNav: () => window.dispatchEvent(new Event('mads:soft-nav-content')) };
}

test('only the features whose root element is on the page are imported', () => {
  assert.deepEqual(run(new Set()).imports, [], 'Contact and CV import no 3D feature');
  assert.deepEqual(run(new Set(['[data-planetary-explorer]', '[data-sample-missions]', '[data-image-inspector]'])).imports, ['./planetary-explorer.js', './sample-missions/loader.js', './image-inspector.js']);
  assert.deepEqual(run(new Set(['.origins-study'])).imports, ['./origins-study/loader.js']);
});

test('soft navigation imports a feature the first time its page appears, and only once', () => {
  const present = new Set();
  const page = run(present);
  page.softNav();
  assert.deepEqual(page.imports, []);
  present.add('[data-planetary-explorer]');
  page.softNav();
  present.delete('[data-planetary-explorer]');
  page.softNav();
  present.add('[data-planetary-explorer]');
  page.softNav();
  assert.deepEqual(page.imports, ['./planetary-explorer.js'], 'the module mounts itself on later visits');
});

test('a failed import is tried again on the next page that needs it', async () => {
  const failing = new Set(['./sample-missions/loader.js']);
  const page = run(new Set(['[data-sample-missions]']), failing);
  await tick();
  assert.equal(page.errors.length, 1);
  failing.clear();
  page.softNav();
  page.softNav();
  assert.deepEqual(page.imports, ['./sample-missions/loader.js', './sample-missions/loader.js']);
});

test('the Origins scene starts loading from its header link before the page is opened', () => {
  const page = run(new Set());
  const on = (type, selector) => {
    const event = new Event(type);
    Object.defineProperty(event, 'target', { value: { closest: query => query === selector ? {} : null } });
    page.document.dispatchEvent(event);
  };
  on('pointerover', '.site-header a[href="origins-study.html"]');
  on('focusin', '.site-header a[href="cv.html"]');
  assert.deepEqual(page.imports, ['./origins-study/main.js']);
});

test('the shell module imports the 3D features lazily, and each one mounts itself when imported late', async () => {
  const shell = await read('../src/components/LegacyShell.astro');
  assert.match(shell, /import '\.\.\/scripts\/feature-loader\.js';/);
  for (const specifier of [...source.matchAll(/\['([^']+)', \(\) => import\('\.\/([^']+)'\)\]/g)].map(match => match[2])) {
    assert.equal(shell.includes(`import '../scripts/${specifier}'`), false, `${specifier} must not be imported on every page`);
    const feature = await read(`../src/scripts/${specifier}`);
    // Imported after DOMContentLoaded, the module must initialise at once, then keep mounting on later soft navigations.
    const entry = feature.match(/if\s*\(\s*document\.readyState\s*===\s*'loading'\s*\)\s*document\.addEventListener\(\s*'DOMContentLoaded'\s*,\s*(\w+)\s*,\s*\{\s*once:\s*true\s*\}\s*\)\s*;\s*else\s+(\w+)\(\)/);
    assert.ok(entry && entry[1] === entry[2], `${specifier} initialises immediately when imported after parsing`);
    assert.match(feature, new RegExp(`addEventListener\\('mads:soft-nav-(?:content|ready|end)',\\s*${entry[1]}\\)`), `${specifier} mounts again after soft navigation`);
    assert.match(feature, /addEventListener\('mads:soft-nav-before-swap',/, `${specifier} unmounts before the page is swapped`);
  }
});
