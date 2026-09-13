import test from 'node:test';
import assert from 'node:assert/strict';
import {accretion,inheritance} from './scenes.js';
test('growth contains thousands of persistent grains, not seven large incoming worlds',()=>{
 const s=accretion(),g=s.group.getObjectByName('accreting-grains');assert.ok(g&&g.count>=2000);
 s.update(0,false);const a=g.instanceMatrix.array.slice();s.update(1,false);const b=g.instanceMatrix.array;
 for(let i=0;i<g.count;i++){const k=i*16,scale=m=>Math.hypot(m[k],m[k+1],m[k+2]);assert.ok(Math.abs(scale(a)-scale(b))<1e-6);}
});
test('escaping fragments remain physical objects instead of fading out',()=>{
 const s=inheritance();s.update(1,false);const a=[];s.group.traverse(n=>{if(n.name.startsWith('parent-fragment-'))a.push(n);});assert.ok(a.every(n=>n.visible&&n.material.opacity===1));
});

import {diskAngle} from './disk-motion.js';
import {growthPopulation,grainPosition} from './growth-dynamics.js';
test('outer disk motion is legible in three seconds and inner motion is faster',()=>{
 const outer=diskAngle(5,3/32);assert(outer>.12&&outer<.3);assert(diskAngle(2,3/32)>outer*2);
});
test('many clusters compact before the entire population gathers; time is reversible',()=>{
 const p=growthPopulation(),kept=p.grains.filter(g=>!g.escape),rms=t=>Math.sqrt(kept.reduce((s,g)=>s+grainPosition(g,p,t).reduce((n,v)=>n+v*v,0),0)/kept.length);
 assert.equal(p.groups.length,32);assert(rms(1)<rms(.35)*.5);
 for(let i=0;i<32;i++){
  const members=kept.filter(g=>g.group===i),spread=t=>{const a=members.map(g=>grainPosition(g,p,t)),c=[0,1,2].map(k=>a.reduce((s,v)=>s+v[k],0)/a.length);return a.reduce((s,v)=>s+v.reduce((n,x,k)=>n+(x-c[k])**2,0),0)/a.length;};
  assert(spread(.4)<spread(0)*.3);
 }
 const a=kept.map(g=>grainPosition(g,p,.57));rms(1);assert.deepEqual(kept.map(g=>grainPosition(g,p,.57)),a);
});

test('fine ejecta include both escaping and returning grains with fixed sizes',()=>{
 const s=inheritance(),grains=s.group.userData.debris;assert(grains.filter(p=>p.preserved).length>=200);assert(grains.filter(p=>!p.preserved).length>=200);
 const mesh=s.group.getObjectByName('mixed-fine-ejecta');s.update(.35,false);const first=mesh.instanceMatrix.array.slice();s.update(1,false);
 for(let i=0;i<mesh.count;i++){const k=i*16,size=a=>Math.hypot(a[k],a[k+1],a[k+2]);assert(Math.abs(size(first)-size(mesh.instanceMatrix.array))<1e-6);}
});
