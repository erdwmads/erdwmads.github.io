import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import * as T from 'three';
import {missions} from '../src/scripts/sample-missions/data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523',evidence=join(process.cwd(),'.codex_tmp','mission-continuity-'+Date.now());
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE}),page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),results=[],failures=[],pageErrors=[];
page.setDefaultTimeout(12000);page.on('pageerror',e=>pageErrors.push(e.message));
const deadline=setTimeout(()=>{console.error('FAIL 180-second regression deadline');browser.close();},180000);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');
async function state(){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return page.evaluate(()=>sampleMissions.state);}
async function select(id,kind,p=0){const stage=missions[id].stages.findIndex(s=>s.kind===kind);await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage,p});return state();}
async function check(name,fn){try{await fn();results.push(name);console.log('PASS',name);}catch(error){failures.push({name,error:error.stack});console.error('FAIL',name,error.message);await writeFile(join(evidence,`${failures.length}.json`),JSON.stringify({name,error:error.stack,state:await page.evaluate(()=>window.sampleMissions?.state).catch(()=>null)},null,2));await root.locator('.mission-scene').screenshot({path:join(evidence,`${failures.length}.png`),timeout:5000}).catch(()=>{});}}
function assertProbeCentered(s){assert.equal(s.focus,'spacecraft');assert(s.proximity.spanKm>0);assert(distance(s.camera.target,s.proximity.position)<s.proximity.spanKm*.01);const d=distance(s.camera.position,s.camera.target);assert(d>=s.camera.minDistance*.999&&d<=s.camera.maxDistance*1.001);}
try{
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto(base+'/research.html',{waitUntil:'domcontentloaded'});await view.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>window.sampleMissions?.state.ready&&document.querySelector('[data-sample-missions]').dataset.ready==='true'&&sampleMissions.state.calls>0,null,{timeout:60000});await ready();
 for(const id of ['hayabusa2','osiris-rex']){
  await page.evaluate(id=>sampleMissions.choose(id),id);await ready();await view.scrollIntoViewIfNeeded();
  for(const kind of ['cruise','outbound'])await check(`${id} ${kind}: fixed camera, source positions and dates`,async()=>{
   let first,lastTime=-Infinity;
   for(const p of [0,.25,.5,.75,1]){
    const s=await select(id,kind,p);assert(s.journey);assert(s.calls>0);assert(Date.parse(s.journey.time)>lastTime);lastTime=Date.parse(s.journey.time);
    if(!first)first=s.camera;else {assert.deepEqual(s.camera.position,first.position);assert.deepEqual(s.camera.target,first.target);}
    const rect=await view.boundingBox(),camera=new T.PerspectiveCamera(38,rect.width/rect.height,.05,150);camera.position.set(...s.camera.position);camera.up.set(...s.camera.up);camera.lookAt(new T.Vector3(...s.camera.target));camera.updateMatrixWorld();
    for(const name of ['craft','earth','asteroid']){const projected=new T.Vector3(...s.journey[name]).project(camera);assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z>-1&&projected.z<1,`${name} stays inside frame`);}
    assert.match(await root.locator('[data-mission-journey-time]').innerText(),new RegExp(s.journey.time.slice(0,10)));
    if(kind==='outbound'&&p===1)assert(s.journey.rangeToTargetKm<40);
   }
  });
  await check(`${id} flyby: same UTC, correct frame speeds and moving Earth`,async()=>{
   for(const p of [.15,.5,.85]){
    const earth=await select(id,'flyby',p);await root.locator('[data-mission-action="frame-sun"]').click();const sun=await state();
    assert.equal(sun.reference,'sun');assert.equal(sun.proximity.time,earth.proximity.time);assert.equal(sun.progress,earth.progress);
    assert.equal(sun.flyby.speedSunKmS,earth.flyby.speedSunKmS);assert.equal(sun.flyby.speedEarthKmS,earth.flyby.speedEarthKmS);
    assert(Math.abs(Math.hypot(...sun.proximity.velocity)-sun.flyby.speedSunKmS)<1e-8);
    assert(Math.abs(Math.hypot(...earth.proximity.velocity)-earth.flyby.speedEarthKmS)<1e-8);
    assert(Math.abs(distance(sun.proximity.position,sun.proximity.targetPosition)-sun.proximity.rangeKm)<1e-5);
    assert(distance(earth.proximity.targetPosition,[0,0,0])<1e-8);
    if(p!==.5)assert(Math.hypot(...sun.proximity.targetPosition)>100000);
    assert.equal(await root.locator('[data-mission-speed-relative]').innerText(),sun.flyby.speedEarthKmS.toFixed(3)+' km/s');
    assert.equal(await root.locator('[data-mission-speed-sun]').innerText(),sun.flyby.speedSunKmS.toFixed(3)+' km/s');
    await root.locator('[data-mission-action="frame-earth"]').click();const restored=await state();assert.equal(restored.proximity.time,earth.proximity.time);assert.deepEqual(restored.proximity.position,earth.proximity.position);
   }
  });
  for(const kind of ['rendezvous','depart'])await check(`${id} ${kind}: probe default, Ctrl-wheel physical zoom bounds`,async()=>{
   for(const p of [0,.5,1])assertProbeCentered(await select(id,kind,p));
   await select(id,kind,.5);await view.scrollIntoViewIfNeeded();const box=await view.boundingBox();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.6);await page.keyboard.down('Control');
   try{for(let i=0;i<18;i++)await page.mouse.wheel(0,100);const far=await state();assertProbeCentered(far);assert(distance(far.camera.position,far.camera.target)<=far.proximity.spanKm*20.001);for(let i=0;i<32;i++)await page.mouse.wheel(0,-100);assertProbeCentered(await state());}finally{await page.keyboard.up('Control');}
  });
  await check(`${id} manual key and drag pause playback`,async()=>{
   await select(id,'rendezvous',.3);await view.focus();await page.keyboard.press('Space');await page.waitForFunction(()=>sampleMissions.state.playing);await page.keyboard.press('ArrowLeft');let s=await state();assert.equal(s.playing,false);assert.equal(s.camera.automatic,false);
   await view.focus();await page.keyboard.press('Space');await page.waitForFunction(()=>sampleMissions.state.playing);const box=await view.boundingBox();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.62,box.y+box.height*.63,{steps:4});await page.mouse.up();s=await state();assert.equal(s.playing,false);assert.equal(s.camera.automatic,false);
  });
 }
 assert.deepEqual(pageErrors,[]);await writeFile(join(evidence,'report.json'),JSON.stringify({results,failures,pageErrors},null,2));console.log(JSON.stringify({passed:results.length,failed:failures.length,evidence}));if(failures.length)process.exitCode=1;
}catch(error){await writeFile(join(evidence,'fatal.json'),JSON.stringify({error:error.stack,pageErrors},null,2));await page.screenshot({path:join(evidence,'fatal.png'),timeout:5000}).catch(()=>{});throw error;}finally{clearTimeout(deadline);await browser.close();}
