import test from 'node:test';
import assert from 'node:assert/strict';
import {samplingClearance,phaseLabel,clampProgress} from './motion.js';
test('sampling is reversible, maintains contact and backs away without penetrating',()=>{
 for(let i=0;i<=1000;i++)assert(samplingClearance(i/1000)>=0);
 assert.equal(samplingClearance(.5),0);assert.equal(samplingClearance(.55),0);
 assert(samplingClearance(0)>6);assert(samplingClearance(1)>5);
 const before=samplingClearance(.25);samplingClearance(.9);assert.equal(samplingClearance(.25),before);
});
test('progress clamps and sampling labels distinguish the mission mechanisms',()=>{
 assert.equal(clampProgress(-1),0);assert.equal(clampProgress(2),1);assert.equal(clampProgress(NaN),0);
 assert.match(phaseLabel('sample',.52,'osiris-rex'),/Nitrogen/);
 assert.match(phaseLabel('sample',.52,'hayabusa2'),/Projectile/);
});
