import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as transfer from './transfer.js';
const journey=JSON.parse(await readFile(new URL('../../../public/assets/data/missions/journey.json',import.meta.url),'utf8'));
const ephemeris=JSON.parse(await readFile(new URL('../../../public/assets/data/missions/ephemeris.json',import.meta.url),'utf8'));
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const ids=['hayabusa2','osiris-rex'];

test('journey vectors are finite, sorted UTC, Sun-centered ICRF from official sources',()=>{
 assert.equal(journey.center,'10');assert.equal(journey.frame,'ICRF');assert.equal(journey.timeScale,'UTC');
 for(const id of ids){const m=journey.missions[id];assert(m.times.every((t,i)=>Number.isFinite(t)&&(!i||t>m.times[i-1])));for(const name of ['craft','earth','target']){assert.equal(m[name].length,m.times.length);assert(m[name].every(s=>s.length===6&&s.every(Number.isFinite)));assert(m.sources[name].every(s=>s.api==='https://ssd.jpl.nasa.gov/api/horizons_file.api'));}}
});

test('one fixed scene projection preserves lengths, direction and the out-of-ecliptic component',()=>{
 assert.equal(typeof transfer.toSolarScene,'function');
 const basis=[[1,0,0],[0,1,0],[0,0,1]].map(transfer.toSolarScene);
 for(const b of basis)assert(Math.abs(Math.hypot(...b)*transfer.AU_KM/3-1)<1e-12);
 const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);assert(Math.abs(dot(basis[0],basis[1]))<1e-30);
 const eps=23.439291111*Math.PI/180,north=[0,-Math.sin(eps),Math.cos(eps)],projected=transfer.toSolarScene(north);
 assert(projected[1]>0&&Math.abs(projected[2])<1e-17);
});

for(const id of ids){
 test(id+' source cruise and outbound endpoints share exact UTC with the Earth flyby',()=>{
  const m=journey.missions[id],before=transfer.transferState(1,id,journey,'cruise'),after=transfer.transferState(0,id,journey,'outbound'),flyby=ephemeris[id].earthFlyby;
  assert.equal(Date.parse(before.time),Date.parse(flyby.samples[0].time));assert.equal(Date.parse(after.time),Date.parse(flyby.samples.at(-1).time));
  assert.equal(Date.parse(transfer.transferState(1,id,journey,'outbound').time),Date.parse(ephemeris[id].rendezvous.samples[0].time));
  for(const [state,sample] of [[before,flyby.samples[0]],[after,flyby.samples.at(-1)]]){
   assert(distance(state.craftPositionKm.map((v,i)=>v-state.earthPositionKm[i]),sample.position)<1e-6);
   assert(distance(state.craftVelocityKmS.map((v,i)=>v-state.earthVelocityKmS[i]),sample.velocity)<1e-10);
  }
  assert.equal(Date.parse(transfer.transferState(0,id,journey,'cruise').time),Date.parse(m.sourceStartUtc));
 });
 test(id+' reaches the source asteroid vicinity with a mission-specific path',()=>{
  const end=transfer.transferState(1,id,journey,'outbound');assert(end.rangeToTargetKm<40);assert(end.rangeToEarthKm>1e6);
  const points=transfer.transferPath(id,'outbound',journey,'craft');assert(points.length>300);
  assert(distance(points.at(-1),end.craft)<1e-10);
  for(const body of ['earth','target'])assert.equal(transfer.transferPath(id,'outbound',journey,body).length,points.length);
 });
 test(id+' exposes consistent Earth-relative and Sun-relative flyby speeds',()=>{
  assert.equal(typeof transfer.flybyFrameState,'function');
  for(const p of [0,.17,.5,.91,1]){
   const f=transfer.flybyFrameState(id,p,ephemeris,journey);
   assert(distance(f.heliocentricVelocityKmS,f.relativeVelocityKmS.map((v,i)=>v+f.earthVelocityKmS[i]))<1e-12);
   assert(distance(f.heliocentricPositionKm,f.relativePositionKm.map((v,i)=>v+f.earthPositionKm[i]))<1e-6);
   assert(Math.abs(f.speedEarthKmS-Math.hypot(...f.relativeVelocityKmS))<1e-12);
   assert(Math.abs(f.speedSunKmS-Math.hypot(...f.heliocentricVelocityKmS))<1e-12);
   assert(f.speedEarthKmS>3&&f.speedEarthKmS<20&&f.speedSunKmS>15&&f.speedSunKmS<50);
  }
 });
 test(id+' physical seconds govern interpolation despite nonuniform samples and chapter durations',()=>{
  for(const kind of ['cruise','outbound']){
   const p=.321,h=1e-6,a=transfer.transferState(p-h,id,journey,kind),b=transfer.transferState(p+h,id,journey,kind),at=transfer.transferState(p,id,journey,kind),dt=(Date.parse(b.time)-Date.parse(a.time))/1000;
   assert(distance(a.craftPositionKm.map((v,i)=>(b.craftPositionKm[i]-v)/dt),at.craftVelocityKmS)<.001);
   assert.deepEqual(transfer.transferState(-1,id,journey,kind),transfer.transferState(0,id,journey,kind));
   assert.deepEqual(transfer.transferState(NaN,id,journey,kind),transfer.transferState(0,id,journey,kind));
  }
 });
}

test('two missions no longer reuse the same invented journey',()=>{
 assert(distance(transfer.transferState(.4,'hayabusa2',journey,'outbound').craft,transfer.transferState(.4,'osiris-rex',journey,'outbound').craft)>.1);
});

test('flyby translation joins all interpolated positions and velocities without fitting the source track',()=>{
 for(const id of ids)for(const p of [0,.013,.17,.501,.791,1]){
  const solar=transfer.transferState(p,id,journey,'flyby'),frames=transfer.flybyFrameState(id,p,ephemeris,journey);
  assert(distance(solar.craftPositionKm,frames.heliocentricPositionKm)<1e-6);
  assert(distance(solar.craftVelocityKmS,frames.heliocentricVelocityKmS)<1e-8);
 }
});

test('trail point counts follow epoch time rather than the denser encounter sampling',()=>{
 for(const id of ids)for(const kind of ['cruise','outbound']){
  const path=transfer.transferPath(id,kind,journey),m=journey.missions[id],start=Date.parse(m[kind].start);
  for(const p of [0,.01,.25,.8,1]){
   const state=transfer.transferState(p,id,journey,kind),expected=m.times.filter(t=>t>=start&&t<=Date.parse(state.time)).length;
   assert.equal(state.travelledCount,expected);assert(state.travelledCount>=1&&state.travelledCount<=path.length);
  }
 }
});
