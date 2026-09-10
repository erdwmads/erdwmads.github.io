import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {join} from 'node:path';import {tmpdir} from 'node:os';
import {missions} from '../src/scripts/sample-missions/data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html');
 const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');await view.scrollIntoViewIfNeeded();const ready=()=>page.waitForFunction(()=>window.sampleMissions&&document.querySelector('[data-sample-missions]').dataset.ready==='true',null,{timeout:60000});await ready();
 for(const id of ['hayabusa2','osiris-rex']){await page.evaluate(id=>sampleMissions.choose(id),id);await ready();
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});
   for(const kind of ['flyby','rendezvous','depart']){
    const stage=missions[id].stages.findIndex(s=>s.kind===kind);await page.evaluate(stage=>sampleMissions.select(stage,.5),stage);
    let physical;
    for(const focus of ['both','asteroid','spacecraft']){
     await root.locator('[data-mission-action="'+focus+'"]').click();await view.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
     const state=await page.evaluate(()=>sampleMissions.state);assert.equal(state.focus,focus);assert.equal(state.progress,.5);assert(state.calls>0);assert(state.proximity.rangeKm>state.proximity.diameterKm/2);
     const dimensions=[state.proximity.spanKm,state.proximity.diameterKm,state.proximity.rangeKm];if(physical)assert.deepEqual(dimensions,physical);physical=dimensions;
     assert.match(await root.locator('[data-mission-trajectory-source]').getAttribute('href'),/^https:/);assert(await root.locator('.mission-labels span:not([hidden])').count()>0,`${id} ${kind} ${focus} labels`);
     await root.locator('.mission-scene').screenshot({path:join(tmpdir(),`physical-${id}-${kind}-${focus}-${width}.png`)});
     if(focus==='spacecraft'&&width===1440){
      await page.emulateMedia({reducedMotion:'no-preference'});await root.locator('[data-mission-action="play"]').click();
      for(let i=0;i<3;i++){await page.waitForTimeout(200);const moving=await page.evaluate(()=>sampleMissions.state);assert(moving.playing);assert(moving.progress>.5);assert(Math.hypot(...moving.camera.target.map((v,j)=>v-moving.proximity.position[j]))<moving.proximity.spanKm*.01,'camera follows vehicle within 1% of its span');assert(await root.locator('.mission-labels span:not([hidden])').count()>0);}
      await root.locator('[data-mission-action="play"]').click();await root.locator('[data-mission-action="zoom-in"]').click();await root.locator('[data-mission-action="play"]').click();await page.waitForTimeout(250);
      const manual=await page.evaluate(()=>sampleMissions.state);assert(!manual.camera.automatic);assert(Math.hypot(...manual.camera.target.map((v,j)=>v-manual.proximity.position[j]))<manual.proximity.spanKm*.01,'manual zoom retains translating frame');
      await root.locator('[data-mission-action="play"]').click();await page.emulateMedia({reducedMotion:'reduce'});
     }
    }
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS 36 physical mission views: camera focus preserves range and dimensions; sources, labels, rendering and responsive bounds');
}finally{await browser.close();}
