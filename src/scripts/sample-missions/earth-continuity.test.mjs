import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {earthFlightState,EARTH_FLIGHT_PROFILES,EARTH_RADIUS_KM} from './earth-physics.js';
import {earthFlightShot} from './earth-scene.js';
const v=a=>new T.Vector3(...a),center=new T.Vector3(0,-EARTH_RADIUS_KM,0);
for(const id of ['hayabusa2','osiris-rex']){
 test(id+' release immediately carries the capsule toward Earth and divert thrust ends before coast',()=>{
  const first=earthFlightState(id,'return',0),relative=v(first.capsule.velocityKmS).sub(v(first.spacecraft.velocityKmS));
  assert(relative.dot(v(first.forward))>relative.length()*.99,'initial relative drift follows the inbound direction');
  assert(v(first.velocityKmS).dot(center.clone().sub(v(first.positionKm)))>0);
  const relativeVelocity=p=>{const s=earthFlightState(id,'return',p);return v(s.spacecraft.velocityKmS).sub(v(s.capsule.velocityKmS));};
  assert(relativeVelocity(.7).distanceTo(relativeVelocity(.9))<1e-10,'no continuing cross-track acceleration after the divert burn');
 });
 test(id+' return-to-entry camera is continuous and fixed relative to the approach plane',()=>{
  const profile=EARTH_FLIGHT_PROFILES[id];let previous;
  for(let i=0;i<=200;i++){
   const s=earthFlightState(id,'return',i/200),shot=earthFlightShot({...s,kind:'return',cameraTarget:s.positionKm,displaySpanKm:profile.capsule.diameterKm*2.3},'detail');
   assert(shot.up?.length===3,'camera supplies its own physical-frame up');
   const camera=new T.PerspectiveCamera(shot.fov,1.9,shot.near,shot.far);camera.position.copy(v(shot.position));camera.up.copy(v(shot.up));camera.lookAt(v(shot.target));camera.updateMatrixWorld();
   if(previous)assert(camera.quaternion.angleTo(previous)<.0001,'camera does not orbit around a coasting capsule');previous=camera.quaternion.clone();
   const earthAngle=center.clone().sub(camera.position).angleTo(v(shot.target).sub(camera.position));
   const earthRadius=Math.asin(Math.min(1,EARTH_RADIUS_KM/camera.position.distanceTo(center)));
   assert(earthAngle<earthRadius+Math.atan(Math.tan(shot.fov*Math.PI/360)*1.9),'Earth remains in the approach view');
  }
  const a=earthFlightState(id,'return',1),b=earthFlightState(id,'landing',0);
  const shot=s=>earthFlightShot({...s,kind:s===a?'return':'landing',cameraTarget:s.positionKm,displaySpanKm:profile.capsule.diameterKm*2.3},'detail');
  assert(v(shot(a).position).distanceTo(v(shot(b).position))<1e-9);assert(v(shot(a).up).distanceTo(v(shot(b).up))<1e-9);
 });
 test(id+' launch camera keeps the same local east/up/south framing through the whole orbit',()=>{
  const profile=EARTH_FLIGHT_PROFILES[id];let reference;
  for(let i=0;i<=400;i++){
   const s=earthFlightState(id,'launch',i/400),shot=earthFlightShot({...s,kind:'launch',cameraTarget:s.positionKm,displaySpanKm:profile.rocket.lengthKm},'detail');
   assert(shot.up);assert(v(shot.up).dot(v(s.up))>.999999);
   const offset=v(shot.position).sub(v(shot.target)).normalize(),up=v(s.up),east=new T.Vector3(up.y,-up.x,0),south=east.clone().cross(up),local=new T.Vector3(offset.dot(east),offset.dot(up),offset.dot(south));
   if(reference)assert(local.distanceTo(reference)<1e-7);reference=local;
  }
 });
}
