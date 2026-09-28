import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeDracoMesh, encodeSymbols, octahedral, canonical, dequantize, loadDracoDecoder, decodeDracoMesh } from './draco-sequential-encoder.mjs';

const draco = await loadDracoDecoder();
const random = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7);
function mesh(faces, points, spread = 16383) {
  const indices = Uint32Array.from({ length: faces * 3 }, (_, i) => i < points ? i : Math.floor(random() * points));
  const positions = Int32Array.from({ length: points * 3 }, () => Math.floor(random() * (spread + 1)));
  const normals = Int32Array.from({ length: points * 2 }, () => Math.floor(random() * 1023));
  return { indices, positions, normals, normalBits: 10, position: { min: [-472.0663146972656, -367.5, -377.63397216796875], range: 896.8692626953125, bits: 14 }, ids: { POSITION: 0, NORMAL: 1 } };
}
function roundTrip(input) {
  const bytes = encodeDracoMesh(input), raw = decodeDracoMesh(draco, bytes, input.ids, true), decoded = decodeDracoMesh(draco, bytes, input.ids);
  assert.deepEqual(raw.indices, input.indices);
  assert.deepEqual(raw.POSITION, input.positions);
  const normals = [];
  for (let i = 0; i < input.normals.length; i += 2) normals.push(...canonical(input.normals[i], input.normals[i + 1], input.normalBits));
  assert.deepEqual(raw.NORMAL, Int32Array.from(normals), 'normals decode to their canonical octahedral codes');
  assert.equal(raw.normalBits, input.normalBits);
  assert.equal(raw.quantization.bits, input.position.bits);
  assert.deepEqual(raw.quantization.min, input.position.min.map(Math.fround));
  assert.equal(raw.quantization.range, Math.fround(input.position.range));
  assert.deepEqual(decoded.POSITION, dequantize(input.positions, input.position), 'float positions match the decoder bit for bit');
  return bytes;
}

test('the stock Draco decoder reads encoded sequential meshes exactly', () => {
  for (const [faces, points, spread] of [[400, 250, 16383], [3000, 1600, 40], [2, 4, 16383], [1, 3, 0]]) roundTrip(mesh(faces, points, spread));
});

test('large index jumps and wide symbols use the tagged fallback without loss', () => {
  const input = mesh(900, 900);
  for (let i = 0; i < input.indices.length; i += 7) input.indices[i] = (i * 7919) % 900;
  roundTrip(input);
  assert.equal(encodeSymbols([0, 3 * 2 ** 29, 1, 2 ** 31])[0], 0, 'values beyond the raw alphabet select tagged coding');
});

test('octahedral quantization inverts the decoder mapping within the 10-bit lattice spacing', () => {
  const decode = (s, t, bits) => {
    const scale = 2 / (2 ** bits - 2); let y = s * scale - 1, z = t * scale - 1; const x = 1 - Math.abs(y) - Math.abs(z), o = Math.max(0, -x);
    y += y < 0 ? o : -o; z += z < 0 ? o : -o; const n = Math.hypot(x, y, z); return [x / n, y / n, z / n];
  };
  for (let i = 0; i < 5000; i++) {
    const v = [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1], n = Math.hypot(...v), unit = v.map(c => c / n);
    const [s, t] = octahedral(unit, 10), back = decode(s, t, 10);
    assert(s >= 0 && s <= 1022 && t >= 0 && t <= 1022);
    assert(unit.reduce((a, c, k) => a + c * back[k], 0) > Math.cos(0.5 * Math.PI / 180));
  }
  for (const axis of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const back = decode(...octahedral(axis, 10), 10);
    assert(axis.every((c, k) => Math.abs(c - back[k]) < 1e-6), 'axis ' + axis);
  }
});
