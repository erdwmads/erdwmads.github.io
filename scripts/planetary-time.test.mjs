import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createEphemeris } from '../src/scripts/planetary-ephemeris.js';
import { packTimeline, unpackTimeline, timelineEncoding, timelineScale } from '../src/scripts/planetary-timeline.js';

const read = name => readFile(new URL(`../public/assets/data/planetary/${name}`,import.meta.url),'utf8');
// Half the fixed-point step (5e-8 AU, about 7.5 km) plus floating-point rounding slack.
const tolerance = 0.5/timelineScale+1e-12;
const withoutPoints = ({bodies,...meta}) => ({...meta,bodies:bodies.map(({points,...body})=>body)});

test('interpolation uses the same physical day for every body and clamps endpoints', () => {
  const ephemeris = createEphemeris({start:'2025-01-01',end:'2025-01-03',stepDays:1,bodies:[{id:'earth',points:[[0,0,0],[2,0,0],[4,0,0]]},{id:'bennu',points:[[0,0,0],[0,4,0],[0,8,0]]}]});
  assert.deepEqual(ephemeris.position('earth',0.5),[1,0,0]);
  assert.deepEqual(ephemeris.position('bennu',0.5),[0,2,0]);
  assert.deepEqual(ephemeris.position('earth',-1),[0,0,0]);
  assert.deepEqual(ephemeris.position('earth',5),[4,0,0]);
});
test('cached timeline has common daily UTC samples and complete provenance', async () => {
  const data = unpackTimeline(JSON.parse(await read('timeline.packed.json')));
  assert.equal(data.timeScale,'UTC');
  assert.equal(data.bodies.length,10);
  const count = (Date.parse(data.end)-Date.parse(data.start))/86400000+1;
  for(const body of data.bodies){
    assert.equal(body.points.length,count);
    assert.ok(body.points.every(p=>p.length===3&&p.every(Number.isFinite)));
    assert.ok(body.query.includes('TIME_TYPE'));
  }
});
test('packed timeline restores the full-precision JPL vectors within 5e-8 AU', async t => {
  const [full,packed] = (await Promise.all([read('timeline.json'),read('timeline.packed.json')])).map(text=>JSON.parse(text));
  const decoded = unpackTimeline(packed);
  assert.deepEqual(withoutPoints(decoded),withoutPoints(full),'Metadata, body order and query URLs must survive unchanged');
  let worst = 0;
  full.bodies.forEach((body,b) => {
    assert.equal(decoded.bodies[b].points.length,body.points.length);
    body.points.forEach((point,i) => point.forEach((value,axis) => { worst = Math.max(worst,Math.abs(decoded.bodies[b].points[i][axis]-value)); }));
  });
  t.diagnostic(`largest coordinate error ${worst.toExponential(3)} AU (${(worst*149597870.7).toFixed(2)} km)`);
  assert.ok(worst <= tolerance,`largest error ${worst} AU`);
  // Linear interpolation mixes neighbouring samples, so interpolated positions keep the same bound.
  const exact = createEphemeris(full), restored = createEphemeris(decoded);
  for (const {id} of full.bodies) for (const day of [0,0.37,431.5,1234.9,2191]) {
    const a = exact.position(id,day), b = restored.position(id,day);
    assert.ok(a.every((value,i)=>Math.abs(value-b[i])<=tolerance),`${id} on day ${day}`);
  }
});
test('packed timeline is reproducible and transfers at least three times smaller', async () => {
  const [fullText,packedText] = await Promise.all([read('timeline.json'),read('timeline.packed.json')]);
  assert.equal(JSON.stringify(packTimeline(JSON.parse(fullText))),packedText,'Regenerate with: node scripts/fetch-planetary-timeline.mjs --from-raw');
  assert.ok(gzipSync(packedText).length*3 <= gzipSync(fullText).length);
});
test('packing round-trips edge cases and rejects unknown encodings', () => {
  const series = {start:'2025-01-01',end:'2025-02-09',units:'AU',stepDays:1,bodies:[
    {id:'single',points:[[1.23456789,-0.5,30.1]]},
    {id:'jagged',points:Array.from({length:40},(_,i)=>[Math.sin(i*0.7)*29.9,Math.cos(i*1.3)*-0.02,i%3?1e-9:-1e-9])},
    {id:'still',points:Array.from({length:5},()=>[0,0,0])}
  ]};
  const decoded = unpackTimeline(packTimeline(series));
  assert.deepEqual(withoutPoints(decoded),withoutPoints(series));
  series.bodies.forEach((body,b) => body.points.forEach((point,i) => point.forEach((value,axis) => assert.ok(Math.abs(decoded.bodies[b].points[i][axis]-value)<=tolerance))));
  assert.throws(()=>unpackTimeline({...packTimeline(series),encoding:{name:'other',scale:timelineScale}}),/Unsupported/);
  assert.throws(()=>unpackTimeline({encoding:{name:timelineEncoding,scale:timelineScale},bodies:[{id:'bad',order:2,x:[1,2],y:[1],z:[1,2]}]}),/Invalid/);
});
