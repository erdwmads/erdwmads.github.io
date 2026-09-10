import {descriptions} from './descriptions.js';
import {studyLocation} from './navigation.js';
let generation=0,activeRoot,dispose,loading,events;
const load=()=>loading??=import('./main.js').catch(error=>{loading=undefined;throw error;});
function leave(){generation++;events?.abort();events=undefined;dispose?.();dispose=undefined;activeRoot=undefined;}
async function enter(recovery){
  const root=document.querySelector('.origins-study');
  if(!root||root===activeRoot)return;
  leave();activeRoot=root;const visit=generation;
  events=new AbortController();const {signal}=events;
  const source=root.querySelector('#sources'),evidence=root.querySelector('#evidence');
  evidence.addEventListener('click',()=>{source.showModal();if(window.study?.state.playing)root.querySelector('#play').click();},{signal});
  source.querySelector('.close').addEventListener('click',()=>source.close(),{signal});
  source.addEventListener('click',e=>{if(e.target===source){const r=source.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)source.close();}},{signal});
  root.querySelector('#retry-scene').addEventListener('click',()=>{const saved=window.study?{...window.study.state,paused:true}:undefined;leave();enter(saved);},{signal});
  const initial=recovery?.stage!==undefined?recovery:studyLocation(location.hash),data=descriptions[initial.stage];
  for(const key of ['eyebrow','title','description','scale','environment'])root.querySelector('#'+key).textContent=data[key];
  root.querySelectorAll('[data-stage]').forEach(b=>{if(Number(b.dataset.stage)===initial.stage)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  root.querySelector('#loading').hidden=false;root.querySelector('#loading').textContent='Preparing the material study…';root.querySelector('#retry-scene').hidden=true;
  root.querySelectorAll('.observatory button:not(#retry-scene),.observatory input,[data-stage]').forEach(control=>control.disabled=true);
  try{
    const {mountStudy}=await load();
    if(visit!==generation||!root.isConnected)return;
    dispose=mountStudy(root,recovery?.stage!==undefined?recovery:undefined);
  }catch(error){
    if(visit!==generation)return;
    console.error(error);root.dataset.renderState='error';root.querySelector('#loading').textContent='The scene could not load. Scientific context is still available.';root.querySelector('#retry-scene').hidden=false;
  }
}
window.addEventListener('mads:soft-nav-before-swap',leave);
window.addEventListener('mads:soft-nav-end',enter);
window.addEventListener('pagehide',leave);
window.addEventListener('pageshow',enter);
for(const event of ['pointerover','focusin'])document.addEventListener(event,e=>{
  if(e.target.closest?.('.site-header a[href="origins-study.html"]'))load().catch(()=>{});
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enter,{once:true});else enter();
