import test from 'node:test';
import assert from 'node:assert/strict';
import { EARTH_RADIUS_KM, EARTH_FLIGHT_PROFILES, earthFlightState } from './earth-physics.js';

const ids = ['hayabusa2', 'osiris-rex'];
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const altitude = p => Math.hypot(p[0], p[1] + EARTH_RADIUS_KM, p[2]) - EARTH_RADIUS_KM;

test('Earth, launch vehicles and capsules retain their real kilometre dimensions', () => {
  assert.equal(EARTH_RADIUS_KM, 6371);
  assert.equal(earthFlightState('hayabusa2', 'launch', 0).vehicle.lengthKm, .053);
  assert.equal(earthFlightState('osiris-rex', 'launch', 0).vehicle.lengthKm, .0576072);
  assert.equal(earthFlightState('hayabusa2', 'entry', 0).vehicle.diameterKm, .0004);
  assert.equal(earthFlightState('osiris-rex', 'entry', 0).vehicle.diameterKm, .00081);
});

for (const id of ids) {
  test(`${id} starts at the launch surface, rises vertically and then pitches downrange`, () => {
    const start = earthFlightState(id, 'launch', 0);
    assert.deepEqual(start.positionKm, [0, 0, 0]);
    assert.deepEqual(start.forward, [0, 1, 0]);
    const early = earthFlightState(id, 'launch', .02);
    assert(early.positionKm[1] > 0);
    assert(Math.abs(early.positionKm[0]) < 1e-8);
    const ascent = earthFlightState(id, 'launch', .3);
    assert(ascent.positionKm[0] > 1);
    assert(ascent.altitudeKm > early.altitudeKm);
    assert(dot(ascent.forward, ascent.up) < .99);
    const end = earthFlightState(id, 'launch', 1);
    assert(end.spacecraftReleased);
    assert.equal(end.vehicle.type, 'spacecraft');
    assert(!end.engineOn.core && !end.engineOn.upper);
    assert(end.elapsedSeconds >= end.events.spacecraftSeparation);
  });

  test(`${id} release and entry join, capsule moves inward and mother ship stays clear`, () => {
    const start = earthFlightState(id, 'separation', 0);
    assert(Math.abs(start.capsule.altitudeKm - EARTH_FLIGHT_PROFILES[id].releaseAltitudeKm) < .001);
    assert(distance(start.capsule.positionKm, start.spacecraft.positionKm) < .01);
    const end = earthFlightState(id, 'separation', 1);
    const entry = earthFlightState(id, 'entry', 0);
    assert(distance(end.capsule.positionKm, entry.positionKm) < 1e-6);
    assert(distance(end.capsule.velocityKmS, entry.velocityKmS) < 1e-6);
    assert(distance(end.capsule.positionKm, end.spacecraft.positionKm) > 100);
    for (let i = 0; i <= 200; i++) {
      const state = earthFlightState(id, 'separation', i / 200);
      assert(state.spacecraft.altitudeKm > 150);
      assert(dot(state.capsule.velocityKmS, state.capsule.up) < 0);
    }
  });

  test(`${id} entry speed is source anchored, shield points forward and parachute descends vertically`, () => {
    const start = earthFlightState(id, 'entry', 0);
    assert(Math.abs(Math.hypot(...start.velocityKmS) - EARTH_FLIGHT_PROFILES[id].entrySpeedKmS) < 1e-6);
    assert(dot(start.forward, start.up) < 0);
    assert.deepEqual(start.heatShieldDirection, start.forward);
    const chute = earthFlightState(id, 'entry', .9);
    assert(chute.parachute > .99);
    assert(Math.abs(chute.velocityKmS[0]) < 1e-10);
    assert(chute.velocityKmS[1] < 0);
    const end = earthFlightState(id, 'entry', 1);
    assert.deepEqual(end.positionKm, [0, 0, 0]);
    assert.deepEqual(end.velocityKmS, [0, 0, 0]);
    assert(end.landed);
  });

  test(`${id} finite reversible states never penetrate the spherical Earth`, () => {
    for (const kind of ['launch', 'separation', 'entry']) {
      let previousAltitude = Infinity;
      for (let i = 0; i <= 300; i++) {
        const state = earthFlightState(id, kind, i / 300);
        assert(state.positionKm.every(Number.isFinite));
        assert(state.velocityKmS.every(Number.isFinite));
        assert(Math.abs(altitude(state.positionKm) - state.altitudeKm) < 1e-7);
        assert(state.altitudeKm >= -1e-8);
        if (kind === 'entry') assert(state.altitudeKm <= previousAltitude + 1e-8);
        previousAltitude = state.altitudeKm;
        assert.match(state.provenance, /explanatory/);
      }
      const earlier = earthFlightState(id, kind, .3);
      earthFlightState(id, kind, .9);
      assert.deepEqual(earthFlightState(id, kind, .3), earlier);
      assert.deepEqual(earthFlightState(id, kind, -1), earthFlightState(id, kind, 0));
      assert.deepEqual(earthFlightState(id, kind, 2), earthFlightState(id, kind, 1));
      assert.deepEqual(earthFlightState(id, kind, NaN), earthFlightState(id, kind, 0));
    }
    assert.deepEqual(earthFlightState(id, 'return', .4), earthFlightState(id, 'separation', .4));
    assert.deepEqual(earthFlightState(id, 'landing', .4), earthFlightState(id, 'entry', .4));
  });

  test(`${id} velocity stays continuous at parachute deployment and matches position change`, () => {
    const before = earthFlightState(id, 'entry', .64 - 1e-7);
    const after = earthFlightState(id, 'entry', .64 + 1e-7);
    assert(distance(before.velocityKmS, after.velocityKmS) < 1e-4);
    for (const kind of ['launch', 'entry', 'separation']) {
      for (const p of [.1, .25, .6, .85]) {
        const a = earthFlightState(id, kind, p - 1e-6);
        const b = earthFlightState(id, kind, p + 1e-6);
        const velocity = a.positionKm.map((v, i) => (b.positionKm[i] - v) / (b.elapsedSeconds - a.elapsedSeconds));
        assert(distance(velocity, earthFlightState(id, kind, p).velocityKmS) < 1e-5);
      }
    }
  });
}

test('mission-specific chronology includes the actual OSIRIS-REx drogue anomaly', () => {
  const h = earthFlightState('hayabusa2', 'launch', .5).events;
  const o = earthFlightState('osiris-rex', 'launch', .5).events;
  assert(h.fairingSeparation < h.stageSeparation);
  assert(o.fairingSeparation > o.stageSeparation);
  assert.equal(h.spacecraftSeparation, 6441);
  const entry = earthFlightState('osiris-rex', 'entry', .5);
  assert.equal(entry.drogueDeployed, false);
  assert.match(entry.note, /drogue/i);
});
