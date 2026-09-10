import test from 'node:test';
import assert from 'node:assert/strict';
import {transferState,transferTiming,earthOrbitRadius} from './transfer.js';
import {phaseLabel} from './motion.js';
import {missions} from './data.js';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const angle=v=>Math.atan2(v[2],v[0]);
const angleStep=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
for(const id of ['hayabusa2','osiris-rex']){
 test(id+' makes one Sun-centered circuit while Earth moves',()=>{
  let total=0,previous=transferState(0,id).craft;
  for(let i=1;i<=500;i++){
   const current=transferState(transferTiming.flyby*i/500,id);
   total+=angleStep(angle(previous),angle(current.craft));previous=current.craft;
   assert(Math.hypot(current.craft[0],current.craft[2])>earthOrbitRadius);
  }
  assert(Math.abs(total-Math.PI*2)<1e-8);
  assert(distance(transferState(0,id).earth,transferState(transferTiming.flyby/2,id).earth)>5.9);
 });
 test(id+' passes outside Earth and departs without an Earth orbit',()=>{
  const encounter=transferState(transferTiming.flyby,id);
  const closest=distance(encounter.craft,encounter.earth);
  assert(closest>.22&&closest<.6);
  let winding=0,last;
  for(let i=0;i<=1000;i++){
   const p=transferTiming.approach+(transferTiming.departure-transferTiming.approach)*i/1000;
   const state=transferState(p,id),relative=state.craft.map((v,k)=>v-state.earth[k]);
   assert(distance(state.craft,state.earth)>=closest-1e-8);
   if(last!==undefined)winding+=angleStep(last,angle(relative));last=angle(relative);
  }
  assert(Math.abs(winding)<Math.PI,'encounter must be an open pass');
  assert(distance(transferState(transferTiming.approach,id).craft,transferState(transferTiming.approach,id).earth)>closest);
  assert(distance(transferState(transferTiming.departure,id).craft,transferState(transferTiming.departure,id).earth)>closest);
  for(let i=0;i<=1000;i++){const s=transferState(i/1000,id);assert(distance(s.craft,s.earth)>.22);}
  const end=transferState(1,id);assert(distance(end.craft,end.asteroid)<.7);assert(distance(end.craft,end.earth)>2);
 });
 test(id+' remains continuous with no velocity jump at the assist',()=>{
  const h=1e-6,p=transferTiming.flyby;
  const before=transferState(p-h,id),at=transferState(p,id),after=transferState(p+h,id);
  for(const key of ['craft','earth']){
   assert(distance(before[key],after[key])<.001);
   const left=at[key].map((v,i)=>(v-before[key][i])/h),right=after[key].map((v,i)=>(v-at[key][i])/h);
   assert(distance(left,right)<.01);
  }
  assert.deepEqual(transferState(-1,id),transferState(0,id));
  assert.deepEqual(transferState(2,id),transferState(1,id));
  assert.deepEqual(transferState(NaN,id),transferState(0,id));
  const snapshot=transferState(.3,id);transferState(.9,id);assert.deepEqual(transferState(.3,id),snapshot);
 });
 test(id+' labels the solar cruise, dated Earth assist and outbound transfer',()=>{
  assert.match(phaseLabel('cruise',0,id),/~1 year.*Sun/);
  assert.match(missions[id].stages.find(s=>s.id==='flyby').date,new RegExp(id==='hayabusa2'?'3 Dec 2015':'22 Sep 2017'));
  assert.match(phaseLabel('outbound',1,id),new RegExp(id==='hayabusa2'?'Ryugu':'Bennu'));
 });
}

test('mission explanations distinguish solar cruise and include mission-design sources',async()=>{
 const {missions}=await import('./data.js');
 for(const mission of Object.values(missions)){
  const stage=mission.stages.find(stage=>stage.id==='flyby');
  assert.match(stage.description,/one year orbiting the Sun/);
  assert.match(stage.detail,/navigation vectors/);
  assert(mission.sources.some(source=>/Solar cruise/.test(source.label)));
 }
});
