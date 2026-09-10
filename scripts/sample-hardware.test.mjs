import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSpacecraft,assembleOsirisRex} from '../src/scripts/sample-missions/spacecraft.js';
import {createLaunchVehicle} from '../src/scripts/sample-missions/launch.js';
import {loadNasaGeometry} from './nasa-geometry-fixture.mjs';
const bounds=o=>{o.updateWorldMatrix(true,true);return new T.Box3().setFromObject(o,true);};

test('Hayabusa2 engine apertures are outside the rear blanket and face away from the bus',async()=>{
 const craft=await createSpacecraft('hayabusa2');craft.group.updateMatrixWorld(true);
 const engines=craft.group.getObjectByName('ion-engine-cluster').children.filter(o=>o.isGroup);
 assert.equal(engines.length,4);
 for(const engine of engines){assert(engine.children[1].getWorldPosition(new T.Vector3()).z<-.54);assert(new T.Vector3(0,1,0).transformDirection(engine.matrixWorld).dot(new T.Vector3(0,0,-1))>.999);}
});

test('TAGSAM deployment retains all rigid link lengths and reverses exactly',async()=>{
 const craft=assembleOsirisRex(await loadNasaGeometry()),arm=craft.group.getObjectByName('illustrative-deployed-tagsam');
 const links=arm.children.filter(o=>o.isMesh&&o.geometry.parameters.radiusTop===.034);
 craft.setSampling(1);const lengths=links.map(o=>o.scale.y),deployed=craft.samplingHead?.position.clone();
 for(let i=0;i<=100;i++){craft.setSampling(i/100);links.forEach((o,j)=>assert(Math.abs(o.scale.y-lengths[j])<1e-10,`rigid link ${j} at ${i/100}`));}
 assert(craft.samplingHead,'actual head anchor is exposed');assert(craft.samplingHead.position.distanceTo(deployed)<1e-10);
 craft.setSampling(0);const folded=links.map(o=>o.position.clone());craft.setSampling(1);craft.setSampling(0);links.forEach((o,i)=>assert(o.position.equals(folded[i])));
});

test('Hayabusa2 launch horn stows above the mount and sampling cutaway leaves an open intake',async()=>{
 const craft=await createSpacecraft('hayabusa2'),horn=craft.group.getObjectByName('sampler-horn');
 assert.equal(typeof craft.setHornDeployment,'function');assert.equal(typeof craft.setSamplingCutaway,'function');
 const deployed=bounds(horn).clone();craft.setHornDeployment(0);assert(bounds(horn).min.y>craft.launchMount.y+.03);
 craft.setHornDeployment(1);assert(bounds(horn).equals(deployed));assert(Math.abs(deployed.min.y-craft.samplerTip.y)<.001);
 const hit=(origin,direction)=>{craft.group.updateMatrixWorld(true);const meshes=[];horn.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});return new T.Raycaster(origin,direction,0,2).intersectObjects(meshes,false);};
 assert.equal(hit(new T.Vector3(0,-1.6,.05),new T.Vector3(0,1,0)).length,0,'intake axis must not be capped');
 const origin=new T.Vector3(0,-.8,1),direction=new T.Vector3(0,0,-1);
 const opaque=hit(origin,direction)[0];assert(opaque&&opaque.point.z>.05);
 craft.setSamplingCutaway(true);const cutaway=hit(origin,direction)[0];assert(cutaway&&cutaway.point.z<.05,'front cutaway reveals the interior');
 craft.setSamplingCutaway(false);assert(Math.abs(hit(origin,direction)[0].distance-opaque.distance)<1e-10);
});

for(const id of ['hayabusa2','osiris-rex'])test(`${id} structural spacecraft mount matches the launcher interface`,async()=>{
 const craft=id==='hayabusa2'?await createSpacecraft(id):assembleOsirisRex(await loadNasaGeometry());
 const nativeSpan=bounds(craft.group).getSize(new T.Vector3()).x,scale=(id==='hayabusa2'?6:6.2)/nativeSpan;
 assert(craft.launchMount?.isVector3);const vehicle=createLaunchVehicle(id);assert.equal(typeof vehicle.payloadMountPosition,'function');
 const ring=craft.group.getObjectByName('launch-mount-ring');assert(ring);assert(Math.abs(bounds(ring).min.y-craft.launchMount.y)<1e-6);
 const radius=ring.geometry.parameters.radius*scale;assert(Math.abs(radius-vehicle.group.userData.payloadMountRadiusM)<1e-6);
 const anchor=vehicle.payloadMountPosition(0),launchScale=vehicle.group.userData.heightM/vehicle.group.userData.airframeLength;
 craft.group.scale.setScalar(scale);craft.group.position.copy(anchor).multiplyScalar(launchScale).addScaledVector(craft.launchMount,-scale);craft.group.updateMatrixWorld(true);
 assert(craft.group.localToWorld(craft.launchMount.clone()).distanceTo(anchor.multiplyScalar(launchScale))<1e-10);
});


test('stowed Hayabusa2 horn clears the bus underside',async()=>{
 const craft=await createSpacecraft('hayabusa2');craft.setHornDeployment(0);craft.group.updateMatrixWorld(true);
 const point=new T.Vector3();let checked=0;
 craft.group.getObjectByName('sampler-horn').traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(Math.abs(point.x)<.56&&Math.abs(point.z)<.45){assert(point.y<-.405, 'stowed shell cannot enter bus at '+point.toArray());checked++;}}});
 assert(checked>100);
});

test('stowage wrist clears the retained NASA source and only obstructing plate triangles are hidden',async()=>{
 const craft=assembleOsirisRex(await loadNasaGeometry()),retired=craft.group.getObjectByName('source-stowed-sampler-hardware');
 assert(retired&&!retired.visible);assert.equal(retired.children.reduce((n,o)=>n+o.geometry.index.count/3,0),392);
 assert(retired.children.every(o=>o.material.name==='Grey-nofoil-fl.001'));
 for(let i=0;i<=100;i++){
  craft.setStowage(.56+i*.001);craft.group.updateMatrixWorld(true);
  const source=[];craft.group.traverseVisible(o=>{if(o.isMesh&&o.material.name)source.push(o);});
  const wrist=craft.group.getObjectByName('tagsam-wrist').getWorldPosition(new T.Vector3());wrist.y+=.0001;
  assert.equal(new T.Raycaster(wrist,new T.Vector3(0,1,0),0,.3998).intersectObjects(source,false).length,0,'source clearance at '+i);
 }
});
