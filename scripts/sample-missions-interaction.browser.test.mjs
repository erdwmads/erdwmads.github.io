import assert from 'node:assert/strict';
import {missions} from '../src/scripts/sample-missions/data.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/ryugu-bennu.html',{waitUntil:'networkidle'});
 const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');
 const ready=async()=>{await view.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true'&&sampleMissions.state.calls>0,null,{timeout:45000});};
 await ready();
 await root.locator('[data-mission-chapters] [data-mission-stage="5"]').click();
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
 await root.locator('[data-mission-chapters] [data-mission-stage="5"]').click();await root.locator('[data-mission-progress]').fill('490');
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
 await page.locator('.nav a[href="ryugu-bennu.html"]').click();await page.waitForURL('**/ryugu-bennu.html');await ready();
 assert.equal(await root.locator('canvas').count(),1);
 await page.evaluate(async()=>{await Promise.all([sampleMissions.choose('osiris-rex'),sampleMissions.choose('hayabusa2'),sampleMissions.choose('osiris-rex')]);});
 await ready();assert.equal(await page.evaluate(()=>sampleMissions.state.mission),'osiris-rex');
 // A BFCache restore retains DOM but creates a new viewer. It resumes the mission remembered for this
 // session (the viewer has done so since 972dc30), and its tabs and chapters must agree with it.
 await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide'));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await ready();
 assert.equal(await page.evaluate(()=>sampleMissions.state.mission),'osiris-rex');
 assert.equal(await root.locator('[aria-selected="true"]').getAttribute('data-mission'),'osiris-rex');
 assert.equal(await root.locator('[data-mission-chapters] [data-mission-stage]').count(),missions['osiris-rex'].stages.length);
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
 // WCAG AA: the computed text colour against every pixel painted behind the text (text hidden for the capture), so the
 // selected tab's gold glow and the notebook surface count. Launch-site link, trajectory source link, selected agency label.
 const lum=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const contrast=async target=>{
  const fg=lum(await target.evaluate(el=>{el.scrollIntoView({block:'center'});el.__style=el.getAttribute('style');el.style.setProperty('transition','none','important');const c=getComputedStyle(el).color.match(/[\d.]+/g).slice(0,3).map(Number);for(const p of ['color','text-decoration-color'])el.style.setProperty(p,'transparent','important');el.style.setProperty('text-shadow','none','important');return c;}));
  const {data,info}=await sharp(await target.screenshot({animations:'disabled'})).raw().toBuffer({resolveWithObject:true});
  await target.evaluate(el=>{if(el.__style==null)el.removeAttribute('style');else el.setAttribute('style',el.__style);});
  let min=Infinity;for(let i=0;i<data.length;i+=info.channels){const b=lum([data[i],data[i+1],data[i+2]]);min=Math.min(min,(Math.max(fg,b)+.05)/(Math.min(fg,b)+.05));}
  return Number(min.toFixed(2));
 };
 await page.setViewportSize({width:1440,height:1050});await page.waitForFunction(()=>document.querySelector('[data-mission-notebook]').open);
 await page.evaluate(()=>sampleMissions.choose('hayabusa2'));await ready();
 const rendezvous=missions.hayabusa2.stages.findIndex(s=>s.kind==='rendezvous'),orbit=root.locator('.mission-orbit-details');
 for(const theme of ['light','space']){
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;document.documentElement.toggleAttribute('data-theme-space',theme==='space');},theme);
  await page.evaluate(()=>sampleMissions.select(0,.3));await page.waitForFunction(()=>!document.querySelector('[data-mission-context]').hidden);
  const measured={agency:await contrast(root.locator('.mission-selector [aria-selected="true"] .mission-agency')),location:await contrast(root.locator('[data-mission-location]'))};
  await page.evaluate(stage=>sampleMissions.select(stage,.5),rendezvous);await view.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>!document.querySelector('[data-mission-physical]').hidden&&document.querySelector('[data-mission-trajectory-source]').textContent.trim()!=='',null,{timeout:15000});
  await orbit.evaluate(d=>d.open=true);measured.trajectory=await contrast(root.locator('[data-mission-trajectory-source]'));await orbit.evaluate(d=>d.open=false);
  assert(Object.values(measured).every(r=>r>=4.5),theme+' mission workspace text contrast '+JSON.stringify(measured));
  console.log('CONTRAST '+theme+' '+JSON.stringify(measured));
 }
 assert.deepEqual(errors,[]);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await mobile.goto(base+'/ryugu-bennu.html',{waitUntil:'networkidle'});
 const mv=mobile.locator('[data-mission-viewport]');await mv.scrollIntoViewIfNeeded();
 await mobile.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true',null,{timeout:45000});
 const touch=mobile.locator('[data-mission-action="touch"]');await touch.click();
 assert.equal(await mv.getAttribute('data-touch-active'),'');
 await mv.press('Escape');assert.equal(await touch.getAttribute('aria-pressed'),'false');
 assert.equal(await touch.getAttribute('aria-label'),'Enable model rotation and pinch zoom');
 await mobile.locator('[data-mission-chapters] [data-mission-stage="5"]').click();await mobile.locator('[data-mission-progress]').fill('500');await mv.scrollIntoViewIfNeeded();
 await mobile.locator('.mission-scene').screenshot({path:process.env.TEMP+'/mission-mobile.png'});
 console.log('PASS play/pause/scrub, auto chapters, keyboard mission tabs, offscreen pause, reduced motion, sample destination, navigation cleanup, rapid switches, BFCache restore, 4 widths x 2 themes, both-theme text contrast and mobile touch');
}finally{await browser.close();}
