import test from 'node:test';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {objToGlb} from './shape-model-glb.mjs';
import {restoreFacetedShape} from '../src/scripts/asteroid-scale.js';

globalThis.ProgressEvent ??= class {constructor(type,properties){this.type=type;Object.assign(this,properties);}};

const faces = 'f 1 2 3\nf 2 4 3\nf 1 3 4 5\nf -1 1 2\n'; // triangles, a quad, a negative index
const points = [[0.1234567, -0.2, 0.3], [-0.45, 0.55, 0.1], [0.6, 0.7, -0.8], [-0.9, -0.15, 0.25], [0.33, -0.66, -0.99]];
// JAXA's Ryugu OBJ stores float32 values printed at double precision; mimic that with Math.fround.
const float32Obj = points.map(p => 'v  ' + p.map(x => String(Math.fround(x))).join(' ')).join('\n') + '\n' + faces;
const decimalObj = points.map(p => 'v ' + p.map(x => (x + 1e-9).toFixed(12)).join(' ')).join('\n') + '\n' + faces;

const bytesOf = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
const firstMesh = object => { let mesh; object.traverse(node => { if (!mesh && node.isMesh) mesh = node; }); return mesh; };
async function viaGlb(text) {
  const glb = objToGlb(text, {name: 'test'});
  const scene = (await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '')).scene;
  return firstMesh(restoreFacetedShape(scene)).geometry;
}

test('GLB re-encoding reproduces the OBJ loader geometry bit for bit for float32 source values', async () => {
  const expected = firstMesh(new OBJLoader().parse(float32Obj)).geometry;
  const actual = await viaGlb(float32Obj);
  assert.equal(actual.index, null, 'restored geometry is non-indexed like the OBJ path');
  assert.equal(actual.attributes.position.count, expected.attributes.position.count);
  assert.deepEqual(bytesOf(actual.attributes.position.array), bytesOf(expected.attributes.position.array));
  assert.deepEqual(bytesOf(actual.attributes.normal.array), bytesOf(expected.attributes.normal.array));
});

test('arbitrary decimal sources keep exact float32 positions and near-identical normals', async () => {
  const expected = firstMesh(new OBJLoader().parse(decimalObj)).geometry;
  const actual = await viaGlb(decimalObj);
  assert.deepEqual(bytesOf(actual.attributes.position.array), bytesOf(expected.attributes.position.array));
  const drift = Math.max(...actual.attributes.normal.array.map((value, i) => Math.abs(value - expected.attributes.normal.array[i])));
  assert(drift < 1e-6, `normal drift ${drift}`);
});

test('GLB container is well formed with 4-byte aligned chunks', () => {
  const glb = objToGlb(float32Obj);
  assert.equal(glb.readUInt32LE(0), 0x46546c67);
  assert.equal(glb.readUInt32LE(4), 2);
  assert.equal(glb.readUInt32LE(8), glb.length);
  const jsonLength = glb.readUInt32LE(12);
  assert.equal(jsonLength % 4, 0);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
  assert.equal(gltf.accessors[0].count, 5);
  assert.equal(gltf.accessors[1].count, 15, 'three triangles, a fanned quad and a negative-index triangle');
  assert.equal(glb.readUInt32LE(20 + jsonLength) % 4, 0);
});

test('faces that reference missing vertices are rejected', () => {
  assert.throws(() => objToGlb('v 0 0 0\nv 1 0 0\nf 1 2 3\n'), /missing vertex/);
});

test('shading data that the position-only encoding would drop is rejected', () => {
  assert.throws(() => objToGlb('v 0 0 0\nv 1 0 0\nv 0 1 0\nvn 0 0 1\nf 1 2 3\n'), /vn data is not supported/);
  assert.throws(() => objToGlb('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1/1 2/1 3/1\n'), /texture coordinates or normals/);
});
