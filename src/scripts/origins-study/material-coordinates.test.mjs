import test from 'node:test';
import assert from 'node:assert/strict';
import {clastGeometry} from './materials.js';
import {fracturedParent} from './parent-body.js';
import {Vector3} from 'three';
test('independent rock geometries have distinct reproducible material coordinates',()=>{
 const a=clastGeometry(41,2),b=clastGeometry(73,2),again=clastGeometry(41,2);
 assert(a.getAttribute('rockOffset'),'Rock texture needs its own stable coordinate origin');
 assert.notDeepEqual(Array.from(a.getAttribute('rockOffset').array).slice(0,3),Array.from(b.getAttribute('rockOffset').array).slice(0,3));
 assert.deepEqual(a.getAttribute('rockOffset').array,again.getAttribute('rockOffset').array);
});
test('fragment material coordinates retain the common intact parent frame',()=>{
 for(const {geometry,center} of fracturedParent(65,64)){const offset=geometry.getAttribute('rockOffset');assert(offset);for(let i=0;i<offset.count;i+=37){const v=new Vector3().fromBufferAttribute(offset,i);assert(v.distanceTo(center)<1e-6,'Texture cannot jump to fragment-local origin');}geometry.dispose();}
});
