import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as Three from 'three';
import {disposeGraph} from './scenes.js';

const source=await readFile(new URL('./viewer.js',import.meta.url),'utf8');
const threeSource=await readFile(new URL('../../../node_modules/three/src/renderers/WebGLRenderer.js',import.meta.url),'utf8');
const compileSource=threeSource.slice(threeSource.indexOf('this.compileAsync = function'),threeSource.indexOf('// Animation Loop',threeSource.indexOf('this.compileAsync = function')));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

// Run the complete viewer factory and installed Three compileAsync. Only WebGL,
// DOM, model fetching and presentation are replaced; lifecycle code is unmodified.
function harness({fetchScene,compile}={}){
 const events=[],models=[],jobs=[],timers=[],properties=new Map();let scene,renderer;
 function element(){return Object.assign(new EventTarget(),{style:{},append(){},prepend(){},replaceChildren(){events.push('labels-clear');},remove(){events.push('canvas-remove');}});}
 function model(id){
  const group=new Three.Group(),geometry=new Three.BufferGeometry(),material=new Three.MeshBasicMaterial({map:new Three.Texture()});
  for(const [name,resource] of [['geometry',geometry],['material',material],['texture',material.map]])resource.addEventListener('dispose',()=>events.push(`${id}:${name}`));
  material.addEventListener('dispose',()=>properties.delete(material));
  group.add(new Three.Mesh(geometry,material));
  const result={group,update(){},earth:()=>null,proximity:()=>null};models.push(result);return result;
 }
 class Renderer{
  constructor(){renderer=this;this.domElement=element();this.shadowMap={};this.info={render:{},autoReset:true};
   const context=vm.createContext({renderer:this,properties:{get:m=>properties.get(m)||{}},extensions:{get:()=>({})},setTimeout:fn=>timers.push(fn)});
   vm.runInContext(`(function(){${compileSource}}).call(renderer)`,context);
   if(compile)this.compileAsync=compile;
  }
  compile(group){const materials=new Set(),job={ready:false};group.traverse(o=>{if(o.material){materials.add(o.material);properties.set(o.material,{currentProgram:{isReady:()=>job.ready}});}});jobs.push(job);return materials;}
  setPixelRatio(){} setSize(){}
  dispose(){events.push('renderer-dispose');properties.clear();}
  forceContextLoss(){events.push('context-loss');}
 }
 class Scene extends Three.Scene{constructor(){super();scene=this;}}
 class Controls extends Three.EventDispatcher{constructor(){super();this.target=new Three.Vector3();this._quat=new Three.Quaternion();this._quatInverse=new Three.Quaternion();}update(){}dispose(){events.push('controls-dispose');}}
 const layer=element(),host={prepend(){},querySelector:()=>layer,getBoundingClientRect:()=>({width:800,height:600})};
 const context=vm.createContext({
  T:{...Three,WebGLRenderer:Renderer,Scene,PMREMGenerator:class{fromScene(){return {texture:new Three.Texture(),dispose(){events.push('environment-dispose');}};}dispose(){}}},
  OrbitControls:Controls,RoomEnvironment:class{dispose(){}},AbortController,AbortSignal,devicePixelRatio:1,
  matchMedia:()=>Object.assign(new EventTarget(),{matches:false}),document:{hidden:false,createElement:element},
  ResizeObserver:class{observe(){}disconnect(){events.push('observer-disconnect');}},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
  createPresentation:()=>({resize(){},capture(){events.push('capture');},glow(){},dispose(){events.push('presentation-dispose');}}),
  createMissionScene:id=>fetchScene?fetchScene(id,model):Promise.resolve(model(id)),disposeGraph,
  missions:{a:{stages:[{kind:'test'}]},b:{stages:[{kind:'test'}]}},clampProgress:v=>v,isProximity:()=>false,hasEarthContext:()=>false,
  missionShot:()=>({position:[1,2,3],target:[0,0,0],fov:38}),cameraDamping:()=>1
 });
 vm.runInContext(source.replace(/^import .*;\r?\n/gm,'').replace('export function createViewer','function createViewer')+'\nglobalThis.createViewer=createViewer;',context);
 const viewer=context.createViewer(host,{signal:new AbortController().signal,onTick(){},onReady:()=>events.push('ready'),onError:error=>events.push(error)});
 return {viewer,events,models,jobs,scene,renderer,async poll(){const callbacks=timers.splice(0);callbacks.forEach(fn=>fn());await settle();}};
}
const count=(events,name)=>events.filter(e=>e===name).length;
function assertReleased(h,ids){
 for(const name of ['renderer-dispose','context-loss','environment-dispose','controls-dispose','presentation-dispose','observer-disconnect','canvas-remove','labels-clear'])assert.equal(count(h.events,name),1,name);
 for(const id of ids)for(const resource of ['geometry','material','texture'])assert.equal(count(h.events,`${id}:${resource}`),1,`${id}:${resource}`);
 assert.equal(h.events.some(e=>typeof e!=='string'),false);
}

for(const order of [[0,1],[1,0]])test(`disposal waits for both Three compilations, completion order ${order}`,async()=>{
 const h=harness(),first=h.viewer.load('a');await settle();const second=h.viewer.load('b');await settle();
 assert.equal(h.jobs.length,2);h.viewer.dispose();h.viewer.dispose();
 assert.equal(count(h.events,'renderer-dispose'),0);assert.equal(count(h.events,'a:material'),0);
 h.jobs[order[0]].ready=true;await h.poll();assert.equal(count(h.events,'renderer-dispose'),0);
 h.jobs[order[1]].ready=true;await h.poll();await Promise.all([first,second]);
 assertReleased(h,['a','b']);assert.equal(count(h.events,'ready'),0);assert.equal(h.models.some(m=>h.scene.children.includes(m.group)),false);
});

test('pending model is disposed once after viewer removal, without compilation',async()=>{
 const pending=deferred();let make;const h=harness({fetchScene:(_,model)=>{make=model;return pending.promise;}});
 const loading=h.viewer.load('a');h.viewer.dispose();h.viewer.dispose();pending.resolve(make('a'));await loading;await settle();
 assertReleased(h,['a']);assert.equal(h.jobs.length,0);assert.equal(count(h.events,'ready'),0);
});

test('loads after disposal do not fetch or leak another graph',async()=>{
 const h=harness();h.viewer.dispose();await h.viewer.load('a');await settle();
 assert.equal(h.models.length,0);assertReleased(h,[]);
});

test('latest compilation alone attaches a graph and reports ready',async()=>{
 const h=harness(),first=h.viewer.load('a');await settle();const second=h.viewer.load('b');await settle();
 h.jobs[1].ready=true;await h.poll();await second;h.jobs[0].ready=true;await h.poll();await first;
 assert.equal(count(h.events,'ready'),1);assert.equal(h.scene.children.includes(h.models[0].group),false);assert.equal(h.scene.children.includes(h.models[1].group),true);
 h.viewer.dispose();await settle();assertReleased(h,['a','b']);
});

test('overlapping compile failures retain the shared graph for retry and final disposal',async()=>{
 const compilations=[];const h=harness({compile:()=>{const p=deferred();compilations.push(p);return p.promise;}});
 const first=h.viewer.load('a');await settle();const second=h.viewer.load('a');await settle();
 compilations[0].reject(new Error('first compile'));await first;
 const retry=h.viewer.load('a');await settle();compilations[1].reject(new Error('second compile'));await second;
 const final=h.viewer.load('a');await settle();assert.equal(h.models.length,1,'compile errors must not evict owned scene resources');
 h.viewer.dispose();compilations[2].resolve();compilations[3].resolve();await Promise.all([retry,final]);await settle();
 assertReleased(h,['a']);assert.equal(count(h.events,'ready'),0);
});

test('a rejected model fetch can be retried',async()=>{
 let calls=0;const h=harness({fetchScene:(id,model)=>++calls===1?Promise.reject(new Error('fetch failed')):Promise.resolve(model(id))});
 await h.viewer.load('a');assert.equal(h.events.filter(e=>e instanceof Error).length,1);h.events.splice(h.events.findIndex(e=>e instanceof Error),1);
 const retry=h.viewer.load('a');await settle();h.jobs[0].ready=true;await h.poll();await retry;
 assert.equal(calls,2);assert.equal(count(h.events,'ready'),1);h.viewer.dispose();await settle();assertReleased(h,['a']);
});


test('compile rejection after disposal releases resources without reporting an error',async()=>{
 const pending=deferred(),h=harness({compile:()=>pending.promise}),loading=h.viewer.load('a');await settle();
 h.viewer.dispose();pending.reject(new Error('compile failed after removal'));await loading;await settle();
 assertReleased(h,['a']);assert.equal(count(h.events,'ready'),0);
});
