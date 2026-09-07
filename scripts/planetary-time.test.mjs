import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEphemeris } from '../src/scripts/planetary-ephemeris.js';

test('interpolation uses the same physical day for every body and clamps endpoints', () => {
  const ephemeris = createEphemeris({start:'2025-01-01',end:'2025-01-03',stepDays:1,bodies:[{id:'earth',points:[[0,0,0],[2,0,0],[4,0,0]]},{id:'bennu',points:[[0,0,0],[0,4,0],[0,8,0]]}]});
  assert.deepEqual(ephemeris.position('earth',0.5),[1,0,0]);
  assert.deepEqual(ephemeris.position('bennu',0.5),[0,2,0]);
  assert.deepEqual(ephemeris.position('earth',-1),[0,0,0]);
  assert.deepEqual(ephemeris.position('earth',5),[4,0,0]);
});
test('cached timeline has common daily UTC samples and complete provenance', async () => {
  const data = JSON.parse(await readFile(new URL('../public/assets/data/planetary/timeline.json',import.meta.url)));
  assert.equal(data.timeScale,'UTC');
  assert.equal(data.bodies.length,10);
  const count = (Date.parse(data.end)-Date.parse(data.start))/86400000+1;
  for(const body of data.bodies){
    assert.equal(body.points.length,count);
    assert.ok(body.points.every(p=>p.length===3&&p.every(Number.isFinite)));
    assert.ok(body.query.includes('TIME_TYPE'));
  }
});
