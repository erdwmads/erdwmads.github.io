import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {missions} from './data.js';
import {validateView,viewFromViewer,parseViewHash,viewURL,readSession,writeSession,restoreView} from './view-state.js';
const source=await readFile(new URL('./loader.js',import.meta.url),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const ready=source.match(/onReady:\(\)=>\{(.*?)\},\n    onError/)[1];
const first={mission:'hayabusa2',stage:4,progress:.43,playing:false,reference:'earth',context:'detail',focus:'spacecraft',cutaway:false};
function harness(){
 const nodes=new Map(),events=[];let stored;
 const c=vm.createContext({shareVersion:0,mission:'hayabusa2',stage:4,progress:.43,playing:false,pending:null,ready:true,disposed:false,visible:true,missions,
  saved:{active:'hayabusa2',views:{}},storage:{getItem:()=>stored,setItem:(_,v)=>stored=v},
  viewFromViewer,parseViewHash,viewURL,writeSession,restoreView,location:{href:'https://example.com/research/',hash:''},document:{hidden:false},
  action:n=>{if(!nodes.has(n))nodes.set(n,{});return nodes.get(n);},el:n=>{if(!nodes.has(n))nodes.set(n,{hidden:true,focus(){events.push('focus');},select(){events.push('select-link');}});return nodes.get(n);},
  chapterUI(){},controlsUI(){},missionUI(){},busy(value){c.ready=!value;},start(){},
  viewer:{state:{...first},async load(id){events.push(['load',id]);},play(v){events.push(['play',v]);this.state.playing=v;},select(stage,progress){this.state={...this.state,mission:c.mission,stage,progress,reference:'earth',focus:'both',context:'detail',cutaway:false};},action(v){if(v.startsWith('frame-'))this.state.reference=v.slice(6);else if(['both','spacecraft','asteroid'].includes(v))this.state.focus=v;else if(v==='cutaway')this.state.cutaway=!this.state.cutaway;else this.state.context=v;},visible(){}},
  navigator:{clipboard:{writeText:async()=>{throw Error('denied');}}}
 });
 vm.runInContext(section(' function remember(){',' const action=n=>')+section(' async function choose(id,view){'," window.addEventListener('hashchange'")+`;globalThis.onReady=()=>{${ready}};`,c);
 return {c,nodes,events,get stored(){return stored;}};
}
test('switching missions retains each position and applies it only after loading',async()=>{
 const {c,events}=harness();const second=validateView({mission:'osiris-rex',chapter:'flyby',progress:.72,reference:'sun'});c.saved.views['osiris-rex']=second;
 await c.choose('osiris-rex');assert.equal(c.ready,false);assert.equal(c.progress,.72);assert.equal(c.saved.views.hayabusa2.progress,.43);assert.deepEqual(events,[['load','osiris-rex']]);
 c.onReady();assert.equal(c.viewer.state.progress,.72);assert.equal(c.viewer.state.reference,'sun');assert.equal(c.viewer.state.playing,false);
 await c.choose('hayabusa2');assert.equal(c.progress,.43);c.onReady();assert.equal(c.viewer.state.stage,4);assert.equal(c.viewer.state.progress,.43);
});
test('saved session can restore position after the loader is re-entered',()=>{
 const h=harness();h.c.remember();const saved=readSession({getItem:()=>h.stored});
 assert.equal(saved.active,'hayabusa2');assert.equal(saved.views.hayabusa2.progress,.43);assert.equal(saved.views.hayabusa2.chapter,missions.hayabusa2.stages[4].id);
});
test('same-document link restores paused and planetary hash is ignored',()=>{
 const {c}=harness();c.location.hash=new URL(viewURL(c.location.href,{mission:'hayabusa2',chapter:'flyby',progress:.33,reference:'sun'})).hash;
 c.restoreHash();assert.equal(c.viewer.state.progress,.33);assert.equal(c.viewer.state.playing,false);assert.equal(c.viewer.state.reference,'sun');
 c.location.hash='#observe=1&view=sample&material=ryugu';c.restoreHash();assert.equal(c.viewer.state.progress,.33);
});
test('clipboard rejection reveals and selects an accessible manual-copy link',async()=>{
 const {c,nodes,events}=harness();await c.copyView();
 assert.equal(nodes.get('share-manual').hidden,false);assert.equal(parseViewHash(new URL(nodes.get('share-url').value).hash).progress,.43);
 assert.deepEqual(events,['focus','select-link']);assert.match(nodes.get('share-status').textContent,/Select and copy/);assert.equal(nodes.get('copy').disabled,false);
});

test('a superseded copy request cannot publish or focus an old mission link',async()=>{
 const {c,nodes,events}=harness();let reject;
 c.navigator.clipboard.writeText=()=>new Promise((_,r)=>reject=r);
 const pending=c.copyView();await c.choose('osiris-rex');reject(new Error('denied'));await pending;
 assert.equal(nodes.get('share-manual').hidden,true);assert.equal(nodes.get('share-status').textContent,'');
 assert.ok(!events.includes('focus'));assert.ok(!events.includes('select-link'));
});
