// Phones (760px and below): the planetary field guide shows the scene before the orbital time controls, and the date,
// speed and view selects sit behind a "View settings" disclosure under it. The controls stay keyboard reachable,
// the DOM order follows the visual order, and wider screens keep the controls above the scene.
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
  // Wider screens restore the original placement, keeping focus on a moved control.
  await root.locator('[data-speed]').focus();
  await page.setViewportSize({width:1024,height:844});
  await page.waitForFunction(()=>document.querySelector('[data-view-settings]').hidden);
  at=await tops(root);
  assert.ok(at.time<at.stage&&at.scope<at.stage,'above 760px the controls return above the scene');
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
  console.log(`PASS ${theme}: phone field guide shows the scene first, View settings is keyboard reachable, wider screens restore the controls`);
 }
 // Desktop keeps the controls above the scene and never shows the disclosure.
 const desktop=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await desktop.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await desktop.goto(base+'/ryugu-bennu.html#observe=1&view=orbit&day=661',{waitUntil:'networkidle'});
 const root=desktop.locator('[data-planetary-explorer]');
 await desktop.waitForFunction(()=>document.querySelector('[data-planetary-explorer]').dataset.renderState==='ready',null,{timeout:60000});
 const at=await tops(root);
 assert.ok(at.time<at.stage&&at.scope<at.stage,'desktop controls stay above the scene');
 assert.equal(await root.locator('[data-view-settings]').isVisible(),false);
 assert.ok(await root.locator('[data-date]').isVisible()&&await root.locator('[data-speed]').isVisible());
 console.log('PASS desktop keeps the time and view controls above the scene');
}finally{await browser.close();}
