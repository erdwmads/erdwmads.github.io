// Interface 2046 orbital layer: the planets keep the former per-frame path (x = a cos θ, y = b sin θ,
// θ = angle − t · 360° / period) but move by compositor animations, with no per-frame style writes,
// and they pause behind the viewer/atlas, while idle, and are absent with FX off or reduced motion.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||process.env.TEST_BASE_URL||'http://127.0.0.1:52523';
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});

async function open(options={}){
 const context=await browser.newContext({viewport:{width:1440,height:900},...options});
 await context.addInitScript(()=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('madsAmbientFxEnabled','1');});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/contact.html',{waitUntil:'networkidle'});
 return {context,page,errors};
}
// Deviation (px) of every planet and label track from the expected point at the current page time.
const deviation=page=>page.evaluate(()=>{
 const t=document.timeline.currentTime;let worst=0;const states=new Set();
 document.querySelectorAll('.ui2046-system-orbit').forEach(orbit=>{
  const planet=orbit.querySelector('.ui2046-planet'),label=orbit.querySelector('.ui2046-planet-label');
  const theta=(Number(planet.dataset.angle)-t/1000*360/Number(planet.dataset.period))*Math.PI/180;
  const x=50+50*Math.cos(theta),y=50+50*Math.sin(theta),clamp=v=>Math.max(5,Math.min(95,v));
  for(const [node,ex,ey] of [[planet,x,y],[label,clamp(x+2.2),clamp(y)]]){
   const track=node.parentElement,matrix=new DOMMatrixReadOnly(getComputedStyle(track).transform);
   worst=Math.max(worst,Math.abs(matrix.m41-track.offsetWidth*ex/100),Math.abs(matrix.m42-track.offsetHeight*ey/100));
   track.getAnimations().forEach(animation=>states.add(animation.playState));
  }
 });
 return {worst,states:[...states]};
});
const drawn=page=>page.evaluate(()=>[...document.querySelectorAll('.ui2046-system-orbit .ui2046-planet')].map(node=>{const box=node.getBoundingClientRect();return [box.x,box.y];}));
// Where each track has placed its planet or label inside the orbit box (the atlas also hides the scrollbar,
// which moves the whole fixed diagram, so held positions are compared inside the orbit).
const placed=page=>page.evaluate(()=>[...document.querySelectorAll('.ui2046-orbit-track')].map(track=>getComputedStyle(track).transform));
// A pause takes effect on the next animation frame, so wait for each track animation's ready promise
// before reading the held pose (a slow frame otherwise lets the first read land before the hold).
const setPause=(page,mode,on)=>page.evaluate(([mode,on])=>{
 if(mode==='idle')window.__madsPowerState={...window.__madsPowerState,idle:on};
 else document.documentElement.classList.toggle(mode,on);
 window.dispatchEvent(new CustomEvent('mads:power-state',{detail:window.__madsPowerState}));
 return Promise.all(document.getAnimations().filter(animation=>animation.effect?.target?.classList?.contains('ui2046-orbit-track')).map(animation=>animation.ready));
},[mode,on]);

try{
 const {context,page,errors}=await open();
 assert.equal(await page.locator('.ui2046-system-orbit .ui2046-planet').count(),9);
 assert.equal(await page.locator('.ui2046-planet-label').count(),9);
 for(let i=0;i<3;i++){
  const {worst,states}=await deviation(page);
  assert.deepEqual(states,['running']);assert.ok(worst<.75,`planets and labels stay on the former path (${worst.toFixed(3)} px)`);
  await page.waitForTimeout(400);
 }
 const writes=await page.evaluate(()=>new Promise(resolve=>{let count=0;const observer=new MutationObserver(list=>count+=list.length);
  observer.observe(document.querySelector('.ui2046-solar-system'),{attributes:true,subtree:true});
  setTimeout(()=>{observer.disconnect();resolve(count);},600);}));
 assert.equal(writes,0,'no per-frame style writes on planets or labels');
 const moved=await drawn(page);await page.waitForTimeout(150);
 assert.notDeepEqual(await drawn(page),moved,'planets move on screen');

 for(const mode of ['mission-lightbox-open','mineral-atlas-open','idle']){
  await setPause(page,mode,true);
  assert.deepEqual((await deviation(page)).states,['paused'],mode+' pauses the orbits');
  const held=await placed(page);await page.waitForTimeout(200);
  assert.deepEqual(await placed(page),held,mode+' holds the planets in place');
  await setPause(page,mode,false);await page.waitForTimeout(50);
  const {worst,states}=await deviation(page);
  assert.deepEqual(states,['running']);assert.ok(worst<.75,mode+' resumes at the phase for the page time');
 }

 await page.evaluate(()=>document.querySelector('.ambient-fx-toggle').click());
 assert.equal(await page.locator('.ui2046-solar-system').count(),0,'FX off removes the orbital layer');
 assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.classList?.contains('ui2046-orbit-track')).length),0);
 await page.evaluate(()=>document.querySelector('.ambient-fx-toggle').click());
 await page.waitForTimeout(50);
 const restored=await deviation(page);
 assert.deepEqual(restored.states,['running']);assert.ok(restored.worst<.75,'FX on restores the orbits on their path');
 assert.deepEqual(errors,[]);await context.close();

 const reduced=await open({reducedMotion:'reduce'});
 assert.equal(await reduced.page.locator('.ui2046-system-orbit .ui2046-planet').count(),0,'reduced motion turns the orbital layer off');
 assert.deepEqual(reduced.errors,[]);await reduced.context.close();
 console.log('PASS orbital motion: former path, compositor animations without style writes, pauses, FX off and reduced motion.');
}finally{await browser.close();}
