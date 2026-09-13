import assert from 'node:assert/strict';import {createRequire} from 'node:module';import os from 'node:os';import path from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const p=await browser.newPage({viewport:{width:1440,height:950},reducedMotion:'reduce'});
 for(const route of ['index','research','origins-study','paper-shelf','cv','photography','contact','research-log']){
  await p.goto(base+'/'+route+'.html');await p.evaluate(()=>document.fonts.ready);
  for(const width of [320,760,1440]){
   await p.setViewportSize({width,height:950});
   for(const theme of ['space','light']){
    await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    const bad=await p.locator('main h1').evaluateAll(nodes=>nodes.flatMap(e=>{
     if(!e.getClientRects().length)return [];
     const range=document.createRange();range.selectNodeContents(e);
     return [...range.getClientRects()].filter(r=>r.left< -1||r.right>innerWidth+1).map(r=>({text:e.textContent,left:r.left,right:r.right}));
    }));
    assert.deepEqual(bad,[],route+' '+width+' '+theme);
   }
  }
 }
 await p.goto(base+'/index.html');await p.evaluate(()=>document.documentElement.dataset.theme='light');
 await p.screenshot({path:path.join(os.tmpdir(),'folio100-home-light.png')});
 await p.setViewportSize({width:1440,height:950});await p.goto(base+'/research.html#research-scale-title');
 await p.locator('[data-inspector-ready]').waitFor();const stage=p.locator('[data-inspector-stage]');await stage.scrollIntoViewIfNeeded();
 const beforeScroll=await p.evaluate(()=>scrollY);const box=await stage.boundingBox();await p.mouse.move(box.x+30,box.y+30);await p.mouse.wheel(0,220);
 await p.waitForTimeout(250);assert.ok(await p.evaluate(()=>scrollY)>beforeScroll,'Ordinary wheel must scroll page');
 const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 await touch.goto(base+'/research.html#research-scale-title');await touch.locator('[data-inspector-ready]').waitFor();
 await touch.locator('[data-inspector-region="sem-detail"]').tap();await touch.locator('[data-inspector-touch]').tap();
 assert.equal(await touch.locator('[data-inspector-stage]').evaluate(e=>getComputedStyle(e).touchAction),'none');
 await touch.locator('[data-inspector-touch]').tap();
 assert.equal(await touch.locator('[data-inspector-stage]').evaluate(e=>getComputedStyle(e).touchAction),'pan-y');
 const broken=await browser.newPage();await broken.route('**/bennu-microstructure.jpg',route=>route.abort());
 await broken.goto(base+'/research.html#research-scale-title');await broken.locator('[data-image-inspector]').scrollIntoViewIfNeeded();
 await broken.waitForFunction(()=>document.querySelector('[data-inspector-status]')?.textContent.includes('could not load'));
 assert.equal(await broken.locator('[data-inspector-controls]').isVisible(),false);
 assert.ok(await broken.locator('.research-scale__credit a[href*="maps.14227"]').isVisible());
 console.log('Eight public routes: actual heading bounds at 320/760/1440 in both themes. Ordinary wheel, touch opt-in/out and failed-image fallback passed.');
}finally{await browser.close();}
