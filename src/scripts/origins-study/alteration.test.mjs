import test from 'node:test';
import assert from 'node:assert/strict';
import {Raycaster,Vector3} from 'three';
import {alteration} from './scenes.js';
import {insideSection} from './breccia-fabric.js';
test('the fine-grained section has continuous support and no macroscopic cavities or wire connectors',()=>{
 const scene=alteration();scene.update(.2,false);scene.group.updateMatrixWorld(true);const wires=[];
 scene.group.traverse(n=>{if(n.isLine||n.geometry?.type==='TubeGeometry')wires.push(n.type);});assert.deepEqual(wires,[]);
 const matrix=scene.group.getObjectByName('alteration-matrix'),ray=new Raycaster();
 for(let x=-1.8;x<=1.8;x+=.3)for(let y=-1.1;y<=1.1;y+=.3){if(!insideSection(x/.97,y/.97))continue;ray.set(new Vector3(x,y,2),new Vector3(0,0,-1));const hit=ray.intersectObject(matrix)[0];assert.ok(hit&&hit.point.z>-.08,'Every interior region retains rock support');}
});
test('material/process colors and reversed scrubbing leave the physical geometry unchanged',()=>{
 const scene=alteration(),snapshot=()=>{const arrays=[];scene.group.traverse(n=>{if(n.isInstancedMesh)arrays.push(Array.from(n.instanceMatrix.array));});return arrays;};
 scene.update(.52,false);const original=snapshot();scene.update(.52,true);assert.deepEqual(snapshot(),original);scene.update(.96,false);scene.update(.52,false);assert.deepEqual(snapshot(),original);
});
