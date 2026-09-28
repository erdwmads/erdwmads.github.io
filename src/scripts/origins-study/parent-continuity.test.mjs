import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {accretion,inheritance} from './scenes.js';
import {growthCamera} from './growth-scene.js';
test('chapter 04 starts from the exact surface that chapter 02 ends with, seen from the same side',()=>{
 const growth=accretion();growth.update(1,false);growth.group.updateMatrixWorld(true);
 const skin=growth.group.getObjectByName('aggregate-fine-material'),breakup=inheritance();breakup.update(.1,false);
 const parts=breakup.group.userData.fragments.map(p=>p.mesh),body=parts[0].parent;breakup.group.updateMatrixWorld(true);
 const ray=new T.Raycaster();
 for(let i=0;i<80;i++){
  const z=1-2*(i+.5)/80,a=i*2.399963,r=Math.sqrt(1-z*z),u=new T.Vector3(r*Math.cos(a),z,r*Math.sin(a));
  ray.set(u.clone().multiplyScalar(5),u.clone().negate());const expected=ray.intersectObject(skin,false)[0];
  ray.set(body.localToWorld(u.clone().multiplyScalar(5)),u.clone().applyQuaternion(body.quaternion).negate());const actual=ray.intersectObjects(parts,false)[0];
  assert(expected&&actual,'Both chapters show a closed body along every direction');
  assert(body.worldToLocal(actual.point.clone()).distanceTo(expected.point)<1e-4,'The intact parent is the chapter 02 surface, not a different outline');
 }
 const view=new T.Vector3(...breakup.camera).normalize().applyQuaternion(body.quaternion.clone().invert());
 assert(view.angleTo(new T.Vector3(...growthCamera))<1e-6,'The fixed chapter 04 camera sees the side chapter 02 ends on');
});
test('the intact parent is sealed: every outer cut meets a shared planar fracture face',()=>{
 for(const {mesh} of inheritance().group.userData.fragments){
  const p=mesh.geometry.attributes.position,key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(),edges=new Map();
  for(let i=0;i<p.count;i+=3){const k=[key(i),key(i+1),key(i+2)];if(new Set(k).size<3)continue;for(let e=0;e<3;e++){const id=[k[e],k[(e+1)%3]].sort().join('|');edges.set(id,(edges.get(id)||0)+1);}}
  assert([...edges.values()].every(n=>n===2),`${mesh.name} is a closed fragment surface`);
 }
});
