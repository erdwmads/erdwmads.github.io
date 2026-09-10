import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/origins-study.html');
 await page.locator('#viewport').scrollIntoViewIfNeeded();await page.waitForFunction(()=>window.study&&document.querySelector('.origins-study').dataset.inView==='true',null,{timeout:90000});
 await page.evaluate(()=>{study.setProgress(.5);study.select(1,.5);});
 assert.equal(await page.locator('.study-dissolve').count(),1,'Outgoing rendered scene must remain during crossfade');
 await page.waitForTimeout(110);
 const opacity=await page.locator('.study-dissolve').evaluate(n=>Number(getComputedStyle(n).opacity));assert(opacity>0&&opacity<1);
 await page.evaluate(()=>{study.select(2,.6);study.select(3,.6);});
 assert.equal(await page.locator('.study-dissolve').count(),1,'Rapid chapter selection must not stack snapshots');
 await page.waitForTimeout(700);assert.equal(await page.locator('.study-dissolve').count(),0);assert.equal(await page.evaluate(()=>study.state.stage),3);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>study.select(2,.5));assert.equal(await page.locator('.study-dissolve').count(),0);
 await page.evaluate(()=>{study.select(3,.7);study.setProgress(.7);});const early=await page.evaluate(()=>study.state.camera);await page.evaluate(()=>study.setProgress(.98));const late=await page.evaluate(()=>study.state.camera);assert.notDeepEqual(early,late,'Final camera follows the survivor');await page.locator('#zoom-in').click();const manual=await page.evaluate(()=>study.state.camera);await page.evaluate(()=>study.setProgress(.8));assert.deepEqual(await page.evaluate(()=>study.state.camera),manual,'Manual camera input suspends automatic framing');await page.locator('#reset').click();assert.notDeepEqual(await page.evaluate(()=>study.state.camera),manual);
 assert.deepEqual(errors,[]);console.log('PASS rendered chapter dissolve, rapid interruption and reduced motion');
}finally{await browser.close();}
