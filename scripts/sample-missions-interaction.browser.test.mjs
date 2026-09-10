import assert from 'node:assert/strict';
import {missions} from '../src/scripts/sample-missions/data.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/research.html',{waitUntil:'networkidle'});
 const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');
 const ready=async()=>{await view.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true'&&sampleMissions.state.calls>0,null,{timeout:45000});};
 await ready();
 await root.locator('[data-mission-stage="5"]').click();
 await root.locator('[data-mission-progress]').fill('490');
 assert.equal(await root.locator('[data-mission-status]').innerText(),'Projectile sampling');
 await root.locator('[data-mission-action="play"]').click();await view.scrollIntoViewIfNeeded();
 await page.waitForTimeout(600);
 assert((await page.evaluate(()=>sampleMissions.state.progress))>.49);
 await root.locator('[data-mission-action="play"]').click();
 const paused=await page.evaluate(()=>sampleMissions.state.progress);
 await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>sampleMissions.state.progress),paused);
 await page.evaluate(()=>sampleMissions.select(5,.999));
 await root.locator('[data-mission-action="play"]').click();await view.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>sampleMissions.state.stage===6);assert.equal(await root.locator('[data-mission-title]').innerText(),'Reaching beneath the surface');
 await root.locator('[data-mission-action="play"]').click();
 await root.locator('[data-mission="hayabusa2"]').focus();await page.keyboard.press('ArrowRight');await ready();
 assert.equal(await page.evaluate(()=>sampleMissions.state.mission),'osiris-rex');
 await root.locator('[data-mission-stage="5"]').click();await root.locator('[data-mission-progress]').fill('490');
 assert.equal(await root.locator('[data-mission-status]').innerText(),'Nitrogen-assisted sampling');
 await root.locator('[data-mission-action="play"]').click();await view.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
 await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>sampleMissions.state.visible===false);
 const outside=await page.evaluate(()=>sampleMissions.state.progress);await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>sampleMissions.state.progress),outside,'offscreen progress pauses');
 await ready();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>sampleMissions.state.playing),false);
 await root.locator('[data-mission-samples]').click();
 await page.waitForFunction(()=>document.querySelector('.planetary').dataset.mode==='sample'&&document.querySelector('.planetary').dataset.activeMaterial==='bennu');
 await page.locator('.nav a[href="contact.html"]').click();await page.waitForURL('**/contact.html');
 assert.equal(await page.evaluate(()=>Boolean(window.sampleMissions)),false);
 await page.locator('.nav a[href="research.html"]').click();await page.waitForURL('**/research.html');await ready();
 assert.equal(await root.locator('canvas').count(),1);
 await page.evaluate(async()=>{await Promise.all([sampleMissions.choose('osiris-rex'),sampleMissions.choose('hayabusa2'),sampleMissions.choose('osiris-rex')]);});
 await ready();assert.equal(await page.evaluate(()=>sampleMissions.state.mission),'osiris-rex');
 // A BFCache restore retains DOM but creates a new viewer: tabs and chapters must reset together.
 await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await ready();
 assert.equal(await root.locator('[aria-selected="true"]').getAttribute('data-mission'),'hayabusa2');
 assert.equal(await root.locator('[data-mission-stage]').count(),missions.hayabusa2.stages.length);
 assert.equal(await root.locator('canvas').count(),1);
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:950});
  for(const theme of ['space','light']){
   await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.toggleAttribute('data-theme-space',theme==='space');},theme);
   await view.scrollIntoViewIfNeeded();await page.waitForTimeout(80);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow '+width+'/'+theme);
   const bounds=await root.locator('.mission-transport button, .mission-selector button, .mission-camera-tools button').evaluateAll(buttons=>buttons.filter(b=>getComputedStyle(b).display!=='none').map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};}));
   if(bounds.some(r=>r.left<0))console.log('LAYOUT',await root.locator('.mission-transport').evaluate(el=>{const out=[];for(let n=el;n;n=n.parentElement){out.push({tag:n.tagName,cls:n.className,scroll:n.scrollLeft,width:n.clientWidth,sw:n.scrollWidth,left:n.getBoundingClientRect().left,overflow:getComputedStyle(n).overflow})}return out;}));
   assert(bounds.every(r=>r.left>=-1&&r.right<=width+1&&r.width>=40&&r.height>=40),'usable controls '+width+'/'+theme+' '+JSON.stringify(bounds));
  }
 }
 assert.deepEqual(errors,[]);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await mobile.goto(base+'/research.html',{waitUntil:'networkidle'});
 const mv=mobile.locator('[data-mission-viewport]');await mv.scrollIntoViewIfNeeded();
 await mobile.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true',null,{timeout:45000});
 const touch=mobile.locator('[data-mission-action="touch"]');await touch.click();
 assert.equal(await mv.getAttribute('data-touch-active'),'');
 await mv.press('Escape');assert.equal(await touch.getAttribute('aria-pressed'),'false');
 assert.equal(await touch.getAttribute('aria-label'),'Enable model rotation and pinch zoom');
 await mobile.locator('[data-mission-stage="5"]').click();await mobile.locator('[data-mission-progress]').fill('500');await mv.scrollIntoViewIfNeeded();
 await mobile.locator('.mission-scene').screenshot({path:process.env.TEMP+'/mission-mobile.png'});
 console.log('PASS play/pause/scrub, auto chapters, keyboard mission tabs, offscreen pause, reduced motion, sample destination, navigation cleanup, rapid switches, BFCache restore, 4 widths x 2 themes and mobile touch');
}finally{await browser.close();}
