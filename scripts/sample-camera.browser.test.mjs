import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {earthFlightShot} from '../src/scripts/sample-missions/earth-scene.js';
import {missionShot} from '../src/scripts/sample-missions/camera.js';
import {missions} from '../src/scripts/sample-missions/data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html');
 const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');
 await view.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true'&&sampleMissions.state.frames>0,null,{timeout:45000});
 await ready();
 async function settled(kind,p,id){
  const aspect=await view.evaluate(el=>el.clientWidth/el.clientHeight),shot=['launch','return','landing'].includes(kind)?earthFlightShot(await page.evaluate(()=>sampleMissions.state.earth),'detail',aspect):missionShot(kind,p,id,aspect);
  await page.waitForFunction(shot=>{
   const {position,target}=sampleMissions.state.camera;
   return position.every((v,i)=>Math.abs(v-shot.position[i])<.002)&&target.every((v,i)=>Math.abs(v-shot.target[i])<.002)&&!sampleMissions.state.transitioning;
  },shot,{timeout:10000});
 }
 for(const id of ['hayabusa2','osiris-rex']){
  await page.evaluate(id=>sampleMissions.choose(id),id);await ready();
  const sample=missions[id].stages.findIndex(s=>s.kind==='sample'),release=missions[id].stages.findIndex(s=>s.kind==='return');
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await view.scrollIntoViewIfNeeded();
   for(const [kind,stage,p]of [['sample',sample,0],['sample',sample,.52],['sample',sample,.78],['return',release,.7],['return',release,1]]){
    await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage,p});if(['launch','return','landing'].includes(kind))await root.locator('[data-mission-action="detail"]').click();await settled(kind,p,id);
    await root.locator('.mission-scene').screenshot({path:join(tmpdir(),`mission-camera-${id}-${kind}-${p}-${width}.png`)});
   }
  }
  await page.evaluate(stage=>sampleMissions.select(stage,.1),sample);await settled('sample',.1,id);
  await page.evaluate(()=>sampleMissions.setProgress(.52));await settled('sample',.52,id);
  await page.waitForTimeout(250);const frames=await page.evaluate(()=>sampleMissions.state.frames);await page.waitForTimeout(300);
  assert((await page.evaluate(()=>sampleMissions.state.frames))-frames<=2,'paused automatic camera stops scheduling after settling');
  await root.locator('[data-mission-action="zoom-in"]').click();await page.waitForTimeout(250);
  const manual=await page.evaluate(()=>sampleMissions.state.camera);
  assert.equal(manual.automatic,false);
  await page.evaluate(()=>sampleMissions.setProgress(.78));await page.waitForTimeout(300);
  const after=await page.evaluate(()=>sampleMissions.state.camera);
  assert(after.position.every((v,i)=>Math.abs(v-manual.position[i])<.002),'manual camera survives paused timeline scrubbing');
  await page.emulateMedia({reducedMotion:'reduce'});
  await root.locator('[data-mission-action="reset"]').click();await settled('sample',.78,id);
  const before=await page.evaluate(()=>sampleMissions.state.frames);
  await page.evaluate(()=>{for(let i=0;i<30;i++)sampleMissions.setProgress(i/29*.52);});await settled('sample',.52,id);
  assert((await page.evaluate(()=>sampleMissions.state.frames))-before<=3,'rapid reduced-motion scrubs coalesce into one immediate camera update');
  await page.emulateMedia({reducedMotion:'no-preference'});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS camera framing, paused settling/idle, manual control preservation and reduced-motion scrub coalescing.');
}finally{await browser.close();}
