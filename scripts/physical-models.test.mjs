import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {createSpacecraft,assembleOsirisRex} from '../src/scripts/sample-missions/spacecraft.js';
import {physicalSizes,physicalScale} from '../src/scripts/sample-missions/proximity.js';
import {loadNasaGeometry} from './nasa-geometry-fixture.mjs';
import {createRecoveryCanopy} from '../src/scripts/sample-missions/recovery.js';
for(const id of ['hayabusa2','osiris-rex'])test(id+' deployed source geometry retains its published span through mission configuration changes',async()=>{
 const craft=id==='hayabusa2'?await createSpacecraft(id):assembleOsirisRex(await loadNasaGeometry()),size=()=>new T.Box3().setFromObject(craft.group).getSize(new T.Vector3()),initial=Math.max(...size().toArray());
 craft.group.scale.setScalar(physicalScale(initial,physicalSizes[id].spanM));
 for(const configure of [()=>craft.setSolarDeployment(1),()=>craft.setSampling(true),()=>craft.setStowage?.(1),()=>{craft.setSampling(false);craft.setSolarDeployment(1);}]){configure();craft.group.updateMatrixWorld(true);assert(Math.abs(size().x*1000-physicalSizes[id].spanM)<.02,'physical solar-array span stays within 2 cm of calibration');}
});

test('Hayabusa2 recovery canopy is cruciform while OSIRIS-REx retains a round main canopy',()=>{
 const edgeRadii=id=>{
  const cloth=createRecoveryCanopy(id).group.children.find(o=>o.isMesh),positions=cloth.geometry.attributes.position;
  const edge=gore=>{const i=(gore*21+20)*9;return Math.hypot(positions.getX(i),positions.getZ(i));};
  return [edge(0),edge(2)];
 };
 const [axis,diagonal]=edgeRadii('hayabusa2');
 assert.ok(diagonal<axis*.7,'cross corners are cut away');
 const [roundAxis,roundDiagonal]=edgeRadii('osiris-rex');
 assert.ok(Math.abs(roundAxis-roundDiagonal)<.001);
});

test('recovery cords retain their capsule anchor through inflation and collapse',()=>{
 for(const id of ['hayabusa2','osiris-rex']){
  const canopy=createRecoveryCanopy(id);
  for(const [inflation,collapse] of [[0,0],[.5,0],[1,0],[1,.5],[1,1]]){
   canopy.update(inflation,collapse,.01);
   const p=canopy.group.getObjectByName('suspension-cords').geometry.attributes.position;
   for(let gore=0;gore<16;gore++){
    const i=(gore+1)*40-1;
    assert.deepEqual([p.getX(i),p.getY(i),p.getZ(i)],[0,-2,0]);
   }
  }
 }
});

test('OSIRIS-REx canopy meridian uses conical sections rather than a hemispherical dome',()=>{
 const canopy=createRecoveryCanopy('osiris-rex');
 const p=canopy.group.children.find(o=>o.isMesh).geometry.attributes.position;
 const slope=(a,b)=>(p.getY(b*9)-p.getY(a*9))/(p.getX(b*9)-p.getX(a*9));
 assert.ok(Math.abs(slope(1,2)-slope(2,3))<.0001);
 assert.ok(Math.abs(slope(1,2)-slope(6,7))>.1);
 assert.ok(Math.abs(slope(6,7)-slope(17,18))>.1);
});
