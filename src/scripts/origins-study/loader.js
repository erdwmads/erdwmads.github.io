import {createChapterReader} from './chapter-reader.js';
import {studyLocation} from './navigation.js';
let generation=0,activeRoot,dispose,loading,events,moduleFailed=false;
const load=()=>loading??=import('./main.js').then(module=>{moduleFailed=false;return module;}).catch(error=>{moduleFailed=true;loading=undefined;throw error;});
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
  const initial=recovery?.stage!==undefined?recovery:studyLocation(location.hash);
  const reader=createChapterReader(root,initial,signal);
  root.querySelector('#retry-scene').addEventListener('click',()=>{const saved={...(root.dataset.renderState==='ready'&&window.study?window.study.state:reader.state),paused:true};if(moduleFailed){const url=new URL(location.href);url.hash=new URLSearchParams({stage:saved.stage,progress:saved.progress}).toString();history.replaceState({...history.state,madsScrollY:scrollY},'',url.href);location.reload();return;}leave();enter(saved);},{signal});
  root.querySelector('#loading').hidden=false;root.querySelector('#loading').textContent='Preparing the material study…';root.querySelector('#retry-scene').hidden=true;root.querySelector('#retry-scene').textContent='Retry scene';
  root.querySelectorAll('.observatory button:not(#retry-scene),.observatory input').forEach(control=>control.disabled=true);
  try{
    const {mountStudy}=await load();
    if(visit!==generation||!root.isConnected)return;
    dispose=mountStudy(root,reader);
  }catch(error){
    if(visit!==generation)return;
    console.error(error);reader.fallback();root.dataset.renderState='error';root.querySelector('#loading').textContent='The scene could not load. Scientific context is still available.';root.querySelector('#retry-scene').hidden=false;root.querySelector('#retry-scene').textContent=moduleFailed?'Reload scene':'Retry scene';
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
