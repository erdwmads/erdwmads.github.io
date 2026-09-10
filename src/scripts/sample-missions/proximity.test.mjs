import test from 'node:test';import assert from 'node:assert/strict';
import * as physics from './proximity.js';
test('published spacecraft and asteroid spans share one physical scale',()=>{
 for(const [id,span,diameter] of [['hayabusa2',6,900],['osiris-rex',6.2,500]]){const m=physics.physicalSizes[id];assert.equal(m.spanM,span);assert.equal(m.diameterM,diameter);for(const native of [1,4.2,26])assert(Math.abs(native*physics.physicalScale(native,span)-span/1000)<1e-12);assert(m.spanM/m.diameterM<.013);}
});
test('ephemeris interpolation follows position and velocity at both ends',()=>{
 const track={samples:[{time:'2021-01-01T00:00:00Z',position:[0,0,0],velocity:[1,0,0]},{time:'2021-01-01T00:00:10Z',position:[10,0,0],velocity:[1,0,0]}]};
 for(const p of [0,.1,.5,.9,1]){const state=physics.sampleTrack(track,p);assert(Math.abs(state.position[0]-p*10)<1e-10);assert(Math.abs(state.velocity[0]-1)<1e-10);}
});
