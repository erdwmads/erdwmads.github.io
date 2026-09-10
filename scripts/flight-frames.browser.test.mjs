import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {missions} from '../src/scripts/sample-missions/data.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto(base+'/research.html');
 const root=page.locator('[data-sample-missions]'),viewport=root.locator('[data-mission-viewport]');
 await viewport.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>window.sampleMissions&&document.querySelector('[data-sample-missions]').dataset.ready==='true',null,{timeout:45000});await ready();
 for(const id of ['hayabusa2','osiris-rex']){
  await page.evaluate(id=>sampleMissions.choose(id),id);await ready();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await viewport.scrollIntoViewIfNeeded();
   for(const [kind,p] of [['launch',0],['launch',.28],['launch',.7],['launch',1],['cruise',.45],['landing',0],['landing',.22],['landing',.42],['landing',.7],['landing',1]]){
    const stage=missions[id].stages.findIndex(s=>s.kind===kind);
    await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage,p});if(['launch','return','landing'].includes(kind))await root.locator('[data-mission-action="detail"]').click();await page.waitForTimeout(160);
    assert.equal(await page.evaluate(()=>sampleMissions.state.stage),stage);
    assert(await page.evaluate(()=>sampleMissions.state.calls>0));
    await root.locator('.mission-scene').screenshot({path:join(tmpdir(),`flight-frame-${id}-${kind}-${p}-${width}.png`)});
   }
  }
 }
 await page.goto(base+'/cv.html',{waitUntil:'networkidle'});
 for(const width of [1440,768,390])for(const theme of ['space','light']){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>{if(document.documentElement.dataset.theme!==theme)document.querySelector('.theme-toggle').click();},theme);
  const portrait=page.locator('.cv-photo img');await portrait.scrollIntoViewIfNeeded();
  const dimensions=await portrait.evaluate(img=>({loaded:img.complete&&img.naturalWidth>0,w:img.clientWidth,h:img.clientHeight,ratio:img.naturalWidth/img.naturalHeight}));
  assert(dimensions.loaded);assert(Math.abs(dimensions.w/dimensions.h-dimensions.ratio)<.02,'CV photo preserves its full composition');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:join(tmpdir(),`cv-restored-${width}-${theme}.png`)});
 }
 assert.deepEqual(errors,[]);console.log('PASS both missions launch/flyby/entry renders at 1440/390, no shader errors; original CV photograph loaded and uncropped at three widths in both themes');
}finally{await browser.close();}
