import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));await page.goto(base+'/origins-study.html');await page.waitForFunction(()=>window.study);
 assert.equal(await page.locator('.scene-frame').count(),1,'The 3D scene has its own framed region');
 await page.evaluate(()=>study.select(2,.4));assert(await page.locator('.chapter-heading').evaluate(e=>e.getAnimations().length>0),'Chapter changes animate the narrative');
 await page.evaluate(()=>{study.select(1);study.select(3);study.setProgress(.7);});await page.waitForTimeout(550);
 assert.equal(await page.locator('#scene-counter').innerText(),'04 / 04');assert.equal(await page.evaluate(()=>study.state.stage),3);
 await page.locator('#play').click();assert.equal(await page.evaluate(()=>study.state.playing),true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!study.state.playing,null,{timeout:1000});await page.evaluate(()=>study.select(2,.4));assert.equal(await page.locator('.chapter-heading').evaluate(e=>e.getAnimations().length),0,'Reduced motion avoids narrative animation');
 await page.locator('#phase-mode').click();assert(await page.locator('#legend').isVisible());assert(!(await page.locator('#material-note').isVisible()));
 await page.locator('#material-mode').click();assert(await page.locator('#material-note').isVisible());
 for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:1050});await page.waitForTimeout(120);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const overlap=await page.evaluate(()=>{const es=['.chapter-copy','.scene-frame','.scene-controls','.transport','.chapters'].map(s=>({s,r:document.querySelector(s).getBoundingClientRect()}));return es.flatMap((a,i)=>es.slice(i+1).filter(b=>Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>1&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>1).map(b=>[a.s,b.s]));});assert.deepEqual(overlap,[],'Regions do not overlap at '+width);
 }
 assert.deepEqual(errors,[]);console.log('PASS regions, rapid chapter switching, motion preferences and mode labels');
 await page.close();
}finally{await browser.close();}
