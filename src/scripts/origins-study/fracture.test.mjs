import test from 'node:test';
import assert from 'node:assert/strict';
import {fracturedBody} from './fracture.js';
function volume(geometry){const p=geometry.attributes.position;let sum=0;for(let i=0;i<p.count;i+=3){const ax=p.getX(i),ay=p.getY(i),az=p.getZ(i),bx=p.getX(i+1),by=p.getY(i+1),bz=p.getZ(i+1),cx=p.getX(i+2),cy=p.getY(i+2),cz=p.getZ(i+2);sum+=ax*(by*cz-bz*cy)+ay*(bz*cx-bx*cz)+az*(bx*cy-by*cx);}return Math.abs(sum/6);}
test('fracture cells partition a solid parent without missing or overlapping volume',()=>{const {shell,cells}=fracturedBody(65,28);assert.equal(cells.length,28);const parent=volume(shell),pieces=cells.reduce((sum,c)=>sum+volume(c.geometry),0);assert.ok(Math.abs(parent-pieces)/parent<.001);for(const {geometry,center} of cells){assert.ok(volume(geometry)>.0001);assert.ok(center.toArray().every(Number.isFinite));geometry.dispose();}shell.dispose();});
test('fracture geometry is deterministic',()=>{const a=fracturedBody(65,12),b=fracturedBody(65,12);assert.deepEqual(a.cells.map(c=>Array.from(c.geometry.attributes.position.array)),b.cells.map(c=>Array.from(c.geometry.attributes.position.array)));});

import {inheritance} from './scenes.js';
test('fragmentation and reaccretion preserve piece scale and replay the same transforms',()=>{const scene=inheritance(),pieces=[];scene.group.traverse(n=>{if(n.name.startsWith('parent-fragment-'))pieces.push(n);});assert.equal(pieces.length,64);const snapshot=()=>pieces.map(p=>[...p.position.toArray(),...p.quaternion.toArray()]);scene.update(.65,false);const before=snapshot();scene.update(1,false);for(const p of pieces)assert.deepEqual(p.scale.toArray(),[1,1,1]);scene.update(.65,false);assert.deepEqual(snapshot(),before);});
