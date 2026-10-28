// Inline after the entrance dialog (CosmicArrival.astro); soft navigation never re-runs it (data-arrival-gate).
(()=>{
  const gate=document.querySelector('#cosmic-arrival');
  let played=false,disabled=false;
  try{played=sessionStorage.getItem('mads-cosmic-arrival-v1')==='done';disabled=localStorage.getItem('madsAmbientFxEnabled')==='0';}catch{}
  if(gate.dataset.home!=='true'||location.hash||played||disabled||navigator.connection?.saveData||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  gate.showModal();gate.dataset.state='preparing';document.documentElement.classList.add('cosmic-arrival-active');window.cosmicArrivalOpened=performance.now();
  // A failed or slow module must never leave the page behind a modal or a scroll lock; entry.js uses the same 3 s cap.
  window.cosmicArrivalFallback=setTimeout(()=>{gate.close();gate.dataset.state='complete';document.documentElement.classList.remove('cosmic-arrival-active');},3000);
  // However the dialog closes (Skip or Back before the module has loaded), release the scroll lock at once.
  gate.addEventListener('close',()=>{if(gate.open)return;clearTimeout(window.cosmicArrivalFallback);document.documentElement.classList.remove('cosmic-arrival-active');});
  document.querySelector('#arrival-skip')?.addEventListener('click',()=>gate.close());
})();
