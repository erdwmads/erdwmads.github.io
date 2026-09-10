import * as THREE from 'three';

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
