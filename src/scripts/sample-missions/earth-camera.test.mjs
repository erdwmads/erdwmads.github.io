import test from 'node:test';import assert from 'node:assert/strict';
import {earthFlightState,EARTH_FLIGHT_PROFILES} from './earth-physics.js';import {earthFlightShot,earthOrientation} from './earth-scene.js';import {earthPoint,locationFor} from './geography.js';import * as T from 'three';
for(const id of ['hayabusa2','osiris-rex']){
 test(id+' geographic globe places launch and landing under local up',()=>{for(const kind of ['launch','landing']){const site=locationFor(id,kind),point=earthPoint(site.lat,site.lon).applyQuaternion(earthOrientation(site));assert(point.distanceTo(new T.Vector3(0,1,0))<1e-12);}});
 test(id+' camera has no basis flip over a full launch trajectory',()=>{const offset=p=>{const f=earthFlightState(id,'launch',p),shot=earthFlightShot({...f,kind:'launch',cameraTarget:f.positionKm,displaySpanKm:EARTH_FLIGHT_PROFILES[id].rocket.lengthKm},'detail');return new T.Vector3(...shot.position).sub(new T.Vector3(...shot.target));};for(let p=0;p<1;p+=.0001)assert(offset(p).distanceTo(offset(p+.000001))<.001,'camera offset continuity at '+p);});
}

test('a fixed return overview keeps Earth and both return branches inside its clipping planes',()=>{
 const overview={center:[-100000,30000,0],extent:260000};
 for(const id of ['hayabusa2','osiris-rex'])for(const p of [0,.5,1]){
  const state={...earthFlightState(id,'return',p),kind:'return',overview};
  const shot=earthFlightShot(state,'earth');
  assert(shot.far>Math.hypot(...shot.position.map((v,i)=>v-[0,-6371,0][i]))+6371);
 }
});
