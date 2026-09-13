let leave=()=>{};
function enter(){
 const root=document.querySelector('[data-photo-experience]');if(!root||root.dataset.layoutReady)return;leave();
 const controls=root.querySelector('[data-photo-layout-controls]');if(!controls)return;
 const abort=new AbortController();let storage;try{storage=sessionStorage;}catch{}
 function select(layout){
  if(!['gallery','contact'].includes(layout))layout='gallery';root.dataset.photoLayout=layout;
  controls.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.photoLayout===layout)));
  try{storage?.setItem('mads:photo-layout',layout);}catch{}
 }
 let saved;try{saved=storage?.getItem('mads:photo-layout');}catch{}select(saved);
 controls.addEventListener('click',event=>{const button=event.target.closest('button[data-photo-layout]');if(button)select(button.dataset.photoLayout);},{signal:abort.signal});
 root.dataset.layoutReady='true';controls.hidden=false;
 leave=()=>{abort.abort();delete root.dataset.layoutReady;};
}
window.addEventListener('mads:soft-nav-before-swap',()=>leave());window.addEventListener('mads:soft-nav-content',enter);window.addEventListener('mads:soft-nav-end',enter);
window.addEventListener('pagehide',()=>leave());window.addEventListener('pageshow',enter);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enter,{once:true});else enter();
