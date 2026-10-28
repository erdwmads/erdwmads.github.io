// The mission chapter strip shows that it scrolls: an edge fade on the side with more chapters and an "n / total"
// position cue beside it. A vertical swipe on the strip still scrolls the page (single-axis touch from round one).
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||process.env.TEST_BASE_URL||'http://127.0.0.1:52523';
const strip=page=>page.evaluate(()=>{const s=document.querySelector('[data-mission-chapters]'),cue=document.querySelector('[data-mission-chapter-position]'),style=getComputedStyle(s),cr=cue.getBoundingClientRect(),sr=s.getBoundingClientRect();
 return {overflow:s.dataset.overflow,mask:style.maskImage||style.webkitMaskImage,cue:cue.textContent.trim(),cueVisible:cr.width>0&&cr.height>0,cueBeside:cr.left>=sr.right-1&&cr.top<sr.bottom&&cr.bottom>sr.top,cueSize:parseFloat(getComputedStyle(cue).fontSize),scrollable:s.scrollWidth>s.clientWidth,touchAction:style.touchAction};});
try{
 for(const theme of ['space','light']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(t=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',t);},theme);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/ryugu-bennu.html',{waitUntil:'networkidle'});
  const root=page.locator('[data-sample-missions]');
  await root.locator('[data-mission-chapters]').scrollIntoViewIfNeeded();
  let s=await strip(page);
  assert.ok(s.scrollable,'the strip overflows on a phone');
  assert.equal(s.overflow,'end','at the start only the end edge fades');
  assert.match(s.mask,/linear-gradient/,'an edge fade is applied');
  assert.equal(s.cue,'01 / 11');assert.ok(s.cueVisible&&s.cueBeside,'the position cue sits beside the strip');
  assert.ok(s.cueSize>=11,'the cue is readable');
  assert.match(s.touchAction,/^(manipulation|pan-x pan-y pinch-zoom)$/,'the strip keeps both touch axes');
  // A chapter in the middle: both edges fade and the cue follows the current chapter.
  await root.locator('[data-mission-chapters] [data-mission-stage="5"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-mission-chapters]').dataset.overflow==='start end');
  s=await strip(page);assert.equal(s.cue,'06 / 11');
  await root.locator('[data-mission-action="next"]').click();
  assert.equal((await strip(page)).cue,'07 / 11','Next updates the cue');
  // The last chapter: only the start edge fades.
  await root.locator('[data-mission-chapters] [data-mission-stage="10"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-mission-chapters]').dataset.overflow==='start');
  assert.equal((await strip(page)).cue,'11 / 11');
  // Switching mission rebuilds the strip and resets the cue to that mission's chapter count.
  await root.locator('[data-mission="osiris-rex"]').click();
  await page.waitForFunction(()=>/^01 \/ \d\d$/.test(document.querySelector('[data-mission-chapter-position]').textContent));
  const total=await root.locator('[data-mission-chapters] [data-mission-stage]').count();
  assert.equal((await strip(page)).cue,`01 / ${String(total).padStart(2,'0')}`);
  // Swipes that start on the strip: vertical scrolls the page, horizontal scrolls the strip.
  const cdp=await context.newCDPSession(page);
  const swipe=async(dx,dy)=>{
   await page.evaluate(()=>{const e=document.querySelector('[data-mission-chapters]');scrollTo(0,e.getBoundingClientRect().top+scrollY-innerHeight/2);});
   await page.waitForTimeout(250);
   const box=await root.locator('[data-mission-chapters]').boundingBox(),x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
   assert.ok(await page.evaluate(([x,y])=>Boolean(document.elementFromPoint(x,y)?.closest('[data-mission-chapters]')),[x,y]),'the swipe starts on the strip');
   const before=await page.evaluate(()=>({page:scrollY,strip:document.querySelector('[data-mission-chapters]').scrollLeft}));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});await page.waitForTimeout(16);}
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await page.waitForTimeout(400);
   const after=await page.evaluate(()=>({page:scrollY,strip:document.querySelector('[data-mission-chapters]').scrollLeft}));
   return {page:after.page-before.page,strip:after.strip-before.strip};
  };
  const vertical=await swipe(0,-240);
  assert.ok(vertical.page>100,`a vertical swipe on the strip scrolls the page (${vertical.page}px)`);
  const horizontal=await swipe(-160,0);
  assert.ok(horizontal.strip>60&&Math.abs(horizontal.page)<20,`a horizontal swipe scrolls the strip, not the page (${JSON.stringify(horizontal)})`);
  await page.waitForFunction(()=>document.querySelector('[data-mission-chapters]').dataset.overflow==='start end');
  await cdp.detach();
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(`PASS ${theme}: chapter strip edge fade, n / total cue and vertical page scrolling`);
 }
 // Desktop: the strip still overflows slightly at 1440, so the cue and the end fade are present there too.
 const desktop=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await desktop.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await desktop.goto(base+'/ryugu-bennu.html',{waitUntil:'networkidle'});
 await desktop.locator('[data-mission-chapters]').scrollIntoViewIfNeeded();
 const s=await strip(desktop);
 assert.equal(s.cue,'01 / 11');assert.ok(s.cueVisible&&s.cueBeside);
 if(s.scrollable)assert.equal(s.overflow,'end');else assert.equal(s.overflow,'');
 console.log('PASS desktop chapter strip cue and fade');
}finally{await browser.close();}
