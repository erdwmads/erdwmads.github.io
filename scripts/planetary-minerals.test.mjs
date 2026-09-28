import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Vector3 } from 'three';
import { mineralModels, createMineralGroup } from '../src/scripts/planetary-minerals.js';

function dispose(group) {
  group.traverse(node=>{node.geometry?.dispose(); for (const value of Object.values(node.material || {})) if (value?.isTexture) value.dispose(); node.material?.dispose();});
}
function worldPoints(group, visit) {
  group.updateMatrixWorld(true);
  const point = new Vector3();
  group.traverse(node=>{ const position = node.isMesh && node.geometry.attributes.position; if (position) for (let i=0;i<position.count;i++) visit(point.fromBufferAttribute(position,i).applyMatrix4(node.matrixWorld)); });
}

test('Named mineral examples have distinct, finite 3D geometry and sourced explanations', () => {
  assert.deepEqual(Object.keys(mineralModels), ['carbonate','matrix','sulfide']);
  for (const id of Object.keys(mineralModels)) {
    assert.match(mineralModels[id].source,/handbookofmineralogy/);
    const normal = createMineralGroup(id,false), detail = createMineralGroup(id,true);
    const a = new Box3().setFromObject(normal).getSize(new Vector3());
    const b = new Box3().setFromObject(detail).getSize(new Vector3());
    assert.ok(a.toArray().every(v=>Number.isFinite(v)&&v>0.1));
    assert.notDeepEqual(a.toArray(),b.toArray(),'Detail must change geometry, not only text');
    for (const group of [normal,detail]) dispose(group);
  }
});
test('Dolomite blocks are cleavage rhombohedra, not cubes', () => {
  const group = createMineralGroup('carbonate',false), faces = new Map();
  const block = group.children[0].children.find(node=>node.isMesh), position = block.geometry.attributes.position;
  const [a,b,c] = [0,1,2].map(()=>new Vector3());
  for (let i=0;i<position.count;i+=3) {
    a.fromBufferAttribute(position,i); b.fromBufferAttribute(position,i+1); c.fromBufferAttribute(position,i+2);
    const cross = b.clone().sub(a).cross(c.clone().sub(a)), normal = cross.clone().normalize(), key = normal.toArray().map(v=>v.toFixed(3)).join();
    faces.set(key,{normal,area:(faces.get(key)?.area ?? 0)+cross.length()/2});
  }
  // The six broad faces are three parallel pairs; bevels are narrow.
  const broad = [...faces.values()].sort((x,y)=>y.area-x.area).slice(0,6).map(face=>face.normal);
  const planes = broad.filter((normal,i)=>broad.findIndex(other=>Math.abs(other.dot(normal))>0.999)===i);
  assert.equal(planes.length,3);
  for (let i=0;i<3;i++) for (let j=i+1;j<3;j++) {
    const angle = Math.acos(Math.abs(planes[i].dot(planes[j])))*180/Math.PI;
    assert.ok(Math.abs(angle-73.75)<0.3,`Cleavage planes meet at ${angle.toFixed(2)}°, not dolomite's ~73.75°`);
  }
  dispose(group);
});
test('Mineral frames fit the separated layout for any turn, keep one scale and carry a studio light rig', () => {
  for (const id of Object.keys(mineralModels)) {
    const normal = createMineralGroup(id,false), detail = createMineralGroup(id,true), themed = createMineralGroup(id,false,true);
    const frame = detail.userData.frame;
    assert.deepEqual(normal.userData.frame,frame,'The detail toggle must not rescale the view');
    let turn = 0, height = 0;
    worldPoints(detail,point=>{ turn = Math.max(turn,Math.hypot(point.x,point.z)); height = Math.max(height,Math.abs(point.y)); });
    assert.ok(frame.radius >= turn && frame.radiusY > height,`${id} frame ${JSON.stringify(frame)} clips ${turn}, ${height}`);
    assert.ok(frame.radius < 1.55 && frame.radiusY < 1.55,'The model must fill more of the stage than the former fixed 1.55 frame');
    const lights = group => group.children.filter(node=>node.isLight);
    assert.deepEqual(lights(normal).map(light=>light.type),['PointLight','PointLight','PointLight','HemisphereLight']);
    assert.notEqual(lights(normal)[2].color.getHex(),lights(themed)[2].color.getHex(),'Light and Space themes keep distinct rim tints');
    const mesh = normal.children[0].children.find(node=>node.isMesh);
    assert.ok(mesh.material.isMeshPhysicalMaterial && mesh.material.normalMap?.isDataTexture && mesh.material.normalMap.image.width===128,'Surface maps are small generated textures, not image assets');
    for (const group of [normal,detail,themed]) dispose(group);
  }
});
