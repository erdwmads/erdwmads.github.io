import test from 'node:test';
import assert from 'node:assert/strict';
import {alteration} from './scenes.js';
test('the rendered section has a measured phase-area budget, not carbonate at every pore',()=>{
 const scene=alteration();scene.update(1,false);
 const atlas=scene.group.userData.modalAtlas;
 assert.ok(atlas,'A quantified phase map must drive the actual surface shader');
 const counts=Array(6).fill(0);for(const id of atlas.ids)if(id<6)counts[id]++;
 const total=counts.reduce((a,b)=>a+b,0),target=[88,2.4,5.3,1.6,.2,2.5];
 counts.forEach((n,i)=>assert.ok(Math.abs(100*n/total-target[i])<.01,`phase ${i} has its own area budget`));
 const matrix=scene.group.getObjectByName('alteration-matrix');
 assert.equal(matrix.material.mineralMap.image.data,atlas.rgba);
 assert.equal(scene.group.getObjectByName('secondary-carbonate-crystallites'),undefined,'No extra carbonate geometry outside the phase budget');
});
