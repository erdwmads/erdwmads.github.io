import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const planetary=await readFile(new URL('../src/scripts/planetary-explorer.js',import.meta.url),'utf8');
const missions=await readFile(new URL('../src/scripts/sample-missions/loader.js',import.meta.url),'utf8');
function listener(source,start,end){
  const from=source.indexOf(start),to=source.indexOf(end,from);
  assert.ok(from>=0&&to>from,'Locate the actual keyboard listeners');
  return source.slice(from,to);
}
function node(){
  const result=new EventTarget();result.closest=()=>null;result.focus=()=>{};return result;
}
function fixture(kind){
  const root=node(),stage=node(),selector=node(),tabs=['orbit','sample','mineral'].map(view=>Object.assign(node(),{dataset:{view}}));
  const effects=[],abort=new AbortController();
  tabs.forEach(tab=>{tab.closest=()=>tab;tab.focus=()=>effects.push(['focus',tab.dataset.view]);});
  root.querySelectorAll=()=>tabs;
  root.querySelector=selectorText=>selectorText==='.mission-selector'?selector:{focus:()=>effects.push(['focus',selectorText])};
  const context={root,signal:abort.signal,el:()=>stage,state:{view:'sample'},mission:'hayabusa2',missions:{hayabusa2:{},'osiris-rex':{}},ready:true,playing:false,
    interrupt:()=>effects.push(['interrupt']),sync:()=>effects.push(['sync']),touchMode:value=>effects.push(['touch',value]),
    controlsUI:()=>effects.push(['controls']),choose:id=>effects.push(['choose',id]),
    viewer:{rotate:key=>effects.push(['rotate',key]),play:value=>effects.push(['play',value])}};
  if(kind.startsWith('planetary'))vm.runInNewContext(listener(planetary,"  root.addEventListener('keydown',","  window.addEventListener('mads:material-selected'"),context);
  else vm.runInNewContext(listener(missions," root.querySelector('.mission-selector').addEventListener('keydown',"," coarse.addEventListener('change'"),context);
  const target=kind==='planetary-tabs'?tabs[1]:kind==='mission-selector'?selector:stage;
  const dispatch=kind.startsWith('planetary')?root:target;
  function press(key,options={}){
    const event=new Event('keydown',{cancelable:true});
    Object.defineProperty(event,'target',{value:target});
    Object.assign(event,{key,code:key===' '?'Space':key,...options});
    if(options.consumed)event.preventDefault();
    let prevented=0;const prevent=event.preventDefault.bind(event);event.preventDefault=()=>{prevented++;prevent();};
    dispatch.dispatchEvent(event);return {event,prevented};
  }
  return {context,effects,press,abort};
}
for(const kind of ['planetary-tabs','planetary-stage','mission-selector','mission-viewport']){
  const keys=kind.endsWith('tabs')||kind.endsWith('selector')?['ArrowLeft','ArrowRight','Home','End']:['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',...(kind==='mission-viewport'?[' ']:[])];
  test(`${kind} leaves modified and consumed keys untouched`,()=>{
    for(const key of keys)for(const options of [{altKey:true},{ctrlKey:true},{metaKey:true},{consumed:true}]){
      const {context,effects,press}=fixture(kind),{event,prevented}=press(key,options);
      assert.equal(prevented,0,`${key} ${JSON.stringify(options)} must not be intercepted`);
      assert.equal(event.defaultPrevented,!!options.consumed);assert.deepEqual(effects,[]);
      assert.equal(context.state.view,'sample');assert.equal(context.playing,false);
    }
  });
  test(`${kind} keeps ordinary keyboard navigation`,()=>{
    for(const key of keys){
      const {context,effects,press}=fixture(kind);
      assert.equal(press(key).event.defaultPrevented,true);
      if(kind==='planetary-tabs'){
        const view=['ArrowLeft','Home'].includes(key)?'orbit':'mineral';
        assert.equal(context.state.view,view);assert.ok(effects.some(e=>e[0]==='focus'&&e[1]===view));
      }else if(kind==='mission-selector'){
        const id=key==='Home'?'hayabusa2':'osiris-rex';assert.ok(effects.some(e=>e[0]==='choose'&&e[1]===id));
      }else if(key===' '){assert.equal(context.playing,true);assert.ok(effects.some(e=>e[0]==='play'&&e[1]===true));}
      else assert.ok(effects.some(e=>e[0]==='rotate'&&e[1]===key));
    }
  });
  test(`${kind} ignores unrelated keys and unregisters on cleanup`,()=>{
    const {effects,press,abort}=fixture(kind);
    assert.equal(press('Tab').event.defaultPrevented,false);assert.deepEqual(effects,[]);
    abort.abort();assert.equal(press('ArrowLeft').event.defaultPrevented,false);assert.deepEqual(effects,[]);
  });
}
