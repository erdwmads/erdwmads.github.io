// Scene posters (spec §7.2 WP4 phase B, §5 rows 22 and 38): each 3D stage shows its poster until the scene is ready,
// at the stage's full size and under the readouts, with the loading line as a band at its foot; the poster fades out
// on the ready state and does not come back when the scene reloads (a mission switch, another planetary view). A
// failed planetary scene shows its reference image instead; a failed Origins scene keeps the poster under its
// message; without JavaScript the posters stay; under reduced motion the fade is at most 120 ms.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
const stages={missions:'[data-mission-viewport]',planetary:'.planetary [data-stage]',origins:'.origins-study .scene-viewport'};
const pageOf=name=>name==='origins'?'origins-study.html':'ryugu-bennu.html';
const skipArrival=()=>{try{sessionStorage.setItem('mads-cosmic-arrival-v1','done');}catch{}};
async function open(name,{width=1440,hold=false,abort,javaScriptEnabled=true,reducedMotion='no-preference'}={}){
  const context=await browser.newContext({viewport:{width,height:width>760?900:844},javaScriptEnabled,reducedMotion});
  await context.addInitScript(skipArrival);
  // Holding three.module (never answered) keeps every viewer in its loading state.
  if(hold)await context.route('**/_astro/three.module.*.js',()=>{});
  if(abort)await context.route(abort,route=>route.abort());
  const page=await context.newPage();
  await page.goto(`${base}/${pageOf(name)}`,{waitUntil:'load'});
  await page.locator(stages[name]).scrollIntoViewIfNeeded();
  return {page,context};
}
// The poster's box, its image, opacity and the stage box, read in the page.
const read=(page,name)=>page.evaluate(selector=>{
  const stage=document.querySelector(selector),poster=stage.querySelector('.scene-poster'),img=poster?.querySelector('img');
  const box=element=>{const r=element.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};};
  // The stage's padding box: a plate's hairline border stays outside the poster.
  const r=stage.getBoundingClientRect(),inner={x:Math.round(r.x+stage.clientLeft),y:Math.round(r.y+stage.clientTop),w:stage.clientWidth,h:stage.clientHeight};
  return poster&&{stage:inner,poster:box(poster),done:poster.dataset.scenePoster==='done',display:getComputedStyle(poster).display,opacity:Number(getComputedStyle(poster).opacity),
    duration:getComputedStyle(poster).transitionDuration,complete:img.complete&&img.naturalWidth>0,natural:img.naturalWidth,src:img.currentSrc.replace(/^.*\/assets\//,'assets/'),
    alt:img.getAttribute('alt'),canvasBelow:[...stage.querySelectorAll(':scope > canvas')].every(canvas=>canvas.compareDocumentPosition(poster)&Node.DOCUMENT_POSITION_FOLLOWING)};
},stages[name]);
const waitImage=(page,name)=>page.waitForFunction(selector=>{const img=document.querySelector(selector+' .scene-poster img');return img?.complete&&img.naturalWidth>0;},stages[name],{timeout:30000});
const ready={missions:'[data-sample-missions][data-ready="true"]',planetary:'[data-planetary-explorer][data-render-state="ready"]',origins:'.origins-study[data-render-state="ready"]'};
const foot={missions:'.mission-loading',origins:'.scene-load-state',planetary:'.planetary-status'};

try{
  // Loading: the poster fills the stage, the tier follows the layout, and the loading line sits at the foot.
  for(const width of [1440,390])for(const name of Object.keys(stages)){
    const {page,context}=await open(name,{width,hold:true});
    await waitImage(page,name);
    const state=await read(page,name);
    assert.ok(state,`${name}: the stage has a poster`);
    assert.equal(state.alt,'',`${name}: the poster is decorative (empty alt)`);
    assert.equal(state.opacity,1,`${name} at ${width}: the poster shows while the scene loads`);
    assert.equal(state.natural,width>760?1600:640,`${name} at ${width}: the ${width>760?'desktop':'phone'} tier loads (${state.src})`);
    for(const key of ['x','y','w','h'])assert.ok(Math.abs(state.poster[key]-state.stage[key])<=1,`${name} at ${width}: the poster covers the stage (${JSON.stringify(state)})`);
    const band=await page.locator(`${stages[name]} ${foot[name]}`).boundingBox();
    assert.ok(band&&Math.abs(band.y+band.height-(state.stage.y+state.stage.h))<=14,`${name} at ${width}: the loading line sits at the foot of the plate`);
    assert.ok(band.height<state.stage.h*.35,`${name} at ${width}: the loading line leaves the poster in view (${band.height} of ${state.stage.h})`);
    await context.close();
  }

  // Ready: the canvas lies under the poster, the poster fades out and is marked done, and a reload of the scene
  // (another mission, another planetary view) does not bring it back.
  for(const name of Object.keys(stages)){
    const {page,context}=await open(name);
    await page.waitForSelector(ready[name],{timeout:120000});
    await page.waitForTimeout(400);
    const state=await read(page,name);
    assert.equal(state.done,true,`${name}: the viewer marks the poster done when ready`);
    assert.equal(state.opacity,0,`${name}: the poster has faded out once the scene is ready`);
    assert.equal(state.canvasBelow,true,`${name}: the scene canvas sits under the poster in the stage`);
    if(name==='missions'){
      await page.locator('[data-mission="osiris-rex"]').click();
      await page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready!=='true',null,{timeout:10000}).catch(()=>{});
      assert.equal((await read(page,name)).opacity,0,'missions: switching missions leaves the poster out');
      await page.waitForSelector(ready[name],{timeout:120000});
    }
    if(name==='planetary'){
      await page.locator('[data-view="shape"]').click();
      await page.waitForFunction(()=>document.querySelector('.planetary').dataset.mode==='shape');
      const shape=await read(page,name);
      assert.ok(shape.opacity===0||shape.display==='none','planetary: another view leaves the poster out');
    }
    await context.close();
  }

  // Failures: the planetary reference image replaces the poster; Origins keeps it under the full message.
  {
    const {page,context}=await open('planetary',{abort:'**/assets/data/planetary/*.json'});
    await page.waitForSelector('[data-planetary-explorer][data-render-state="error"]',{timeout:30000});
    assert.equal((await read(page,'planetary')).display,'none','planetary: a failed scene shows its reference image, not the poster');
    assert.equal(await page.locator('.planetary [data-fallback]').isVisible(),true,'planetary: the reference image shows');
    await context.close();
  }
  {
    const {page,context}=await open('origins',{abort:'**/_astro/main.*.js'});
    await page.waitForSelector('.origins-study[data-render-state="error"]',{timeout:30000});
    const state=await read(page,'origins');
    assert.equal(state.display,'block','origins: the poster stays under the failure message');
    const message=await page.locator('.origins-study .scene-load-state').boundingBox();
    assert.ok(Math.abs(message.height-state.stage.h)<=2,'origins: a failed scene keeps the full overlay above the poster');
    assert.equal(await page.locator('#retry-scene').isVisible(),true,'origins: Retry shows');
    await context.close();
  }

  // Without JavaScript the posters stay; under reduced motion the fade is at most 120 ms.
  for(const name of Object.keys(stages)){
    const {page,context}=await open(name,{javaScriptEnabled:false});
    await waitImage(page,name);
    assert.equal((await read(page,name)).opacity,1,`${name}: without JavaScript the poster stays`);
    await context.close();
  }
  {
    const {page,context}=await open('origins',{hold:true,reducedMotion:'reduce'});
    const seconds=parseFloat((await read(page,'origins')).duration);
    assert.ok(seconds<=.12,`origins: reduced motion keeps the poster fade within 120 ms (${seconds}s)`);
    await context.close();
  }
  console.log('Scene posters: loading, ready, reload, failure, no-script and reduced-motion states hold for missions, planetary and Origins.');
}finally{
  await browser.close();
}
