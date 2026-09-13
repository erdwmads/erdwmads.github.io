import {fitImage,clampView,zoomView,frameRegion} from './image-inspector-geometry.js';
let leave=()=>{};
function enter(){
 const root=document.querySelector('[data-image-inspector]');if(!root||root.dataset.initialized)return;leave();root.dataset.initialized='true';
 const abort=new AbortController(),{signal}=abort,stage=root.querySelector('[data-inspector-stage]'),image=root.querySelector('[data-inspector-image]'),controls=root.querySelector('[data-inspector-controls]'),slider=root.querySelector('[data-inspector-zoom]'),output=root.querySelector('[data-inspector-output]'),hint=root.querySelector('[data-inspector-hint]'),status=root.querySelector('[data-inspector-status]'),touch=root.querySelector('[data-inspector-touch]');
 let view={zoom:1,x:0,y:0},fitted={width:0,height:0},width=0,height=0,ready=false,disposed=false,drag;
 const coarse=matchMedia('(pointer:coarse)');
 function cancelDrag(){const id=drag?.id;drag=undefined;stage.removeAttribute('data-dragging');if(id!==undefined&&stage.hasPointerCapture(id))stage.releasePointerCapture(id);}
 function moving(value){if(!value)cancelDrag();stage.toggleAttribute('data-moving',value);touch.setAttribute('aria-pressed',String(value));touch.textContent=value?'Done moving':'Move image';}
 function render(){
  if(!ready||!width||!height)return;
  view=clampView(view,fitted,width,height);
  image.style.width=fitted.width+'px';image.style.height=fitted.height+'px';image.style.transform='translate(calc(-50% + '+view.x+'px),calc(-50% + '+view.y+'px)) scale('+view.zoom+')';
  slider.value=view.zoom;slider.setAttribute('aria-valuetext',view.zoom.toFixed(1)+' times display zoom');output.value=view.zoom.toFixed(1)+'×';
  root.dataset.zoomed=String(view.zoom>1);touch.disabled=view.zoom===1;if(view.zoom===1){moving(false);root.querySelectorAll('[data-inspector-region]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.inspectorRegion==='all')));}
  hint.textContent=view.zoom===1?'Enlarge, then move the image':coarse.matches?(stage.hasAttribute('data-moving')?'Drag to move · Done returns page scrolling':'Tap Move image to pan'):'Mouse: drag · Touch or pen: Move image · Home resets';
 }
 function resize(){
  const r=stage.getBoundingClientRect();if(!ready||!r.width||!r.height)return;
  if(width!==r.width||height!==r.height)cancelDrag();
  const previous=fitted;fitted=fitImage(image.naturalWidth,image.naturalHeight,r.width,r.height);width=r.width;height=r.height;
  if(previous.width&&previous.height){view.x*=fitted.width/previous.width;view.y*=fitted.height/previous.height;}
  render();
 }
 function clearRegion(){root.querySelectorAll('[data-inspector-region]').forEach(b=>b.setAttribute('aria-pressed','false'));}
 function zoom(value){if(!ready)return;cancelDrag();clearRegion();view=zoomView(view,value,fitted,width,height);render();}
 function region(id){if(!ready)return;cancelDrag();view=frameRegion(id,fitted,width,height);root.querySelectorAll('[data-inspector-region]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.inspectorRegion===id)));render();status.textContent=id==='all'?'Full figure restored. Original scale bars remain in the image.':'Selected region enlarged. Display zoom '+view.zoom.toFixed(1)+'×; this does not add source detail.';}
 async function loaded(){
  try{await image.decode();}catch{if(!image.naturalWidth)return failed();}
  if(disposed||!image.naturalWidth)return;ready=true;root.setAttribute('data-inspector-ready','');controls.hidden=false;hint.hidden=false;resize();status.textContent='Original figure and scale bars retained. Enlarge an image region to examine it.';
 }
 function failed(){if(disposed)return;ready=false;root.removeAttribute('data-inspector-ready');controls.hidden=true;hint.hidden=true;status.textContent='The figure could not load. The original-image and publication links remain available below.';}
 slider.addEventListener('input',()=>zoom(Number(slider.value)),{signal});
 slider.addEventListener('change',()=>{status.textContent='Display zoom '+view.zoom.toFixed(1)+'×. Image enlargement, not instrument magnification.';},{signal});
 root.addEventListener('click',event=>{const b=event.target.closest('[data-inspector-region]');if(b)region(b.dataset.inspectorRegion);},{signal});
 touch.addEventListener('click',()=>{moving(!stage.hasAttribute('data-moving'));render();},{signal});
 stage.addEventListener('pointerdown',event=>{
  if(!ready||view.zoom===1||event.button!==0||drag||(event.pointerType!=='mouse'&&!stage.hasAttribute('data-moving')))return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:view.x,startY:view.y};stage.setPointerCapture(event.pointerId);stage.setAttribute('data-dragging','');
 },{signal});
 stage.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;view.x=drag.startX+event.clientX-drag.x;view.y=drag.startY+event.clientY-drag.y;clearRegion();render();},{signal});
 function stop(event){if(drag?.id===event.pointerId)cancelDrag();}
 for(const name of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(name,stop,{signal});
 stage.addEventListener('wheel',event=>{if(!ready||!(event.ctrlKey||event.metaKey))return;event.preventDefault();zoom(view.zoom+(event.deltaY<0?.2:-.2));},{signal,passive:false});
 stage.addEventListener('keydown',event=>{
  if(event.target!==stage||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||!ready)return;
  if(event.key==='Home'){event.preventDefault();region('all');return;}
  if(['+','=','-'].includes(event.key)){event.preventDefault();zoom(view.zoom+(event.key==='-'?-.2:.2));return;}
  const deltas={ArrowLeft:[32,0],ArrowRight:[-32,0],ArrowUp:[0,32],ArrowDown:[0,-32]};
  if(deltas[event.key]&&view.zoom>1){event.preventDefault();cancelDrag();const [x,y]=deltas[event.key];view.x+=x;view.y+=y;clearRegion();render();}
  if(event.key==='Escape'&&(stage.hasAttribute('data-moving')||drag)){event.preventDefault();moving(false);render();touch.focus({preventScroll:true});}
 },{signal});
 image.addEventListener('load',loaded,{signal});image.addEventListener('error',failed,{signal});
 const observer=new ResizeObserver(resize);observer.observe(stage);
 coarse.addEventListener('change',()=>{moving(false);render();},{signal});
 if(image.complete){if(image.naturalWidth)loaded();else failed();}
 leave=()=>{disposed=true;cancelDrag();abort.abort();observer.disconnect();root.removeAttribute('data-initialized');};
}
window.addEventListener('mads:soft-nav-before-swap',()=>leave());
window.addEventListener('mads:soft-nav-end',enter);
window.addEventListener('pagehide',()=>leave());window.addEventListener('pageshow',enter);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enter,{once:true});else enter();
