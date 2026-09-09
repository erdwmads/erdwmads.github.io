
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{for(const width of [1440,390,320]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
 await page.goto(base+'/research.html');const root=page.locator('.planetary');await root.locator('[data-stage]').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
 assert.equal(await page.locator('a[href="/origins-study.html"]').count(),1);
 assert.deepEqual(await root.locator('[role="tablist"] [data-view]').evaluateAll(es=>es.map(e=>e.dataset.view)),['orbit','shape','sample','minerals']);
 assert.equal(await root.locator('[data-origin-controls],[data-origin-step]').count(),0);
 await root.locator('[data-material="bennu"]').click();
 for(const view of ['shape','sample','minerals','orbit']){
   await root.locator('[data-view="'+view+'"]').click();
   if(view==='sample')await root.locator('[data-sample-image]').waitFor();
   else {await root.locator('[data-stage]').scrollIntoViewIfNeeded();await page.waitForFunction(view=>{const e=document.querySelector('.planetary');return e.dataset.mode===view&&e.dataset.renderState==='ready'&&(view==='orbit'||e.dataset.modelReady===(view==='shape'?'bennu':'carbonate'));},view);await root.locator('[data-action="zoom-in"]').click();await root.locator('[data-action="reset"]').click();}
 }
 await root.locator('[data-view="orbit"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await root.locator('[data-view="shape"]').getAttribute('aria-selected'),'true');
 await page.locator('.planetary-heading').screenshot({path:join(tmpdir(),'unified-origins-'+width+'.png')});
 await root.locator('.planetary-origins-link').click();await page.waitForURL('**/origins-study.html');await page.waitForFunction(()=>window.study);
 assert.equal(await page.locator('.chapters [data-stage]').count(),4);
 await page.locator('header .brand').click();await page.waitForURL('**/research.html#planetary-title');
 await page.goto(base+'/research.html#observe=1&view=origins&material=ryugu&originProgress=.65&originCutaway=.85');
 await page.waitForURL('**/origins-study.html#stage=2&progress=0.6');await page.waitForFunction(()=>window.study);
 assert.deepEqual(await page.evaluate(()=>({stage:study.state.stage,progress:study.state.progress,playing:study.state.playing})),{stage:2,progress:.6,playing:false});
 assert.equal(new URL(page.url()).origin,base);assert.deepEqual(errors,[]);await page.close();
 console.log('PASS '+width+'px: four field-guide views, one Origins link, local return, legacy chapter restoration');
}}finally{await browser.close();}
