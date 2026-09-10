import {createElement,Play,Pause,ArrowLeft,ArrowRight,ZoomIn,ZoomOut,RotateCcw,Hand} from 'lucide';
import {missions} from './data.js';
import {isProximity,physicalSizes} from './proximity.js';
import {locationFor,hasEarthContext} from './locations.js';
import {phaseLabel,clampProgress} from './motion.js';
let leave=()=>{};
function enter(){
 const root=document.querySelector('[data-sample-missions]');if(!root||root.dataset.initialized)return;leave();root.dataset.initialized='true';
 const abort=new AbortController(),{signal}=abort,el=n=>root.querySelector('[data-mission-'+n+']'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const coarse=matchMedia('(pointer:coarse)');
 const icons={play:Play,previous:ArrowLeft,next:ArrowRight,'zoom-in':ZoomIn,'zoom-out':ZoomOut,reset:RotateCcw,hand:Hand};
 root.querySelectorAll('[data-mission-icon]').forEach(host=>host.replaceChildren(createElement(icons[host.dataset.missionIcon],{'aria-hidden':'true'})));
 let viewer,starting=false,visible=false,mission='hayabusa2',stage=0,progress=0,playing=false,ready=false,lastStatus='',disposed=false;
 const action=n=>root.querySelector('[data-mission-action="'+n+'"]');
 function touchMode(active){
  action('touch').setAttribute('aria-pressed',String(active));action('touch').setAttribute('aria-label',active?'Return to page scrolling':'Enable model rotation and pinch zoom');el('touch-label').textContent=active?'Done':'Explore';
  el('viewport').toggleAttribute('data-touch-active',active);viewer?.touch(active);el('hint').textContent=coarse.matches?(active?'Drag to rotate · pinch to zoom':'Tap Explore to rotate the model'):'Drag to orbit · Ctrl/⌘ + scroll to zoom';
 }
 function busy(value,message='Preparing the mission model…'){
  ready=!value;root.dataset.ready=String(ready);el('loading').hidden=!value;el('loading').querySelector('span').textContent=message;
  root.querySelectorAll('[data-mission-stage], [data-mission-progress], [data-mission-action]').forEach(c=>{if(c.dataset.missionAction!=='retry')c.disabled=value;});
  if(!value){action('previous').disabled=stage===0;action('next').disabled=stage===missions[mission].stages.length-1;}
 }
 function chapterUI(){
  const m=missions[mission],s=m.stages[stage];el('number').textContent=String(stage+1).padStart(2,'0')+' / '+String(m.stages.length).padStart(2,'0');
  el('date').textContent=s.date;el('title').textContent=s.title;el('description').textContent=s.description;el('detail').textContent=s.detail;el('source').textContent=s.sourceLabel;el('source').href=s.source;
  const scales={launch:'Launch · physical vehicle scale',cruise:'Solar cruise · bodies not to scale',flyby:'Earth-centered flyby · source trajectory',outbound:'Onward transfer · bodies not to scale',rendezvous:'Asteroid vicinity',sample:'Local surface · illustrative terrain',impact:'SCI experiment · illustrative terrain',stow:'Spacecraft mechanism',depart:'Asteroid departure',return:'Capsule release · physical vehicle scale',landing:'Entry and landing · physical vehicle scale'};
  el('scene').textContent=scales[s.kind];
  el('physical').hidden=!isProximity(s.kind);el('context').hidden=!hasEarthContext(s.kind);if(hasEarthContext(s.kind)){const site=locationFor(mission,s.kind);el('location').textContent=site.label;el('location').href=site.source;el('location-note').textContent=site.type==='Recovery region'?'Regional locator · not an exact touchdown pin':'Launch-site locator';}
  root.querySelectorAll('[data-mission-stage]').forEach(b=>{if(Number(b.dataset.missionStage)===stage)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  const activeChapter=el('chapters').querySelector('[aria-current=step]');if(activeChapter){const strip=el('chapters'),r=activeChapter.getBoundingClientRect(),sr=strip.getBoundingClientRect();strip.scrollTo({left:strip.scrollLeft+r.left-sr.left-(sr.width-r.width)/2,behavior:reduced.matches?'instant':'smooth'});}
  action('previous').disabled=!ready||stage===0;action('next').disabled=!ready||stage===m.stages.length-1;
  el('samples').href='#observe=1&view=sample&material='+m.targetId;
 }
 function controlsUI(){
  const kind=missions[mission].stages[stage].kind;if(hasEarthContext(kind)){const overview=viewer?.state.context!=='detail';action('earth').setAttribute('aria-pressed',String(overview));action('detail').setAttribute('aria-pressed',String(!overview));el('scene').textContent=overview?'Earth overview · position markers':'Physical vehicle scale · terrain illustrated';}
  const state=viewer?.state;if(isProximity(kind)&&state?.proximity){const v=state.proximity,m=physicalSizes[mission];el('range').textContent=v.rangeKm.toLocaleString('en-US',{maximumFractionDigits:2})+' km from '+v.target+' centre';el('dimensions').textContent=m.spanM+' m spacecraft span · '+(kind==='flyby'?'12,742 km Earth diameter':'~'+m.diameterM+' m asteroid diameter')+' · '+v.time.slice(0,16).replace('T',' ')+' UTC';el('trajectory-source').textContent=v.sourceLabel;el('trajectory-source').href=v.source;for(const name of ['both','asteroid','spacecraft'])action(name).setAttribute('aria-pressed',String(state.focus===name));el('scene').textContent=state.focus==='both'?'Physical sizes and distances · dots mark positions':state.focus==='asteroid'?'Target close-up · camera zoom only':'Spacecraft close-up · camera zoom only';}
  el('progress').value=Math.round(progress*1000);el('percent').textContent=Math.floor(progress*100)+'%';
  el('percent-short').textContent=Math.floor(progress*100)+'%';el('play-short').textContent=playing?'Pause':'Play';
  const label=playing?'Pause mission':'Play mission';action('play').setAttribute('aria-label',label);if(el('play-label').textContent!==label){el('play-label').textContent=label;action('play').querySelector('[data-mission-icon]').replaceChildren(createElement(playing?Pause:Play,{'aria-hidden':'true'}));}
  action('play').setAttribute('aria-pressed',String(playing));
  const flight=viewer?.state.earth,status=flight?flight.phase+' · '+(flight.altitudeKm<1?Math.round(flight.altitudeKm*1000)+' m':flight.altitudeKm.toLocaleString('en-US',{maximumFractionDigits:1})+' km')+' altitude · T+ '+Math.floor(flight.elapsedSeconds/60)+'m '+Math.floor(flight.elapsedSeconds%60)+'s':phaseLabel(missions[mission].stages[stage].kind,progress,mission);el('progress').setAttribute('aria-valuetext',missions[mission].stages[stage].label+', '+Math.floor(progress*100)+'% — '+status);if(lastStatus!==status){el('status').textContent=status;lastStatus=status;}
 }
 function animateChapter(){if(!reduced.matches){root.querySelector('.mission-copy').getAnimations().forEach(a=>a.cancel());root.querySelector('.mission-copy').animate([{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:240,easing:'ease-out'});}}
 function select(index,p=0){
  if(!ready)return;stage=Math.max(0,Math.min(missions[mission].stages.length-1,index));progress=clampProgress(p);playing=false;viewer.play(false);viewer.select(stage,progress);chapterUI();controlsUI();animateChapter();
 }
 function setProgress(p){if(!ready)return;progress=clampProgress(p);playing=false;viewer.progress(progress);controlsUI();}
 function error(){playing=false;controlsUI();busy(true,'The 3D view could not load. You can still read the mission sources below.');root.dataset.ready='error';action('retry').hidden=false;}
 async function start(){
  if(starting||viewer||disposed)return;starting=true;busy(true);
  try{
   const {createViewer}=await import('./viewer.js');if(signal.aborted)return;
   viewer=createViewer(el('viewport'),{signal,onReady:()=>{busy(false);action('retry').hidden=true;stage=0;progress=0;chapterUI();controlsUI();viewer.visible(visible&&!document.hidden);},
    onError:error,onTick:state=>{const changed=stage!==state.stage;stage=state.stage;progress=state.progress;playing=state.playing;if(changed){chapterUI();animateChapter();}controlsUI();}});
   touchMode(false);await viewer.load(mission);
  }catch(e){if(!signal.aborted){console.error(e);error();}}finally{starting=false;}
 }
 function missionUI(id){
  root.querySelectorAll('[data-mission]').forEach(b=>{const active=b.dataset.mission===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
  root.querySelector('#mission-player').setAttribute('aria-labelledby','mission-tab-'+id);
  el('chapters').replaceChildren(...missions[id].stages.map((s,i)=>{const b=document.createElement('button');b.type='button';b.dataset.missionStage=i;const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');b.append(number,document.createTextNode(s.label));return b;}));
 }
 async function choose(id){
  if(!missions[id]||id===mission)return;mission=id;stage=0;progress=0;playing=false;
  missionUI(id);busy(true);chapterUI();controlsUI();if(viewer)await viewer.load(id);else await start();
 }
 root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.mission){choose(b.dataset.mission);return;}
  if(b.hasAttribute('data-mission-stage')){select(Number(b.dataset.missionStage));return;}
  const a=b.dataset.missionAction;
  if(a==='play'){playing=!playing;viewer.play(playing);controlsUI();}
  else if(a==='previous'||a==='next')select(stage+(a==='next'?1:-1));
  else if(a==='touch')touchMode(b.getAttribute('aria-pressed')!=='true');
  else if(a==='retry'){viewer?.dispose();viewer=undefined;starting=false;action('retry').hidden=true;start();}
  else if(a)viewer?.action(a);
 },{signal});
 el('progress').addEventListener('input',e=>setProgress(Number(e.target.value)/1000),{signal});
 root.querySelector('.mission-selector').addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const ids=Object.keys(missions),id=e.key==='Home'?ids[0]:e.key==='End'?ids[1]:ids.find(id=>id!==mission);choose(id);root.querySelector('[data-mission="'+id+'"]').focus();
 },{signal});
 el('viewport').addEventListener('keydown',e=>{
  if(e.code==='Space'&&e.target===el('viewport')&&ready){e.preventDefault();playing=!playing;viewer.play(playing);controlsUI();}
  if(e.key==='Escape'){playing=false;viewer?.play(false);controlsUI();touchMode(false);}
 },{signal});
 coarse.addEventListener('change',()=>touchMode(false),{signal});
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();viewer?.visible(visible&&!document.hidden);},{threshold:0});
 observer.observe(el('viewport'));
 const displayObserver=new IntersectionObserver(entries=>document.documentElement.toggleAttribute('data-mission-in-view',entries[0].isIntersecting));displayObserver.observe(root);
 document.addEventListener('visibilitychange',()=>viewer?.visible(visible&&!document.hidden),{signal});
 reduced.addEventListener('change',()=>{if(reduced.matches){playing=false;viewer?.play(false);controlsUI();}},{signal});
 const api={choose,select,setProgress,get state(){return viewer?.state||{mission,stage,progress,playing,ready:false};}};window.sampleMissions=api;
 missionUI(mission);touchMode(false);busy(true);chapterUI();controlsUI();
 leave=()=>{disposed=true;document.documentElement.removeAttribute('data-mission-in-view');abort.abort();observer.disconnect();displayObserver.disconnect();viewer?.dispose();root.querySelector('.mission-copy').getAnimations().forEach(a=>a.cancel());delete root.dataset.initialized;if(window.sampleMissions===api)delete window.sampleMissions;};
}
window.addEventListener('mads:soft-nav-before-swap',()=>leave());
window.addEventListener('mads:soft-nav-end',enter);
window.addEventListener('pagehide',()=>leave());
window.addEventListener('pageshow',enter);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enter,{once:true});else enter();
