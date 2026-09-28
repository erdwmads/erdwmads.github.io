import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PACK_FORMAT, RICE_ESCAPE, RiceState, zigzag, predictState, decodePacked } from '../src/scripts/sample-missions/packed-data.js';

// Packs journey.json / ephemeris.json into journey.packed.json / ephemeris.packed.json
// (decoder: src/scripts/sample-missions/packed-data.js). Plain JSON with one base64 payload keeps the
// files gzip-compressible by static hosts; a .bin path was dropped because some browser security filters
// answer *.bin requests with an empty 204.
// Run directly to repack from the checked-in JSON without network access: node scripts/mission-data-pack.mjs
// Resolution (value = integer / 10^digits): journey 1e-5 km and 1e-9 km/s; ephemeris 1e-9 km and 1e-12 km/s.
// Times, strings and scalar metadata are exact. Journey flyby states are rebuilt exactly as the generator
// defines them (Earth state + ephemeris Earth-relative state), so chapter joins stay exact after decoding.
export const JOURNEY_DIGITS = [5, 9], EPHEMERIS_DIGITS = [9, 12];

const bitLength = z => { let n = 0; while (z >= 1) { z = Math.floor(z / 2); n++; } return n; };
class BitWriter {
  constructor() { this.bytes = []; this.bit = 0; }
  write(value, n) { for (let i = 0; i < n; i++, this.bit++) { if (!(this.bit & 7)) this.bytes.push(0); if (Math.floor(value / 2 ** i) % 2) this.bytes[this.bytes.length - 1] |= 1 << (this.bit & 7); } }
  raw(v) { const z = zigzag(v), n = bitLength(z); if (n > 53) throw Error('Value exceeds exact integer range'); this.write(n, 6); this.write(z, n); }
  rice(state, v) {
    const z = zigzag(v), k = state.k, q = Math.floor(z / 2 ** k);
    if (!Number.isSafeInteger(z)) throw Error('Residual exceeds exact integer range');
    if (q < RICE_ESCAPE) { for (let i = 0; i < q; i++) this.write(1, 1); this.write(0, 1); this.write(z - q * 2 ** k, k); }
    else { for (let i = 0; i < RICE_ESCAPE; i++) this.write(1, 1); const n = bitLength(z); this.write(n, 6); this.write(z, n); }
    state.update(z);
  }
}
function intBytes(values) {
  const writer = new BitWriter(), state = new RiceState();
  values.forEach((v, i) => { if (!Number.isSafeInteger(v)) throw Error('Integer track expected'); if (!i) writer.raw(v); else writer.rice(state, v - (i > 1 ? 2 * values[i - 1] - values[i - 2] : values[0])); });
  return writer.bytes;
}
// rows: [[x,y,z,vx,vy,vz]]. Spliced rows are not stored; both sides rebuild them from decoded blocks.
const clocks = new WeakMap(), seconds = ms => { if (!clocks.has(ms)) clocks.set(ms, ms.map(v => v / 1000)); return clocks.get(ms); };
function stateBytes(rows, timesMs, [dp, dv], predictor, splice) {
  const writer = new BitWriter(), t = seconds(timesMs), f = 10 ** (dp - dv), X = [[], [], []], V = [[], [], []], states = Array.from({ length: 6 }, () => new RiceState());
  rows.forEach((row, i) => {
    if (splice && i >= splice.from && i <= splice.to) {
      const joined = splice.base[i].map((v, k) => v + splice.add[i - splice.from][k]);
      for (let c = 0; c < 3; c++) { X[c].push(Math.round(joined[c] * 10 ** dp)); V[c].push(Math.round(joined[c + 3] * 10 ** dv)); }
      return;
    }
    for (let c = 0; c < 3; c++) {
      const x = Math.round(row[c] * 10 ** dp), v = Math.round(row[c + 3] * 10 ** dv), [pv, px] = predictState(predictor, X[c], V[c], t, i, f);
      if (i) writer.rice(states[c + 3], v - Math.round(pv)); else writer.raw(v);
      V[c].push(v);
      if (i) writer.rice(states[c], x - Math.round(px(v))); else writer.raw(x);
      X[c].push(x);
    }
  });
  return writer.bytes;
}
const quantized = (rows, [dp, dv]) => rows.map(r => r.map((v, k) => k < 3 ? Math.round(v * 10 ** dp) / 10 ** dp : Math.round(v * 10 ** dv) / 10 ** dv));

class Container {
  constructor() { this.blocks = []; this.chunks = []; this.offset = 0; }
  add(block, bytes) { this.blocks.push({ ...block, offset: this.offset, length: bytes.length }); this.chunks.push(bytes); this.offset += bytes.length; return { $pack: this.blocks.length - 1 }; }
  ints(values) { return this.add({ type: 'int', count: values.length }, intBytes(values)); }
  states(rows, times, digits, splice) {
    // Keep whichever reproducible predictor is smaller for this track.
    const [predictor, bytes] = ['A', 'D'].map(p => [p, stateBytes(rows, times.values, digits, p, splice && { ...splice, base: splice.base.decoded, add: splice.add.decoded })]).sort((a, b) => a[1].length - b[1].length)[0];
    // decoded: the exact rows decodePacked() returns, used as the base of later spliced blocks.
    const ref = this.add({ type: 'state', count: rows.length, times: times.ref.$pack, digits, predictor, ...(splice && { splice: { from: splice.from, to: splice.to, base: splice.base.ref.$pack, add: splice.add.ref.$pack } }) }, bytes);
    const decoded = quantized(rows, digits);
    if (splice) for (let i = splice.from; i <= splice.to; i++) decoded[i] = splice.base.decoded[i].map((v, k) => v + splice.add.decoded[i - splice.from][k]);
    return { ref, decoded };
  }
  text(tree) {
    const payload = Buffer.concat(this.chunks.map(chunk => Buffer.from(chunk))).toString('base64');
    return JSON.stringify({ format: PACK_FORMAT, version: 1, tree, blocks: this.blocks, payload }) + '\n';
  }
}
const isoSeconds = ms => new Date(ms).toISOString().replace('.000Z', 'Z');
function times(container, values) { return { values, ref: container.ints(values) }; }

export function packEphemeris(ephemeris) {
  const pack = new Container(), tree = structuredClone(ephemeris);
  for (const mission of Object.values(tree)) {
    if (!mission || typeof mission !== 'object') continue;
    for (const track of Object.values(mission)) {
      const ms = track.samples.map(s => Date.parse(s.time)), flags = {};
      track.samples.forEach((s, i) => {
        const keys = Object.keys(s).join();
        if (isoSeconds(ms[i]) !== s.time || !(keys === 'time,position,velocity' || keys === 'time,position,velocity,breakBefore' && s.breakBefore === true)) throw Error('Unexpected ephemeris sample shape at ' + s.time);
        if (s.breakBefore) (flags.breakBefore ||= []).push(i);
      });
      const clock = times(pack, ms), state = pack.states(track.samples.map(s => [...s.position, ...s.velocity]), clock, EPHEMERIS_DIGITS);
      track.samples = pack.add({ type: 'samples', times: clock.ref.$pack, state: state.ref.$pack, format: 'iso-seconds', ...(Object.keys(flags).length && { flags }) }, []);
    }
  }
  return verify(pack.text(tree), ephemeris);
}

export function packJourney(journey, ephemeris) {
  const pack = new Container(), tree = structuredClone(journey);
  for (const [id, mission] of Object.entries(tree.missions)) {
    const clock = times(pack, mission.times), earth = pack.states(mission.earth, clock, JOURNEY_DIGITS), flyby = ephemeris[id].earthFlyby.samples;
    // Flyby rows are Earth + ephemeris Earth-relative states in the generator; keep that construction.
    const from = mission.times.indexOf(Date.parse(flyby[0].time)), to = from + flyby.length - 1;
    if (from < 0 || flyby.some((s, k) => mission.times[from + k] !== Date.parse(s.time))) throw Error(id + ': flyby epochs are not shared');
    flyby.forEach((s, k) => { const row = mission.craft[from + k], sum = [...s.position, ...s.velocity].map((v, j) => v + mission.earth[from + k][j]); if (row.some((v, j) => Math.abs(v - sum[j]) > 1e-6)) throw Error(id + ': flyby state is not Earth + relative state'); });
    const relativeClock = times(pack, flyby.map(s => Date.parse(s.time))), relative = pack.states(flyby.map(s => [...s.position, ...s.velocity]), relativeClock, EPHEMERIS_DIGITS);
    mission.times = clock.ref; mission.earth = earth.ref;
    mission.craft = pack.states(journey.missions[id].craft, clock, JOURNEY_DIGITS, { from, to, base: earth, add: relative }).ref;
    mission.target = pack.states(journey.missions[id].target, clock, JOURNEY_DIGITS).ref;
  }
  return verify(pack.text(tree), journey);
}

// Structural equality with numeric tolerance; returns the largest absolute numeric difference.
export function compareTrees(a, b, path = '$', report = { max: 0, where: '' }) {
  if (typeof a === 'number' && typeof b === 'number') { const d = Math.abs(a - b); if (!(d <= report.max)) Object.assign(report, { max: d, where: path }); return report; }
  if (Array.isArray(a) !== Array.isArray(b) || typeof a !== typeof b || (a === null) !== (b === null)) throw Error('Type differs at ' + path);
  if (a && typeof a === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.join('\u0000') !== kb.join('\u0000')) throw Error('Keys differ at ' + path);
    for (const k of ka) compareTrees(a[k], b[k], path + '.' + k, report);
  } else if (a !== b) throw Error('Value differs at ' + path);
  return report;
}
function verify(text, original) {
  const report = compareTrees(original, decodePacked(text));
  if (report.max > 1e-5) throw Error(`Packed data exceeds tolerance at ${report.where}: ${report.max}`);
  return text;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const dir = new URL('../public/assets/data/missions/', import.meta.url);
  const ephemeris = JSON.parse(await readFile(new URL('ephemeris.json', dir), 'utf8')), journey = JSON.parse(await readFile(new URL('journey.json', dir), 'utf8'));
  for (const [name, text] of [['ephemeris.packed.json', packEphemeris(ephemeris)], ['journey.packed.json', packJourney(journey, ephemeris)]]) {
    await writeFile(new URL(name, dir), text);
    console.log(name, Buffer.byteLength(text), 'bytes');
  }
}
