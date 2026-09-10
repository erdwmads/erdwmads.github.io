import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {missions} from './data.js';import {sampleTrack} from './proximity.js';
const tracks=JSON.parse(readFileSync(new URL('../../../public/assets/data/missions/ephemeris.json',import.meta.url)));
test('Earth flyby is a distinct chapter between solar cruise and outbound transfer',()=>{for(const m of Object.values(missions)){const i=m.stages.findIndex(s=>s.id==='flyby');assert.equal(m.stages[i].kind,'flyby');assert.equal(m.stages[i-1].kind,'cruise');assert.equal(m.stages[i+1].kind,'outbound');}});
for(const id of ['hayabusa2','osiris-rex'])test(id+' source flyby approaches Earth once and departs without impact',()=>{
 const t=tracks[id].earthFlyby,range=p=>Math.hypot(...sampleTrack(t,p).position),start=sampleTrack(t,0),end=sampleTrack(t,1);let min=Infinity,index=-1;
 for(let i=0;i<=1000;i++){const r=range(i/1000);assert(r>6371);if(r<min){min=r;index=i;}}
 assert(index>0&&index<1000);assert(min<range(0)/3&&min<range(1)/3);assert(start.position.reduce((n,v,i)=>n+v*start.velocity[i],0)<0);assert(end.position.reduce((n,v,i)=>n+v*end.velocity[i],0)>0);assert.match(t.source,/nasa.gov/);assert(['mission-navigation','reconstructed','mission-prediction'].includes(t.dataKind));
});
test('playback does not interpolate across source solution discontinuities',()=>{for(const id of ['hayabusa2','osiris-rex'])for(const kind of ['rendezvous','depart','earthFlyby']){const t=tracks[id][kind],s=t.samples.slice(t.playbackStartIndex||0);assert(s.length>1);assert(!s.slice(1).some(p=>p.breakBefore));for(const p of [0,.1,.5,.9,1])assert([...sampleTrack({...t,samples:s},p).position,...sampleTrack({...t,samples:s},p).velocity].every(Number.isFinite));}});
