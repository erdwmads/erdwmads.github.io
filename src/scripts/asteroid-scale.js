import * as THREE from 'three';

// Both shape models ship as GLB. ryugu.glb is an exact float32 re-encoding of JAXA's OBJ
// (scripts/shape-model-glb.mjs); restoreFacetedShape rebuilds the non-indexed, flat-normal
// geometry the OBJ loader produced, so the rendered shape and shading are unchanged.
export const shapeModelUrl = id => `/assets/data/planetary/${id}.glb`;

export function restoreFacetedShape(object){
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),cb=new THREE.Vector3(),ab=new THREE.Vector3();
  object.traverse(node=>{
    if(!node.isMesh||!node.geometry.index)return;
    const geometry=node.geometry.toNonIndexed(),position=geometry.attributes.position;
    // Face normals normalised before storage, exactly as OBJLoader computes them for OBJ files without normals.
    const normals=new Float32Array(position.count*3);
    for(let i=0;i<position.count;i+=3){
      a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
      cb.subVectors(c,b);ab.subVectors(a,b);cb.cross(ab).normalize();
      for(let k=0;k<3;k++)normals.set([cb.x,cb.y,cb.z],(i+k)*3);
    }
    geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
    node.geometry.dispose();
    node.geometry=geometry;
  });
  return object;
}

export function normalizeAsteroid(object,id){
  if(id==='ryugu')object.rotation.x=-Math.PI/2;
  object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3());
  const span=Math.max(...size.toArray());
  object.position.sub(box.getCenter(new THREE.Vector3()));
  object.scale.multiplyScalar(1/span);object.position.multiplyScalar(1/span);
  const unit=new THREE.Group();unit.add(object);
  // NASA VTAD Bennu vertices use metres; JAXA's Ryugu OBJ uses kilometres.
  // Retain this before illustrative details can enlarge the display bounds.
  unit.userData.kilometersPerUnit=span*(id==='bennu'?.001:1);
  return unit;
}
