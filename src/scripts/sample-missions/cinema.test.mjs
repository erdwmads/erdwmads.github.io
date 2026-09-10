import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {missionShot} from './camera.js';
import {createRecoveryCanopy} from './recovery.js';
import {disposeGraph} from './scenes.js';
test('camera rails stay finite and keep their distance across every chapter',()=>{
 for(const kind of ['cruise','outbound','sample','impact','stow'])for(const aspect of [1,1.9]){
  let previous;
  for(let i=0;i<=100;i++){const shot=missionShot(kind,i/100,'hayabusa2',aspect);assert([...shot.position,...shot.target,shot.fov].every(Number.isFinite));assert(Math.hypot(...shot.position.map((v,k)=>v-shot.target[k]))>3);if(previous)assert(Math.hypot(...shot.position.map((v,k)=>v-previous[k]))<.5);previous=shot.position;}
 }
});
test('canopy collapse is reversible and stays above its attachment plane',()=>{
 for(const id of ['hayabusa2','osiris-rex']){const canopy=createRecoveryCanopy(id);canopy.update(1,1);const end=new T.Box3().setFromObject(canopy.group,true);assert(end.min.y>=-2.001);assert(end.max.y<-.5);canopy.update(1,0);const open=new T.Box3().setFromObject(canopy.group,true);assert(open.max.y>.5);canopy.update(1,1);assert.deepEqual(new T.Box3().setFromObject(canopy.group,true).min.toArray(),end.min.toArray());disposeGraph(canopy.group);}
});

test('landed canopy meets the ground beneath the capsule, not its attachment height',()=>{
 const canopy=createRecoveryCanopy('osiris-rex');
 canopy.update(1,1,-.16);canopy.group.position.y=2.16;canopy.group.updateMatrixWorld(true);
 const cloth=canopy.group.getObjectByName('sixteen-fabric-gores'),bounds=new T.Box3().setFromObject(cloth,true);
 assert(bounds.min.y>=0&&bounds.min.y<.006);assert(bounds.max.y>.075&&bounds.max.y<.15,'a few visible folds rise above the grounded sheet');
 const p=cloth.geometry.attributes.position;let grounded=0;for(let i=0;i<p.count;i++)if(p.getY(i)+2.16<.015)grounded++;
 assert(grounded/p.count>.7,'most fabric rests on ground, folds remain local');
 disposeGraph(canopy.group);
});
