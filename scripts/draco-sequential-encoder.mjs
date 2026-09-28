import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';

// Minimal Draco 2.2 triangle-mesh encoder (sequential connectivity, rANS symbols).
// It writes only features that the stock three.js/Google Draco decoder reads:
// quantized float attributes with delta prediction and octahedral normals.
// No Draco encoder is installed with three.js, so this keeps the site's existing
// GLTFLoader + DRACOLoader path unchanged. Verify output with the real decoder.

const varint = (out, value) => { while (value >= 128) { out.push(value % 128 + 128); value = Math.floor(value / 128); } out.push(value); };
const float32 = (out, value) => { const bytes = new Uint8Array(new Float32Array([value]).buffer); out.push(...bytes); };
const int32 = (out, value) => { const bytes = new Uint8Array(new Int32Array([value]).buffer); out.push(...bytes); };
const zigzag = value => value >= 0 ? value * 2 : -value * 2 - 1;
const msb = value => { let bit = 0; while (value >= 2) { value = Math.floor(value / 2); bit++; } return bit; };

// Normalize symbol counts to an exact rANS precision; every used symbol keeps p >= 1.
function probabilities(counts, precision) {
  const total = counts.reduce((a, b) => a + b, 0), probs = counts.map(c => c ? Math.max(1, Math.round(c * precision / total)) : 0);
  let error = precision - probs.reduce((a, b) => a + b, 0);
  const order = counts.map((c, i) => i).filter(i => counts[i]).sort((a, b) => counts[b] - counts[a]);
  for (let k = 0; error !== 0; k = (k + 1) % order.length) {
    const i = order[k];
    if (error > 0) { probs[i]++; error--; } else if (probs[i] > 1) { probs[i]--; error++; }
  }
  return probs;
}
function encodeTable(out, probs) {
  varint(out, probs.length);
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (!p) { let offset = 0; while (offset < 63 && probs[i + offset + 1] === 0) offset++; out.push(offset << 2 | 3); i += offset; continue; }
    if (p >= 1 << 22) throw Error('rANS probability overflow');
    const extra = p >= 1 << 14 ? 2 : p >= 1 << 6 ? 1 : 0;
    out.push((p << 2 | extra) & 255);
    for (let b = 0; b < extra; b++) out.push(p >>> 8 * (b + 1) - 2 & 255);
  }
}
// rANS with Draco's constants: L = 4 * precision, byte-wise renormalization, reverse order.
function ransBytes(symbols, probs, precisionBits) {
  const precision = 2 ** precisionBits, base = 4 * precision, cumulative = [];
  probs.reduce((sum, p, i) => (cumulative[i] = sum) + p, 0);
  const bytes = []; let state = base;
  for (let i = symbols.length - 1; i >= 0; i--) {
    const s = symbols[i], p = probs[s];
    while (state >= 1024 * p) { bytes.push(state % 256); state = Math.floor(state / 256); }
    state = Math.floor(state / p) * precision + state % p + cumulative[s];
  }
  const rest = state - base;
  if (rest < 1 << 6) bytes.push(rest);
  else if (rest < 1 << 14) { const v = 0x4000 + rest; bytes.push(v & 255, v >>> 8); }
  else if (rest < 1 << 22) { const v = 0x800000 + rest; bytes.push(v & 255, v >>> 8 & 255, v >>> 16); }
  else { const v = 0xc0000000 + rest; bytes.push(v & 255, v >>> 8 & 255, v >>> 16 & 255, v >>> 24 & 255); }
  return bytes;
}
function ransStream(symbols, precisionBits) {
  let top = 0; for (const s of symbols) if (s > top) top = s;
  const counts = new Array(top + 1).fill(0);
  for (const s of symbols) counts[s]++;
  const out = [], probs = probabilities(counts, 2 ** precisionBits), bytes = ransBytes(symbols, probs, precisionBits);
  encodeTable(out, probs); varint(out, bytes.length); out.push(...bytes);
  return out;
}
const precisionFor = length => Math.min(20, Math.max(12, Math.floor(3 * length / 2)));
// Draco DecodeSymbols(): scheme 1 = raw rANS symbols, scheme 0 = rANS bit-length tags + raw bits.
export function encodeSymbols(values, components = 1) {
  if (!values.length) return [];
  let best = null, top = 0;
  for (const v of values) if (v > top) top = v;
  const unique = new Set(values).size;
  if (top < 2 ** 20 && unique < 2 ** 18) {
    for (const length of [8, 10, 12, 14, 18]) {
      if (2 ** precisionFor(length) < unique * 2) continue;
      const out = [1, length, ...ransStream(values, precisionFor(length))];
      if (!best || out.length < best.length) best = out;
    }
  }
  const tags = [], bits = [];
  let bit = 0;
  const put = (value, n) => { for (let i = 0; i < n; i++, bit++) { if (!(bit & 7)) bits.push(0); if (Math.floor(value / 2 ** i) % 2) bits[bits.length - 1] |= 1 << (bit & 7); } };
  for (let i = 0; i < values.length; i += components) {
    let peak = 1; for (let j = 0; j < components; j++) if (values[i + j] > peak) peak = values[i + j];
    const length = msb(peak) + 1;
    tags.push(length);
    for (let j = 0; j < components; j++) put(values[i + j], length);
  }
  const tagged = [0, ...ransStream(tags, 12), ...bits];
  return !best || tagged.length < best.length ? tagged : best;
}

// Draco's float -> octahedral (s, t) quantization (OctahedronToolBox: max = 2^bits - 2).
export function octahedral(vector, bits) {
  const max = 2 ** bits - 2, center = max / 2, sum = Math.abs(vector[0]) + Math.abs(vector[1]) + Math.abs(vector[2]);
  const scaled = sum > 1e-6 ? vector.map(v => v / sum) : [1, 0, 0];
  const q = [Math.floor(scaled[0] * center + .5), Math.floor(scaled[1] * center + .5), 0];
  q[2] = center - Math.abs(q[0]) - Math.abs(q[1]);
  if (q[2] < 0) { q[1] += q[1] > 0 ? q[2] : -q[2]; q[2] = 0; }
  if (scaled[2] < 0) q[2] *= -1;
  let s, t;
  if (q[0] >= 0) { s = q[1] + center; t = q[2] + center; }
  else { s = q[1] < 0 ? Math.abs(q[2]) : max - Math.abs(q[2]); t = q[2] < 0 ? Math.abs(q[1]) : max - Math.abs(q[1]); }
  return canonical(s, t, bits);
}
// Boundary points of the octahedral square have two codes; Draco keeps one (CanonicalizeOctahedralCoords).
export function canonical(s, t, bits) {
  const max = 2 ** bits - 2, center = max / 2;
  if ((s === 0 && t === 0) || (s === 0 && t === max) || (s === max && t === 0)) { s = max; t = max; }
  else if (s === 0 && t > center) t = center - (t - center);
  else if (s === max && t < center) t = center + (center - t);
  else if (t === max && s < center) s = center + (center - s);
  else if (t === 0 && s > center) s = center - (s - center);
  return [s, t];
}
// Decoder-side dequantization, reproduced in float32 exactly as Draco computes it.
export function dequantize(q, { min, range, bits }) {
  const f = Math.fround, delta = f(f(range) / f(2 ** bits - 1)), out = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) out[i] = f(f(q[i] * delta) + f(min[i % 3]));
  return out;
}

// mesh: {indices, positions: Int32Array (quantized xyz), position: {min, range, bits},
// normals: Int32Array (octahedral s,t), normalBits, ids: {POSITION, NORMAL}}.
const append = (out, values) => { for (const v of values) out.push(v); return values.length; };
// Encoder side of PREDICTION_TRANSFORM_NORMAL_OCTAHEDRON_CANONICALIZED with delta prediction:
// prediction and value are moved into the bottom-left diamond quadrant, corrections are kept positive.
function normalCorrections(input, bits) {
  const normals = [];
  for (let i = 0; i < input.length; i += 2) normals.push(...canonical(input[i], input[i + 1], bits));
  const modulus = 2 ** bits - 1, center = 2 ** (bits - 1) - 1, out = [];
  const inDiamond = ([s, t]) => Math.abs(s) + Math.abs(t) <= center;
  const invert = ([s, t]) => {
    const [ss, st] = s >= 0 && t >= 0 ? [1, 1] : s <= 0 && t <= 0 ? [-1, -1] : [s > 0 ? 1 : -1, t > 0 ? 1 : -1], cs = ss * center, ct = st * center;
    let us = 2 * s - cs, ut = 2 * t - ct;
    [us, ut] = ss * st >= 0 ? [-ut, -us] : [ut, us];
    return [(us + cs) / 2, (ut + ct) / 2];
  };
  const rotation = ([x, y]) => x === 0 ? (y === 0 ? 0 : y > 0 ? 3 : 1) : x > 0 ? (y >= 0 ? 2 : 1) : (y <= 0 ? 0 : 3);
  const rotate = ([x, y], n) => n === 1 ? [y, -x] : n === 2 ? [-x, -y] : n === 3 ? [-y, x] : [x, y];
  const bottomLeft = ([x, y]) => (x === 0 && y === 0) || (x < 0 && y <= 0);
  for (let i = 0; i < normals.length; i += 2) {
    let orig = [normals[i] - center, normals[i + 1] - center], pred = i ? [normals[i - 2] - center, normals[i - 1] - center] : [-center, -center];
    if (!inDiamond(pred)) { orig = invert(orig); pred = invert(pred); }
    if (!bottomLeft(pred)) { const n = rotation(pred); orig = rotate(orig, n); pred = rotate(pred, n); }
    for (let k = 0; k < 2; k++) { const c = orig[k] - pred[k]; out.push(c < 0 ? c + modulus : c); }
  }
  return out;
}
export function encodeDracoMesh({ indices, positions, position, normals, normalBits, ids = { POSITION: 0, NORMAL: 1 } }) {
  const points = positions.length / 3, out = [...Buffer.from('DRACO'), 2, 2, 1, 0, 0, 0], sizes = {};
  if (normals.length !== points * 2) throw Error('Normal count must match position count');
  varint(out, indices.length / 3); varint(out, points); out.push(0);
  let last = 0; const differences = [];
  for (const index of indices) { const d = index - last; differences.push(Math.abs(d) * 2 + (d < 0 ? 1 : 0)); last = index; }
  sizes.connectivity = append(out, encodeSymbols(differences, 1));
  out.push(1); varint(out, 2);
  out.push(0, 9, 3, 0); varint(out, ids.POSITION);
  out.push(1, 9, 3, 0); varint(out, ids.NORMAL);
  out.push(2, 3);
  // Positions: difference prediction with Draco's wrap transform.
  let min = Infinity, maxValue = -Infinity;
  for (const v of positions) { if (v < min) min = v; if (v > maxValue) maxValue = v; }
  const span = maxValue - min + 1, maxCorrection = Math.floor(span / 2) - (span % 2 ? 0 : 1), clamp = v => Math.min(maxValue, Math.max(min, v));
  const corrections = [];
  for (let i = 0; i < positions.length; i++) {
    let c = positions[i] - clamp(i < 3 ? 0 : positions[i - 3]);
    if (c < -Math.floor(span / 2)) c += span; else if (c > maxCorrection) c -= span;
    corrections.push(zigzag(c));
  }
  out.push(0, 1, 1); sizes.positions = append(out, encodeSymbols(corrections, 3));
  int32(out, min); int32(out, maxValue);
  // Normals: difference from the previous vertex in Draco's canonicalized octahedral frame.
  out.push(0, 3, 1); sizes.normals = append(out, encodeSymbols(normalCorrections(normals, normalBits), 2));
  int32(out, 2 ** normalBits - 1); int32(out, 2 ** (normalBits - 1) - 1);
  for (const v of position.min) float32(out, v);
  float32(out, position.range); out.push(position.bits);
  out.push(normalBits);
  return Object.assign(Uint8Array.from(out), { sizes });
}

// Node verification with the decoder files the site already serves.
export async function loadDracoDecoder(directory = new URL('../public/assets/data/missions/draco/', import.meta.url)) {
  const wasmBinary = await readFile(new URL('draco_decoder.wasm', directory)), source = await readFile(new URL('draco_wasm_wrapper.js', directory), 'utf8');
  const context = { module: { exports: {} }, exports: {}, require: createRequire(import.meta.url), process, console, Buffer, TextDecoder, WebAssembly, setTimeout, clearTimeout, __dirname: '' };
  vm.runInNewContext(source, context);
  return context.module.exports({ wasmBinary });
}
// Returns indices plus either quantized integers (raw=true) or decoded floats.
export function decodeDracoMesh(draco, bytes, ids = { POSITION: 0, NORMAL: 1 }, raw = false) {
  const decoder = new draco.Decoder(), buffer = new draco.DecoderBuffer(), mesh = new draco.Mesh();
  if (raw) { decoder.SkipAttributeTransform(draco.POSITION); decoder.SkipAttributeTransform(draco.NORMAL); }
  buffer.Init(bytes, bytes.length);
  try {
    const status = decoder.DecodeBufferToMesh(buffer, mesh);
    if (!status.ok()) throw Error(status.error_msg());
    const result = { faces: mesh.num_faces(), points: mesh.num_points() }, face = new draco.DracoInt32Array();
    result.indices = new Uint32Array(result.faces * 3);
    for (let i = 0; i < result.faces; i++) { decoder.GetFaceFromMesh(mesh, i, face); for (let j = 0; j < 3; j++) result.indices[i * 3 + j] = face.GetValue(j); }
    draco.destroy(face);
    for (const [name, id] of Object.entries(ids)) {
      const attribute = decoder.GetAttributeByUniqueId(mesh, id), values = raw ? new draco.DracoInt32Array() : new draco.DracoFloat32Array();
      if (raw) decoder.GetAttributeInt32ForAllPoints(mesh, attribute, values); else decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
      result[name] = (raw ? Int32Array : Float32Array).from({ length: values.size() }, (_, i) => values.GetValue(i));
      if (raw && name === 'POSITION') { const q = new draco.AttributeQuantizationTransform(); q.InitFromAttribute(attribute); result.quantization = { bits: q.quantization_bits(), min: [0, 1, 2].map(a => q.min_value(a)), range: q.range() }; draco.destroy(q); }
      if (raw && name === 'NORMAL') { const o = new draco.AttributeOctahedronTransform(); o.InitFromAttribute(attribute); result.normalBits = o.quantization_bits(); draco.destroy(o); }
      draco.destroy(values);
    }
    return result;
  } finally { draco.destroy(mesh); draco.destroy(buffer); draco.destroy(decoder); }
}
