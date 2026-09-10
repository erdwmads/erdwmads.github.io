import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergeStaticDetails} from '../src/scripts/sample-missions/static-geometry.js';
import {createSpacecraft} from '../src/scripts/sample-missions/spacecraft.js';

test('static batching preserves transformed bounds, capsule ownership and shader-local geometry',()=>{
 const root=new THREE.Group(),material=new THREE.MeshStandardMaterial(),shared=new THREE.BoxGeometry(.2,.3,.4);
 const capsule=new THREE.Group();capsule.name='capsule';root.add(capsule);
 const retained=new THREE.Mesh(shared,material);capsule.add(retained);
 let disposed=0;shared.addEventListener('dispose',()=>disposed++);
 for(let i=0;i<8;i++){const mesh=new THREE.Mesh(shared,material);mesh.position.set(i*.13,i*.07,-i*.11);mesh.rotation.set(i*.2,i*.1,0);root.add(mesh);}
 const shaderMaterial=new THREE.MeshStandardMaterial(),foil=new THREE.Mesh(new THREE.BoxGeometry(.8,.4,.2),shaderMaterial);foil.position.x=-1;root.add(foil);
 const cells=new THREE.InstancedMesh(shared,material,1);cells.setMatrixAt(0,new THREE.Matrix4().makeTranslation(-.6,0,0));root.add(cells);
 root.updateMatrixWorld(true);const before=new THREE.Box3().setFromObject(root);
 const stats=mergeStaticDetails(root,{excludeRoots:[capsule],excludeMaterials:[shaderMaterial]});
 root.updateMatrixWorld(true);const after=new THREE.Box3().setFromObject(root);
 assert.ok(before.min.distanceTo(after.min)<1e-6&&before.max.distanceTo(after.max)<1e-6);
 assert.equal(stats.before,11);assert.equal(stats.after,4);
 assert.equal(capsule.children[0],retained);assert.equal(cells.parent,root);assert.equal(foil.parent,root);assert.equal(disposed,0);
});

test('Hayabusa2 detail batching removes at least half of mesh draws without changing mission anchors',async()=>{
 const craft=await createSpacecraft('hayabusa2'),stats=craft.group.userData.staticBatch;
 assert.ok(stats.after<stats.before*.5);
 assert.equal(craft.group.getObjectByName('ion-engine-cluster').children.length,5);
 assert.equal(craft.capsule.parent,craft.group);
 assert.deepEqual(craft.samplerTip.toArray(),[0,-1.428,.05]);
 assert.equal(craft.group.getObjectByName('individual-photovoltaic-cells').isInstancedMesh,true);
});
