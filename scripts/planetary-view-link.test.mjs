import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeObservation, decodeObservation } from '../src/scripts/planetary-view-link.js';

const base = 'https://example.com/project/index.html?password=secret#private';
const camera = { position: [1.123456789, -2, 3], target: [0, 0, 0], up: [0, 1, 0], zoom: 1.23456789 };
const roundedCamera = { position: [1.123457, -2, 3], target: [0, 0, 0], up: [0, 1, 0], zoom: 1.234568 };
const roundtrip = state => decodeObservation(new URL(encodeObservation(state, base)).hash);
const cameraHash = value => '#observe=1&camera=' + encodeURIComponent(JSON.stringify(value));

test('roundtrips all public fields and rounds day to eight decimals', () => {
  const state = { view: 'orbit', material: 'orgueil', inspected: 'earth', scope: 'solar', angle: 'tilt', mineral: 'sulfide', compare: true, wireframe: false, separated: true, day: 123.123456789 };
  assert.deepEqual(roundtrip(state), { ...state, day: 123.12345679 });
  assert.equal(new URL(encodeObservation(state, base)).hash.startsWith('#observe=1&'), true);
});

test('roundtrips every enum value', () => {
  const enums = {
    view: ['orbit', 'shape', 'sample', 'minerals'], material: ['bennu', 'ryugu', 'orgueil'],
    inspected: ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'bennu', 'ryugu', 'orgueil'],
    scope: ['inner', 'solar'], angle: ['plan', 'tilt'], mineral: ['carbonate', 'matrix', 'sulfide'],
  };
  for (const [key, values] of Object.entries(enums)) {
    for (const value of values) assert.deepEqual(roundtrip({ [key]: value }), { [key]: value });
  }
});

test('partial states stay partial and optional camera is not synthesized', () => {
  assert.deepEqual(roundtrip({}), {});
  assert.deepEqual(roundtrip({ view: 'shape' }), { view: 'shape' });
});

test('coerces only explicit boolean and decimal numeric representations', () => {
  for (const value of [true, 1, '1', 'true']) assert.deepEqual(roundtrip({ compare: value }), { compare: true });
  for (const value of [false, 0, '0', 'false']) assert.deepEqual(roundtrip({ separated: value }), { separated: false });
  assert.deepEqual(roundtrip({ day: '12.000000019', wireframe: 'false' }), { day: 12.00000002, wireframe: false });
  assert.deepEqual(decodeObservation('#observe=1&day=1e2&compare=true'), { day: 100, compare: true });
});

test('preserves numeric bounds without clamping', () => {
  for (const day of [0, 50000]) assert.deepEqual(roundtrip({ day }), { day });
  for (const zoom of [0.35, 64]) {
    const value = { position: [-2000, 2000, 0], target: [2000, 0, 0], up: [0, 0, 2000], zoom };
    assert.deepEqual(roundtrip({ camera: value }), { camera: value });
  }
});

test('rejects invalid state types and invalid supplied public fields', () => {
  for (const state of [null, undefined, [], 'orbit', 1]) assert.throws(() => encodeObservation(state, base), TypeError);
  const invalid = {
    view: ['Orbit', 'private', null, {}, ['orbit']], material: ['earth'], inspected: ['sun'], scope: ['all'], angle: ['free'], mineral: ['password'],
    compare: ['yes', '', 'TRUE', 2, null, [], {}], wireframe: ['off'], separated: [undefined],
    day: [-1, 50000.000000001, Infinity, NaN, '', ' ', '0x10', true, null, [], {}, '1e999', '12days'],
  };
  for (const [key, values] of Object.entries(invalid)) {
    for (const value of values) assert.throws(() => encodeObservation({ [key]: value }, base), TypeError, `${key}: ${String(value)}`);
  }
});

test('public URL uses sibling research.html without query, old hash or credentials', () => {
  for (const path of ['index.html', 'research.html', '']) {
    const url = new URL(encodeObservation({ view: 'orbit' }, `https://user:secret@example.com/project/${path}?private=yes#password`));
    assert.equal(url.href, 'https://example.com/project/research.html#observe=1&view=orbit');
  }
  assert.equal(new URL(encodeObservation({}, new URL(base))).pathname, '/project/research.html');
  for (const url of ['bad', '/research.html', 'javascript:alert(1)', 'file:///private/index.html', 'ftp://example.com/']) {
    assert.throws(() => encodeObservation({}, url), TypeError);
  }
});

test('never reads or copies unknown, private or inherited state properties', () => {
  const state = Object.assign(Object.create({ material: 'orgueil', day: 22 }), { view: 'sample', playing: true, live: true, password: 'secret', private: 'secret' });
  Object.defineProperty(state, 'unknown', { get() { throw new Error('must not read'); }, enumerable: true });
  assert.deepEqual(roundtrip(state), { view: 'sample' });
  assert.equal(encodeObservation(JSON.parse('{"view":"sample","__proto__":{"polluted":true},"constructor":"secret"}'), base).includes('secret'), false);
  assert.equal({}.polluted, undefined);
});

test('roundtrips optional camera with six-decimal precision and fresh arrays', () => {
  const state = { camera };
  const before = JSON.stringify(state);
  const decoded = roundtrip(state);
  assert.deepEqual(decoded, { camera: roundedCamera });
  assert.notEqual(decoded.camera.position, camera.position);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(roundtrip(decoded), decoded);
  assert.deepEqual(roundtrip({ camera: { ...camera, position: ['1.123456789', '-2', '3'], zoom: '1.23456789', password: 'secret' } }), { camera: roundedCamera });
});

test('rejects invalid or degenerate cameras both before and after rounding', () => {
  const invalid = [null, [], {},
    ...[[], [1, 2], [1, 2, 3, 4], [Infinity, 0, 0], [2000.00000001, 0, 1], [true, 0, 1], [null, 0, 1], Array(3)].map(position => ({ ...camera, position })),
    { ...camera, target: camera.position }, { ...camera, up: [0, 0, 0] },
    { ...camera, position: [0, 0, 1], up: [0, 0, -1] },
    { ...camera, position: [0, 0, 0.00000001] },
    { ...camera, position: [1, 0, 0], up: [1, 0.00000001, 0] },
    ...[0, 0.349999999, 64.00000001, Infinity, null, ''].map(zoom => ({ ...camera, zoom })),
  ];
  for (const value of invalid) {
    assert.throws(() => encodeObservation({ camera: value }, base), TypeError);
    assert.equal(decodeObservation(cameraHash(value)), null);
  }
});

test('rejects malformed, unsupported, duplicate and unknown hash tokens', () => {
  const hashes = [null, undefined, {}, [], '', '#', '#observe=2', '#view=orbit', '#observe=01',
    'observe=1&view=orbit', '#view=orbit&observe=1', '#observe=1&observe=1', '#observe=1&view=orbit&view=shape',
    '#observe=1&playing=true', '#observe=1&live=1', '#observe=1&password=secret', '#observe=1&__proto__=x', '#observe=1&constructor=x',
    '#observe=1&day=-1', '#observe=1&day=50001', '#observe=1&day=', '#observe=1&compare=truthy', '#observe=1&view=bogus',
    '#observe=1&view=%', '#observe=1&view=%GG', '#observe=1&view=%C0%AF', '#observe=1&view=%E0%A4',
    '#observe=1&camera={', '#observe=1&&day=1', '#observe=1&', '#observe=1&day', '#observe=1&day=1=2',
    '#observe=1&day=1\n', '#observe=1&day=1#private', '#observe=1&camera=' + '0'.repeat(2048),
  ];
  for (const hash of hashes) assert.equal(decodeObservation(hash), null, String(hash));
});

test('rejects oversized hashes even when their numeric value is valid', () => {
  assert.equal(decodeObservation('#observe=1&day=' + '0'.repeat(2048)), null);
  assert.equal(decodeObservation('#observe=1&' + 'day=0&'.repeat(10000)), null);
});

test('rejects nested unknown camera tokens without prototype pollution', () => {
  assert.equal(decodeObservation(cameraHash({ ...camera, password: 'secret' })), null);
  const value = JSON.parse(JSON.stringify(camera).replace('"zoom":', '"__proto__":{"polluted":true},"zoom":'));
  assert.equal(decodeObservation(cameraHash(value)), null);
  assert.equal({}.polluted, undefined);
});

test('rejects scaled parallel camera vectors despite floating-point cancellation', () => {
  for (const up of [[0.3, 0.6, 0.9], [-0.3, -0.6, -0.9]]) {
    const value = { position: [0.1, 0.2, 0.3], target: [0, 0, 0], up, zoom: 1 };
    assert.equal(decodeObservation(cameraHash(value)), null);
    assert.throws(() => encodeObservation({ camera: value }, base), TypeError);
  }
});

test('rejects inherited camera coordinates at every vector index', () => {
  for (const key of ['position', 'target', 'up']) {
    for (const index of [0, 1, 2]) {
      const vector = [...camera[key]];
      delete vector[index];
      const prototype = Object.create(Array.prototype);
      Object.defineProperty(prototype, index, { value: camera[key][index] });
      Object.setPrototypeOf(vector, prototype);
      assert.throws(() => encodeObservation({ camera: { ...camera, [key]: vector } }, base), TypeError, `${key}[${index}]`);
    }
  }
});

test('custom iterators cannot supply missing own camera coordinates', () => {
  for (const key of ['position', 'target', 'up']) {
    const vector = new Array(3);
    vector[Symbol.iterator] = function* () { yield* camera[key]; };
    assert.throws(() => encodeObservation({ camera: { ...camera, [key]: vector } }, base), TypeError);
  }
});

test('reads dense camera coordinates directly without consulting custom iterators', () => {
  for (const key of ['position', 'target', 'up']) {
    for (const values of [[], [1, 2], [1, 2, 3, 4]]) {
      const vector = [...camera[key]];
      let calls = 0;
      vector[Symbol.iterator] = function* () { calls++; yield* values; };
      assert.deepEqual(roundtrip({ camera: { ...camera, [key]: vector } }), { camera: roundedCamera });
      assert.equal(calls, 0);
    }
    const vector = [...camera[key]];
    Object.defineProperty(vector, Symbol.iterator, { get() { throw new Error('must not read iterator'); } });
    assert.deepEqual(roundtrip({ camera: { ...camera, [key]: vector } }), { camera: roundedCamera });
  }
});
