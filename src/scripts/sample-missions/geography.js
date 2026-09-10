import * as T from 'three';
import {smooth,clampProgress,releasePaths} from './motion.js';
export const EARTH_RADIUS=2.4;
import {locationFor} from './locations.js';
export {missionLocations,hasEarthContext,locationFor} from './locations.js';
export function earthPoint(lat,lon){const a=lat*Math.PI/180,b=lon*Math.PI/180;return new T.Vector3(Math.cos(a)*Math.cos(b),Math.sin(a),-Math.cos(a)*Math.sin(b));}
function frame(id,kind){const site=locationFor(id,kind),normal=earthPoint(site.lat,site.lon),east=new T.Vector3(-Math.sin(site.lon*Math.PI/180),0,-Math.cos(site.lon*Math.PI/180));return {normal,east};}
export function earthFlightPoint(id,kind,p){
 const {normal,east}=frame(id,kind),t=smooth(clampProgress(p));
 if(kind==='launch')return normal.clone().addScaledVector(east,.26*t).normalize().multiplyScalar(EARTH_RADIUS+.06+.82*t);
 return normal.clone().addScaledVector(east,-.32*(1-t)).normalize().multiplyScalar(EARTH_RADIUS+.06+(kind==='return'?1.1:.82)*(1-t)+(kind==='return'?.25*t:0));
}
export function earthOccludes(point,camera){
 const ray=point.clone().sub(camera),t=Math.max(0,Math.min(1,-camera.dot(ray)/ray.lengthSq()));
 return camera.clone().addScaledVector(ray,t).lengthSq()<EARTH_RADIUS*EARTH_RADIUS;
}
export function earthContextShot(id,kind,aspect=1.9){
 const {normal}=frame(id,kind),north=new T.Vector3(0,1,0).addScaledVector(normal,-normal.y).normalize();
 const target=normal.clone().multiplyScalar(.15),distance=9.8*Math.max(1,1.1/aspect);
 return {position:normal.clone().multiplyScalar(distance).addScaledVector(north,.65).toArray(),target:target.toArray(),fov:38};
}
export function createEarthContext(id){
 const group=new T.Group(),siteMaterial=new T.MeshBasicMaterial({color:0xdcc27c}),flightMaterial=new T.MeshBasicMaterial({color:0x9ae2ef});
 const pin=new T.Mesh(new T.SphereGeometry(.022,12,8),siteMaterial),beacon=new T.Mesh(new T.SphereGeometry(.023,12,8),flightMaterial),escape=new T.Mesh(new T.SphereGeometry(.018,12,8),flightMaterial);
 const ring=new T.Mesh(new T.RingGeometry(.07,.085,48),new T.MeshBasicMaterial({color:0xdcc27c,side:T.DoubleSide,transparent:true,opacity:.65,depthWrite:false}));
 const path=new T.Line(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array(121*3),3)),new T.LineBasicMaterial({color:0x9ae2ef,transparent:true,opacity:.65}));
 group.add(pin,beacon,escape,ring,path);let current,labels=[];
 return {group,update(kind,p){
  const site=locationFor(id,kind),{normal,east}=frame(id,kind);pin.position.copy(normal).multiplyScalar(EARTH_RADIUS+.06);ring.position.copy(pin.position);ring.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);ring.scale.setScalar(kind==='launch'?.65:1.8);
  if(current!==kind){const positions=path.geometry.attributes.position;for(let i=0;i<=120;i++){const v=earthFlightPoint(id,kind,i/120);positions.setXYZ(i,v.x,v.y,v.z);}positions.needsUpdate=true;path.geometry.computeBoundingSphere();current=kind;}
  path.geometry.setDrawRange(0,Math.max(2,Math.round(clampProgress(p)*120)+1));beacon.position.copy(earthFlightPoint(id,kind,p));
  const separated=kind==='return'&&releasePaths(p).separated;escape.visible=separated;if(separated)escape.position.copy(earthFlightPoint(id,kind,.28)).lerp(normal.clone().multiplyScalar(3.5).addScaledVector(east,1.35),smooth((p-.28)/.72));
  labels=[{text:site.label,point:pin.position.clone()}];if(beacon.position.distanceTo(pin.position)>.2)labels.push({text:kind==='launch'?'Departure · position marker':kind==='return'?(separated?'Capsule approaching Earth':'Spacecraft approaching Earth'):'Capsule · position marker',point:beacon.position.clone()});if(escape.visible)labels.push({text:'Spacecraft continues into space',point:escape.position.clone()});
 },labels:()=>labels};
}
