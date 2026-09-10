import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('madsAmbientFxEnabled','1');localStorage.setItem('mads-theme','space');});
 await page.goto(base+'/research.html');await page.waitForSelector('.ambient-space-layer');await page.waitForSelector('.ui2046-layer',{state:'attached'});
 await page.evaluate(()=>{window.continuity={header:document.querySelector('.site-header'),dust:document.querySelector('.ambient-space-layer'),orbits:document.querySelector('.ui2046-layer'),swaps:[]};window.addEventListener('mads:soft-nav-before-swap',()=>continuity.swaps.push(Number(getComputedStyle(document.querySelector('main')).opacity)));});
 for(let i=0;i<3;i++){
  await page.locator('.nav a[href="origins-study.html"]').click();await page.waitForURL('**/origins-study.html');
  assert(await page.evaluate(()=>!!window.continuity),'Origins keeps the document alive');await page.waitForFunction(()=>window.study);
  assert(await page.evaluate(()=>continuity.header===document.querySelector('.site-header')&&continuity.dust===document.querySelector('.ambient-space-layer')&&continuity.orbits===document.querySelector('.ui2046-layer')),'Header and FX retain their identity');
  assert(await page.locator('.ambient-meteor').count()>0);assert(await page.locator('.ambient-pebble').count()>0);
  await page.evaluate(()=>{window.previousStudy=study;window.previousCanvas=document.querySelector('#scene');});
  await page.locator('.nav a[href="research.html"]').click();await page.waitForURL('**/research.html');await page.waitForFunction(()=>!document.documentElement.classList.contains('mads-soft-nav-active'));
  assert.equal(await page.evaluate(()=>typeof window.study),'undefined','Outgoing scene releases its public handle');
  const stopped=await page.evaluate(()=>previousStudy.state.progress);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>previousStudy.state.progress),stopped,'Outgoing render loop stops');
  assert(await page.evaluate(()=>previousCanvas.getContext('webgl2').isContextLost()),'Outgoing WebGL context released');
 }
 assert(await page.evaluate(()=>continuity.swaps.length===6&&continuity.swaps.every(opacity=>opacity<.02)),'All content swaps happen after fade-out');
 await page.goBack();await page.waitForURL('**/origins-study.html');await page.waitForFunction(()=>window.study);
 await page.goForward();await page.waitForURL('**/research.html');await page.waitForFunction(()=>!window.study);
 await page.evaluate(()=>{document.querySelector('.nav a[href="origins-study.html"]').click();document.querySelector('.nav a[href="cv.html"]').click();});await page.waitForURL('**/cv.html');await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>typeof window.study),'undefined');
 await page.goto(base+'/origins-study.html');await page.waitForFunction(()=>window.study);assert(await page.locator('.ambient-space-layer').count()>0);assert(await page.locator('.ui2046-layer').count()>0);
 await page.evaluate(()=>{window.returnedDuringFade=false;window.addEventListener('mads:soft-nav-ready',()=>{window.returnedDuringFade=true;history.back();},{once:true});document.querySelector('.nav a[href="cv.html"]').click();});
 // Keep the navigation deadline separate from asynchronous GPU shader compilation.
 await page.waitForFunction(()=>window.returnedDuringFade&&!document.documentElement.classList.contains('mads-soft-nav-active')&&document.querySelector('.origins-study'),null,{timeout:4000});
 await page.waitForFunction(()=>window.study,null,{timeout:30000});
 await page.evaluate(()=>{study.setPhase(true);window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await page.waitForFunction(()=>window.study&&study.state.calls>0,null,{timeout:30000});
 assert.equal(await page.locator('#material-mode').getAttribute('aria-pressed'),'true','Restored page UI matches material mode');assert.equal(await page.evaluate(()=>study.state.phase),false);
 await page.evaluate(()=>window.directDocument=document);await page.locator('.nav a[href="research.html"]').click();await page.waitForURL('**/research.html');assert(await page.evaluate(()=>directDocument===document));
 assert.deepEqual(errors,[]);console.log('PASS persistent document and FX, fade-out, repeat entry, disposal, history and rapid navigation');await page.close();
}finally{await browser.close();}
