
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
await page.goto(base+'/research.html');
const root=page.locator('.planetary');await root.locator('[data-stage]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
const icons=()=>root.locator('[data-icon]').evaluateAll(es=>es.map(e=>({name:e.dataset.icon,count:e.querySelectorAll('svg').length})));
const controls=()=>root.locator('[data-action="zoom-in"],[data-action="zoom-out"],[data-action="reset"],[data-action="share"]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
const before=await controls();
for(let i=0;i<3;i++){
 await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
 await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
 assert((await icons()).every(x=>x.count===1),JSON.stringify(await icons()));assert.deepEqual(await controls(),before);
}
console.log('PASS repeated page restoration: exactly one icon per control, stable button heights');
for(const width of [1536,1280,1152,1024,768,390,320]){
 await page.setViewportSize({width,height:1000});await page.goto(base+'/research.html');
 assert.equal(await root.locator('a[href="/origins-study.html"]').count(),0,'No isolated Origins link in Research');
 const link=page.locator('.site-header .nav a[href="origins-study.html"]');assert.equal(await link.count(),1);
 if(width<=760)await page.locator('[data-nav-toggle]').click();
 assert(await link.isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const fits=await page.locator('.site-header a,.site-header button').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;}));assert(fits,'Header controls fit at '+width);
 await link.click();await page.waitForURL('**/origins-study.html');await page.waitForFunction(()=>window.study);
 assert.equal(await page.locator('.site-header .nav a[aria-current="page"]').innerText(),'Origins');assert.equal(await page.locator('.site-header').count(),1,'Origins shares the site header');
 if(width<=760){
   await page.locator('[data-nav-toggle]').focus();await page.keyboard.press('Enter');
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'index.html');
   await page.keyboard.press('Escape');assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'),'false');
   await page.keyboard.press('Enter');
 }

 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(width===1536||width===390)await page.locator('.site-header').screenshot({path:join(tmpdir(),'origins-category-header-'+width+'.png')});
 if(width===1536){
   await page.goBack();await page.waitForURL('**/research.html');assert((await icons()).every(x=>x.count===1),'Browser Back keeps one icon');
   await page.locator('.site-header .nav a[href="origins-study.html"]').click();await page.waitForURL('**/origins-study.html');await page.waitForFunction(()=>window.study);
 }
 await page.locator('.site-header .nav a[href="research.html"]').click();await page.waitForURL('**/research.html');await page.locator('.planetary [data-stage]').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');assert((await icons()).every(x=>x.count===1));
 console.log('PASS '+width+'px: Origins top navigation, active state, mobile menu and return');
}
assert.deepEqual(errors,[]);await page.close();
}finally{await browser.close();}
