import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import os from 'node:os';import path from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1050},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/origins-study.html#stage=0&progress=.1');
 await page.waitForFunction(()=>window.study&&document.querySelector('.origins-study').dataset.renderState==='ready',null,{timeout:45000});
 for(const [stage,times] of [[0,[.1,.19375]],[1,[0,.32,.6,.8,1]],[3,[0,.3,.49,.65,.8,1]]]){
  await page.evaluate(s=>study.select(s),stage);await page.locator('#viewport').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  const camera=await page.evaluate(()=>study.state.camera),frames=[];
  for(const t of times){await page.evaluate(t=>study.setProgress(t),t);await page.waitForTimeout(120);assert((await page.evaluate(()=>study.state.camera)).every((v,i)=>Math.abs(v-camera[i])<1e-9),'Camera stays fixed');frames.push(await page.locator('#viewport').screenshot({path:path.join(os.tmpdir(),`motion-${stage}-${t}.png`)}));}
  assert.notDeepEqual(frames[0],frames[1],'Motion must visibly change the image');
  await page.evaluate(t=>study.setProgress(t),times[1]);await page.waitForTimeout(150);assert.deepEqual(await page.locator('#viewport').screenshot(),frames[1],'Reversing time must restore the same frame');
  await page.locator('#phase-mode').click();await page.evaluate(()=>study.setProgress(.65));await page.waitForTimeout(100);await page.locator('#viewport').screenshot({path:path.join(os.tmpdir(),`motion-${stage}-process.png`)});await page.locator('#material-mode').click();
  if(stage===0){await page.evaluate(()=>study.setProgress(.15));await page.locator('#play').click();await page.waitForTimeout(3200);await page.locator('#play').click();const advanced=await page.evaluate(()=>study.state.progress-.15);assert(advanced>.065&&advanced<.18,'Disk playback follows wall time rather than frame count');}
  if(stage!==0){const id=stage===1?'growth-sequence':'inheritance-sequence';assert(await page.locator('#'+id).isVisible());assert.equal(await page.locator('#'+id+' [aria-current="step"]').count(),1);}
 }
 for(const width of [760,390,320]){await page.setViewportSize({width,height:1000});for(const stage of [0,1,3]){await page.evaluate(s=>study.select(s,.65),stage);await page.waitForTimeout(100);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#viewport').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),`motion-mobile-${stage}-${width}.png`)});}}
 assert.deepEqual(errors,[]);console.log('PASS three chapters, actual WebGL motion, reversible frames, fixed cameras, stage cues, mobile widths, no console errors.');
}finally{await browser.close()}
