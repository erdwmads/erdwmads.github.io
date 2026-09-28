import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { packJourney, packEphemeris, compareTrees } from './mission-data-pack.mjs';
import { decodePacked, loadPackedJson } from '../src/scripts/sample-missions/packed-data.js';
import { transferState, flybyFrameState } from '../src/scripts/sample-missions/transfer.js';
import { sampleTrack } from '../src/scripts/sample-missions/proximity.js';

const dir = new URL('../public/assets/data/missions/', import.meta.url);
const journey = JSON.parse(await readFile(new URL('journey.json', dir), 'utf8')), ephemeris = JSON.parse(await readFile(new URL('ephemeris.json', dir), 'utf8'));
const journeyText = await readFile(new URL('journey.packed.json', dir), 'utf8'), ephemerisText = await readFile(new URL('ephemeris.packed.json', dir), 'utf8');
const packedJourney = decodePacked(journeyText), packedEphemeris = decodePacked(ephemerisText);
const ids = ['hayabusa2', 'osiris-rex'], distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

test('checked-in packed files are reproducible from the JSON sources', () => {
  assert.equal(packEphemeris(ephemeris), ephemerisText);
  assert.equal(packJourney(journey, ephemeris), journeyText);
});

test('decoded objects keep every key, order, string, time and scalar of the JSON files', () => {
  compareTrees(journey, packedJourney);
  compareTrees(ephemeris, packedEphemeris);
  for (const id of ids) {
    assert.deepEqual(packedJourney.missions[id].times, journey.missions[id].times);
    for (const [phase, track] of Object.entries(ephemeris[id])) assert.deepEqual(packedEphemeris[id][phase].samples.map(s => s.time), track.samples.map(s => s.time));
  }
  assert.deepEqual(packedEphemeris.hayabusa2.depart.samples.flatMap((s, i) => s.breakBefore ? [i] : []), [12]);
  assert.equal(packedEphemeris.hayabusa2.depart.playbackStartIndex, 12);
});

test('every numeric field stays within the stated fixed-point tolerance', () => {
  const worst = { jp: 0, jv: 0, ep: 0, ev: 0 };
  for (const id of ids) for (const body of ['earth', 'craft', 'target']) journey.missions[id][body].forEach((row, i) => row.forEach((v, k) => {
    const d = Math.abs(v - packedJourney.missions[id][body][i][k]), key = k < 3 ? 'jp' : 'jv';
    worst[key] = Math.max(worst[key], d);
  }));
  for (const id of ids) for (const [phase, track] of Object.entries(ephemeris[id])) track.samples.forEach((s, i) => {
    const out = packedEphemeris[id][phase].samples[i];
    s.position.forEach((v, k) => { worst.ep = Math.max(worst.ep, Math.abs(v - out.position[k])); });
    s.velocity.forEach((v, k) => { worst.ev = Math.max(worst.ev, Math.abs(v - out.velocity[k])); });
  });
  // Half of the 1e-5 km / 1e-9 km/s and 1e-9 km / 1e-12 km/s grids, plus float rounding (1e8 km sums, 1e14-unit products).
  assert(worst.jp <= 5.1e-6, 'journey position ' + worst.jp);
  assert(worst.jv <= 5.1e-10, 'journey velocity ' + worst.jv);
  assert(worst.ep <= 5.3e-10, 'ephemeris position ' + worst.ep);
  assert(worst.ev <= 5.01e-13, 'ephemeris velocity ' + worst.ev);
});

test('flyby joins remain exact: journey flyby rows equal decoded Earth plus decoded Earth-relative states', () => {
  for (const id of ids) {
    const m = packedJourney.missions[id], flyby = packedEphemeris[id].earthFlyby.samples, from = m.times.indexOf(Date.parse(flyby[0].time));
    flyby.forEach((s, k) => assert.deepEqual(m.craft[from + k], [...s.position, ...s.velocity].map((v, j) => m.earth[from + k][j] + v)));
    const before = transferState(1, id, packedJourney, 'cruise'), after = transferState(0, id, packedJourney, 'outbound');
    for (const [state, sample] of [[before, flyby[0]], [after, flyby.at(-1)]]) {
      assert(distance(state.craftPositionKm.map((v, i) => v - state.earthPositionKm[i]), sample.position) < 1e-6);
      assert(distance(state.craftVelocityKmS.map((v, i) => v - state.earthVelocityKmS[i]), sample.velocity) < 1e-10);
    }
    for (const p of [0, .013, .17, .501, .791, 1]) {
      const solar = transferState(p, id, packedJourney, 'flyby'), frames = flybyFrameState(id, p, packedEphemeris, packedJourney);
      assert(distance(solar.craftPositionKm, frames.heliocentricPositionKm) < 1e-6);
      assert(distance(solar.craftVelocityKmS, frames.heliocentricVelocityKmS) < 1e-8);
    }
  }
});

// The mission panel's printed numbers (loader.js controlsUI, flight-cues.js, viewer.js labels).
// Range chart and radial speed are shown for rendezvous/depart; the flyby panel prints speeds.
const label = km => km < 1 ? Math.round(km * 1000) + ' m' : km >= 1e6 ? (km / 1e6).toFixed(2) + ' million km' : km.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' km';
function proximityPrints(e, j, id, kind, p) {
  const raw = e[id][kind === 'flyby' ? 'earthFlyby' : kind], track = { ...raw, samples: raw.samples.slice(raw.playbackStartIndex || 0) }, sample = sampleTrack(track, p);
  const range = Math.hypot(...sample.position), rate = sample.position.reduce((n, x, i) => n + x * sample.velocity[i], 0) / range, history = track.samples.map(s => Math.hypot(...s.position)), radial = rate * 1000;
  const out = [range.toLocaleString('en-US', { maximumFractionDigits: 2 }), sample.time.slice(0, 19), label(range)];
  if (kind !== 'flyby') out.push(history[0].toFixed(2), range.toFixed(2), history.at(-1).toFixed(2), label(Math.abs(range - history[0])),
    rate < -.000001 ? 'approaching' : rate > .000001 ? 'away' : 'holding', (radial < -.001 ? 'approaching ' : radial > .001 ? 'receding ' : 'holding ') + Math.abs(radial).toFixed(3) + ' m/s');
  else {
    const f = flybyFrameState(id, p, e, j), ends = [0, 1].map(q => flybyFrameState(id, q, e, j));
    out.push(Math.hypot(...f.earthVelocityKmS).toFixed(3), f.speedEarthKmS.toFixed(3), f.speedSunKmS.toFixed(3), ...ends.flatMap(x => [x.speedSunKmS.toFixed(3), x.speedEarthKmS.toFixed(3), x.speedSunKmS.toFixed(2)]));
  }
  return out;
}
function journeyPrints(j, id, kind, p) {
  const s = transferState(p, id, j, kind);
  return [s.time.slice(0, 19), (s.rangeToEarthKm / 1e6).toFixed(2), (s.rangeToTargetKm / 1e6).toFixed(2), label(s.rangeToTargetKm), String(s.travelledCount)];
}
const grid = extra => [...Array.from({ length: 1001 }, (_, k) => k / 1000), ...extra];

test('every printed distance, speed, rate and time is identical on the 0.1% progress grid and at each sample', () => {
  let compared = 0;
  for (const id of ids) {
    for (const kind of ['rendezvous', 'depart', 'flyby']) {
      const raw = ephemeris[id][kind === 'flyby' ? 'earthFlyby' : kind], n = raw.samples.length - (raw.playbackStartIndex || 0);
      for (const p of grid(Array.from({ length: n }, (_, i) => i / (n - 1)))) {
        const a = proximityPrints(ephemeris, journey, id, kind, p), b = proximityPrints(packedEphemeris, packedJourney, id, kind, p);
        assert.deepEqual(b, a, `${id} ${kind} at ${p}`); compared += a.length;
      }
    }
    for (const kind of ['cruise', 'outbound']) {
      const m = journey.missions[id], start = Date.parse(m[kind].start), end = Date.parse(m[kind].end);
      for (const p of grid(m.times.filter(t => t >= start && t <= end).map(t => (t - start) / (end - start)))) {
        const a = journeyPrints(journey, id, kind, p), b = journeyPrints(packedJourney, id, kind, p);
        assert.deepEqual(b, a, `${id} ${kind} at ${p}`); compared += a.length;
      }
    }
  }
  assert(compared > 60000, 'compared ' + compared + ' printed values');
});

test('loadPackedJson is a drop-in for fetch().json() and keeps the caller error message', async () => {
  const original = globalThis.fetch;
  try {
    let seen;
    globalThis.fetch = async (url, options) => { seen = [url, options.signal]; return { ok: true, json: async () => JSON.parse(journeyText) }; };
    const signal = new AbortController().signal;
    compareTrees(journey, await loadPackedJson('/assets/data/missions/journey.packed.json', signal, 'Solar journey unavailable'));
    assert.deepEqual(seen, ['/assets/data/missions/journey.packed.json', signal]);
    globalThis.fetch = async () => ({ ok: false });
    await assert.rejects(loadPackedJson('/missing.packed.json', signal, 'Solar journey unavailable'), /Solar journey unavailable/);
  } finally { globalThis.fetch = original; }
});

test('decoding leaves the parsed input untouched, and corrupt or foreign files fail loudly', () => {
  const pack = JSON.parse(journeyText), copy = structuredClone(pack);
  decodePacked(pack); assert.deepEqual(pack, copy);
  assert.throws(() => decodePacked({ ...pack, payload: pack.payload.slice(0, -1200) }), /truncated/);
  assert.throws(() => decodePacked({ not: 'packed' }), /Not a packed/);
});
