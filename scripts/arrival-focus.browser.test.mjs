// Where keyboard focus lands when the home entrance closes. Motion is allowed and every page starts with a fresh
// sessionStorage, so the entrance really opens. Assertions:
// - CosmicArrival renders the skip link right after the dialog, so after Escape, or after the inline 3 s fallback
//   when the module never loads, nothing is focused by script (pointer users never see the skip link appear) and
//   the first Tab reaches the skip link instead of #arrival-replay.
// - No width shows the fixed Replay button (2026-11-26: one persistent control on screen); Replay entrance stands in
//   the footer at every width, the skip link is followed by the brand, and a replay started from the footer (closed
//   with Escape or with Skip intro) returns focus to it.
// - A Save-Data skip never opens the dialog or moves focus.
// - Skip intro opens focused without the focus ring (owner, 2026-11-28): at rest, words over the beam, no rectangle;
//   the first key brings one focus treatment, the beam lit 2 px in the focus colour at 3:1 or more over the pool and
//   no outline, and that Tab stays on Skip; a replay started from the keyboard shows it at once; forced colours draw a
//   real outline. The target stays 44 px high.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const active=page=>page.evaluate(()=>{const el=document.activeElement;return !el||el===document.body?'body':el.matches('.site-skip-link')?'skip-link':el.matches('.footer-replay')?'footer-replay':el.matches('.brand')?'brand':el.id||el.tagName;});
const closed=page=>page.waitForFunction(()=>{const gate=document.querySelector('#cosmic-arrival');return !gate.open&&gate.dataset.state==='complete';});
const playing=page=>page.waitForFunction(()=>document.querySelector('#cosmic-arrival').dataset.state==='playing'&&document.activeElement?.id==='arrival-skip');
// Skip's focus treatment, read in the page: the ring state, the outline, the beam (background) and its contrast with the
// pool's surface colour laid over the night paper, both read inside the dialog (on-night tokens).
const skipState=page=>page.evaluate(()=>{
  const gate=document.querySelector('#cosmic-arrival'),skip=document.querySelector('#arrival-skip'),style=getComputedStyle(skip);
  const token=name=>{const probe=document.createElement('i');probe.style.color=`var(${name})`;gate.append(probe);const value=getComputedStyle(probe).color;probe.remove();return value;};
  const parse=value=>{const n=value.match(/[\d.]+/g).map(Number);return [n[0],n[1],n[2],n[3]??1];};
  const over=(top,ground)=>top.slice(0,3).map((c,i)=>c*top[3]+ground[i]*(1-top[3]));
  const lum=rgb=>{const [r,g,b]=rgb.map(c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4;});return .2126*r+.7152*g+.0722*b;};
  const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
  const focus=token('--obs-focus'),beam=style.backgroundImage.match(/^linear-gradient\((rgba?\([^)]*\)), \1\)$/)?.[1]||null;
  const pool=over(parse(token('--obs-surface')),parse(token('--obs-paper')));
  return {active:document.activeElement===skip,ring:skip.matches(':focus-visible'),outline:style.outlineStyle,outlineWidth:parseFloat(style.outlineWidth),
    image:style.backgroundImage,size:style.backgroundSize,beam,focus,contrast:beam?ratio(parse(beam),pool):0,height:skip.getBoundingClientRect().height};
});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/index.html`);
  assert.equal(await page.evaluate(()=>{const gate=document.querySelector('#cosmic-arrival'),skip=document.querySelector('.site-skip-link');return gate.nextElementSibling===skip&&skip.nextElementSibling?.id==='arrival-replay';}),true,'Order is dialog, skip link, Replay');
  await playing(page);
  let skip=await skipState(page);
  assert.deepEqual({active:skip.active,ring:skip.ring,outline:skip.outline,image:skip.image},{active:true,ring:false,outline:'none',image:'none'},`${width}px: Skip opens focused and at rest, with no focus ring`);
  assert(skip.height>=44,`${width}px: Skip keeps its 44 px target (${skip.height})`);
  await page.keyboard.press('Tab');
  skip=await skipState(page);
  assert.equal(skip.active,true,`${width}px: the first Tab stays on Skip`);
  assert.equal(skip.ring,true,`${width}px: the keyboard brings the focus treatment`);
  assert.equal(skip.outline,'none',`${width}px: keyboard focus draws no rectangle`);
  assert.equal(skip.size,'100% 2px',`${width}px: the focus beam is 2 px`);
  assert.equal(skip.beam,skip.focus,`${width}px: the focus beam takes the focus colour: ${skip.image}`);
  assert(skip.contrast>=3,`${width}px: the focus beam is ${skip.contrast.toFixed(2)}:1 over the pool, needs 3:1`);
  await page.keyboard.press('Escape');
  await closed(page);
  assert.notEqual(await active(page),'skip-link',`${width}px: closing the intro does not focus (and so does not reveal) the skip link`);
  assert.equal(await page.evaluate(()=>scrollY),0,'Closing does not scroll the page');
  assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('cosmic-arrival-active')),false,'Scroll lock released');
  await page.keyboard.press('Tab');
  assert.equal(await active(page),'skip-link','The first Tab after the intro reaches the skip link, not Replay');
  await page.keyboard.press('Tab');
  // One persistent control (2026-11-26): no width shows the fixed Replay button; Replay entrance lives in the footer
  // at every width, so the skip link is followed by the brand, and a replay started there returns focus to it.
  assert.equal(await page.locator('#arrival-replay').isVisible(),false,`${width}px: the fixed Replay button never shows`);
  assert.equal(await active(page),'brand',`${width}px: the skip link is followed by the brand`);
  const footerReplay=page.locator('.footer-replay');
  assert.equal(await footerReplay.isVisible(),true,`${width}px: Replay entrance stands in the footer`);
  await footerReplay.focus();
  await page.keyboard.press('Enter');
  await playing(page);
  assert.equal((await skipState(page)).ring,true,`${width}px: a replay started from the keyboard shows Skip's focus at once`);
  await page.keyboard.press('Escape');
  await closed(page);
  assert.equal(await active(page),'footer-replay',`${width}px: after a replay from the footer, focus returns there`);
  if(width===1440){
   // Skip intro has two click handlers: the inline one closes the dialog before entry.js finishes the run.
   await page.keyboard.press('Enter');
   await playing(page);
   await page.keyboard.press('Enter');
   await closed(page);
   assert.equal(await active(page),'footer-replay','Skip intro after a replay also returns focus to Replay entrance');
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 // Forced colours: the system draws Skip's keyboard focus as a real outline.
 const forced=await browser.newContext({viewport:{width:1440,height:900},forcedColors:'active'});
 const forcedPage=await forced.newPage();
 await forcedPage.goto(`${base}/index.html`);
 await playing(forcedPage);
 await forcedPage.keyboard.press('Tab');
 const forcedSkip=await skipState(forcedPage);
 assert.equal(forcedSkip.ring,true,'forced colours: the keyboard brings the focus');
 assert(forcedSkip.outline==='solid'&&forcedSkip.outlineWidth>=2,`forced colours: Skip draws a real outline (${forcedSkip.outline} ${forcedSkip.outlineWidth})`);
 await forced.close();
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
 assert.equal(await saver.locator('.footer-replay').isVisible(),false,'So does Replay entrance in the footer');
 assert.notEqual(await active(saver),'skip-link','A skipped entrance does not move focus');
 await saver.close();
 console.log('Arrival focus: closing never reveals the skip link, the first Tab reaches it, Replay entrance in the footer regains focus after a replay at every width, Save-Data skips the entrance.');
}finally{await browser.close();}
