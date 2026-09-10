import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html',{waitUntil:'networkidle'});
 const root=page.locator('[data-sample-missions]'),view=root.locator('[data-mission-viewport]');
 await view.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-sample-missions]').dataset.ready==='true'&&sampleMissions.state.frames>0,null,{timeout:45000});
 const settle=async()=>{await view.scrollIntoViewIfNeeded();await page.waitForFunction(()=>!sampleMissions.state.transitioning,null,{timeout:15000});await page.waitForTimeout(120);};
 await ready();
 for(const [id,stage,p,name]of [['hayabusa2',0,.84,'fairing-release'],['hayabusa2',5,.52,'contact'],['hayabusa2',10,.22,'entry'],['osiris-rex',4,.52,'bennu'],['osiris-rex',6,.52,'mechanism'],['osiris-rex',9,.22,'utah-entry'],['osiris-rex',9,1,'landed']]){
  await page.evaluate(id=>sampleMissions.choose(id),id);await ready();
  await page.evaluate(({stage,p})=>sampleMissions.select(stage,p),{stage,p});if(['fairing-release','entry','utah-entry','landed'].includes(name))await root.locator('[data-mission-action="detail"]').click();if(name==='bennu')await root.locator('[data-mission-action="asteroid"]').click();await settle();
  assert.equal(await page.evaluate(()=>sampleMissions.state.playing),false);
  const stats=await sharp(await view.locator('canvas').screenshot()).stats();assert(stats.channels.some(c=>c.stdev>12),'visible geometry at '+name);
  await root.locator('.mission-scene').screenshot({path:process.env.TEMP+'/mission-cinema-'+name+'.png'});
  const labels=await root.locator('.mission-labels span:not([hidden])').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return {left:r.left-p.left,right:r.right-p.left,top:r.top-p.top,bottom:r.bottom-p.top,w:p.width,h:p.height};}));
  assert(labels.every(r=>r.left>=0&&r.right<=r.w&&r.top>=0&&r.bottom<=r.h),'labels remain in scene '+name);
 }
 await page.evaluate(()=>{sampleMissions.select(0,.3);sampleMissions.select(3,.5);sampleMissions.select(4,.7);});await settle();
 assert.equal(await page.evaluate(()=>sampleMissions.state.stage),4);
 await page.waitForTimeout(800);const before=await page.evaluate(()=>sampleMissions.state.frames);await page.waitForTimeout(500);
 assert((await page.evaluate(()=>sampleMissions.state.frames))-before<=2,'paused renderer stops after dissolve/damping');
 assert.equal(await page.locator('.obs-fx-dock').evaluate(e=>getComputedStyle(e).visibility),'visible');
 await page.evaluate(()=>{const r=document.querySelector("[data-sample-missions]").getBoundingClientRect();scrollTo(0,scrollY+r.bottom+100);});await page.waitForFunction(()=>!document.documentElement.hasAttribute("data-mission-in-view"));
 assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-mission-in-view')),false);
 await view.scrollIntoViewIfNeeded();await settle();
 await root.screenshot({path:process.env.TEMP+'/mission-cinema-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>sampleMissions.select(3,.5));await settle();
 await root.screenshot({path:process.env.TEMP+'/mission-cinema-mobile-dark.png'});
 await page.evaluate(()=>{document.documentElement.dataset.theme='light';document.documentElement.removeAttribute('data-theme-space');});
 await root.screenshot({path:process.env.TEMP+'/mission-cinema-mobile-light.png'});
 assert.equal(await root.locator('[data-mission-status]').evaluate(e=>getComputedStyle(e).color),'rgb(195, 208, 216)');
 assert.deepEqual(errors,[]);
 console.log('PASS cold chapter dissolves, rapid chapter selection, paused render idle, label bounds, uncluttered canvas and responsive final images');
}finally{await browser.close();}
