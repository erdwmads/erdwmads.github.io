import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as transfer from './transfer.js';
import {durations} from './motion.js';
import {validateView} from './view-state.js';
const source=readFileSync(new URL('./viewer.js',import.meta.url),'utf8');
const journey=JSON.parse(readFileSync(new URL('../../../public/assets/data/missions/journey.json',import.meta.url)));
test('slow rendering does not lengthen mission playback',()=>{
 const advance=source.match(/if\(last\)progress\+=([^;]+);/)[1];
 const context={last:1000,now:3000,progress:0,durations,missions:{x:{stages:[{kind:'sample'}]}},mission:'x',stage:0};
 vm.runInNewContext('progress+='+advance,context);
 assert(Math.abs(context.progress-2/durations.sample)<1e-10);
});
test('sampling, approach, departure and return play at a legible brisk pace',()=>{
 for(const k of ['rendezvous','sample','impact','stow','depart'])assert(durations[k]<=10,k);
 for(const k of ['return','landing'])assert(durations[k]<=14,k);
});
test('approach and departure default to a fixed view of relative distance',()=>{
 for(const mission of ['hayabusa2','osiris-rex'])for(const chapter of ['rendezvous','depart']){
  const id=chapter==='depart'?'departure':chapter;
  const view=validateView({mission,chapter:id});assert(view);assert.equal(view.focus,'both');
 }
});
test('solar context orbits close without truncating the actual flight path',()=>{
 assert.equal(typeof transfer.referenceOrbit,'function');
 for(const id of ['hayabusa2','osiris-rex'])for(const body of ['earth','target']){
  const m=journey.missions[id],t=m.cruise.start,orbit=transfer.referenceOrbit(m,body,t);
  assert.equal(orbit.length,361);assert.deepEqual(orbit[0],orbit.at(-1));
  assert(orbit.every(v=>v.every(Number.isFinite)));
  const radii=orbit.map(v=>Math.hypot(...v));assert(Math.min(...radii)>2&&Math.max(...radii)<5);
  const actual=transfer.toSolarScene(transfer.sampleJourneyBody(m,body,t).position);
  assert(Math.min(...orbit.map(v=>Math.hypot(...v.map((x,i)=>x-actual[i]))))<.06);
 }
});
