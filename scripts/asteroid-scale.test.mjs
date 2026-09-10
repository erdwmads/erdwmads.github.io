import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {augmentAsteroid} from '../src/scripts/sample-missions/asteroid-detail.js';
import {normalizeAsteroid} from '../src/scripts/asteroid-scale.js';

globalThis.ProgressEvent ??= class {constructor(type,properties){this.type=type;Object.assign(this,properties);}};

async function sourceModel(id){
  const bytes=await readFile(new URL(`../public/assets/data/planetary/${id==='ryugu'?'ryugu.obj':'bennu.glb'}`,import.meta.url));
  if(id==='ryugu')return new OBJLoader().parse(bytes.toString());
  // CPU geometry test: omit embedded images, retaining all source mesh data and transforms.
  const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length).toString());
  gltf.images=[];gltf.textures=[];gltf.materials=[];
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives)delete primitive.material;
  gltf.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
  return (await new GLTFLoader().parseAsync(JSON.stringify(gltf),'')).scene;
}

function equivalentDiameter(object){
  object.updateMatrixWorld(true);let volume=0;
  object.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const positions=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?.count??positions.count;
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    for(let i=0;i<count;i+=3){
      a.fromBufferAttribute(positions,index?index.getX(i):i).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(positions,index?index.getX(i+1):i+1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(positions,index?index.getX(i+2):i+2).applyMatrix4(mesh.matrixWorld);
      volume+=a.dot(b.cross(c))/6;
    }
  });
  return Math.cbrt(Math.abs(volume)*6/Math.PI);
}

for(const [id,spanKm,diameterKm] of [['bennu',.565036987,.491774603],['ryugu',1.019200027,.896499394]]){
  test(`${id} source dimensions survive display normalization and conversion to kilometres`,async()=>{
    assert.equal(typeof normalizeAsteroid,'function','shared normalization must retain the source physical scale');
    const unit=normalizeAsteroid(await sourceModel(id),id);
    assert(Math.abs(Math.max(...new THREE.Box3().setFromObject(unit).getSize(new THREE.Vector3()).toArray())-1)<1e-7);
    unit.scale.setScalar(unit.userData.kilometersPerUnit);
    const box=new THREE.Box3().setFromObject(unit);
    assert(box.getCenter(new THREE.Vector3()).length()<1e-7,'display centre remains at the origin');
    assert(Math.abs(Math.max(...box.getSize(new THREE.Vector3()).toArray())-spanKm)<1e-7,'preserve source maximum span, not nominal mean diameter');
    assert(Math.abs(equivalentDiameter(unit)-diameterKm)<1e-7,'preserve source volume-equivalent diameter');
  });
  test(`${id} illustrative boulders cannot resize the physical source shape`,async()=>{
    assert.equal(typeof normalizeAsteroid,'function','shared normalization must retain the source physical scale');
    const unit=normalizeAsteroid(await sourceModel(id),id),source=unit.children[0],scale=unit.userData.kilometersPerUnit;
    const before=new THREE.Box3().setFromObject(source);
    augmentAsteroid(unit,id);
    assert.equal(unit.userData.kilometersPerUnit,scale);
    assert(new THREE.Box3().setFromObject(source).equals(before),'source bounds are unchanged by augmentation');
    unit.scale.setScalar(unit.userData.kilometersPerUnit);
    unit.updateMatrixWorld(true);
    const physicalSpan=Math.max(...new THREE.Box3().setFromObject(source).getSize(new THREE.Vector3()).toArray());
    assert(Math.abs(physicalSpan-spanKm)<1e-7,'physical conversion does not use augmented bounds');
  });
}
