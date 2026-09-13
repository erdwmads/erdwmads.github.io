import test from 'node:test';
import assert from 'node:assert/strict';
import {missions} from './data.js';
import {validateView,viewFromViewer,parseViewHash,viewURL,readSession,writeSession,restoreView} from './view-state.js';
const view={mission:'hayabusa2',chapter:'flyby',progress:.375,reference:'sun',focus:'spacecraft',context:'detail',cutaway:false};
test('mission view round trips stable chapter and framing without playback or camera',()=>{
 const url=viewURL('https://example.com/research/?lang=en#observe=1&view=sample', {...view,playing:true,camera:{position:[1,2,3]}});
 assert.deepEqual(parseViewHash(new URL(url).hash),view);
 assert.equal(new URL(url).search,'?lang=en');
 assert.ok(!url.includes('camera')&&!url.includes('playing')&&!url.includes('observe'));
});
test('invalid and planetary hashes are ignored safely',()=>{
 for(const hash of ['#observe=1&view=sample','#mission-view=2&mission=hayabusa2&chapter=flyby','#mission-view=1&mission=__proto__&chapter=flyby','#mission-view=1&mission=hayabusa2&chapter=missing','#mission-view=1&mission=hayabusa2&chapter=flyby&progress=NaN','#mission-view=1&mission=hayabusa2&chapter=flyby&progress=2','#mission-view=1&mission=hayabusa2&chapter=flyby&cutaway=yes','#mission-view=1&observe=1&mission=hayabusa2&chapter=flyby','#mission-view=1&mission=hayabusa2&mission=osiris-rex&chapter=flyby'])assert.equal(parseViewHash(hash),null,hash);
});
test('validation rejects invalid types and normalizes chapter-specific controls',()=>{
 for(const progress of [NaN,Infinity,-1,2,'0.2',null])assert.equal(validateView({...view,progress}),null);
 assert.equal(validateView({...view,reference:'mars'}),null);
 const launch=validateView({...view,chapter:'launch',cutaway:true});
 assert.equal(launch.reference,'earth');assert.equal(launch.focus,'both');assert.equal(launch.cutaway,false);
 assert.equal(validateView({...view,mission:'constructor'}),null);
});
test('viewer snapshots map stage indexes to stable IDs and omit transient state',()=>{
 const stage=missions.hayabusa2.stages.findIndex(s=>s.id==='flyby');
 assert.deepEqual(viewFromViewer({...view,stage,playing:true,camera:{}}),view);
 assert.equal(viewFromViewer({...view,stage:999}),null);
});
test('session preserves independent mission positions and ignores corrupt storage',()=>{
 let value;const storage={getItem:()=>value,setItem:(_,v)=>value=v};
 const other=validateView({...view,mission:'osiris-rex',chapter:'launch',progress:.81});
 writeSession(storage,{active:other.mission,views:{hayabusa2:view,'osiris-rex':other}});
 assert.deepEqual(readSession(storage),{active:other.mission,views:{hayabusa2:view,'osiris-rex':other}});
 value='{bad';assert.deepEqual(readSession(storage),{active:'hayabusa2',views:{}});
 assert.doesNotThrow(()=>writeSession({setItem(){throw Error('denied');}},{active:'hayabusa2',views:{hayabusa2:view}}));
 assert.deepEqual(readSession({getItem(){throw Error('denied');}}),{active:'hayabusa2',views:{}});
});
test('restoration pauses before selecting and applies frame before focus',()=>{
 const calls=[];const viewer={state:{cutaway:false},play:v=>calls.push(['play',v]),select:(...v)=>calls.push(['select',...v]),action:v=>calls.push(['action',v])};
 assert.equal(restoreView(viewer,view),true);
 assert.deepEqual(calls,[['play',false],['select',missions.hayabusa2.stages.findIndex(s=>s.id==='flyby'),.375],['action','frame-sun'],['action','spacecraft']]);
 calls.length=0;assert.equal(restoreView(viewer,{...view,chapter:'missing'}),false);assert.deepEqual(calls,[]);
});
