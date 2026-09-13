import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {PerspectiveCamera} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const source=await readFile(new URL('../src/scripts/origins-study/main.js',import.meta.url),'utf8');
const start=source.indexOf("  on(canvas,'keydown',"),end=source.indexOf('  const ambient=',start);
assert.ok(start>=0&&end>start,'Locate the canvas keyboard listener');
const handlerSource=source.slice(start,end);
const listenerSource=source.match(/  const on=.+;/)[0];
function fixture(){
  const canvas=new EventTarget(),abort=new AbortController(),camera=new PerspectiveCamera(42,1,.04,100);
  camera.position.set(4,3,8);
  const controls=new OrbitControls(camera);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.88;
  const state={canvas,controls,abort,root:{dataset:{renderState:'ready'}},disposed:false,contextLost:false,manualCamera:false,playing:false,dirty:false,requests:0};
  controls.addEventListener('change',()=>state.dirty=true);
  state.setPlaying=value=>state.playing=value;state.setExploring=()=>{};state.$=()=>({focus(){}});state.requestFrame=()=>state.requests++;
  vm.runInNewContext(listenerSource+handlerSource,state);
  const press=(key,options={})=>{const event=new Event('keydown',{cancelable:true});Object.assign(event,{key,code:key===' '?'Space':key,...options});canvas.dispatchEvent(event);return event;};
  return{camera,controls,state,press,abort};
}
for(const [key,axis,sign] of [['ArrowLeft','azimuth',-1],['ArrowRight','azimuth',1],['ArrowUp','polar',-1],['ArrowDown','polar',1]]){
  test(`${key} orbits the camera and schedules a redraw without changing playback`,()=>{
    const {camera,controls,state,press}=fixture();
    const angle=()=>axis==='azimuth'?controls.getAzimuthalAngle():controls.getPolarAngle(),before=angle(),position=camera.position.clone();
    const event=press(key);for(let i=0;i<100;i++)controls.update();
    assert.ok((angle()-before)*sign>0,'Camera moves in the requested direction');
    assert.ok(camera.position.distanceTo(position)>.05,'Camera actually changes');
    assert.equal(event.defaultPrevented,true);assert.equal(state.manualCamera,true);assert.equal(state.dirty,true);assert.equal(state.requests,1);assert.equal(state.playing,false);
  });
}
test('unrelated keys and browser shortcuts keep their default behavior',()=>{
  for(const [key,options] of [['Tab',{}],['a',{}],['ArrowLeft',{altKey:true}],['ArrowUp',{ctrlKey:true}],['ArrowDown',{metaKey:true}]]){
    const {camera,state,press}=fixture(),before=camera.position.clone();
    assert.equal(press(key,options).defaultPrevented,false);assert.ok(camera.position.equals(before));assert.equal(state.manualCamera,false);
  }
});
test('keyboard rotation stays available when coarse pointer exploration is inactive',()=>{
  const {camera,controls,press}=fixture(),before=camera.position.clone();controls.enabled=false;
  press('ArrowLeft');assert.ok(camera.position.distanceTo(before)>0);
});
test('loading, lost context and disposed visits ignore camera keys',()=>{
  for(const mode of ['loading','contextLost','disposed']){
    const {camera,state,press}=fixture(),before=camera.position.clone();
    if(mode==='loading')state.root.dataset.renderState='loading';else state[mode]=true;
    assert.equal(press('ArrowLeft').defaultPrevented,false);assert.ok(camera.position.equals(before));
  }
});
test('cleanup removes the keyboard listener',()=>{
  const {camera,press,abort}=fixture(),before=camera.position.clone();abort.abort();
  assert.equal(press('ArrowLeft').defaultPrevented,false);assert.ok(camera.position.equals(before));
});
test('Space retains playback toggle',()=>{
  const {state,press}=fixture();assert.equal(press(' ').defaultPrevented,true);assert.equal(state.playing,true);
  press(' ');assert.equal(state.playing,false);
});
test('canvas instructions expose its keyboard controls',async()=>{
  const page=await readFile(new URL('../src/pages/origins-study.astro',import.meta.url),'utf8');
  assert.match(page,/<canvas[^>]+aria-describedby="scene-hint"/);
  assert.match(page,/id="scene-hint"[^>]*>[^<]*Arrow keys[^<]*Space/);
});
