// Where keyboard focus lands when the home entrance closes. Motion is allowed and every page starts with a fresh
// sessionStorage, so the entrance really opens. Assertions:
// - CosmicArrival renders the skip link right after the dialog, so after Escape, or after the inline 3 s fallback
//   when the module never loads, nothing is focused by script (pointer users never see the skip link appear) and
//   the first Tab reaches the skip link instead of #arrival-replay.
// - Replay is the skip link's successor, and a replay returns focus to the Replay button.
// - A Save-Data skip never opens the dialog or moves focus.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const active=page=>page.evaluate(()=>{const el=document.activeElement;return !el||el===document.body?'body':el.matches('.site-skip-link')?'skip-link':el.id||el.tagName;});
const closed=page=>page.waitForFunction(()=>{const gate=document.querySelector('#cosmic-arrival');return !gate.open&&gate.dataset.state==='complete';});
const playing=page=>page.waitForFunction(()=>document.querySelector('#cosmic-arrival').dataset.state==='playing'&&document.activeElement?.id==='arrival-skip');
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/index.html`);
  assert.equal(await page.evaluate(()=>{const gate=document.querySelector('#cosmic-arrival'),skip=document.querySelector('.site-skip-link');return gate.nextElementSibling===skip&&skip.nextElementSibling?.id==='arrival-replay';}),true,'Order is dialog, skip link, Replay');
  await playing(page);
  await page.keyboard.press('Escape');
  await closed(page);
  assert.notEqual(await active(page),'skip-link',`${width}px: closing the intro does not focus (and so does not reveal) the skip link`);
  assert.equal(await page.evaluate(()=>scrollY),0,'Closing does not scroll the page');
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('cosmic-arrival-active')),false,'Scroll lock released');
  await page.keyboard.press('Tab');
  assert.equal(await active(page),'skip-link','The first Tab after the intro reaches the skip link, not Replay');
  await page.keyboard.press('Tab');
  assert.equal(await active(page),'arrival-replay','Replay follows the skip link');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await active(page),'skip-link','The skip link precedes Replay in the sequential order');
  if(width===1440){
   await page.keyboard.press('Tab');
   await page.keyboard.press('Enter');
   await playing(page);
   await page.keyboard.press('Escape');
   await closed(page);
   assert.equal(await active(page),'arrival-replay','After a replay, focus returns to the Replay button');
   // Skip intro has two click handlers: the inline one closes the dialog before entry.js finishes the run.
   await page.keyboard.press('Enter');
   await playing(page);
   await page.keyboard.press('Enter');
   await closed(page);
   assert.equal(await active(page),'arrival-replay','Skip intro after a replay also returns focus to Replay');
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 // Without the module, only the inline script runs; its fallback must close within the 3 s cap.
 const inline=await browser.newPage({viewport:{width:1440,height:900}});
 let blocked=0;
 await inline.route('**/_astro/CosmicArrival*.js',route=>{blocked++;return route.abort();});
 await inline.goto(`${base}/index.html`);
 assert.equal(await inline.evaluate(()=>document.querySelector('#cosmic-arrival').open),true,'Inline script opens the entrance');
 const opened=await inline.evaluate(()=>window.cosmicArrivalOpened);
 await inline.waitForFunction(()=>!document.querySelector('#cosmic-arrival').open,null,{timeout:8000});
 assert(blocked>0,'The arrival module request was intercepted');
 const waited=await inline.evaluate(start=>performance.now()-start,opened);
 assert(waited>=2900&&waited<4500,`Inline fallback closes after about 3 s (took ${Math.round(waited)} ms)`);
 assert.equal(await inline.evaluate(()=>document.documentElement.classList.contains('cosmic-arrival-active')),false);
 await inline.keyboard.press('Tab');
 assert.equal(await active(inline),'skip-link','After the inline fallback, the first Tab also reaches the skip link');
 await inline.close();
 // The entrance dialog persists across soft navigation. Start on Home with FX off (no entrance, no 'done' flag), turn FX
 // back on, then follow a header link: the inline opener must not run again and reopen the dialog over another page.
 const soft=await browser.newPage({viewport:{width:1440,height:900}});
 await soft.addInitScript(()=>{if(!sessionStorage.getItem('fx-test-init')){localStorage.setItem('madsAmbientFxEnabled','0');sessionStorage.setItem('fx-test-init','1');}});
 await soft.goto(`${base}/index.html`);
 await soft.waitForFunction(()=>document.querySelector('#cosmic-arrival').dataset.state==='complete');
 await soft.evaluate(()=>{localStorage.removeItem('madsAmbientFxEnabled');window.softNavMarker=1;window.softNavReady=false;window.addEventListener('mads:soft-nav-ready',()=>{window.softNavReady=true;},{once:true});});
 await soft.locator('.nav a[href="research.html"]').first().click();
 await soft.waitForFunction(()=>window.softNavReady===true&&window.softNavMarker===1&&document.body.classList.contains('ui-page-research'));
 assert.equal(await soft.evaluate(()=>document.querySelector('#cosmic-arrival').open),false,'Soft navigation does not reopen the entrance over another page');
 assert.equal(await soft.evaluate(()=>document.documentElement.classList.contains('cosmic-arrival-active')),false,'No scroll lock after soft navigation');
 await soft.close();
 // Save-Data skips the entrance up front, like reduced motion and FX off.
 const saver=await browser.newPage({viewport:{width:1440,height:900}});
 await saver.addInitScript(()=>Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}}));
 await saver.goto(`${base}/index.html`);
 await saver.waitForFunction(()=>document.querySelector('#cosmic-arrival').dataset.state==='complete');
 assert.equal(await saver.evaluate(()=>document.querySelector('#cosmic-arrival').open),false,'Save-Data never opens the entrance');
 assert.equal(await saver.locator('#cosmic-arrival canvas').count(),0);
 assert.equal(await saver.locator('#arrival-replay').isVisible(),false,'Replay stays hidden while Save-Data is on');
 assert.notEqual(await active(saver),'skip-link','A skipped entrance does not move focus');
 await saver.close();
 console.log('Arrival focus: closing never reveals the skip link, the first Tab reaches it before Replay, Replay regains focus after a replay, Save-Data skips the entrance.');
}finally{await browser.close();}
