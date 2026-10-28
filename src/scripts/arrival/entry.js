import {createElement,ArrowRight,RotateCcw} from 'lucide';
import {arrivalProgress} from './timeline.js';

const gate=document.querySelector('#cosmic-arrival');
if(gate){
 const root=document.documentElement,skip=document.querySelector('#arrival-skip'),replay=document.querySelector('#arrival-replay');
 const signature=gate.querySelector('.arrival-signature'),number=gate.querySelector('.arrival-number'),label=gate.querySelector('.arrival-label'),track=gate.querySelector('.arrival-track span');
 const name=gate.querySelector('.arrival-name');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 // Matches the inline fallback in CosmicArrival.astro: a slow load skips the entrance rather than holding the page.
 const PREPARE_CAP=3000;
 let scene,frame,timer,serial=0,active=false,chapter=-1,replayed=false;
 // The fixed Replay button serves wider windows; on phones a footer button ([data-arrival-replay]) takes its place
 // (home-shell.css), so no fixed control covers the reading column. Focus returns to whichever one started the replay.
 const replays=[replay,...document.querySelectorAll('[data-arrival-replay]')];
 let replaySource=replay;
 const isHome=()=>document.body.classList.contains('ui-page-home');
 // Reduced motion and Save-Data both skip the entrance and hide Replay, as FX off does.
 const quiet=()=>reduced.matches||Boolean(navigator.connection?.saveData);
 const allowed=()=>{try{return !quiet()&&localStorage.getItem('madsAmbientFxEnabled')!=='0';}catch{return !quiet();}};
 const syncReplay=()=>{const hidden=active||!isHome()||!allowed();for(const button of replays)button.hidden=hidden;};
 for(const [name,icon] of [['next',ArrowRight],['replay',RotateCcw]])document.querySelector(`[data-arrival-icon="${name}"]`).append(createElement(icon,{'aria-hidden':'true'}));
 function finish(restarting){
  // The inline Skip handler may already have closed the dialog, so an active run also counts as shown.
  const shown=gate.open||active;
  serial++;active=false;cancelAnimationFrame(frame);clearTimeout(timer);clearTimeout(window.cosmicArrivalFallback);
  scene?.dispose();scene=null;gate.close();gate.style.opacity='0';gate.dataset.state='complete';
  root.classList.remove('cosmic-arrival-active');syncReplay();
  // The skip link follows the dialog, so after the first close the next Tab reaches it; after a replay, focus returns to Replay.
  const focused=document.activeElement;
  if(shown&&restarting!==true&&replayed&&!replaySource.hidden&&replaySource.getClientRects().length&&(!focused||focused===document.body||gate.contains(focused)))replaySource.focus({preventScroll:true});
  if(restarting!==true)replayed=false;
  try{sessionStorage.setItem('mads-cosmic-arrival-v1','done');}catch{}
 }
 function draw(time){
  const p=arrivalProgress(time);
  scene.render(p);gate.style.opacity=String(1-smooth(.88,1,p));
  signature.style.opacity=String(smooth(.025,.10,time)*(1-smooth(.54,.64,time)));
  name.style.opacity=String(smooth(.29,.40,time));
  const next=p<.28?0:p<.61?1:p<.88?2:3;
  if(next!==chapter){number.textContent=['01','02','03','04'][next];label.textContent=['GALACTIC DUST','SOLAR SYSTEM','EARTH','THE MINERAL RECORD'][next];chapter=next;}
  track.style.transform=`scaleX(${p})`;gate.dataset.progress=p.toFixed(3);
 }
 async function play(event){
  // The first run counts from when the inline script opened the dialog, so the whole wait stays within the cap.
  const opened=gate.open&&window.cosmicArrivalOpened||performance.now();
  if(!allowed()||!isHome()){finish();return;}
  finish(true);replayed=Boolean(event);if(replays.includes(event?.currentTarget))replaySource=event.currentTarget;const run=++serial;active=true;for(const button of replays)button.hidden=true;chapter=-1;
  gate.showModal();root.classList.add('cosmic-arrival-active');gate.dataset.state='preparing';gate.dataset.progress='0';
  // Prime the underlying homepage compositor before the final single-overlay fade.
  gate.style.opacity='.999';signature.style.opacity='0';name.style.opacity='0';track.style.transform='scaleX(0)';
  number.textContent='01';label.textContent='GALACTIC DUST';skip.focus({preventScroll:true});
  timer=setTimeout(finish,Math.max(0,opened+PREPARE_CAP-performance.now()));
  try{
   const {createGalaxy}=await import('./galaxy.js');if(run!==serial)return;
   scene=createGalaxy(document.querySelector('#arrival-universe'));
   scene.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();finish();},{once:true});
   await scene.ready;if(run!==serial)return;
  }catch(error){if(run===serial){console.warn('Entrance animation unavailable:',error);finish();}return;}
  clearTimeout(window.cosmicArrivalFallback);clearTimeout(timer);
  // Shortened in September 2026 so the name arrives sooner; the scene order is unchanged.
  const duration=innerWidth<700?4000:5600;timer=setTimeout(finish,duration+2000);gate.dataset.state='playing';
  let start;
  function tick(time){if(run!==serial)return;start??=time;const p=Math.min(1,(time-start)/duration);draw(p);if(p===1)finish();else frame=requestAnimationFrame(tick);}
  frame=requestAnimationFrame(tick);
 }
 skip.addEventListener('click',finish);for(const button of replays)button.addEventListener('click',play);
 gate.addEventListener('cancel',event=>{event.preventDefault();finish();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)finish();});
 window.addEventListener('pagehide',()=>{if(active)finish();});
 window.addEventListener('resize',()=>scene?.resize());
 window.addEventListener('mads:soft-nav-start',()=>{if(active)finish();});
 window.addEventListener('mads:soft-nav-ready',syncReplay);
 window.addEventListener('mads:fx-state',()=>{if(active&&!allowed())finish();syncReplay();});
 reduced.addEventListener('change',()=>{if(active&&reduced.matches)finish();syncReplay();});
 if(gate.open)play();else{clearTimeout(window.cosmicArrivalFallback);root.classList.remove('cosmic-arrival-active');gate.dataset.state='complete';syncReplay();}
}
