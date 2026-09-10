import test from 'node:test';
import assert from 'node:assert/strict';
import {inheritance} from './scenes.js';
test('the inheritance finale visually prioritizes the surviving aggregate over departing ejecta',()=>{
 const s=inheritance(),survivors=[],ejecta=[];s.update(0,false);
 s.group.traverse(m=>{if(m.name.startsWith('parent-fragment-'))(m.position.x<.18?survivors:ejecta).push(m);});
 s.update(1,false);
 assert(survivors.length>5&&survivors.every(m=>m.visible&&m.material.opacity===1));
 assert(ejecta.every(m=>!m.visible||m.material.opacity<.01),'Departing fragments must not dominate the final composition');
 assert(s.cameraAt(1).target[0]<-.8,'Final framing follows the surviving material');
});
