import {buildSectionGeometry} from './section-geometry.js';

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {accretion,alteration} from './scenes.js';
test('surface ice stays embedded after the parent core is scaled',()=>{
const {group}=accretion();group.updateWorldMatrix(true,true);
const ice=group.getObjectByName('surface-ice'),core=ice.parent.children[0],matrix=new T.Matrix4(),point=new T.Vector3(),ray=new T.Raycaster();
for(let i=0;i<ice.count;i++){
ice.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix).applyMatrix4(ice.matrixWorld);
const direction=point.clone().normalize();ray.set(direction.clone().multiplyScalar(3),direction.clone().negate());const surface=ray.intersectObject(core,false)[0];
assert(surface);assert(point.distanceTo(surface.point)<.009,'Ice patch '+i+' is detached from its actual core');
}
});
test('the ice shown in the cutout lies in open pores rather than behind the section',()=>{
const scene=alteration(buildSectionGeometry());scene.update(0,false);scene.group.updateWorldMatrix(true,true);
const rock=scene.group.getObjectByName('alteration-matrix'),ray=new T.Raycaster();let count=0;
scene.group.traverse(mesh=>{if(mesh.name!=='embedded-ice')return;count++;
ray.set(new T.Vector3(mesh.position.x,mesh.position.y,2),new T.Vector3(0,0,-1));
const wall=ray.intersectObject(rock,false)[0],ice=ray.intersectObject(mesh,false)[0];
assert(ice&&wall);assert(ice.distance<wall.distance,'An ice grain is completely buried behind the rock');
});assert.equal(count,48);
});
