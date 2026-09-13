import test from 'node:test';
import assert from 'node:assert/strict';
import {createPorousMedium,localAlteration} from './porous-medium.js';
test('fine ice is distributed across all regions without a dominant chamber',()=>{
 const m=createPorousMedium();assert.ok(m.grains.length>1000);assert.ok(m.sites.filter(s=>s.ice>0).length>300);
 const quadrants=[0,0,0,0];for(const s of m.sites){assert.ok(s.radius<.045);if(s.ice)quadrants[(s.x>0?1:0)+(s.y>0?2:0)]++;}
 assert.ok(quadrants.every(n=>n>60));assert.ok(Math.max(...m.sites.map(s=>s.radius))<m.width/70);
 assert.deepEqual(createPorousMedium(),m,'same seed returns the same specimen');
});
test('water arrives through neighboring pores before mineral growth',()=>{
 const m=createPorousMedium();for(const s of m.sites){
  assert.equal(localAlteration(s,0).crystal,0);assert.equal(localAlteration(s,0).water,0);
  for(let t=0;t<=1;t+=.025){const q=localAlteration(s,t);assert.ok(Object.values(q).every(v=>v>=0&&v<=1));if(q.crystal>0)assert.ok(q.melt>0||!s.ice);}
  assert.equal(localAlteration(s,1).ice,0);assert.ok(localAlteration(s,1).crystal>.9);
 }
 assert.ok(m.links.every(l=>Math.hypot(m.sites[l.a].x-m.sites[l.b].x,m.sites[l.a].y-m.sites[l.b].y)<.25));
 const arrivals=m.sites.map(s=>s.arrival);assert.ok(Math.max(...arrivals)-Math.min(...arrivals)>.12);
});
test('scrubbing is reversible and local ice melting is monotonic',()=>{
 const m=createPorousMedium();for(const s of m.sites.slice(0,100)){
  const before=localAlteration(s,.38);localAlteration(s,.9);assert.deepEqual(localAlteration(s,.38),before);
  assert.ok(localAlteration(s,.2).ice>=localAlteration(s,.4).ice);
  assert.ok(localAlteration(s,.5).crystal<=localAlteration(s,.8).crystal);
 }
});
