import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {missions} from '../src/scripts/sample-missions/data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const failure=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await failure.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await failure.route('**/assets/data/missions/ephemeris.json',r=>r.abort());
 await failure.goto(base+'/research.html',{waitUntil:'networkidle'});
 await failure.locator('[data-mission-viewport]').scrollIntoViewIfNeeded();
 await failure.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='error',null,{timeout:60000});
 for(const [id,m] of Object.entries(missions)){
  await failure.locator(`[data-mission="${id}"]`).click();
  await failure.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='error',null,{timeout:60000});
  for(let i=0;i<m.stages.length;i++){
   await failure.locator(`[data-mission-stage="${i}"]`).click();
   assert.equal(await failure.locator('[data-mission-title]').innerText(),m.stages[i].title);
   assert.equal(await failure.locator('[data-mission-source]').getAttribute('href'),m.stages[i].source);
  }
  assert(await failure.locator('[data-mission-action="play"]').isDisabled());
 }
 await failure.close();
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto(base+'/research.html',{waitUntil:'networkidle'});
 const view=page.locator('[data-mission-viewport]');await view.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true'&&sampleMissions.state.calls>0,null,{timeout:60000});await ready();
 await page.evaluate(()=>sampleMissions.select(5,.5));await view.focus();
 for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']){
  const before=await page.evaluate(()=>sampleMissions.state);await page.keyboard.press(key);
  const after=await page.evaluate(()=>sampleMissions.state);assert.notDeepEqual(after.camera.position,before.camera.position);assert.equal(after.progress,before.progress);assert.equal(after.camera.automatic,false);
 }
 await page.evaluate(()=>sampleMissions.select(0,.4));await page.locator('[data-mission-action="play"]').click();
 assert.equal(await page.locator('[data-mission-status]').getAttribute('aria-live'),'off');
 await page.locator('[data-mission-action="play"]').click();assert.equal(await page.locator('[data-mission-status]').getAttribute('aria-live'),'polite');
 assert.match(await page.locator('[data-mission-status]').innerText(),/Model altitude/);
 for(const id of Object.keys(missions)){
  await page.evaluate(id=>sampleMissions.choose(id),id);await ready();
  for(const p of [0,.5,1]){
   await page.evaluate(p=>sampleMissions.select(4,p),p);
   const utc=page.locator('[data-mission-utc]');assert(await utc.isVisible());
   const state=await page.evaluate(()=>sampleMissions.state);assert.equal(await utc.innerText(),state.proximity.time.slice(0,19).replace('T',' ')+' UTC');
  }
 }
 // Real lost-context recovery must replace the unusable canvas and resume rendering.
 await page.evaluate(()=>{const c=document.querySelector('[data-mission-viewport] canvas');c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();});
 await page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='error');
 await page.locator('[data-mission-action="retry"]').click();await ready();assert.equal(await view.locator('canvas').count(),1);
 assert.deepEqual(errors,[]);
 console.log('PASS mission readable chapters without 3D, keyboard rotation, bounded live announcements, visible UTC, explicit model altitude and real WebGL retry');
}finally{await browser.close();}
