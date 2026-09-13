import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {missions} from './data.js';
import * as story from './story.js';
const loader=await readFile(new URL('./loader.js',import.meta.url),'utf8');
function fixture(){
 const panels=Object.values(missions).map(m=>({dataset:{missionStoryPanel:m.id},hidden:false,buttons:m.stages.map((_,i)=>({dataset:{missionStage:String(i)},attributes:new Map(),setAttribute(k,v){this.attributes.set(k,v);},removeAttribute(k){this.attributes.delete(k);}})),querySelectorAll(){return this.buttons;}}));
 const name={},phase={};
 return {panels,name,phase,root:{querySelectorAll:()=>panels,querySelector:s=>s==='[data-mission-story-name]'?name:phase}};
}
test('each mission overview preserves all chapters in order across three phases',()=>{
 assert.equal(typeof story.missionStory,'function');
 for(const mission of Object.values(missions)){
  const groups=story.missionStory(mission);
  assert.deepEqual(groups.map(g=>g.title),['Earth to asteroid','At the asteroid','Return to Earth']);
  assert.deepEqual(groups.flatMap(g=>g.chapters.map(c=>c.stage)),mission.stages);
  assert.deepEqual(groups.flatMap(g=>g.chapters.map(c=>c.index)),mission.stages.map((_,i)=>i));
  assert.deepEqual(groups[0].chapters.map(c=>c.stage.kind),['launch','cruise','flyby','outbound']);
  assert.deepEqual(groups[2].chapters.map(c=>c.stage.kind),['depart','return','landing']);
 }
});
test('switching mission replaces overview visibility and clears the previous current chapter',()=>{
 assert.equal(typeof story.updateStory,'function');
 const f=fixture();story.updateStory(f.root,missions.hayabusa2,6);
 assert.deepEqual(f.panels.map(p=>p.hidden),[false,true]);assert.equal(f.phase.textContent,'At the asteroid');
 assert.equal(f.panels[0].buttons[6].attributes.get('aria-current'),'step');
 story.updateStory(f.root,missions['osiris-rex'],8);
 assert.deepEqual(f.panels.map(p=>p.hidden),[true,false]);assert.equal(f.name.textContent,'OSIRIS-REx');assert.equal(f.phase.textContent,'Return to Earth');
 assert.ok(f.panels[0].buttons.every(b=>!b.attributes.has('aria-current')));
 assert.deepEqual(f.panels[1].buttons.filter(b=>b.attributes.has('aria-current')).map(b=>b.dataset.missionStage),['8']);
});
test('overview chapter selection uses the existing paused loader path before and after 3D loads',()=>{
 assert.equal(typeof story.updateStory,'function');
 const f=fixture(),calls=[];
 const c=vm.createContext({mission:'hayabusa2',stage:0,progress:.6,playing:true,pending:{},ready:false,missions,
  clearShare:()=>calls.push('clear-share'),clampProgress:p=>Math.max(0,Math.min(1,p)),
  chapterUI:()=>story.updateStory(f.root,missions[c.mission],c.stage),controlsUI(){},animateChapter(){},remember:()=>calls.push('remember'),
  viewer:{play:v=>calls.push(['play',v]),select:(i,p)=>calls.push(['select',i,p])}});
 vm.runInContext(loader.slice(loader.indexOf(' function select(index,p=0){'),loader.indexOf(' function setProgress(p)')),c);
 c.select(9);assert.equal(c.playing,false);assert.equal(c.progress,0);assert.equal(c.pending,null);assert.equal(f.phase.textContent,'Return to Earth');assert.deepEqual(calls,['clear-share','remember']);
 c.ready=true;c.playing=true;c.select(2);assert.equal(c.playing,false);assert.equal(f.phase.textContent,'Earth to asteroid');assert.deepEqual(calls.slice(-4),['clear-share',['play',false],['select',2,0],'remember']);
});
test('overview remains server-rendered and shares loader selection and lifecycle',async()=>{
 const component=await readFile(new URL('../../components/SampleMissions.astro',import.meta.url),'utf8');
 assert.match(component,/<details class="mission-story">/);
 assert.match(component,/Object\.values\(missions\)\.map\(mission=>/);
 assert.match(component,/data-mission-story-panel=\{mission.id\}/);
 assert.match(component,/data-mission-stage=\{index\}/);
 assert.match(loader,/updateStory\(root,m,stage\)/);
 assert.equal((loader.match(/root.addEventListener\('click'/g)||[]).length,1);
});
