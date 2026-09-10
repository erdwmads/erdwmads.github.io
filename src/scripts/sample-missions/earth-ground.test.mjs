import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import * as ground from './earth-ground.js';
for(const id of ['hayabusa2','osiris-rex'])test(id+' recovery ground resolves metres and kilometres without inflating scenery',()=>{
 assert.equal(typeof ground.createRecoveryGround,'function');const site=ground.createRecoveryGround(id);
 assert.match(site.userData.provenance,/illustrative/i);assert.equal(site.userData.units,'km');
 const surface=site.getObjectByName('recovery-surface');assert(surface);assert(surface.geometry.attributes.position.count>10000);
 const box=new T.Box3().setFromObject(surface);assert(box.max.x-box.min.x>100,'real horizon-scale terrain');
 assert(Math.abs(ground.recoveryGroundHeight(id,0,0))<1e-12,'touchdown patch remains at zero');
 assert(Math.abs(ground.recoveryGroundHeight(id,.001,.001))<1e-7,'flat landing-contact patch');
 const gravel=site.getObjectByName('recovery-gravel'),scrub=site.getObjectByName('recovery-scrub');assert(gravel?.isInstancedMesh&&scrub?.isInstancedMesh);
 const matrix=new T.Matrix4(),scale=new T.Vector3(),position=new T.Vector3(),rotation=new T.Quaternion();
 for(let i=0;i<gravel.count;i++){gravel.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);assert(Math.max(...scale.toArray())<.00004,'pebbles stay centimetre-scale');assert(Math.hypot(position.x,position.z)>.001);}
 assert(surface.material.userData.detailScalesM.includes(.0125),'centimetre relief is independent of a stretched image');
 const shader={vertexShader:"#include <common>\n#include <begin_vertex>",fragmentShader:"#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>\n#include <roughnessmap_fragment>"};surface.material.onBeforeCompile(shader);
 assert(shader.fragmentShader.includes('fwidth'),'grain must be filtered at distant views');
});
test('Woomera and Utah preserve distinct palettes and horizon relief',()=>{
 assert.equal(typeof ground.createRecoveryGround,'function');const h=ground.createRecoveryGround('hayabusa2'),o=ground.createRecoveryGround('osiris-rex');
 assert(!h.getObjectByName('recovery-surface').material.color.equals(o.getObjectByName('recovery-surface').material.color));
 assert(ground.recoveryGroundHeight('osiris-rex',20,0)-ground.recoveryGroundHeight('hayabusa2',20,0)>.2);
});

test('gravel sits on the ground with restrained contact shading',()=>{
 const site=ground.createRecoveryGround('hayabusa2'),gravel=site.getObjectByName('recovery-gravel'),contacts=site.getObjectByName('gravel-contact-shadows');
 assert(contacts?.isInstancedMesh,'small stones need contact shading independent of distant directional-shadow resolution');
 assert.equal(contacts.count,gravel.count);assert(contacts.material.opacity<=.2);
 const matrix=new T.Matrix4(),point=new T.Vector3(),vertices=gravel.geometry.attributes.position;
 for(let i=0;i<gravel.count;i+=41){
  gravel.getMatrixAt(i,matrix);const location=new T.Vector3().setFromMatrixPosition(matrix);let bottom=Infinity;
  for(let j=0;j<vertices.count;j++){point.fromBufferAttribute(vertices,j).applyMatrix4(matrix);bottom=Math.min(bottom,point.y);}
  const surface=ground.recoveryGroundHeight('hayabusa2',location.x,location.z);assert(bottom<=surface+1e-8&&bottom>surface-.000002,'stone must sit in the surface without hovering or deep burial');
 }
});
