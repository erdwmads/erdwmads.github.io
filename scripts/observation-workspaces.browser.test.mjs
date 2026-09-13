import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
const evidence=pathToFileURL(join(tmpdir(),'observation-workspaces-review')+'/');await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const results=[],errors=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto(base+'/research.html');
 assert.equal(await page.locator('.mission-workspace').count(),1,'mission workspace exists');
 const view=page.locator('[data-mission-viewport]'),notes=page.locator('[data-mission-notebook]');
 await view.scrollIntoViewIfNeeded();
 const ready=()=>page.waitForFunction(()=>window.sampleMissions?.state.ready,null,{timeout:60000});await ready();
 for(const mission of ['hayabusa2','osiris-rex']) {
  await page.evaluate(id=>sampleMissions.choose(id),mission);await ready();
  for(const stage of [0,2,4,5]) {
   await page.evaluate(stage=>sampleMissions.select(stage,.5),stage);await view.scrollIntoViewIfNeeded();
   const v=await view.boundingBox(),n=await notes.boundingBox(),transport=await page.locator('.mission-transport').boundingBox();
   assert(n.x>=v.x+v.width-1,'notes are beside model');assert(transport.x<v.x+10,'transport stays under model');
   assert(await notes.evaluate(n=>n.open));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert(await page.evaluate(()=>sampleMissions.state.calls>0));
   for(const theme of ['light','space']) {
    if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('.theme-toggle').click();
    const ratios=await notes.evaluate(node=>{
     const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
     const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
     const bg=lum(rgb(getComputedStyle(node).backgroundColor));
     return [...node.querySelectorAll('[data-mission-range],[data-mission-frame-explanation],[data-mission-journey-range],[data-mission-description],[data-mission-detail]')].filter(n=>n.getClientRects().length).map(n=>{
      const fg=lum(rgb(getComputedStyle(n).color));return {text:n.textContent.slice(0,30),ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)};
     });
    });
    assert(ratios.every(r=>r.ratio>=4.5),theme+' notebook contrast: '+JSON.stringify(ratios));
    const themed=await view.boundingBox();assert(Math.abs(themed.width-v.width)<1&&Math.abs(themed.height-v.height)<1,'theme preserves mission viewport dimensions');
   }
  }
  await page.locator('.mission-workspace').screenshot({path:fileURLToPath(new URL(mission+'-desktop.png',evidence))});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await notes.evaluate(n=>n.open),false);
  const v=await view.boundingBox(),n=await notes.boundingBox();assert(n.y>=v.y+v.height,'mobile visual precedes notes');
  await notes.locator(':scope > summary').focus();await page.keyboard.press('Enter');assert(await notes.evaluate(n=>n.open));
  await page.evaluate(()=>sampleMissions.select(2,.5));await page.locator('[data-mission-action=frame-sun]').click();
  assert.equal(await page.evaluate(()=>sampleMissions.state.reference),'sun');
  await notes.locator(':scope > summary').click();await view.scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await view.screenshot({path:fileURLToPath(new URL(mission+'-mobile.png',evidence))});
  await page.setViewportSize({width:1440,height:1050});assert(await notes.evaluate(n=>n.open));
  results.push(mission+' desktop/mobile notes, model, frame controls and both-theme text contrast');
 }
 await page.goto(base+'/origins-study.html#stage=2&progress=0');
 await page.waitForFunction(()=>window.study&&document.querySelector('.origins-study').dataset.renderState==='ready',null,{timeout:60000});
 for(const [stage,id,values] of [[1,'growth',[.16,.51,.92]],[2,'reaction',[.08,.27,.50,.90]],[3,'inheritance',[.12,.38,.90]]]) {
  await page.evaluate(stage=>study.select(stage),stage);
  const buttons=page.locator('#'+id+'-sequence button');assert.equal(await buttons.count(),values.length);
  for(let i=0;i<values.length;i++){
   await buttons.nth(i).focus();await page.keyboard.press('Enter');
   const state=await page.evaluate(()=>study.state);assert.equal(state.progress,values[i]);assert.equal(state.playing,false);
   assert.equal(await buttons.nth(i).locator('..').getAttribute('aria-current'),'step');
  }
  results.push(id+' phase buttons seek real animation and pause');
 }
 await page.evaluate(()=>study.select(2));await page.locator('#reaction-sequence button').last().click();
 await page.locator('.observatory').screenshot({path:fileURLToPath(new URL('origins-desktop.png',evidence))});
 const before=await page.locator('#viewport').boundingBox();await page.locator('.theme-toggle').click();const after=await page.locator('#viewport').boundingBox();assert.deepEqual(after,before,'theme preserves model geometry');
 await page.locator('.observatory').screenshot({path:fileURLToPath(new URL('origins-light.png',evidence))});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('#reaction-sequence button').nth(1).click();assert.equal(await page.evaluate(()=>study.state.progress),.27);
 await page.locator('.observatory').screenshot({path:fileURLToPath(new URL('origins-mobile.png',evidence))});
 for(const route of ['index','research','origins-study','paper-shelf','cv','photography','contact','research-log']) {
  await page.goto(base+'/'+route+'.html');const links=page.locator('.continue-reading a');assert.equal(await links.count(),2);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' no mobile overflow');
  for(const link of await links.all()) {
   const layout=await link.evaluate(a=>({display:getComputedStyle(a).display,decoration:getComputedStyle(a).textDecorationLine,padding:parseFloat(getComputedStyle(a).paddingTop)}));
   assert.equal(layout.display,'grid');assert.equal(layout.decoration,'none');assert(layout.padding>=18);
  }
  results.push(route+' contextual onward links, visual alignment and mobile bounds');
 }
 await page.setViewportSize({width:1440,height:1050});await page.goto(base+'/cv.html');
 await page.waitForFunction(()=>window.__madsLegacyNavigationReady);
 await page.locator('.cv-photo img').evaluate(img=>img.decode());
 assert(await page.locator('.cv-photo img').evaluate(img=>img.naturalWidth>0),'CV photo remains available');
 await page.locator('.continue-reading a[href="research.html"]').click();await page.waitForURL('**/research.html');
 await page.waitForFunction(()=>!document.documentElement.classList.contains('mads-soft-nav-active'));
 assert.equal(await page.locator('.continue-reading a[href="origins-study.html"]').count(),1);
 results.push('CV photo and contextual link through continuous navigation');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors},null,2));
 await writeFile(new URL('results.json',evidence),JSON.stringify({results,errors},null,2));
} finally {await browser.close();}
