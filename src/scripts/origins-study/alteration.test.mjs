import test from 'node:test';
import assert from 'node:assert/strict';
import {Raycaster,Vector3} from 'three';
import {alteration} from './scenes.js';
test('the rock section has recessed fissures rather than rendered wire connectors',()=>{const scene=alteration();scene.update(.2,false);scene.group.updateMatrixWorld(true);const wires=[];scene.group.traverse(n=>{if(n.isLine||n.geometry?.type==='TubeGeometry')wires.push(n.type);});assert.deepEqual(wires,[]);const matrix=scene.group.getObjectByName('alteration-matrix');assert.ok(matrix);const ray=new Raycaster(new Vector3(-.515,.8,2),new Vector3(0,0,-1)),hit=ray.intersectObject(matrix)[0];assert.ok(hit&&hit.point.z<.12,'Fissure is cut into the rock, not drawn above it');});
