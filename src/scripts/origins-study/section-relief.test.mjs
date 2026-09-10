import {buildSectionGeometry} from './section-geometry.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {alteration} from './scenes.js';
test('the exposed section breaks up the flat cutting plane with geometric relief',()=>{
 const {group}=alteration(buildSectionGeometry()),g=group.getObjectByName('alteration-matrix').geometry,p=g.attributes.position,n=g.attributes.normal;
 let front=0,planar=0;
 for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getY(i))<1.2&&p.getZ(i)>.10&&p.getZ(i)<.18&&n.getZ(i)>.95){front++;if(Math.abs(p.getZ(i)-.14)<.00001)planar++;}
 assert(front>30,'Cut face needs enough geometry to resolve rock relief');
 assert(planar/front<.8,`Cut face still has ${(100*planar/front).toFixed(1)}% exactly planar vertices`);
});
