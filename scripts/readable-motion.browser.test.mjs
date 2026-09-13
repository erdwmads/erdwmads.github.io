import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as T from 'three';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const evidence=join(tmpdir(),'readable-motion-final');await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const results=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{sessionStorage.clear();sessionStorage.setItem('mads-cosmic-arrival-v1','done');});
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html');
 const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');await view.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>window.sampleMissions?.state.ready&&document.querySelector('[data-sample-missions]').dataset.ready==='true',null,{timeout:60000});await ready();
 for(const mission of ['hayabusa2','osiris-rex']){
  await page.evaluate(id=>sampleMissions.choose(id),mission);await ready();
  const kinds=mission==='hayabusa2'?['launch','cruise','flyby','outbound','rendezvous','sample','impact','sample','depart','return','landing']:['launch','cruise','flyby','outbound','rendezvous','sample','stow','depart','return','landing'];
  for(let stage=0;stage<kinds.length;stage++){
   const kind=kinds[stage];let first;
   for(const p of [0,.5,1]){
    await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage,p});await view.scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const state=await page.evaluate(()=>sampleMissions.state);assert(state.calls>0);assert.equal(state.progress,p);
    if(['cruise','outbound','rendezvous','depart','return'].includes(kind)){
     if(!first)first=state;else assert.deepEqual(state.camera.position,first.camera.position,mission+' '+kind+' fixed overview');
    }
    if(['rendezvous','depart'].includes(kind)){assert.equal(state.focus,'both');assert(await root.locator('[data-mission-inset]').isVisible());}
    if(kind==='return'){
     assert.equal(state.context,'earth');const bounds=await view.boundingBox(),c=state.camera,camera=new T.PerspectiveCamera(c.fov,bounds.width/bounds.height,c.near,c.far);camera.position.set(...c.position);camera.up.set(...c.up);camera.lookAt(...c.target);camera.updateMatrixWorld();
     for(const point of [[0,-6371,0],state.earth.positionKm,state.earth.spacecraft.positionKm]){const projected=new T.Vector3(...point).project(camera);assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z>-1&&projected.z<1,'Earth and return branches stay in view');}
    }
    if(kind==='flyby')assert(await root.locator('[data-mission-solar-context]').isVisible());
    if((p===.5&&['cruise','flyby','sample','landing'].includes(kind))||(p===1&&['outbound','rendezvous','depart','return'].includes(kind)))await view.screenshot({path:evidence+'/'+mission+'-'+stage+'-'+p+'.png'});
   }
   if(kind==='flyby'){
    await page.evaluate(()=>sampleMissions.select(2,.5));await root.locator('[data-mission-action=frame-sun]').click();await view.scrollIntoViewIfNeeded();await view.screenshot({path:evidence+'/'+mission+'-flyby-sun.png'});const sun=await page.evaluate(()=>sampleMissions.state);assert.equal(sun.reference,'sun');assert(sun.flyby.endpoints[1].speedSunKmS>sun.flyby.endpoints[0].speedSunKmS);assert(await root.locator('[data-mission-solar-context]').isVisible());
   }
   results.push(mission+' '+kind+' endpoints/midpoint');
  }
  await page.evaluate(()=>sampleMissions.select(5,0));await view.scrollIntoViewIfNeeded();await root.locator('[data-mission-action=play]').click();
  const start=Date.now();await page.waitForFunction(()=>sampleMissions.state.progress>=.3,null,{timeout:6500});const elapsed=Date.now()-start;
  assert(elapsed<5000,'visible change within five seconds');await root.locator('[data-mission-action=play]').click();results.push(mission+' sampling reaches 30% in '+elapsed+' ms');
  await page.evaluate(()=>sampleMissions.select(1,.98));await view.scrollIntoViewIfNeeded();await root.locator('[data-mission-action=play]').click();
  await page.waitForFunction(()=>sampleMissions.state.progress===1,null,{timeout:5000});assert.equal(await page.evaluate(()=>sampleMissions.state.stage),1);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>sampleMissions.state.stage),1);await page.waitForFunction(()=>sampleMissions.state.stage===2,null,{timeout:4000});await root.locator('[data-mission-action=play]').click();results.push(mission+' completed loop holds before flyby');
  await page.setViewportSize({width:390,height:900});
  for(const stage of [1,2,4,5,kinds.length-2,kinds.length-1]){
   await page.evaluate(stage=>sampleMissions.select(stage,.5),stage);await view.scrollIntoViewIfNeeded();await page.waitForTimeout(120);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await view.screenshot({path:evidence+'/'+mission+'-'+stage+'-mobile.png'});
  }
  await page.setViewportSize({width:1440,height:1050});
 }
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/origins-study.html#stage=1&progress=0');
 await page.waitForFunction(()=>window.study&&document.querySelector('.origins-study').dataset.renderState==='ready',null,{timeout:60000});
 for(const stage of [1,2,3]){
  await page.evaluate(stage=>{study.select(stage);study.setProgress(0);},stage);await page.locator('#viewport').scrollIntoViewIfNeeded();
  const before=await page.locator('#viewport').screenshot();const button=page.locator('#play');await button.click();const start=Date.now();
  await page.waitForFunction(()=>study.state.progress>=.25,null,{timeout:6500});assert(Date.now()-start<5500);await button.click();
  const after=await page.locator('#viewport').screenshot({path:evidence+'/origins-'+stage+'-quarter.png'});assert.notDeepEqual(before,after);results.push('Origins '+stage+' changes visibly within five seconds');
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length,results,evidence}));
}finally{await writeFile(evidence+'/report.json',JSON.stringify({results,errors},null,2));await browser.close();}
