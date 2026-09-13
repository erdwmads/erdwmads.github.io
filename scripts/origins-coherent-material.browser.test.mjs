import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1560,height:1100},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/buffers too small|WebGL.*(error|invalid)/i.test(m.text()))errors.push(m.text());});
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/origins-study.html?revision=coherent-check#stage=1&progress=1');
 await page.waitForFunction(()=>window.study&&document.querySelector('.origins-study').dataset.renderState==='ready',null,{timeout:45000});
 await page.locator('#viewport').evaluate(e=>e.scrollIntoView({block:'center'}));
 for(const stage of [1,2,3]){
  await page.evaluate(s=>study.select(s),stage);await page.waitForTimeout(600);const camera=await page.evaluate(()=>study.state.camera);let last;
  for(const progress of [0,.35,.65,.85,1]){
   await page.evaluate(p=>study.setProgress(p),progress);await page.waitForTimeout(150);
   (await page.evaluate(()=>study.state.camera)).forEach((v,i)=>assert(Math.abs(v-camera[i])<1e-9));
   last=await page.locator('#viewport').screenshot({path:path.join(os.tmpdir(),`coherent-${stage}-${progress}.png`)});
  }
  await page.evaluate(()=>{study.setProgress(.42);study.setProgress(1)});await page.waitForTimeout(150);
  assert.deepEqual(await page.locator('#viewport').screenshot(),last,'Reverse scrubbing is deterministic');
  await page.evaluate(()=>{study.setProgress(.75);study.setPhase(true)});await page.waitForTimeout(200);
  await page.locator('#viewport').screenshot({path:path.join(os.tmpdir(),`coherent-process-${stage}.png`)});
  await page.evaluate(()=>study.setPhase(false));console.log('stage',stage,'frames and controls checked');
 }
 for(const width of [760,390,320]){
  await page.setViewportSize({width,height:950});await page.waitForTimeout(200);
  for(const stage of [1,2,3]){await page.evaluate(s=>{study.select(s);study.setProgress(1)},stage);await page.waitForTimeout(600);await page.locator('#viewport').screenshot({path:path.join(os.tmpdir(),`coherent-mobile-${width}-${stage}.png`)});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 }
 assert.deepEqual(errors,[]);console.log('PASS three stages, fixed cameras, reversible geometry, process modes, 3 responsive widths, no errors');
}finally{await browser.close();}})();
