import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('planetary data contains sourced heliocentric trajectories, not invented CI coordinates', async () => {
  const data = JSON.parse(await readFile(new URL('../public/assets/data/planetary/orbits.json', import.meta.url), 'utf8'));
  assert.equal(data.epoch, '2026-09-07');
  assert.equal(data.units, 'AU');
  assert.equal(data.timeScale, 'TDB');
  assert.equal(data.center, 'Sun');
  assert.deepEqual(data.bodies.map(b => b.id), ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune','bennu','ryugu']);
  for (const body of data.bodies) {
    assert.equal(body.points.length, 181);
    assert.ok(body.points.every(p => p.length === 3 && p.every(Number.isFinite)));
    assert.match(body.query, /^https:\/\/ssd.jpl.nasa.gov\/api\/horizons.api/);
    assert.equal(body.firstJD, data.bodies[0].firstJD);
  }
  const earth = data.bodies.find(b => b.id === 'earth');
  assert.ok(Math.hypot(...earth.points[0]) > 0.98 && Math.hypot(...earth.points[0]) < 1.02);
  for (const id of ['bennu','ryugu']) assert.ok(data.bodies.find(b => b.id === id).points.some(p => Math.abs(p[2]) > 0.01));
});

test('public models and attribution are locally available', async () => {
  const credits = JSON.parse(await readFile(new URL('../public/assets/data/planetary/models.json', import.meta.url), 'utf8'));
  for (const id of ['bennu','ryugu']) {
    assert.match(credits[id].source, /^https:/);
    assert.ok((await stat(new URL(`../public${credits[id].asset}`, import.meta.url))).size > 10000);
  }
  assert.equal(credits.orgueil.model, null);
});
