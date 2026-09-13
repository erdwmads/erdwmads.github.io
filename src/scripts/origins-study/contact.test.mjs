

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {alteration} from './scenes.js';
test('dispersed ice sits on the exposed material throughout the section',()=>{
 const scene=alteration();scene.update(0,false);scene.group.updateWorldMatrix(true,true);
 const rock=scene.group.getObjectByName('alteration-matrix'),ice=scene.group.getObjectByName('dispersed-ice-grains'),ray=new T.Raycaster(),matrix=new T.Matrix4(),point=new T.Vector3(),scale=new T.Vector3();let count=0;
 for(let i=0;i<ice.count;i+=3){ice.getMatrixAt(i,matrix);scale.setFromMatrixScale(matrix);if(scale.x===0)continue;count++;point.setFromMatrixPosition(matrix);ray.set(new T.Vector3(point.x,point.y,2),new T.Vector3(0,0,-1));const wall=ray.intersectObject(rock,false)[0];assert(wall);assert(point.z>wall.point.z&&point.z-wall.point.z<.015,'Ice remains partly embedded in the exposed matrix');ice.geometry.computeBoundingBox();const bounds=ice.geometry.boundingBox.clone().applyMatrix4(matrix);assert(bounds.min.z<wall.point.z&&bounds.max.z>wall.point.z,'The cut surface intersects each visible ice grain');}
 assert(count>300);
});
