import test from 'node:test';
import assert from 'node:assert/strict';
import {studyLocation} from './navigation.js';
import {legacyOriginsDestination} from '../planetary-view-link.js';
test('legacy Origins shares preserve chapter and within-chapter progress',()=>{
  for(const [progress,stage,local] of [[0,0,0],[.125,0,.5],[.25,1,0],[.65,2,.6],[.875,3,.5],[1,3,1]]){
    const destination=legacyOriginsDestination('#observe=1&view=origins&material=ryugu&originProgress='+progress+'&originCutaway=.85');
    assert(destination.startsWith('/origins-study.html#'));assert.deepEqual(studyLocation(destination.slice(destination.indexOf('#'))),{stage,progress:local,paused:true});
  }
});
test('ordinary shares stay in the field guide; invalid study locations use defaults',()=>{
  for(const hash of ['','#observe=1&view=shape&material=bennu','#observe=1&view=origins&originProgress=NaN'])assert.equal(legacyOriginsDestination(hash),null);
  for(const hash of ['','#stage=7&progress=.5','#stage=2&progress=-1','#stage=NaN&progress=.5'])assert.deepEqual(studyLocation(hash),{stage:0,progress:.08,paused:false});
});
