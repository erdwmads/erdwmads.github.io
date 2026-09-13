import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {descriptions} from '../src/scripts/origins-study/descriptions.js';
import {studyLocation} from '../src/scripts/origins-study/navigation.js';

class Element extends EventTarget {
  constructor(stage){super();this.dataset=stage===undefined?{}:{stage:String(stage)};this.attrs=new Map();this.hidden=false;this.disabled=false;this.textContent='';this.innerHTML='';}
  setAttribute(name,value){this.attrs.set(name,value);}
  removeAttribute(name){this.attrs.delete(name);}
  getAttribute(name){return this.attrs.get(name);}
  click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
}
function fixture(){
  const nodes=new Map(['sources','evidence','retry-scene','eyebrow','title','description','scale','environment','scene-counter','legend','material-note','loading','moment','play','progress'].map(id=>['#'+id,new Element()]));
  const close=new Element();nodes.get('#sources').querySelector=()=>close;
  const chapters=descriptions.map((_,index)=>new Element(index));
  const controls=[nodes.get('#play'),nodes.get('#progress')];
  const root={dataset:{},isConnected:true,querySelector:selector=>nodes.get(selector),querySelectorAll:selector=>selector==='[data-stage]'?chapters:selector.includes('[data-stage]')?[...controls,...chapters]:controls};
  return{root,nodes,chapters,controls};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function loaderFixture(failure='import'){
  const f=fixture(),document=new EventTarget(),window=new EventTarget();document.querySelector=()=>f.root;document.readyState='complete';
  const mounts=[],reloads=[];let attempts=0,initFailed=false;
  const source=await readFile(new URL('../src/scripts/origins-study/loader.js',import.meta.url),'utf8');
  const transformed=source.replace(/^import .+;\r?\n/gm,'').replace("import('./main.js')","loadMain()");
  const bindings={...f,descriptions,studyLocation,document,window,location:{href:'https://example.com/origins-study.html#stage=2&progress=0.6',hash:'#stage=2&progress=0.6',reload(){reloads.push(bindings.location.href);}},history:{state:{},replaceState(state,unused,href){this.state=state;bindings.location.href=href;}},scrollY:640,URL,URLSearchParams,AbortController,console:{error(){}},loadMain:async()=>{attempts++;if(attempts===1&&failure==='import')throw Error('network unavailable');return{mountStudy(root,reader){if(!initFailed&&failure==='init'){initFailed=true;throw Error('graphics unavailable');}mounts.push({recovery:reader.state,reader});return()=>{};}};}};
  if(source.includes('createChapterReader'))bindings.createChapterReader=(await import('../src/scripts/origins-study/chapter-reader.js')).createChapterReader;
  vm.runInNewContext(transformed,bindings);await tick();return{...f,window,mounts,reloads};
}
test('failed 3D import leaves all four chapters readable, with legend and selection',async()=>{
  const {root,nodes,chapters,controls}=await loaderFixture();
  assert.equal(root.dataset.renderState,'error');
  for(let index=0;index<4;index++){
    assert.equal(chapters[index].disabled,false,'chapter navigation is independent of graphics');chapters[index].click();
    assert.equal(nodes.get('#title').textContent,descriptions[index].title);
    assert.equal(nodes.get('#description').textContent,descriptions[index].description);
    assert.equal(nodes.get('#scene-counter').textContent,`0${index+1} / 04`);
    assert.equal(chapters[index].getAttribute('aria-current'),'step');
    assert.equal(chapters.filter(b=>b.getAttribute('aria-current')==='step').length,1);
    assert.equal(nodes.get('#legend').hidden,false);
    for(const [,label] of descriptions[index].legend)assert.ok(nodes.get('#legend').innerHTML.includes(label));
  }
  assert.ok(controls.every(control=>control.disabled));
});
test('retry retains the chapter chosen after failure and old handlers are removed',async()=>{
  const {nodes,chapters,mounts}=await loaderFixture('init');chapters[3].click();nodes.get('#retry-scene').click();await tick();
  assert.equal(mounts.length,1);assert.equal(mounts[0].recovery.stage,3);assert.equal(nodes.get('#title').textContent,descriptions[3].title);
  let selected=0;mounts[0].reader.connect(()=>selected++);chapters[1].click();assert.equal(selected,1);
});
test('reader detaches failed graphics and keeps the latest stage through recovery',async()=>{
  const {createChapterReader}=await import('../src/scripts/origins-study/chapter-reader.js');
  const {root,nodes,chapters}=fixture(),abort=new AbortController();
  const reader=createChapterReader(root,{stage:0,progress:.08},abort.signal);let draws=0;
  reader.connect(()=>draws++);chapters[1].click();assert.equal(draws,1);
  reader.fallback({stage:1,progress:.62,phase:true});chapters[3].click();
  assert.equal(draws,1);assert.equal(reader.state.stage,3);assert.equal(reader.state.progress,.05);assert.equal(nodes.get('#legend').hidden,false);
  reader.connect(()=>draws++);chapters[2].click();assert.equal(draws,2);
  abort.abort();chapters[0].click();assert.equal(draws,2);assert.equal(reader.state.stage,2);
});

test('initialization exceptions retain a working reader after the scene is disposed',async()=>{
  const {createChapterReader}=await import('../src/scripts/origins-study/chapter-reader.js');
  const {root,nodes,chapters}=fixture(),reader=createChapterReader(root,{stage:2,progress:.6},new AbortController().signal);
  const source=await readFile(new URL('../src/scripts/origins-study/main.js',import.meta.url),'utf8');
  const initialize=source.slice(source.indexOf('  async function initialize(){'),source.indexOf('  function releaseResources(){'));
  const bindings={root,reader,$:selector=>nodes.get(selector),disposed:false,console:{error(){}},requestAnimationFrame:callback=>callback(),nebula(){throw Error('GPU initialization failed');},accretion(){},alteration(){},inheritance(){},dispose(){bindings.disposed=true;}};
  await vm.runInNewContext(initialize+'initialize();',bindings);
  assert.equal(root.dataset.renderState,'error');assert.equal(bindings.disposed,true);assert.equal(nodes.get('#loading').hidden,false);
  chapters[3].click();assert.equal(nodes.get('#title').textContent,descriptions[3].title);
});
test('context loss stops scene callbacks and subsequent initialization, without resetting chapter reading',async()=>{
  const {createChapterReader}=await import('../src/scripts/origins-study/chapter-reader.js');
  const source=await readFile(new URL('../src/scripts/origins-study/main.js',import.meta.url),'utf8');
  const handler=source.match(/^  on\(canvas,'webglcontextlost'.+$/m)[0];
  for(const ready of [true,false]){
    const {root,nodes,chapters}=fixture(),reader=createChapterReader(root,{stage:3,progress:.6},new AbortController().signal),canvas=new EventTarget();let draws=0;
    reader.connect(()=>draws++);
    const bindings={canvas,root,reader,api:ready?{}:undefined,stage:1,progress:.62,phase:true,contextLost:false,frameId:1,disposed:false,$:selector=>nodes.get(selector),on:(target,event,listener)=>target.addEventListener(event,listener),cancelAnimationFrame(){},setPlaying(){},dispose(){bindings.disposed=true;}};
    vm.runInNewContext(handler,bindings);canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
    assert.equal(bindings.contextLost,true);assert.equal(bindings.disposed,true);assert.equal(reader.state.stage,ready?1:3);
    assert.equal(root.dataset.renderState,'error');chapters[2].click();assert.equal(draws,0);assert.equal(nodes.get('#title').textContent,descriptions[2].title);
  }
});

test('a cached import failure reloads the document with the chosen chapter preserved',async()=>{
 const {nodes,chapters,mounts,reloads}=await loaderFixture();chapters[3].click();
 assert.equal(nodes.get('#retry-scene').textContent,'Reload scene');nodes.get('#retry-scene').click();await tick();
 assert.equal(mounts.length,0);assert.equal(reloads.length,1);
 assert.deepEqual(studyLocation(new URL(reloads[0]).hash),{stage:3,progress:.05,paused:true});
});
