import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readNasaSource, simplifyOsirisRex } from './spacecraft-model-simplify.mjs';
import { loadDracoDecoder, decodeDracoMesh } from './draco-sequential-encoder.mjs';

const draco = await loadDracoDecoder();
const shipped = await readFile(new URL('../public/assets/data/missions/osiris-rex-nasa.glb', import.meta.url));
const nasa = await readNasaSource().catch(() => null);
const bounds = (values, k) => values.reduce(([lo, hi], v, i) => i % 3 === k ? [Math.min(lo, v), Math.max(hi, v)] : [lo, hi], [Infinity, -Infinity]);
function primitives(bytes) {
  const jsonLength = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength)), binary = 28 + jsonLength;
  return gltf.meshes[0].primitives.map(p => {
    const ext = p.extensions.KHR_draco_mesh_compression, view = gltf.bufferViews[ext.bufferView];
    return { material: gltf.materials[p.material].name, accessors: [p.indices, p.attributes.POSITION, p.attributes.NORMAL].map(i => gltf.accessors[i]), mesh: decodeDracoMesh(draco, bytes.subarray(binary + view.byteOffset, binary + view.byteOffset + view.byteLength), ext.attributes) };
  });
}

test('shipped OSIRIS-REx model decodes with the stock Draco decoder inside the 40-60k triangle budget', () => {
  const parts = primitives(shipped), triangles = parts.reduce((n, p) => n + p.mesh.faces, 0);
  assert.equal(parts.length, 41);
  assert(triangles >= 40000 && triangles <= 60000, 'triangles ' + triangles);
  for (const { material, accessors: [index, position, normal], mesh } of parts) {
    assert.equal(index.count, mesh.faces * 3, material);
    assert.equal(position.count, mesh.points, material); assert.equal(normal.count, mesh.points, material);
    for (let k = 0; k < 3; k++) {
      const [lo, hi] = bounds(mesh.POSITION, k);
      assert.equal(position.min[k], lo, material); assert.equal(position.max[k], hi, material);
    }
    for (let i = 0; i < mesh.NORMAL.length; i += 3) assert(Math.abs(Math.hypot(mesh.NORMAL[i], mesh.NORMAL[i + 1], mesh.NORMAL[i + 2]) - 1) < 1e-5, material + ' unit normals');
  }
});

test('simplification is reproducible and keeps NASA vertices bit for bit', { skip: !nasa && 'NASA source blob is not in this git history' }, async () => {
  const { glb } = await simplifyOsirisRex(nasa);
  assert(Buffer.compare(glb, shipped) === 0, 'scripts/spacecraft-model-simplify.mjs reproduces the shipped GLB');
  const before = primitives(nasa), after = primitives(shipped);
  after.forEach((part, i) => {
    assert.equal(part.material, before[i].material);
    const source = new Set(); for (let v = 0; v < before[i].mesh.POSITION.length; v += 3) source.add(before[i].mesh.POSITION.slice(v, v + 3).join());
    for (let v = 0; v < part.mesh.POSITION.length; v += 3) assert(source.has(part.mesh.POSITION.slice(v, v + 3).join()), part.material + ' vertex ' + v / 3);
  });
  const extent = parts => [0, 1, 2].map(k => parts.map(p => bounds(p.mesh.POSITION, k)).reduce(([a, b], [c, d]) => [Math.min(a, c), Math.max(b, d)]));
  assert.deepEqual(extent(after), extent(before), 'overall model extent is unchanged');
});
