import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {PerspectiveCamera} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const source=await readFile(new URL('../src/scripts/origins-study/main.js',import.meta.url),'utf8');
const between=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,`Locate ${start}`);return source.slice(a,b);};
function fixture(){
  const callbacks=new Map(),camera=new PerspectiveCamera(42,1,.04,100),document=new EventTarget(),canvas=new EventTarget();
  camera.position.set(4,3,8);
  const controls=new OrbitControls(camera);controls.enableDamping=true;controls.dampingFactor=.09;
  let id=0,now=1000,renders=0;
  const element={setAttribute(){},querySelectorAll(){return [];},style:{setProperty(){}}};
  const state={controls,camera,canvas,document,root:{dataset:{renderState:'ready'},style:element.style},viewport:{clientWidth:800,clientHeight:600},
    disposed:false,visible:true,contextLost:false,frameId:0,dirty:true,playing:false,progress:.2,phase:false,stage:0,hold:0,last:now,manualCamera:false,
    requestAnimationFrame:fn=>{callbacks.set(++id,fn);return id;},cancelAnimationFrame:key=>callbacks.delete(key),performance:{now:()=>now},
    renderer:{info:{reset(){}},setSize(){}},composer:{render(){renders++;},setSize(){}},ao:{},syncOcclusionCamera(){},
    reducedMotion:new EventTarget(),chapterMotionNodes:[],clearDissolve(){},scenes:[{update(){},moment:()=>''}],$:()=>element,icon(){},resetCamera(){},setExploring(){},
    on:(target,event,listener)=>target.addEventListener(event,listener)};
  document.hidden=false;
  vm.createContext(state);
  vm.runInContext(between('  function sync(){','  function setPhase(')+between('  function resize(){','  function showStage(')+
    between("  controls.addEventListener('change',",'  const scenes=')+
    between("  on(reducedMotion,'change',",'  function animateChapter(')+
    between("  on(document,'visibilitychange',","  on(canvas,'webglcontextlost',")+
    between("  on(canvas,'keydown',",'  const ambient=')+
    between('    function frame(now){','  }catch(error)'),state);
  function tick(elapsed=16){assert.ok(callbacks.size,'A frame is scheduled');now+=elapsed;const batch=[...callbacks];callbacks.clear();for(const [,fn] of batch)fn(now);}
  function settle(){for(let i=0;callbacks.size&&i<250;i++)tick();assert.equal(callbacks.size,0,'Paused, settled scene must leave no pending RAF');}
  return{state,camera,controls,document,canvas,callbacks,tick,settle,get renders(){return renders;}};
}

test('a visible paused scene becomes idle after its initial render',()=>{
  const f=fixture();f.settle();assert.equal(f.renders,1);
});

test('control damping wakes a paused scene, animates, and settles back to idle',()=>{
  const f=fixture();f.settle();const before=f.camera.position.clone(),renders=f.renders;
  f.controls.rotateLeft(Math.PI/12);assert.equal(f.callbacks.size,1);f.tick();const first=f.camera.position.clone();f.settle();
  assert.ok(first.distanceTo(before)>.01);assert.ok(f.camera.position.distanceTo(first)>.01);assert.ok(f.renders>renders+1);
});

test('paused progress and material updates each wake rendering once',()=>{
  const f=fixture();f.settle();
  for(const change of [()=>f.state.progress=.8,()=>f.state.phase=true]){
    const before=f.renders;change();f.state.sync();assert.equal(f.callbacks.size,1);f.settle();assert.equal(f.renders,before+1);
  }
});

test('playback restarts from idle and pausing returns to idle',()=>{
  const f=fixture();f.settle();const before=f.state.progress;f.state.setPlaying(true);
  f.tick();f.tick();assert.ok(f.state.progress>before);assert.equal(f.callbacks.size,1);
  f.state.setPlaying(false);f.settle();
});

test('resize redraws a paused scene even when its camera position is unchanged',()=>{
  const f=fixture();f.settle();const before=f.renders;f.state.resize();assert.equal(f.callbacks.size,1);f.settle();assert.equal(f.renders,before+1);
});

test('keyboard rotation wakes an idle scene and retains damping',()=>{
  const f=fixture();f.settle();const before=f.camera.position.clone(),event=new Event('keydown',{cancelable:true});
  Object.assign(event,{key:'ArrowLeft',code:'ArrowLeft'});f.canvas.dispatchEvent(event);f.settle();
  assert.ok(f.camera.position.distanceTo(before)>.01);assert.equal(event.defaultPrevented,true);assert.equal(f.state.playing,false);
});

test('hidden documents cancel playback frames and showing them resumes playback',()=>{
  const f=fixture();f.settle();f.state.setPlaying(true);f.tick();f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.callbacks.size,0);f.state.sync();assert.equal(f.callbacks.size,0);
  f.document.hidden=false;f.document.dispatchEvent(new Event('visibilitychange'));f.tick();assert.equal(f.callbacks.size,1);
  f.state.setPlaying(false);f.settle();
});

test('offscreen, disposed and context-lost scenes reject wake requests',()=>{
  for(const property of ['visible','disposed','contextLost']){
    const f=fixture();f.settle();f.state[property]=property!=='visible';f.state.sync();f.state.setPlaying(true);assert.equal(f.callbacks.size,0);
  }
});

test('switching to reduced motion pauses playback and lets the scheduler go idle',()=>{
  const f=fixture();f.settle();f.state.setPlaying(true);f.tick();
  f.state.reducedMotion.matches=true;f.state.reducedMotion.dispatchEvent(new Event('change'));
  assert.equal(f.state.playing,false);f.settle();
});

test('completed playback stops scheduling after the closing hold',()=>{
  const f=fixture();f.settle();f.state.progress=1;f.state.setPlaying(true);f.settle();
  assert.equal(f.state.playing,false);assert.equal(f.state.progress,1);
});

test('low frame rate does not slow the chapter clock',()=>{
 const f=fixture();f.settle();f.state.setPlaying(true);const start=f.state.progress;
 for(let i=0;i<16;i++)f.tick(200);
 assert.ok(Math.abs(f.state.progress-start-.1)<1e-8,'3.2 visible seconds advances 10% of the 32-second disk chapter');
});
