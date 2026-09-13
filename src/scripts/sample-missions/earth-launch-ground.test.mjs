import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as ground from './earth-ground.js';
import {earthOrientation} from './earth-scene.js';
import {locationFor} from './geography.js';
import {EARTH_RADIUS_KM as R} from './earth-physics.js';
import {disposeGraph} from './scenes.js';

const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);
function height(mesh,x,z){
 ray.set(new T.Vector3(x,100,z),down);
 const hit=ray.intersectObject(mesh,false)[0];
 assert(hit,`surface must cover (${x}, ${z})`);
 return hit.point.y;
}
for(const id of ['hayabusa2','osiris-rex'])test(id+': launch ground connects the pad to the actual faceted Earth',()=>{
 const earth=new T.Mesh(new T.SphereGeometry(1,128,80),new T.MeshBasicMaterial());
 earth.scale.setScalar(R);earth.position.y=-R;earth.quaternion.copy(earthOrientation(locationFor(id,'launch')));earth.updateMatrixWorld(true);
 assert(height(earth,0,0)<-2,'reproduce the kilometre-scale gap under the launch pad');
 assert.equal(typeof ground.createLaunchGround,'function','launch needs a regional ground surface');
 const local=ground.createLaunchGround(),surface=local.getObjectByName('launch-surface');
 try{
  local.updateMatrixWorld(true);assert(surface?.isMesh);assert.equal(local.userData.units,'km');assert.match(local.userData.provenance,/illustrative/i);
  assert(surface.geometry.index.count/3<70000,'regional detail must have a bounded triangle budget');
  assert(surface.geometry.attributes.uv,'the existing ground material needs valid texture coordinates');
  for(const [x,z] of [[0,0],[.035,.0425],[-.035,-.0425],[.05,.096]])assert(Math.abs(height(surface,x,z))<.000001,'pad and trench retain a ground surface at their unchanged origin');
  for(const radius of [1,10,50,120])for(let i=0;i<12;i++){
   const angle=i*2*Math.PI/12,x=radius*Math.cos(angle),z=radius*Math.sin(angle);
   const expected=-radius*radius/(R+Math.sqrt(R*R-radius*radius));
   assert(Math.abs(height(surface,x,z)-expected)<.002,'regional ground follows Earth curvature within two metres');
  }
  for(let i=0;i<48;i++){
   const angle=(i+.31)*2*Math.PI/48,x=319*Math.cos(angle),z=319*Math.sin(angle);
   assert(height(surface,x,z)<height(earth,x,z)-.5,'outer edge must overlap below Earth, never leave an exposed floating rim');
  }
 }finally{disposeGraph(local);disposeGraph(earth);}
});
import {createEarthFlightScene} from './earth-scene.js';
import {EARTH_FLIGHT_PROFILES} from './earth-physics.js';
import {createSpacecraft,assembleOsirisRex,createCapsule} from './spacecraft.js';
import {createLaunchVehicle} from './launch.js';
import {createRecoveryCanopy} from './recovery.js';
import {createEntryWake} from './atmosphere.js';
import {loadNasaGeometry} from '../../../scripts/nasa-geometry-fixture.mjs';

for(const id of ['hayabusa2','osiris-rex'])test(id+': launch scene preserves vehicle scale and keeps illustrative ground out of Earth overview',async()=>{
 const group=new T.Group(),earth=new T.Group(),desert=new T.Group();
 earth.add(new T.Mesh(new T.SphereGeometry(1,128,80),new T.MeshBasicMaterial()),new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial()),new T.Mesh(new T.BufferGeometry(),new T.ShaderMaterial({uniforms:{opacity:{value:1}}})));
 const craft=id==='hayabusa2'?await createSpacecraft(id):assembleOsirisRex(await loadNasaGeometry());
 const launch=createLaunchVehicle(id),capsule=createCapsule(id),canopy=createRecoveryCanopy(id),entryWake=createEntryWake();
 group.add(earth,desert,craft.group,launch.group,capsule,canopy.group,entryWake.group);
 try{
  const scene=createEarthFlightScene(id,{group,earth,desert,craft,launch,capsule,canopy,heat:entryWake.group,entryWake});
  scene.update('launch',0,'detail');
  const local=group.getObjectByName('launch-ground');assert(local?.visible);
  assert(Math.abs(launch.group.userData.airframeLength*launch.group.scale.y-EARTH_FLIGHT_PROFILES[id].rocket.lengthKm)<1e-12,'ground repair cannot inflate the roughly 53-metre rocket');
  const base=launch.group.localToWorld(new T.Vector3(0,launch.group.userData.baseY,0));
  assert(Math.abs(base.y-.00015)<1e-10,'rocket base stays on the original pad top');
  assert(Math.abs(height(local.getObjectByName('launch-surface'),base.x,base.z))<1e-10);
  scene.update('launch',0,'earth');assert.equal(local.visible,false,'a regional grass surface must not repaint globe geography');
  scene.update('launch',0,'detail');assert.equal(local.visible,true);
  scene.hide();assert.equal(local.visible,false);
 }finally{disposeGraph(group);}
});
