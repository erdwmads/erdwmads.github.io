// The planetary field guide shows the scene before the orbital time controls at every width. Phones (760px and
// below) fold the date, speed and view selects behind a "View settings" disclosure under the scene. The controls stay
// keyboard reachable, the DOM order follows the visual order, and wider screens keep the view selects in the toolbar
// above the scene and the date and speed beside play. Finally the plate holds one height across views and widths.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||process.env.TEST_BASE_URL||'http://127.0.0.1:52523';
const tops=root=>root.evaluate(r=>{const top=s=>r.querySelector(s).getBoundingClientRect().top;return {stage:top('[data-stage]'),time:top('[data-time-controls]'),play:top('[data-action="play"]'),scope:top('[data-scope]')};});
const before=(root,a,b)=>root.evaluate((r,[a,b])=>Boolean(r.querySelector(a).compareDocumentPosition(r.querySelector(b))&Node.DOCUMENT_POSITION_FOLLOWING),[a,b]);
try{
 for(const theme of ['space','light']){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await context.addInitScript(t=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',t);},theme);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/ryugu-bennu.html#observe=1&view=orbit&day=661',{waitUntil:'networkidle'});
  const root=page.locator('[data-planetary-explorer]'),summary=root.locator('[data-view-settings] > summary');
  await page.waitForFunction(()=>{const r=document.querySelector('[data-planetary-explorer]');return r.dataset.renderState==='ready'&&!r.querySelector('[data-time-controls]').disabled;},null,{timeout:60000});
  // The scene comes first; play, the timeline and the clock status follow it; the secondary controls are folded away.
  let at=await tops(root);
  assert.ok(at.stage<at.time&&at.stage<at.play,`${theme}: the scene precedes the time controls on phones`);
  assert.ok(await before(root,'[data-stage]','[data-action="play"]'),'DOM order matches the visual order');
  assert.ok(await root.locator('[data-timeline]').isVisible(),'the timeline stays visible');
  assert.ok(await summary.isVisible(),'the View settings disclosure is shown under the scene');
  assert.equal(await summary.innerText(),'View settings');
  for(const s of ['[data-date]','[data-speed]','[data-scope]','[data-angle]','[data-action="now"]'])assert.equal(await root.locator(s).isVisible(),false,`${s} is folded away`);
  // Keyboard: the summary takes focus and opens with Enter; Tab then reaches the date field and the selects.
  await summary.focus();await page.keyboard.press('Enter');
  for(const s of ['[data-date]','[data-speed]','[data-scope]','[data-angle]','[data-action="now"]'])assert.ok(await root.locator(s).isVisible(),`${s} is shown when open`);
  await page.keyboard.press('Tab');
  assert.ok(await root.locator('[data-date]').evaluate(e=>e===document.activeElement||e.contains(document.activeElement)),'Tab moves from the summary to the date');
  at=await tops(root);assert.ok(at.scope>at.stage,'view selects sit under the scene');
  await root.locator('[data-speed]').selectOption('86400');
  await root.locator('[data-scope]').selectOption('solar');
  await page.waitForFunction(()=>document.querySelector('[data-planetary-explorer] [data-object="inner"]'),null,{timeout:30000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${theme}: no horizontal overflow`);
  // Wider screens return the selects to their places, keeping focus on a moved control.
  await root.locator('[data-speed]').focus();
  await page.setViewportSize({width:1024,height:844});
  await page.waitForFunction(()=>document.querySelector('[data-view-settings]').hidden);
  at=await tops(root);
  assert.ok(at.scope<at.stage&&at.stage<at.time,'above 760px the view selects return above the scene; the time controls stay under it');
  assert.ok(await root.locator('[data-speed]').evaluate(e=>e===document.activeElement),'focus stays on the moved control');
  assert.equal(await root.locator('[data-speed]').inputValue(),'86400','the moved control keeps its value');
  assert.equal(await root.locator('[data-time-controls] > [data-action="play"] + label').count(),1,'the date returns beside play');
  // Narrowing to a phone with focus on a moved control opens the folded disclosure, so focus stays on that control.
  await root.locator('[data-view-settings]').evaluate(d=>{d.open=false;});
  await root.locator('[data-speed]').focus();
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>!document.querySelector('[data-view-settings]').hidden);
  assert.ok(await root.locator('[data-speed]').evaluate(e=>e===document.activeElement),`${theme}: focus stays on the moved control at phone width`);
  assert.equal(await root.locator('[data-view-settings]').evaluate(d=>d.open),true,'View settings opens to show the focused control');
  at=await tops(root);assert.ok(at.stage<at.time,'phones again put the scene first');
  // Outside the orbit view the time controls and the disclosure are hidden together.
  await root.locator('[data-view="minerals"]').click();
  assert.equal(await summary.isVisible(),false,'no View settings outside the orbit view');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(`PASS ${theme}: phone field guide shows the scene first, View settings is keyboard reachable, wider screens restore the selects`);
 }
 // Desktop keeps the view selects above the scene and the time controls under it, and never shows the disclosure.
 const desktop=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await desktop.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await desktop.goto(base+'/ryugu-bennu.html#observe=1&view=orbit&day=661',{waitUntil:'networkidle'});
 const root=desktop.locator('[data-planetary-explorer]');
 await desktop.waitForFunction(()=>document.querySelector('[data-planetary-explorer]').dataset.renderState==='ready',null,{timeout:60000});
 const at=await tops(root);
 assert.ok(at.scope<at.stage&&at.stage<at.time,'desktop view selects stay above the scene, the time controls under it');
 assert.ok(await before(root,'[data-stage]','[data-action="play"]'),'desktop DOM order matches the visual order');
 assert.equal(await root.locator('[data-view-settings]').isVisible(),false);
 assert.ok(await root.locator('[data-date]').isVisible()&&await root.locator('[data-speed]').isVisible());
 console.log('PASS desktop keeps the view selects above the scene and the time controls under it');
 // Reserved space: in every view the visible plate starts at one height, the Orgueil note is as tall as the stage,
 // and no hidden box that keeps its space (data-reserve-space) leaves a dead band between the figure and the reading.
 const measure=root=>root.evaluate(r=>{
  const shown=e=>e&&!e.hidden&&getComputedStyle(e).display!=='none';
  const plate=[...r.querySelectorAll('[data-stage],[data-ci-figure],[data-sample-figure]')].find(shown).getBoundingClientRect();
  const blocks=[...r.querySelector('.planetary-visual').children].filter(e=>shown(e)&&getComputedStyle(e).visibility==='visible'&&e.getBoundingClientRect().height>0);
  const last=blocks.at(-1).getBoundingClientRect(),summary=r.querySelector('[data-summary]').getBoundingClientRect();
  const tools=r.querySelector('[data-shape-tools]'),toolsBox=tools.getBoundingClientRect();
  const toolbar=r.querySelector('.planetary-toolbar').getBoundingClientRect().top;
  return {plate:plate.top-toolbar,reading:summary.top-toolbar,height:plate.height,gap:summary.top>=last.bottom-1?summary.top-last.bottom:null,tools:{box:toolsBox.height,afterStage:Boolean(r.querySelector('[data-stage]').compareDocumentPosition(tools)&Node.DOCUMENT_POSITION_FOLLOWING)}};
 });
 for(const [width,touch] of [[1440,false],[768,true],[390,true]]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  await context.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
  const page=await context.newPage();
  await page.goto(base+'/ryugu-bennu.html#observe=1&view=orbit&day=661',{waitUntil:'networkidle'});
  const root=page.locator('[data-planetary-explorer]');
  await page.waitForFunction(()=>document.querySelector('[data-planetary-explorer]').dataset.renderState==='ready',null,{timeout:60000});
  const seen={};
  for(const [view,material] of [['orbit','bennu'],['shape','bennu'],['shape','orgueil'],['sample','bennu'],['minerals','bennu']]){
   await root.locator(`[data-view="${view}"]`).click();
   await root.locator(`[data-material="${material}"]`).click();
   await page.waitForFunction(([v,m])=>{const r=document.querySelector('[data-planetary-explorer]');return r.dataset.mode===v&&r.querySelector(`[data-material="${m}"]`).getAttribute('aria-pressed')==='true';},[view,material]);
   const at=await measure(root),name=`${width}${touch?' touch':''} ${view}/${material}`;
   seen[`${view}/${material}`]=at;
   assert.ok(Math.abs(at.plate-seen['orbit/bennu'].plate)<=1,`${name}: the plate starts ${at.plate}px under the toolbar, not ${seen['orbit/bennu'].plate}px`);
   // Orgueil keeps the hidden shape tools' row in Shapes, so the reading holds still (checked below).
   if(at.gap!==null&&!(view==='shape'&&material==='orgueil'))assert.ok(at.gap<=25,`${name}: ${at.gap}px between the figure and the reading`);
   if(width<=760){
    assert.ok(at.tools.afterStage,`${name}: phones move the shape tools under the scene`);
    if(view!=='shape')assert.equal(at.tools.box,0,`${name}: the shape tools reserve nothing outside Shapes`);
   }
  }
  assert.ok(Math.abs(seen['shape/orgueil'].height-seen['orbit/bennu'].height)<=1,`${width}: the Orgueil note is as tall as the stage`);
  assert.ok(Math.abs(seen['shape/orgueil'].reading-seen['shape/bennu'].reading)<=1,`${width}: choosing Orgueil in Shapes moves the reading`);
  await context.close();
  console.log(`PASS ${width}${touch?' touch':''}: one plate height in every view, no dead band before the reading`);
 }
}finally{await browser.close();}
