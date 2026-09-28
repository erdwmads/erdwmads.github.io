import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import os from 'node:os';import path from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE}),base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
const ready=page=>page.waitForFunction(()=>window.study&&document.querySelector('.origins-study').dataset.renderState==='ready',null,{timeout:90000});
const box=locator=>locator.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y+scrollY,w:r.width,h:r.height};});
const inside=(a,b)=>a.x>=b.x-.5&&a.y>=b.y-.5&&a.x+a.w<=b.x+b.w+.5&&a.y+a.h<=b.y+b.h+.5,apart=(a,b)=>a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y;
try{
 for(const [width,height,mobile] of [[1440,1000,false],[760,1000,false],[390,844,true],[320,700,true]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme','space');});
  await page.goto(base+'/origins-study.html#stage=1&progress=1');await ready(page);
  const locator=page.locator('#section-locator');
  for(const stage of [0,1,3]){await page.evaluate(s=>study.select(s,.5),stage);assert(await locator.isHidden(),'Locator belongs to chapter 03 only');}
  await page.evaluate(()=>study.select(2,.05));await page.locator('#viewport').scrollIntoViewIfNeeded();assert(await locator.isVisible());
  // Scale cue and calibration are stated, not implied.
  const label=await locator.getAttribute('aria-label');assert.equal(await locator.getAttribute('role'),'img');
  for(const word of [/schematic/i,/millimetre-scale/,/kilometre-scale/,/chapter 02/,/illustrative/])assert.match(label,word);
  const text=await locator.innerText();assert.match(text,/schematic/i);assert.match(text,/mm scale/);assert.match(text,/km scale/);if(width>380)assert.match(text,/illustrative/i);
  // The locator image is the rendered chapter 02 body: a lit object centred on a dark field.
  const image=await locator.locator('canvas').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,l=(x,y)=>{const i=(Math.round(y)*c.width+Math.round(x))*4;return d[i]+d[i+1]+d[i+2];};let lit=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>90)lit++;return{lit:lit/(d.length/4),centre:l(c.width/2,c.height/2),corner:l(2,2)};});
  assert(image.lit>.25&&image.lit<.9,'The body fills the locator without flooding it');assert(image.centre>image.corner+60,'The body sits on a dark field');
  const view=await box(page.locator('#viewport')),own=await box(locator);assert(inside(own,view),'Locator stays inside the scene at '+width);
  for(const other of ['#explore','.scene-hint'])if(await page.locator(other).isVisible())assert(apart(own,await box(page.locator(other))),'Locator clears '+other+' at '+width);
  assert.equal(await locator.evaluate(e=>getComputedStyle(e).pointerEvents),'none','Dragging over the locator still reaches the scene');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);
  await page.locator('.theme-toggle').evaluate(e=>e.click());await page.waitForTimeout(200);
  assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.deepEqual(await box(locator),own,'Themes keep the locator geometry');
  await page.locator('#viewport').scrollIntoViewIfNeeded();await page.locator('.scene-frame').screenshot({path:path.join(os.tmpdir(),`origins-locator-${width}.png`)});
  if(width===1440){
   await page.evaluate(()=>document.querySelector('#scene').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());await page.locator('#retry-scene').waitFor();
   assert(await locator.isHidden(),'The locator leaves with the 3D scene');
   await page.locator('#retry-scene').click();await ready(page);assert.equal(await page.evaluate(()=>study.state.stage),2);assert(await locator.isVisible(),'Retry restores the locator');
  }
  assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px: chapter 03 locator, scale statement, placement, themes');
 }
}finally{await browser.close();}
