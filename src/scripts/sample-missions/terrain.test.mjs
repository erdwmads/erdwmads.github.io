import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSamplingTerrain} from './terrain.js';
import {samplingClearance} from './motion.js';
import * as motion from './motion.js';
test('SCI crater walls cast reversible self shadows only in the linked crater chapters',()=>{
 for(const id of ['hayabusa2','osiris-rex']){
  const terrain=createSamplingTerrain(id),surface=terrain.group.getObjectByName('sampling-surface');
  terrain.update('sample',.5,id==='hayabusa2'?'touchdown-1':'tag');assert.equal(surface.castShadow,false);
  terrain.update('impact',.8,'impact');assert.equal(surface.castShadow,id==='hayabusa2');
  terrain.update('sample',.5,'touchdown-2');assert.equal(surface.castShadow,id==='hayabusa2');
  terrain.update('sample',.5,id==='hayabusa2'?'touchdown-1':'tag');assert.equal(surface.castShadow,false);
 }
});
test('cached endpoint heights follow actual terrain triangles and excavation reversibly',()=>{
 const terrain=createSamplingTerrain('hayabusa2'),surface=terrain.group.getObjectByName('sampling-surface');
 assert.equal(typeof terrain.heightAt,'function');surface.updateMatrixWorld(true);
 for(const p of [0,1,.5,0]){
  terrain.update('impact',p,'sci');
  for(const [x,z] of [[0,0],[0,13.974],[-3,11],[2,2],[-5,-2]]){
   const hit=new T.Raycaster(new T.Vector3(x,10,z),new T.Vector3(0,-1,0)).intersectObject(surface,false)[0];
   assert(Math.abs(terrain.heightAt(x,z)-hit.point.y)<1e-7,'cached barycentric heights must track current morph weights');
  }
 }
});
test('SCI and second touchdown retain one crater and a darker ejecta blanket at the northern target',()=>{
 const terrain=createSamplingTerrain('hayabusa2');assert(terrain.markers?.sciImpact);
 const surface=terrain.group.getObjectByName('sampling-surface'),point=new T.Vector3();
 terrain.update('impact',1,'sci');
 const end=Array.from({length:surface.geometry.attributes.position.count},(_,i)=>surface.getVertexPosition(i,point).y);
 terrain.update('sample',0,'touchdown-2');
 const next=Array.from({length:end.length},(_,i)=>surface.getVertexPosition(i,point).y);
 assert.deepEqual(next,end,'chapter transition must not move or resize the crater');
 assert(Math.abs(surface.getVertexPosition(0,point).y)<1e-8,'touchdown remains outside the pit at the local origin');
 assert(terrain.markers.samplingTarget.z<terrain.markers.sciImpact.z);
 assert(surface.geometry.attributes.sciDeposit.getX(0)>.1,'target is inside the deposited ejecta blanket');
 assert.equal(surface.material.userData.sciEjecta.value,1);
 terrain.update('sample',.5,'touchdown-1');assert.equal(surface.material.userData.sciEjecta.value,0);
});

test('sampling terrain keeps the contact disk clear and stays within its rendering budget',()=>{
 for(const id of ['hayabusa2','osiris-rex']){
  const terrain=createSamplingTerrain(id),matrix=new T.Matrix4(),point=new T.Vector3();
  let triangles=0,draws=0;
  terrain.group.traverse(mesh=>{
   if(!mesh.isMesh)return;
   draws++;
   triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
   if(!mesh.isInstancedMesh)return;
   const p=mesh.geometry.attributes.position;
   for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);
    for(let j=0;j<p.count;j++){
     point.fromBufferAttribute(p,j).applyMatrix4(matrix);
     assert.ok(Math.hypot(point.x,point.z)>1.1,'rock intersects the contact disk');
    }
   }
  });
  assert.ok(triangles<=150000,`${triangles} triangles exceeds budget`);
  assert.ok(draws<=20,`${draws} draw calls exceeds budget`);
 }
});
test('Bennu contact ground yields beneath the complete head and restores when scrubbing',()=>{
 const terrain=createSamplingTerrain('osiris-rex'),surface=terrain.group.getObjectByName('sampling-surface');
 const point=new T.Vector3(),position=surface.geometry.attributes.position;
 const heights=()=>{const result=[];for(let i=0;i<position.count;i++){surface.getVertexPosition(i,point);if(Math.hypot(point.x,point.z)<.125)result.push(point.y);}return result;};
 terrain.update('sample',.46,'tag');const before=heights();assert(before.every(y=>Math.abs(y)<1e-6));
 terrain.update('sample',.57,'tag');const contact=heights();assert(contact.every(y=>y<-.2));
 assert(contact.every(y=>Math.abs(y-samplingClearance(.57,'osiris-rex'))<1e-6));
 terrain.update('sample',.9,'tag');assert.deepEqual(heights(),contact,'excavation remains after retreat');
 terrain.update('sample',.46,'tag');assert.deepEqual(heights(),before);
});

test('crater excavation uses reversible GPU morphs without per-frame geometry changes',()=>{
 const terrain=createSamplingTerrain('hayabusa2');
 const surface=terrain.group.getObjectByName('sampling-surface');
 assert.ok(surface.morphTargetInfluences?.length===2);
 const version=surface.geometry.attributes.position.version;
 terrain.update('impact',.3,'sci');
 assert.deepEqual(surface.morphTargetInfluences,[0,0]);
 terrain.update('impact',.7,'sci');
 assert.deepEqual(surface.morphTargetInfluences,[1,0]);
 terrain.update('sample',.7,'touchdown-2');
 assert.deepEqual(surface.morphTargetInfluences,[0,1]);
 terrain.update('sample',.7,'touchdown-1');
 assert.deepEqual(surface.morphTargetInfluences,[0,0]);
 assert.equal(surface.geometry.attributes.position.version,version);
 const pos=surface.geometry.attributes.position,delta=surface.geometry.morphAttributes.position[0];
 let center=-1,centerDistance=Infinity,rimHeight=-Infinity;
 for(let i=0;i<pos.count;i++){
  const z=pos.getZ(i)-motion.sciLayout.crater[2],r=Math.hypot(pos.getX(i),z);
  if(r<centerDistance){center=i;centerDistance=r;}
  if(z<0&&Math.abs(r-motion.sciLayout.rimRadius)<.5)rimHeight=Math.max(rimHeight,delta.getY(i));
 }
 assert.ok(delta.getY(center)<-.5);
 assert.ok(rimHeight>.15);
});
