import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSpacecraft,assembleOsirisRex} from '../src/scripts/sample-missions/spacecraft.js';
import {samplingClearance,collectedGrain} from '../src/scripts/sample-missions/motion.js';
import {createSamplingTerrain} from '../src/scripts/sample-missions/terrain.js';
import {loadNasaGeometry} from './nasa-geometry-fixture.mjs';
import {missionShot} from '../src/scripts/sample-missions/camera.js';
test('second-touchdown overview retains the arriving spacecraft while closing onto the site',async()=>{
 const craft=await createSpacecraft('hayabusa2'),point=new T.Vector3();craft.setSamplingCutaway(false);craft.group.scale.setScalar(.9);
 for(const aspect of [.7,1,1.9])for(const p of [0,.1,.2,.3,.4,.46]){
  craft.group.position.copy(craft.samplerTip).multiplyScalar(-.9);craft.group.position.y+=samplingClearance(p);craft.group.updateMatrixWorld(true);
  const shot=missionShot('sample',p,'hayabusa2',aspect,'touchdown-2'),view=new T.PerspectiveCamera(shot.fov,aspect,.05,150);
  view.position.set(...shot.position);view.lookAt(...shot.target);view.updateMatrixWorld();
  craft.group.traverseVisible(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(view);
   assert(Math.abs(point.x)<.97&&Math.abs(point.y)<.97,`TD2 spacecraft clipped at ${p}, aspect ${aspect}`);
  }});
 }
});

test('Bennu TAG approach, penetration and retreat keep the actual spacecraft and collector in frame',async()=>{
 const craft=assembleOsirisRex(await loadNasaGeometry()),point=new T.Vector3();
 craft.setSampling(true);craft.group.scale.setScalar(.9);
 for(const aspect of [.65,1,1.9])for(const p of [0,.1,.3,.46,.5,.57,.65,.8,1]){
  craft.group.position.copy(craft.samplerTip).multiplyScalar(-.9);craft.group.position.y+=samplingClearance(p,'osiris-rex');craft.group.updateMatrixWorld(true);
  const shot=missionShot('sample',p,'osiris-rex',aspect),camera=new T.PerspectiveCamera(shot.fov,aspect,.05,150);
  camera.position.set(...shot.position);camera.lookAt(...shot.target);camera.updateMatrixWorld();
  craft.group.traverseVisible(mesh=>{
   if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);
    assert(Math.abs(point.x)<.96&&Math.abs(point.y)<.96&&point.z>-1&&point.z<1,`visible spacecraft at ${p}, aspect ${aspect}`);
   }
  });
  const collector=craft.samplingHead.getWorldPosition(point).project(camera);assert(Math.abs(collector.x)<.9&&Math.abs(collector.y)<.9);
 }
});

test('actual sampler geometry meets the yielded contact footprint and restores on reverse playback',async()=>{
 for(const id of ['hayabusa2','osiris-rex']){
  const craft=id==='hayabusa2'?await createSpacecraft(id):assembleOsirisRex(await loadNasaGeometry());
  const terrain=createSamplingTerrain(id),surface=terrain.group.getObjectByName('sampling-surface');
  const pose=p=>{
   craft.setSampling(true);craft.group.scale.setScalar(.9);
   craft.group.position.copy(craft.samplerTip).multiplyScalar(-.9);craft.group.position.y+=samplingClearance(p,id);
   craft.group.updateMatrixWorld(true);terrain.update('sample',p,id==='hayabusa2'?'touchdown-1':'tag');
   return {tip:craft.samplerTip.clone().applyMatrix4(craft.group.matrixWorld),ground:surface.getVertexPosition(0,new T.Vector3()),bounds:new T.Box3().setFromObject(craft.group)};
  };
  for(const p of [.46,.49,.53,.57]){
   const {tip,ground,bounds}=pose(p);
   assert(Math.abs(tip.y-ground.y)<1e-6,`${id}: sampler-ground contact at ${p}`);
   assert(Math.abs(bounds.min.y-tip.y)<.01,`${id}: sampler remains the lowest hardware`);
  }
  const before=pose(.53);pose(.95);const restored=pose(.53);
  assert.deepEqual(restored.tip.toArray(),before.tip.toArray());assert(restored.bounds.equals(before.bounds));assert(restored.ground.equals(before.ground));
  const retreat=pose(.7);assert(retreat.tip.y>retreat.ground.y);
  if(id==='osiris-rex'){
   pose(.564);
   const head=craft.group.getObjectByName('tagsam-collector-head'),headBounds=new T.Box3().setFromObject(head);
   const grain=collectedGrain(.564,id,{a:0},0);
   assert(grain.visible);assert(headBounds.containsPoint(new T.Vector3(...grain.position)),'captured material reaches the collector chamber');
  }
 }
});
