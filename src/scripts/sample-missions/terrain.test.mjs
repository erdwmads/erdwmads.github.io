import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSamplingTerrain} from './terrain.js';

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
 let center=-1,rim=-1;
 for(let i=0;i<pos.count;i++){
  const r=Math.hypot(pos.getX(i),pos.getZ(i));
  if(r<.05)center=i;
  if(Math.abs(r-1.48)<.04)rim=i;
 }
 assert.ok(delta.getY(center)<-.5);
 assert.ok(delta.getY(rim)>.15);
});
