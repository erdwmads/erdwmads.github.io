import test from 'node:test';
import assert from 'node:assert/strict';
import {samplingClearance,phaseLabel,clampProgress} from './motion.js';
import * as motion from './motion.js';
test('SCI projectile does not brake before impact and shares the calibrated second-target layout',()=>{
 assert.equal(typeof motion.sciFlight,'function');
 const flight=[0,.1,.2,.3,.399].map(motion.sciFlight);
 for(let i=1;i<flight.length;i++)assert(flight[i].height<flight[i-1].height);
 const early=(motion.sciFlight(.1).height-motion.sciFlight(.11).height)/.01;
 const late=(motion.sciFlight(.389).height-motion.sciFlight(.399).height)/.01;
 assert(Math.abs(early-late)<1e-8,'free flight must preserve speed');
 assert.equal(motion.sciFlight(.4).height,0);assert.equal(motion.sciFlight(.399).excavation,0);assert(motion.sciFlight(.401).excavation>0);
 assert.equal(motion.sciFlight(.4).visible,false);
 assert(Math.abs(motion.sciLayout.crater[2]/motion.sciLayout.unitsPerMeter-20)<1e-8);
 assert(motion.sciLayout.crater[2]>0,'sampling origin lies north of the crater');
});
test('sampling is reversible, maintains contact and backs away without penetrating',()=>{
 for(let i=0;i<=1000;i++)assert(samplingClearance(i/1000)>=0);
 assert.equal(samplingClearance(.5),0);assert.equal(samplingClearance(.55),0);
 assert(samplingClearance(0)>6);assert(samplingClearance(1)>5);
 const before=samplingClearance(.25);samplingClearance(.9);assert.equal(samplingClearance(.25),before);
});
test('Bennu yields after contact and backs away continuously from its deepest point',()=>{
 assert.equal(samplingClearance(.46,'osiris-rex'),0);
 assert(samplingClearance(.55,'osiris-rex')<-.2);
 assert(samplingClearance(.57,'osiris-rex')<samplingClearance(.50,'osiris-rex'));
 assert(Math.abs(samplingClearance(.57,'osiris-rex')-samplingClearance(.570001,'osiris-rex'))<.0001);
 assert(samplingClearance(1,'osiris-rex')>6);
 const first=samplingClearance(.54,'osiris-rex');samplingClearance(.9,'osiris-rex');assert.equal(samplingClearance(.54,'osiris-rex'),first);
 assert.equal(samplingClearance(.55,'hayabusa2'),0);
});
test('projectile contacts before ejecta and captured grains move upward into the sampler',()=>{
 assert.equal(typeof motion.samplingState,'function');
 const before=motion.samplingState(.509,'hayabusa2'),impact=motion.samplingState(.51,'hayabusa2');
 assert(before.projectileY>.018);assert.equal(before.ejecta,0);
 assert(Math.abs(impact.projectileY-.018)<1e-8);assert.equal(impact.ejecta,0);
 assert(motion.samplingState(.511,'hayabusa2').ejecta>0);
 for(const id of ['hayabusa2','osiris-rex']){
  const seed={a:1,v:1,h:1,s:.012};
  const start=id==='hayabusa2'?.514:.542,end=start+(id==='hayabusa2'?.035:.018);
  const a=motion.collectedGrain(start,id,seed,0),b=motion.collectedGrain(end,id,seed,0);
  assert(a.visible&&b.visible);assert(b.position[1]>a.position[1],'captured grain must rise');
  assert(Math.hypot(b.position[0],b.position[2])<Math.hypot(a.position[0],a.position[2]));
  assert.equal(motion.collectedGrain(.7,id,seed,0).visible,false);
  assert.deepEqual(motion.collectedGrain(start,id,seed,0),a);
 }
});
test('progress clamps and sampling labels distinguish the mission mechanisms',()=>{
 assert.equal(clampProgress(-1),0);assert.equal(clampProgress(2),1);assert.equal(clampProgress(NaN),0);
 assert.match(phaseLabel('sample',.52,'osiris-rex'),/Nitrogen/);
 assert.match(phaseLabel('sample',.52,'hayabusa2'),/Projectile/);
});
