import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Bake only opaque static siblings; independently animated subtrees stay owned. */
export function mergeStaticDetails(root,{excludeRoots=[],excludeMaterials=[]}={}){
 const protectedRoots=new Set(excludeRoots),protectedMaterials=new Set(excludeMaterials),removedGeometry=new Set();
 const count=()=>{let meshes=0;root.traverse(o=>{if(o.isMesh)meshes++;});return meshes;};
 const before=count();
 function visit(parent){
  if(protectedRoots.has(parent))return;
  for(const child of [...parent.children])if(child.children.length)visit(child);
  const batches=new Map();
  for(const object of parent.children){
   if(!object.isMesh||object.isInstancedMesh||object.isSkinnedMesh||object.children.length||protectedRoots.has(object))continue;
   const material=object.material,geometry=object.geometry;
   if(Array.isArray(material)||material.transparent||protectedMaterials.has(material)||!object.visible||Object.keys(geometry.morphAttributes).length)continue;
   if(geometry.drawRange.start!==0||geometry.drawRange.count!==Infinity)continue;
   object.updateMatrix();if(object.matrix.determinant()<=0)continue;
   const attributes=Object.entries(geometry.attributes).map(([name,a])=>`${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join(',');
   const key=[material.id,object.castShadow,object.receiveShadow,object.renderOrder,object.layers.mask,!!geometry.index,attributes].join('|');
   if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);
  }
  for(const objects of batches.values()){
   if(objects.length<2)continue;
   const transformed=objects.map(o=>o.geometry.clone().applyMatrix4(o.matrix));
   const merged=mergeGeometries(transformed,false);transformed.forEach(g=>g.dispose());
   if(!merged)continue;
   const first=objects[0],mesh=new THREE.Mesh(merged,first.material);
   mesh.name='static-detail-batch';mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;mesh.layers.mask=first.layers.mask;
   for(const object of objects){parent.remove(object);removedGeometry.add(object.geometry);}
   parent.add(mesh);
  }
 }
 visit(root);
 const retained=new Set();root.traverse(o=>{if(o.geometry)retained.add(o.geometry);});
 for(const geometry of removedGeometry)if(!retained.has(geometry))geometry.dispose();
 return {before,after:count()};
}
