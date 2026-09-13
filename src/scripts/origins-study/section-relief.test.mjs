import test from 'node:test';
import assert from 'node:assert/strict';
import {Matrix4,Vector3,Raycaster} from 'three';
import {alteration} from './scenes.js';
test('geometric grains vary in size, height and lateral position within the fine matrix instead of standing up as gravel',()=>{
 const {group}=alteration();group.updateMatrixWorld(true);const support=group.getObjectByName('alteration-matrix'),ray=new Raycaster();const mesh=group.getObjectByName('fine-rock-grains'),matrix=new Matrix4(),position=new Vector3(),scale=new Vector3(),heights=[],sizes=[];let displaced=0;
 for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);scale.setFromMatrixScale(matrix);heights.push(position.z);sizes.push(scale.x);if(i%20===0){ray.set(new Vector3(position.x,position.y,2),new Vector3(0,0,-1));const hit=ray.intersectObject(support)[0];assert(hit);assert(position.z+scale.z<hit.point.z+.001,'Fines are embedded in the actual irregular surface');assert(Math.abs(matrix.elements[2])+Math.abs(matrix.elements[6])<1e-6,'Thin grains lie along the face');}if(Math.abs(position.x/.105-Math.round(position.x/.105))>.2)displaced++;}
 assert(mesh.count>1000);assert(Math.max(...heights)-Math.min(...heights)>.0015);assert(Math.max(...sizes)/Math.min(...sizes)>3);assert(displaced>mesh.count*.4);
});
