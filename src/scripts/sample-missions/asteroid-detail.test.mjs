import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {augmentAsteroid} from './asteroid-detail.js';

test('asteroid detail preserves measured shape and seats bounded rocks on transformed surfaces',()=>{
 const unit=new T.Group(),body=new T.Mesh(new T.SphereGeometry(4,24,16),new T.MeshStandardMaterial());
 body.scale.setScalar(.125);body.rotation.set(.3,.7,.2);unit.add(body);
 const original=body.geometry.attributes.position.array.slice();
 augmentAsteroid(unit,'bennu');
 assert.deepEqual(body.geometry.attributes.position.array,original);
 const detail=unit.getObjectByName('illustrative-surface-boulders');
 assert.ok(detail);
 assert.match(detail.userData.description,/illustrative/i);
 let triangles=0,calls=0,rocks=0;
 const matrix=new T.Matrix4(),point=new T.Vector3();
 detail.traverse(mesh=>{
  if(!mesh.isInstancedMesh)return;
  calls++;rocks+=mesh.count;
  triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count;
  for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);
   assert.ok(point.length()>.465&&point.length()<.535,'boulder detached from normalized surface');
  }
 });
 assert.ok(rocks>=3000,`${rocks} is too sparse for the rubble field`);
 assert.ok(triangles<=100000,`${triangles} exceeds triangle budget`);
 assert.ok(calls<=8);
});


test('rubble keeps a dense fine-fragment majority with occasional prominent boulders',()=>{
 for(const id of ['ryugu','bennu']){
  const unit=new T.Group();unit.add(new T.Mesh(new T.SphereGeometry(.5,24,16),new T.MeshStandardMaterial()));
  const detail=augmentAsteroid(unit,id),matrix=new T.Matrix4(),scale=new T.Vector3();
  let count=0,fine=0,large=0;
  detail.traverse(mesh=>{if(!mesh.isInstancedMesh)return;for(let i=0;i<mesh.count;i++){
   mesh.getMatrixAt(i,matrix);scale.setFromMatrixScale(matrix);const width=Math.max(scale.x,scale.z);
   count++;if(width<.014)fine++;if(width>.02)large++;
  }});
  assert(fine/count>.6,'fine fragments should dominate instead of similarly sized studs');
  assert(large>200&&large<count*.25,'retain prominent boulders without covering the whole shape');
 }
});
