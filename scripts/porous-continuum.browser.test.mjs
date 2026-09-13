import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import os from 'node:os';import path from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE}),base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{
 const page=await browser.newPage({viewport:{width:1560,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto(base+'/origins-study.html#stage=2&progress=0');await page.waitForFunction(()=>window.study&&document.querySelector('.origins-study').dataset.renderState==='ready',null,{timeout:45000});
 await page.locator('#viewport').evaluate(e=>e.scrollIntoView({block:'center'}));await page.waitForTimeout(200);
 const camera=await page.evaluate(()=>study.state.camera),captures=[];
 for(const [t,step]of[[0,0],[.28,1],[.5,2],[.8,3],[1,3]]){
  await page.evaluate(t=>study.setProgress(t),t);await page.waitForTimeout(150);
  (await page.evaluate(()=>study.state.camera)).forEach((v,i)=>assert(Math.abs(v-camera[i])<1e-9,'Timeline does not rotate or jump the camera'));
  assert.equal(await page.locator('#reaction-sequence li').nth(step).getAttribute('aria-current'),'step');
  captures.push(await page.locator('#viewport').screenshot({path:path.join(os.tmpdir(),'continuum-final-'+t+'.png')}));
 }
 assert.notDeepEqual(captures[0],captures[2],'Melting changes the rendered material');assert.notDeepEqual(captures[2],captures[4],'Crystallization changes the rendered material');
 await page.evaluate(()=>study.setProgress(.5));await page.waitForTimeout(150);const back=await page.locator('#viewport').screenshot();assert.deepEqual(back,captures[2],'Reversing the timeline returns the same rendered frame');
 await page.locator('#phase-mode').click();assert.equal(await page.locator('#legend').isVisible(),true);assert.equal(await page.evaluate(()=>study.state.progress),.5);
 await page.locator('#viewport').screenshot({path:path.join(os.tmpdir(),'continuum-final-process.png')});
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();await page.waitForTimeout(200);await page.locator('#viewport').screenshot({path:path.join(os.tmpdir(),'continuum-final-detail.png')});
 await page.locator('#reset').click();await page.locator('#material-mode').click();
 for(const width of [1560,760,390,320]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);
  const bounds=()=>page.locator('.origins-study :is(button,input)').evaluateAll(nodes=>nodes.filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y+scrollY,w:r.width,h:r.height};}));
  const dark=await bounds();await page.locator('.theme-toggle').evaluate(e=>e.click());await page.waitForTimeout(200);const light=await bounds();
  assert.equal(light.length,dark.length);dark.forEach((r,i)=>['x','y','w','h'].forEach(k=>assert(Math.abs(r[k]-light[i][k])<.6,'Theme preserves '+k+' at '+width)));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);
  await page.locator('.study-panel').evaluate(e=>e.scrollIntoView());await page.screenshot({path:path.join(os.tmpdir(),'continuum-final-light-'+width+'.png')});
  await page.locator('.theme-toggle').evaluate(e=>e.click());
 }
 await page.setViewportSize({width:1560,height:1100});await page.locator('[data-stage="0"]').click();assert.equal(await page.locator('#reaction-sequence').isVisible(),false);await page.locator('[data-stage="2"]').click();assert.equal(await page.locator('#reaction-sequence').isVisible(),true);
 assert.deepEqual(errors,[]);console.log('PASS deterministic WebGL frames, fixed camera, process readout, phase mode, zoom/reset, four widths, two themes, chapter switching and no console errors.');
}finally{await browser.close();}
