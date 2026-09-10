import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as camera from './camera.js';
import {samplingClearance} from './motion.js';

test('camera settling has the same elapsed-time response at 24, 30, 60 and 120 fps',()=>{
 assert.equal(typeof camera.cameraDamping,'function');
 const endpoints=[24,30,60,120].map(fps=>{
  let position=-4,target=8,fov=39;
  for(let frame=0;frame<fps/2;frame++){
   const alpha=camera.cameraDamping(1/fps);
   position+=(12-position)*alpha;target+=(1-target)*alpha;fov+=(34-fov)*alpha;
  }
  return [position,target,fov];
 });
 for(const endpoint of endpoints)endpoint.forEach((value,i)=>assert(Math.abs(value-endpoints[0][i])<1e-10));
 assert.equal(camera.cameraDamping(0),0);
 assert(Math.abs(camera.cameraDamping(1/60)-.12)<1e-12,'preserves the established 60fps response');
});

test('sampling camera holds still through contact and shows both surface and spacecraft during approach',()=>{
 for(const id of ['hayabusa2','osiris-rex']){
  const first=camera.missionShot('sample',.46,id);
  for(const p of [.48,.52,.55,.57])assert.deepEqual(camera.missionShot('sample',p,id),first);
  for(const aspect of [.7,1,1.9])for(const p of [0,.1,.3,.46,.57,.7,1]){
   const shot=camera.missionShot('sample',p,id,aspect),view=new T.PerspectiveCamera(shot.fov,aspect,.05,150);
   view.position.set(...shot.position);view.lookAt(...shot.target);view.updateMatrixWorld();
   for(const point of [[0,0,0],[0,samplingClearance(p)+2.6,0]]){
    const projected=new T.Vector3(...point).project(view);
    assert(Math.abs(projected.y)<.97,`${id} sampling ${p}: ground and spacecraft remain in the vertical frame`);
   }
  }
 }
});

test('generic camera rails remain finite and continuous in both missions and portrait layouts',()=>{
 for(const id of ['hayabusa2','osiris-rex'])for(const kind of ['cruise','outbound','sample','impact','stow'])for(const aspect of [.7,1,1.9]){
  let previous;
  for(let i=0;i<=1000;i++){
   const shot=camera.missionShot(kind,i/1000,id,aspect);
   assert([...shot.position,...shot.target,shot.fov].every(Number.isFinite));
   const distance=Math.hypot(...shot.position.map((v,k)=>v-shot.target[k]));assert(distance>3&&distance<32);
   if(previous){assert(Math.hypot(...shot.position.map((v,k)=>v-previous.position[k]))<.1);assert(Math.abs(shot.fov-previous.fov)<.1);}
   previous=shot;
  }
 }
});

test('physical chapters require their dedicated camera rather than an obsolete generic shot',()=>{
 for(const kind of ['launch','return','landing','rendezvous','depart','flyby']){
  assert.throws(()=>camera.missionShot(kind,.5,'hayabusa2'),/dedicated camera/);
 }
});
