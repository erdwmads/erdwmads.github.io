import test from 'node:test';
import assert from 'node:assert/strict';
import {clastGeometry,fractureRelief} from './materials.js';
import {fracturedBody} from './fracture.js';
import {Vector3} from 'three';
test('independent rock geometries have distinct reproducible material coordinates',()=>{
 const a=clastGeometry(41,2),b=clastGeometry(73,2),again=clastGeometry(41,2);
 assert(a.getAttribute('rockOffset'),'Rock texture needs its own stable coordinate origin');
 assert.notDeepEqual(Array.from(a.getAttribute('rockOffset').array).slice(0,3),Array.from(b.getAttribute('rockOffset').array).slice(0,3));
 assert.deepEqual(a.getAttribute('rockOffset').array,again.getAttribute('rockOffset').array);
});
test('fragment material coordinates retain the common intact parent frame',()=>{
 const {cells,shell}=fracturedBody(65,12);
 for(const {geometry,center} of cells){const g=fractureRelief(geometry,center),offset=g.getAttribute('rockOffset');assert(offset);const v=new Vector3().fromBufferAttribute(offset,0);assert(v.distanceTo(center)<1e-6,'Texture cannot jump to fragment-local origin');g.dispose();geometry.dispose();}shell.dispose();
});
