import {toggleFx} from './display-settings-helper.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try{
 for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/index.html?inspect=1`);
  assert.equal(await page.locator('#cosmic-arrival').count(),1,'New entrance is integrated into the real site');
  await page.waitForFunction(()=>document.querySelector('#cosmic-arrival').dataset.state==='playing');
  assert.equal(await page.locator('#arrival-question').textContent(),'What was responsible for making diverse planets in the Solar System?');
  assert.equal(await page.locator('.entry-gate').count(),0,'No second, legacy intro');
  assert.equal(await page.locator('html').getAttribute('data-fx-intensity'),'immersive');
  assert.equal(await page.locator('#cosmic-arrival canvas').count(),1);
  const frames=[];
  for(const progress of [.14,.42,.77]){
   await page.waitForFunction(p=>Number(document.querySelector('#cosmic-arrival').dataset.progress)>=p,progress);
   const pixels=await page.locator('#cosmic-arrival canvas').evaluate(canvas=>{
    const gl=canvas.getContext('webgl2'),data=new Uint8Array(canvas.width*canvas.height*4);
    gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);
    let lit=0,hash=0;
    for(let i=0;i<data.length;i+=4){if(data[i]+data[i+1]+data[i+2]>80)lit++;hash=(Math.imul(hash,31)+data[i]+data[i+1]+data[i+2])>>>0;}
    return{lit,hash};
   });
   assert(pixels.lit>500,'Scene is visibly rendered');frames.push(pixels.hash);
   if(progress===.14) assert.equal(await page.locator('.arrival-name').evaluate(el=>Number(getComputedStyle(el).opacity)),0,'The question precedes the name');
   if(progress===.42) assert.equal(await page.locator('.arrival-name').evaluate(el=>Number(getComputedStyle(el).opacity)),1,'The name arrives during the Solar System stage');
   await page.screenshot({path:`.codex_tmp/arrival-${width}-${progress}.png`});
  }
  assert.equal(new Set(frames).size,3,'Galaxy, Solar System and Earth have distinct rendered frames');
  await page.waitForFunction(()=>!document.querySelector('#cosmic-arrival').open,{},{timeout:15000});
  assert.equal(await page.locator('#cosmic-arrival canvas').count(),0,'GPU resources removed after arrival');
  assert.equal(await page.locator('main').evaluate(el=>el.inert),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`.codex_tmp/arrival-home-${width}.png`});
  await page.locator('#arrival-replay').click();
  await page.locator('#arrival-skip').click();
  assert.equal(await page.locator('#cosmic-arrival').evaluate(el=>el.open),false);
  await page.reload();
  assert.equal(await page.locator('#cosmic-arrival').evaluate(el=>el.open),false,'Once per session');
  if(width===1440){
   assert.equal(await page.locator('.ambient-fx-toggle').getAttribute('aria-pressed'),'true');
   await page.locator('.obs-fx-settings').click();
   await page.locator('input[value="standard"]').check();
   await toggleFx(page);
   await page.reload();
   assert.equal(await page.locator('html').getAttribute('data-fx-intensity'),'standard','Explicit lower intensity is retained');
   assert.equal(await page.locator('.ambient-fx-toggle').getAttribute('aria-pressed'),'false','Explicit FX off is retained');
   await page.locator('.nav a[href="cv.html"]').click();
   await page.waitForURL('**/cv.html');
   assert.equal(await page.locator('#arrival-replay').isVisible(),false,'Replay is home-only');
   await page.locator('.nav a[href="index.html"]').click();
   await page.waitForURL('**/index.html');
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 const reduced=await browser.newPage({reducedMotion:'reduce'});
 await reduced.goto(`${base}/index.html`);
 assert.equal(await reduced.locator('#cosmic-arrival').evaluate(el=>el.open),false);
 assert.equal(await reduced.locator('#cosmic-arrival canvas').count(),0);
 await reduced.close();
 const failed=await browser.newPage();
 await failed.route('**/assets/img/arrival/earth-day.jpg',route=>route.abort());
 await failed.goto(`${base}/index.html`);
 await failed.waitForFunction(()=>document.querySelector('#cosmic-arrival').dataset.state==='complete');
 assert.equal(await failed.locator('#cosmic-arrival').evaluate(el=>el.open),false,'Texture failure does not block navigation');
 await failed.close();
 console.log('Arrival integration, lifecycle, responsive layout, highest default FX, preference persistence and failure recovery passed.');
}finally{await browser.close();}
