import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEarthFlightScene} from './earth-scene.js';
import {EARTH_FLIGHT_PROFILES} from './earth-physics.js';
import {createSpacecraft,assembleOsirisRex,createCapsule} from './spacecraft.js';
import {createLaunchVehicle} from './launch.js';
import {createRecoveryCanopy} from './recovery.js';
import {createEntryWake} from './atmosphere.js';
import {disposeGraph} from './scenes.js';
import {loadNasaGeometry} from '../../../scripts/nasa-geometry-fixture.mjs';

// Measure geometry in the spacecraft's own axes, independent of flight attitude.
function craftSize(craft){
 const position=craft.group.position.clone(),rotation=craft.group.quaternion.clone();
 craft.group.position.set(0,0,0);craft.group.quaternion.identity();
 const size=new T.Box3().setFromObject(craft.group,true).getSize(new T.Vector3());
 craft.group.position.copy(position);craft.group.quaternion.copy(rotation);craft.group.updateMatrixWorld(true);
 return size;
}

async function setup(id){
 const craft=id==='hayabusa2'?await createSpacecraft(id):assembleOsirisRex(await loadNasaGeometry());
 const deployedNative=craftSize(craft),nativeSpan=Math.max(...deployedNative.toArray());
 craft.setSolarDeployment(0);const foldedWidth=craftSize(craft).x;craft.setSolarDeployment(1);
 const group=new T.Group(),earth=new T.Group(),desert=new T.Group();
 // Only Earth/desert material plumbing is stubbed; all flight hardware is real geometry.
 for(let i=0;i<3;i++)earth.add(new T.Mesh(new T.BufferGeometry(),i===2?
  new T.ShaderMaterial({uniforms:{opacity:{value:1}}}):new T.MeshBasicMaterial()));
 desert.add(new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial()));
 const launch=createLaunchVehicle(id),capsule=createCapsule(id),canopy=createRecoveryCanopy(id),entryWake=createEntryWake();
 group.add(earth,desert,craft.group,launch.group,capsule,canopy.group,entryWake.group);
 const flight=createEarthFlightScene(id,{group,earth,desert,craft,launch,capsule,canopy,heat:entryWake.group,entryWake});
 const update=(kind,p)=>{
  // Match the surrounding scene's visibility/array reset, which exposed the missing payload bug.
  for(const object of [craft.group,launch.group,capsule,canopy.group]){
   object.visible=false;object.position.set(0,0,0);object.quaternion.identity();object.scale.setScalar(1);
  }
  craft.capsule.visible=true;craft.setSolarDeployment(1);
  flight.update(kind,p,'detail');
  return flight.state();
 };
 return {group,craft,launch,capsule,canopy,update,foldedFraction:foldedWidth/nativeSpan};
}

for(const id of ['hayabusa2','osiris-rex']){
 test(`${id}: exposed upper stage retains a folded physical spacecraft until deployment`,async()=>{
  const fixture=await setup(id),{craft,launch,update}=fixture;
  try{
   const physicalSpan=EARTH_FLIGHT_PROFILES[id].spacecraft.spanKm;
   let scale;
   for(const p of [.60,.70,.80,.90]){
    const state=update('launch',p);
    assert(state.elapsedSeconds>state.events.fairingSeparation);
    assert(!state.spacecraftReleased);
    assert(craft.group.visible,'the exposed payload adapter must carry the actual spacecraft');
    const attached=launch.group.localToWorld(launch.payloadMountPosition(p,state));
    assert(craft.group.localToWorld(craft.launchMount.clone()).distanceTo(attached)<1e-9,'spacecraft structural mount meets the upper-stage adapter');
    assert(Math.abs(craftSize(craft).x-physicalSpan*fixture.foldedFraction)<1e-8,'arrays stay folded through ascent and coast');
    scale??=craft.group.scale.x;assert.equal(craft.group.scale.x,scale);
   }
   update('launch',.92);const folded=craftSize(craft).x;
   update('launch',.95);const opening=craftSize(craft).x;
   const final=update('launch',1),deployed=craftSize(craft);
   assert(final.spacecraftReleased&&craft.group.visible);
   assert(opening>folded&&opening<deployed.x,'arrays unfold after release');
   assert(Math.abs(Math.max(...deployed.toArray())-physicalSpan)<1e-8,'deployed model retains its published physical span');
   assert.equal(craft.group.scale.x,scale,'deployment changes hinges, not vehicle scale');
   update('launch',.70);
   assert(craft.group.visible&&Math.abs(craftSize(craft).x-folded)<1e-8,'scrubbing back restores the attached folded payload');
  }finally{disposeGraph(fixture.group);}
 });

 test(`${id}: landed capsule stays fixed while canopy settles continuously onto the ground`,async()=>{
  const fixture=await setup(id),{capsule,canopy,update}=fixture;
  try{
   const cloth=canopy.group.getObjectByName(id==='hayabusa2'?'cruciform-fabric-canopy':'sixteen-fabric-gores');
   assert(cloth);
   const height=()=>new T.Box3().setFromObject(cloth,true).max.y;
   update('landing',.92);const landedPosition=capsule.position.clone(),initialHeight=height();
   let previous=initialHeight;
   for(let i=0;i<=80;i++){
    const state=update('landing',.92+.08*i/80),current=height();
    assert(state.landed);assert.equal(state.altitudeKm,0);
    assert(capsule.position.distanceTo(landedPosition)<1e-12,'settling must not lower or lift the landed capsule');
    assert(current<=previous+1e-8,'fabric height falls during settling');
    assert(previous-current<initialHeight*.06,'fabric cannot jump directly to the collapsed state');
    previous=current;
   }
   assert(previous<initialHeight*.15,'the deflated cloth rests near the ground');
   update('landing',.92);
   assert(Math.abs(height()-initialHeight)<1e-10,'settling is reversible when scrubbing');
  }finally{disposeGraph(fixture.group);}
 });
}

for(const id of ['hayabusa2','osiris-rex'])test(`${id}: capsule close-up retains a visible physical vehicle after separation`,async()=>{
 const fixture=await setup(id);
 try{for(const p of [.4,.55,.8,1]){
  const state=fixture.update('return',p),diameter=EARTH_FLIGHT_PROFILES[id].capsule.diameterKm;
  assert(state.displaySpanKm<=diameter*3.01,'close-up must not expand to the intervehicle separation');
  assert(new T.Vector3(...state.cameraTarget).distanceTo(fixture.capsule.position)<diameter*.01,'camera tracks the released capsule');
 }}finally{disposeGraph(fixture.group);}
});


for(const id of ['hayabusa2','osiris-rex'])test(id+': actual return and entry scenes join without camera or capsule jumps',async()=>{
 const fixture=await setup(id),{earthFlightShot}=await import('./earth-scene.js');
 try{
  const a=fixture.update('return',1),pa=fixture.capsule.position.clone(),sa=earthFlightShot(a,'detail');
  const b=fixture.update('landing',0),sb=earthFlightShot(b,'detail');
  assert(pa.distanceTo(fixture.capsule.position)<1e-10);assert(new T.Vector3(...sa.position).distanceTo(new T.Vector3(...sb.position))<1e-9);assert(new T.Vector3(...sa.up).distanceTo(new T.Vector3(...sb.up))<1e-9);
  const before=fixture.update('launch',.92-1e-7),after=fixture.update('launch',.92+1e-7);
  assert(Math.abs(before.displaySpanKm-after.displaySpanKm)<1e-7,'separation cannot jump to a different zoom');
  const relative=s=>new T.Vector3(...s.cameraTarget).sub(new T.Vector3(...s.positionKm));
  assert(relative(before).distanceTo(relative(after))<1e-7,'the upper-stage/craft tracking handoff is continuous');
 }finally{disposeGraph(fixture.group);}
});


for(const id of ['hayabusa2','osiris-rex'])test(id+': final landing camera eases closer while retaining capsule and fallen canopy',async()=>{
 const fixture=await setup(id),{earthFlightShot}=await import('./earth-scene.js');
 try{
  const start=fixture.update('landing',.92),startSpan=start.displaySpanKm;
  const end=fixture.update('landing',1);assert(end.displaySpanKm/startSpan>=.65&&end.displaySpanKm/startSpan<=.75);
  for(const p of [.94,.96,.98,1]){
   const s=fixture.update('landing',p),box=new T.Box3().setFromObject(fixture.canopy.group,true).union(new T.Box3().setFromObject(fixture.capsule,true));
   for(const aspect of [1.9,.75]){
    const shot=earthFlightShot(s,'detail',aspect),camera=new T.PerspectiveCamera(shot.fov,aspect,shot.near,shot.far);camera.position.set(...shot.position);camera.up.set(...shot.up);camera.lookAt(new T.Vector3(...shot.target));camera.updateMatrixWorld();
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const point=new T.Vector3(x,y,z).project(camera);assert(Math.abs(point.x)<.95&&Math.abs(point.y)<.95,'fallen cloth and capsule stay framed at '+p);}
   }
  }
 }finally{disposeGraph(fixture.group);}
});
