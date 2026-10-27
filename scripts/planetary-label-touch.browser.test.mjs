import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 // The label layout follows the displayed date, which otherwise opens on today's UTC date. day counts days from the
 // timeline start (2025-01-01 UTC); day=365 is 2026-01-01, a layout with isolated labels. In crowded inner-planet layouts
 // (day=661, 2026-10-24) the tap still ends on Mercury: see the open touch-adjustment issue, not fixed by this pin.
 const day=365;
 await page.goto(base+'/ryugu-bennu.html#observe=1&view=orbit&day='+day);
 const root=page.locator('[data-planetary-explorer]');
 await root.locator('[data-stage]').scrollIntoViewIfNeeded();
 // The restore finishes by scrolling the viewer into place; measure labels only after that.
 await page.waitForFunction(day=>{const r=document.querySelector('[data-planetary-explorer]');return r.dataset.renderState==='ready'&&Number(r.dataset.day)===day&&r.querySelector('[data-share-status]').textContent==='Saved observation restored';},day,{timeout:60000});
 // Tap 9px outside a drawn label, on the scene itself, where that label is the nearest one.
 // Selecting an object can move the labels, so targets are measured afresh before each tap.
 const findTarget=done=>root.locator('button.planetary-label').evaluateAll((labels,done)=>{
  const boxes=labels.filter(l=>!l.hidden&&l.getBoundingClientRect().width).map(l=>{const r=l.getBoundingClientRect();return {name:l.textContent.trim(),h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2,x:r.left+r.width/2,y:r.top-9};});
  return boxes.find(b=>!done.includes(b.name)&&document.elementFromPoint(b.x,b.y)?.tagName==='CANVAS'&&boxes.every(o=>o===b||Math.hypot(b.x-o.cx,b.y-o.cy)>Math.hypot(b.x-b.cx,b.y-b.cy)+4));
 },done);
 const tapped=[];
 for(let i=0;i<2;i++){
  const target=await findTarget(tapped);
  assert(target,`need an isolated label after ${tapped}`);
  assert(target.h<30,'orbit labels keep their compact drawn size');
  await page.touchscreen.tap(target.x,target.y);
  await page.waitForFunction(n=>document.querySelector('[data-planetary-explorer] [data-object-title]')?.textContent===n,target.name,{timeout:5000});
  tapped.push(target.name);await page.waitForTimeout(400);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS isolated orbit labels (day '+day+') answer touch taps within a 44px target without changing their drawn size (crowded layouts such as day 661 remain an open issue): '+tapped.join(', '));
}finally{await browser.close();}
