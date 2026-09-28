import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { encodeDracoMesh, octahedral, dequantize, loadDracoDecoder, decodeDracoMesh } from './draco-sequential-encoder.mjs';

// Reproducible display simplification of NASA's OSIRIS-REx GLB (credits: public/assets/data/missions/SPACECRAFT-CREDITS.md).
// node scripts/spacecraft-model-simplify.mjs [NASA OSIRIS-REx.glb] [--error=0.75] [--normal-weight=0.5] [--hidden-error=3] [--out=path] [--dry-run]
// Without a source path the unmodified NASA file is read from git history and checked by SHA-256.
// 1. Draco-decode each material primitive, keeping NASA's 14-bit position grid and 10-bit normals.
// 2. Weld by position and drop exact duplicate triangles (every solar cell is stored four times).
// 3. meshoptimizer edge collapse with an absolute error in source units (about 2.38 mm per unit at the 6.2 m span),
//    plus a curvature term from crease-split vertex normals (creases above 30 degrees are kept as seams).
//    Collapses keep a subset of NASA vertices; no vertex is moved or invented. The always-hidden stowed
//    sampling head (puck-*, Silver-Puck) uses hiddenError; the hidden plate kept for inspection is not simplified.
// 4. No triangle crosses the runtime partitions of spacecraft.js / spacecraft-mechanics.js
//    (capsule, hidden stowed-sampler plate, solar-wing hinges at x = +/-0.69); cut vertices are locked.
// 5. Flat shading: each triangle keeps NASA's normal when unchanged or within 4 degrees, otherwise its facet normal.
// 6. Re-encode as Draco (sequential connectivity, same quantization) so kept vertices decode bit-identically,
//    then verify every primitive with the stock decoder that the site serves.
export const NASA_BLOB = '7db5bd5c9f2404c310c5f644588d9e1998907a47', NASA_SHA256 = 'ef8e0429ee4dd8e918908923d5efdc6d3576b9216cc8e16533b50dd28c196bca';
export const DEFAULT_ERROR = .75, DEFAULT_NORMAL_WEIGHT = .5;
const root = new URL('../', import.meta.url);

export async function readNasaSource(path) {
  const source = path ? await readFile(path) : execFileSync('git', ['cat-file', 'blob', NASA_BLOB], { cwd: root, maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
  if (createHash('sha256').update(source).digest('hex') !== NASA_SHA256) throw Error('Source is not the unmodified NASA OSIRIS-REx GLB (SHA-256 mismatch)');
  return source;
}
const cyclic = (a, b, c) => a <= b && a <= c ? `${a},${b},${c}` : b <= c ? `${b},${c},${a}` : `${c},${a},${b}`;
function decodeNormal([s, t], bits) {
  const scale = 2 / (2 ** bits - 2); let y = s * scale - 1, z = t * scale - 1; const x = 1 - Math.abs(y) - Math.abs(z), o = Math.max(0, -x);
  y += y < 0 ? o : -o; z += z < 0 ? o : -o; const n = Math.hypot(x, y, z); return [x / n, y / n, z / n];
}

export async function simplifyOsirisRex(source, { error = DEFAULT_ERROR, hiddenError = error * 4, normalWeight = DEFAULT_NORMAL_WEIGHT } = {}) {
  const draco = await loadDracoDecoder();
  await MeshoptSimplifier.ready;
  const jsonLength = source.readUInt32LE(12), gltf = JSON.parse(source.toString('utf8', 20, 20 + jsonLength)), binary = 28 + jsonLength;
  // Same transform chain as assembleOsirisRex(): model scale 0.105, yaw 90 deg, lowered 0.24, NASA pivot scale.
  const model = new THREE.Group(), pivot = new THREE.Group(), point = new THREE.Vector3(), center = new THREE.Vector3();
  model.scale.setScalar(.105); model.rotation.y = Math.PI / 2; model.position.y = -.24;
  pivot.scale.fromArray(gltf.nodes[1].scale); model.add(pivot); model.updateMatrixWorld(true);
  // Mirrors partitionMesh() classification by triangle centroid in assembled coordinates.
  function partition(material, positions, a, b, c) {
    if (/SRC-/.test(material)) return 'capsule';
    center.set(0, 0, 0);
    for (const i of [a, b, c]) center.add(point.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]).applyMatrix4(pivot.matrixWorld));
    center.multiplyScalar(1 / 3);
    if (material === 'Grey-nofoil-fl.001' && center.y > .35 && center.y < .4 && Math.abs(center.x) < .17 && Math.abs(center.z) < .2) return 'retired';
    return center.x < -.69 ? 'port' : center.x > .69 ? 'starboard' : 'body';
  }

  function simplifyPrimitive(primitive) {
    const extension = primitive.extensions.KHR_draco_mesh_compression, view = gltf.bufferViews[extension.bufferView], material = gltf.materials[primitive.material].name;
    const raw = decodeDracoMesh(draco, source.subarray(binary + view.byteOffset, binary + view.byteOffset + view.byteLength), extension.attributes, true);
    // Position welding on NASA's own quantization grid.
    const ids = new Map(), qpos = [], weld = new Uint32Array(raw.points);
    for (let i = 0; i < raw.points; i++) {
      const key = `${raw.POSITION[i * 3]},${raw.POSITION[i * 3 + 1]},${raw.POSITION[i * 3 + 2]}`;
      if (!ids.has(key)) { ids.set(key, ids.size); qpos.push(raw.POSITION[i * 3], raw.POSITION[i * 3 + 1], raw.POSITION[i * 3 + 2]); }
      weld[i] = ids.get(key);
    }
    const positions = dequantize(qpos, raw.quantization), original = new Map(), incident = Array.from({ length: ids.size }, () => new Map());
    const owner = new Map(), lock = new Uint8Array(ids.size);
    for (let t = 0; t < raw.faces; t++) {
      const corner = raw.indices[t * 3], [a, b, c] = [0, 1, 2].map(k => weld[raw.indices[t * 3 + k]]), key = cyclic(a, b, c);
      if (a === b || b === c || a === c || original.has(key)) continue;
      const normal = [raw.NORMAL[corner * 2], raw.NORMAL[corner * 2 + 1]];
      original.set(key, normal);
      for (const v of [a, b, c]) incident[v].set(normal.join(','), normal);
      // Vertices shared by two runtime partitions stay fixed so both sides keep the same cut.
      const group = partition(material, positions, a, b, c);
      for (const v of [a, b, c]) { if (!owner.has(v)) owner.set(v, group); else if (owner.get(v) !== group) lock[v] = 1; }
    }
    // Curvature-aware metric: corners carry an area-weighted normal of the facets within 30 degrees
    // (split at sharper creases), so curved shells keep enough facets to shade like the source while
    // coplanar detail collapses freely and creases act as preserved attribute seams.
    const facets = [...original.keys()].map(key => {
      const [a, b, c] = key.split(',').map(Number), p = i => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]], A = p(a), B = p(b), C = p(c);
      const u = B.map((x, k) => x - A[k]), w = C.map((x, k) => x - A[k]), n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], l = Math.hypot(...n) || 1;
      return { corners: [a, b, c], n, unit: n.map(x => x / l) };
    });
    const around = Array.from({ length: ids.size }, () => []), crease = Math.cos(30 * Math.PI / 180), vertexOf = new Map(), vertexPosition = [], attributes = [];
    facets.forEach((f, t) => { for (const v of f.corners) around[v].push(t); });
    const smoothVertex = (t, v) => {
      const n = [0, 0, 0], u = facets[t].unit;
      for (const s of around[v]) { const f = facets[s]; if (f.unit[0] * u[0] + f.unit[1] * u[1] + f.unit[2] * u[2] >= crease) for (let k = 0; k < 3; k++) n[k] += f.n[k]; }
      const l = Math.hypot(...n) || 1, key = `${v}:${n.map(x => Math.round(x / l * 4096)).join()}`;
      if (!vertexOf.has(key)) { vertexOf.set(key, vertexPosition.length); vertexPosition.push(v); attributes.push(...n.map(x => x / l)); }
      return vertexOf.get(key);
    };
    const corners = facets.map((f, t) => f.corners.map(v => smoothVertex(t, v))), smooth = Float32Array.from(attributes);
    const cornerPositions = Float32Array.from(vertexPosition.flatMap(v => [positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]]));
    const cornerLock = Uint8Array.from(vertexPosition, v => lock[v]), grouped = new Map();
    facets.forEach((f, t) => { const group = partition(material, positions, ...f.corners); if (!grouped.has(group)) grouped.set(group, []); grouped.get(group).push(...corners[t]); });
    // Collapse inside each partition; repeat with more locked vertices if a centroid would change partition.
    const tolerance = /puck-|Silver-Puck/.test(material) ? hiddenError : error;
    let triangles, attempts = 0;
    for (;;) {
      triangles = [];
      let moved = 0;
      for (const [group, list] of grouped) {
        const indices = Uint32Array.from(list);
        const [result] = group === 'retired' ? [indices] : MeshoptSimplifier.simplifyWithAttributes(indices, cornerPositions, 3, smooth, 3, [normalWeight, normalWeight, normalWeight], cornerLock, 0, tolerance, ['ErrorAbsolute']);
        for (let i = 0; i < result.length; i += 3) {
          const [x, y, z] = result.subarray(i, i + 3), [a, b, c] = [x, y, z].map(s => vertexPosition[s]);
          if (partition(material, positions, a, b, c) !== group) { cornerLock[x] = cornerLock[y] = cornerLock[z] = 1; moved++; }
          triangles.push([a, b, c, group]);
        }
      }
      if (!moved) break;
      if (++attempts > 8) throw Error(`${material}: partition-stable simplification failed`);
    }
    // Flat normals: NASA's value for unchanged or near-coplanar facets, otherwise the new facet normal.
    const bits = raw.normalBits, cosine = Math.cos(4 * Math.PI / 180), faces = [];
    for (const [a, b, c] of triangles) {
      let normal = original.get(cyclic(a, b, c));
      if (!normal) {
        const p = i => [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]], A = p(a), B = p(b), C = p(c);
        const u = B.map((x, k) => x - A[k]), w = C.map((x, k) => x - A[k]), n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], length = Math.hypot(...n);
        let best = null, score = -2;
        for (const v of [a, b, c]) for (const candidate of incident[v].values()) {
          const d = decodeNormal(candidate, bits), dot = length ? (d[0] * n[0] + d[1] * n[1] + d[2] * n[2]) / length : 0;
          if (dot > score) { score = dot; best = candidate; }
        }
        normal = score > cosine || !length ? best : octahedral(n.map(x => x / length), bits);
      }
      faces.push([a, b, c, normal]);
    }
    // Draco sequential coding predicts each vertex from the previous one: walk across shared edges so
    // neighbouring facets (similar normals, nearby positions) and their vertices are consecutive.
    const edges = new Map(), edge = (x, y) => x < y ? `${x},${y}` : `${y},${x}`;
    faces.forEach(([a, b, c], f) => { for (const [x, y] of [[a, b], [b, c], [c, a]]) { const k = edge(x, y); if (!edges.has(k)) edges.set(k, []); edges.get(k).push(f); } });
    const visited = new Uint8Array(faces.length), ordered = [], stack = [];
    let last = -1, lastNormal = null, next = 0;
    while (ordered.length < faces.length) {
      let f = -1;
      while (stack.length && f < 0) {
        const [a, b, c] = faces[stack.at(-1)];
        let best = -1, score = -1;
        for (const [x, y] of [[a, b], [b, c], [c, a]]) for (const g of edges.get(edge(x, y))) {
          if (visited[g]) continue;
          const s = (faces[g].slice(0, 3).includes(last) ? 2 : 0) + (lastNormal && faces[g][3][0] === lastNormal[0] && faces[g][3][1] === lastNormal[1] ? 1 : 0);
          if (s > score) { score = s; best = g; }
        }
        if (best < 0) stack.pop(); else f = best;
      }
      if (f < 0) { while (visited[next]) next++; f = next; }
      visited[f] = 1; stack.push(f);
      const [a, b, c, n] = faces[f], corners = [a, b, c], r = Math.max(0, corners.indexOf(last));
      ordered.push([corners[r], corners[(r + 1) % 3], corners[(r + 2) % 3], n]);
      last = ordered.at(-1)[2]; lastNormal = n;
    }
    const vertexIds = new Map(), vertices = [], indices = [];
    for (const [a, b, c, n] of ordered) for (const v of [a, b, c]) {
      const key = `${v},${n[0]},${n[1]}`;
      if (!vertexIds.has(key)) { vertexIds.set(key, vertices.length); vertices.push([v, n]); }
      indices.push(vertexIds.get(key));
    }
    const out = {
      material, sourceTriangles: raw.faces, sourceVertices: raw.points, uniqueTriangles: original.size, triangles: triangles.length, vertices: vertices.length,
      indices: Uint32Array.from(indices), positions: Int32Array.from(vertices.flatMap(([v]) => qpos.slice(v * 3, v * 3 + 3))), normals: Int32Array.from(vertices.flatMap(([, n]) => n)),
      quantization: raw.quantization, normalBits: bits, groups: {},
    };
    for (const [, , , group] of triangles) out.groups[group] = (out.groups[group] || 0) + 1;
    out.bytes = encodeDracoMesh({ indices: out.indices, positions: out.positions, position: out.quantization, normals: out.normals, normalBits: bits, ids: extension.attributes });
    // Verify with the stock decoder: exact topology, bit-identical NASA vertex coordinates.
    const check = decodeDracoMesh(draco, out.bytes, extension.attributes), expected = dequantize(out.positions, out.quantization);
    if (check.faces !== out.triangles || check.points !== out.vertices || check.POSITION.some((v, i) => v !== expected[i]) || check.indices.some((v, i) => v !== out.indices[i])) throw Error(`${material}: Draco round trip failed`);
    out.min = [Infinity, Infinity, Infinity]; out.max = [-Infinity, -Infinity, -Infinity];
    check.POSITION.forEach((v, i) => { out.min[i % 3] = Math.min(out.min[i % 3], v); out.max[i % 3] = Math.max(out.max[i % 3], v); });
    return out;
  }

  const results = gltf.meshes[0].primitives.map(simplifyPrimitive), json = structuredClone(gltf), chunks = [];
  let offset = 0;
  json.asset.generator += '; simplified with scripts/spacecraft-model-simplify.mjs (meshoptimizer, Draco sequential)';
  const claimed = new Set(), own = index => { if (!claimed.has(index)) { claimed.add(index); return index; } json.accessors.push({ ...json.accessors[index] }); claimed.add(json.accessors.length - 1); return json.accessors.length - 1; };
  results.forEach((result, i) => {
    const primitive = json.meshes[0].primitives[i], viewIndex = primitive.extensions.KHR_draco_mesh_compression.bufferView, padding = (4 - result.bytes.length % 4) % 4;
    // NASA's file shares index accessors between primitives with equal counts; counts now differ.
    primitive.indices = own(primitive.indices); primitive.attributes.POSITION = own(primitive.attributes.POSITION); primitive.attributes.NORMAL = own(primitive.attributes.NORMAL);
    json.bufferViews[viewIndex] = { buffer: 0, byteLength: result.bytes.length, byteOffset: offset };
    chunks.push(result.bytes, new Uint8Array(padding));
    offset += result.bytes.length + padding;
    Object.assign(json.accessors[primitive.indices], { count: result.triangles * 3 });
    Object.assign(json.accessors[primitive.attributes.POSITION], { count: result.vertices, min: result.min, max: result.max });
    Object.assign(json.accessors[primitive.attributes.NORMAL], { count: result.vertices });
  });
  json.buffers[0].byteLength = offset;
  let text = JSON.stringify(json);
  text += ' '.repeat((4 - Buffer.byteLength(text) % 4) % 4);
  const jsonBytes = Buffer.from(text), bin = Buffer.concat(chunks), glb = Buffer.alloc(28 + jsonBytes.length + bin.length);
  glb.write('glTF', 0, 'ascii'); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonBytes.length, 12); glb.write('JSON', 16, 'ascii'); jsonBytes.copy(glb, 20);
  glb.writeUInt32LE(bin.length, 20 + jsonBytes.length); glb.write('BIN\0', 24 + jsonBytes.length, 'ascii'); bin.copy(glb, 28 + jsonBytes.length);
  return { glb, results };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = process.argv.slice(2), option = (name, fallback) => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
  const error = Number(option('error', DEFAULT_ERROR)), hiddenError = Number(option('hidden-error', error * 4)), normalWeight = Number(option('normal-weight', DEFAULT_NORMAL_WEIGHT));
  const output = option('out') ? resolve(option('out')) : fileURLToPath(new URL('public/assets/data/missions/osiris-rex-nasa.glb', root));
  const source = await readNasaSource(args.find(a => !a.startsWith('--'))), { glb, results } = await simplifyOsirisRex(source, { error, hiddenError, normalWeight });
  const sum = key => results.reduce((n, r) => n + r[key], 0);
  for (const r of results) console.log(`${r.material.padEnd(28)} ${String(r.sourceTriangles).padStart(6)} -> ${String(r.uniqueTriangles).padStart(6)} unique -> ${String(r.triangles).padStart(6)} tris, ${String(r.vertices).padStart(6)} verts, ${String(r.bytes.length).padStart(6)} B ${JSON.stringify(r.groups)}`);
  console.log('encoded streams', ['connectivity', 'positions', 'normals'].map(k => `${k} ${results.reduce((n, r) => n + r.bytes.sizes[k], 0)} B`).join(', '));
  console.log(`triangles ${sum('sourceTriangles')} -> ${sum('uniqueTriangles')} unique -> ${sum('triangles')}; vertices ${sum('sourceVertices')} -> ${sum('vertices')}`);
  console.log(`bytes ${source.length} (gzip ${gzipSync(source, { level: 9 }).length}) -> ${glb.length} (gzip ${gzipSync(glb, { level: 9 }).length}); max error ${error} source units, normal weight ${normalWeight} (hidden head ${hiddenError})`);
  if (!args.includes('--dry-run')) { await writeFile(output, glb); console.log('wrote', output); }
}
