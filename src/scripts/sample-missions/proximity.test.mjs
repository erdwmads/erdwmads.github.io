import test from 'node:test';import assert from 'node:assert/strict';
import * as physics from './proximity.js';
test('published spacecraft and asteroid spans share one physical scale',()=>{
 for(const [id,span,diameter] of [['hayabusa2',6,900],['osiris-rex',6.2,500]]){const m=physics.physicalSizes[id];assert.equal(m.spanM,span);assert.equal(m.diameterM,diameter);for(const native of [1,4.2,26])assert(Math.abs(native*physics.physicalScale(native,span)-span/1000)<1e-12);assert(m.spanM/m.diameterM<.013);}
});
test('ephemeris interpolation follows position and velocity at both ends',()=>{
 const track={samples:[{time:'2021-01-01T00:00:00Z',position:[0,0,0],velocity:[1,0,0]},{time:'2021-01-01T00:00:10Z',position:[10,0,0],velocity:[1,0,0]}]};
 for(const p of [0,.1,.5,.9,1]){const state=physics.sampleTrack(track,p);assert(Math.abs(state.position[0]-p*10)<1e-10);assert(Math.abs(state.velocity[0]-1)<1e-10);}
});

test('displayed UTC matches the interpolated instant across source intervals',()=>{
 const samples=[0,300,600].map(seconds=>({time:new Date(Date.UTC(2021,0,1)+seconds*1000).toISOString(),position:[seconds,0,0],velocity:[1,0,0]}));
 for(const [p,seconds] of [[0,0],[.25,150],[.5,300],[.75,450],[1,600]])assert.equal(physics.sampleTrack({samples},p).time,new Date(Date.UTC(2021,0,1)+seconds*1000).toISOString());
 const before=Date.parse(physics.sampleTrack({samples},.5-1e-6).time),after=Date.parse(physics.sampleTrack({samples},.5+1e-6).time);assert(after-before<3,'no five-minute jump at a knot');
});

test('close-up zoom remains in the selected physical scale',()=>{
 const state={position:[20,0,0],center:[10,0,0],extent:200,diameterKm:.9,spanKm:.006,kind:'rendezvous'};
 const craft=physics.proximityShot(state,'spacecraft'),body=physics.proximityShot(state,'asteroid');
 assert(craft.maxDistance<=state.spanKm*20,'a spacecraft close-up cannot zoom from metres into a kilometre-scale trajectory');
 assert(body.maxDistance<=state.diameterKm*10,'asteroid inspection remains near the asteroid');
 assert(craft.maxDistance<craft.far,'scene visibility and interaction limits serve different purposes');
});
