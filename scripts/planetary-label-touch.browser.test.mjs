import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
// The label layout follows the displayed date, which otherwise opens on today's UTC date. day counts days from the
// timeline start (2025-01-01 UTC). day=365 (2026-01-01) has isolated labels. day=661 (2026-10-24) crowds Mercury,
// Venus and Earth around the Sun: a tap meant for Venus or Earth lies within a few pixels of a neighbouring label,
// where the browser's touch adjustment used to retarget its own click onto that neighbour (ending on Mercury).
const fixtures=[{day:365,taps:2,crowded:false},{day:661,taps:3,crowded:true}];
try{
 for(const fixture of fixtures){
  const {day}=fixture;
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/ryugu-bennu.html#observe=1&view=orbit&day='+day);
  const root=page.locator('[data-planetary-explorer]');
  await root.locator('[data-stage]').scrollIntoViewIfNeeded();
  // The restore finishes by scrolling the viewer into place; measure labels only after that.
  await page.waitForFunction(day=>{const r=document.querySelector('[data-planetary-explorer]');return r.dataset.renderState==='ready'&&Number(r.dataset.day)===day&&r.querySelector('[data-share-status]').textContent==='Saved observation restored';},day,{timeout:60000});
  // Count every selection, so a second (retargeted) selection for one tap is caught even if it repeats the first.
  await page.evaluate(()=>{window.__selections=[];const title=document.querySelector('[data-planetary-explorer] [data-object-title]');new MutationObserver(()=>window.__selections.push(title.textContent)).observe(title,{childList:true,characterData:true,subtree:true});});
  // Tap 9px outside a drawn label, on the scene itself, where that label is the nearest one.
  // Selecting an object can move the labels, so targets are measured afresh before each tap.
  const findTarget=done=>root.locator('button.planetary-label').evaluateAll((labels,done)=>{
   const boxes=labels.filter(l=>!l.hidden&&l.getBoundingClientRect().width).map(l=>{const r=l.getBoundingClientRect();return {name:l.textContent.trim(),h:r.height,l:r.left,r:r.right,t:r.top,b:r.bottom,cx:r.left+r.width/2,cy:r.top+r.height/2,x:r.left+r.width/2,y:r.top-9};});
   const edge=(p,o)=>Math.hypot(Math.max(o.l-p.x,0,p.x-o.r),Math.max(o.t-p.y,0,p.y-o.b));
   const candidates=boxes.filter(b=>!done.includes(b.name)&&document.elementFromPoint(b.x,b.y)?.tagName==='CANVAS'&&boxes.every(o=>o===b||Math.hypot(b.x-o.cx,b.y-o.cy)>Math.hypot(b.x-b.cx,b.y-b.cy)+4));
   // Prefer taps that sit close to a neighbouring label: these are the ones touch adjustment can retarget.
   const scored=candidates.map(b=>({...b,neighbour:Math.min(...boxes.filter(o=>o!==b).map(o=>edge(b,o)))})).sort((a,b)=>a.neighbour-b.neighbour);
   return scored[0];
  },done);
  const tapped=[],closest=[];
  for(let i=0;i<fixture.taps;i++){
   const target=await findTarget(tapped);
   assert(target,`day ${day}: need a label whose 44px target is nearest after ${tapped}`);
   assert(target.h<30,'orbit labels keep their compact drawn size');
   await page.evaluate(()=>{window.__selections=[];});
   await page.touchscreen.tap(target.x,target.y);
   await page.waitForFunction(n=>document.querySelector('[data-planetary-explorer] [data-object-title]')?.textContent===n,target.name,{timeout:5000});
   // Give a retargeted native click time to arrive, then require that the tap still ends on its label.
   await page.waitForTimeout(500);
   const title=await root.locator('[data-object-title]').textContent();
   assert.equal(title,target.name,`day ${day}: a tap 9px above ${target.name} must end on ${target.name}, not ${title}`);
   const distinct=[...new Set(await page.evaluate(()=>window.__selections))];
   assert.deepEqual(distinct,[target.name],`day ${day}: one tap selects one object (saw ${distinct})`);
   tapped.push(target.name);closest.push(Math.round(target.neighbour));
  }
  if(fixture.crowded) assert(Math.min(...closest)<=12,`day ${day} must exercise a crowded tap within 12px of another label (closest ${closest})`);
  if(!fixture.crowded){
   // A tap on empty scene, then within 800 ms a tap on a label whose finger travels 10px (over the 5px this viewer
   // resolves itself, within the browser's tap slop): the browser's own click must still select that label.
   const layout=()=>root.evaluate(r=>{
    const labels=[...r.querySelectorAll('button.planetary-label')].filter(l=>!l.hidden&&l.getBoundingClientRect().width).map(l=>{const b=l.getBoundingClientRect();return {name:l.textContent.trim(),w:b.width,l:b.left,r:b.right,t:b.top,b:b.bottom,cx:b.left+b.width/2,cy:b.top+b.height/2};});
    const s=r.querySelector('[data-stage]').getBoundingClientRect(),gap=(x,y,o)=>Math.hypot(Math.max(o.l-x,0,x-o.r),Math.max(o.t-y,0,y-o.b));
    let empty=null;
    for(let x=s.left+12;x<s.right-12;x+=12)for(let y=s.top+12;y<s.bottom-12;y+=12){
     if(document.elementFromPoint(x,y)?.tagName!=='CANVAS')continue;
     const clear=Math.min(...labels.map(o=>gap(x,y,o)));if(!empty||clear>empty.clear)empty={x,y,clear};
    }
    const title=r.querySelector('[data-object-title]').textContent;
    const label=labels.filter(b=>b.name!==title&&b.w>=30&&labels.every(o=>o===b||gap(b.cx,b.cy,o)>40))[0];
    return {empty,label};
   });
   // Labels follow the scene and the page can still be settling: measure until two readings agree.
   let before=await layout(),now;
   for(let i=0;i<20;i++){await page.waitForTimeout(250);now=await layout();if(JSON.stringify(now)===JSON.stringify(before))break;before=now;}
   const {empty,label}=now;
   assert(empty&&empty.clear>60,`day ${day}: need empty scene at least 60px from every label (${JSON.stringify(empty)})`);
   assert(label,`day ${day}: need an isolated label other than the selected one`);
   await page.evaluate(()=>{window.__downs=[];document.addEventListener('pointerdown',e=>window.__downs.push(e.timeStamp),{capture:true});});
   await page.touchscreen.tap(empty.x,empty.y);
   const cdp=await context.newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:label.cx-5,y:label.cy}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:label.cx+5,y:label.cy}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const downs=await page.evaluate(()=>window.__downs);
   assert.equal(downs.length,2,`day ${day}: two taps (${downs})`);
   assert(downs[1]-downs[0]<800,`day ${day}: the label tap must follow the empty tap within 800 ms (${Math.round(downs[1]-downs[0])} ms)`);
   await page.waitForFunction(n=>document.querySelector('[data-planetary-explorer] [data-object-title]')?.textContent===n,label.name,{timeout:5000}).catch(()=>{});
   assert.equal(await root.locator('[data-object-title]').textContent(),label.name,`day ${day}: a 10px-jittered tap on ${label.name} right after an empty-scene tap must select ${label.name}`);
   console.log(`PASS day ${day}: an empty-scene tap does not swallow the next, jittered label tap (${label.name}, ${Math.round(downs[1]-downs[0])} ms later)`);
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS day ${day}: orbit labels answer touch taps within a 44px target without changing their drawn size: ${tapped.join(', ')} (nearest other label ${closest.join(', ')} px away)`);
  await context.close();
 }
}finally{await browser.close();}
