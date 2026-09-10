import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{for(const width of [1440,768,390,320]){
 const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme','space');});
 const header=()=>page.locator('.site-header').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {height:r.height,font:s.fontFamily,background:s.backgroundColor,brand:e.querySelector('.brand').textContent.trim(),links:[...e.querySelectorAll('.nav a')].map(a=>{const r=a.getBoundingClientRect();return {text:a.textContent,x:r.x,width:r.width,height:r.height};})};});
 await page.goto(base+'/research.html');await page.evaluate(()=>document.fonts.ready);if(width<=760)await page.locator('[data-nav-toggle]').click();const expected=await header();
 await page.goto(base+'/origins-study.html');assert.equal(await page.locator('.site-header').count(),1,'Origins must use the shared site header');
 await page.waitForFunction(()=>window.study);await page.evaluate(()=>document.fonts.ready);if(width<=760)await page.locator('[data-nav-toggle]').click();assert.deepEqual(await header(),expected,'Header geometry, brand and styling match Research');
 assert.equal(await page.locator('.nav a[aria-current="page"]').innerText(),'Origins');
 const controls=()=>page.locator('.origins-study button,.origins-study input').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y+scrollY,r.width,r.height];}));
 const dark=await controls();await page.locator('.theme-toggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'light');assert.deepEqual(await controls(),dark,'Theme preserves study control geometry');
 if(width<=760)await page.locator('[data-nav-toggle]').click();
 for(let i=0;i<4;i++){await page.locator('[data-stage="'+i+'"]').click();await page.evaluate(()=>study.setProgress(.6));assert.equal(await page.evaluate(()=>study.state.stage),i);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.locator('#phase-mode').click();assert.equal(await page.evaluate(()=>study.state.phase),true);
 await page.locator('#evidence').click();assert(await page.locator('#sources').isVisible());await page.locator('#sources .close').click();
 await page.evaluate(()=>{study.select(0,.2);study.setPhase(false);});await page.locator('#viewport').scrollIntoViewIfNeeded();await page.waitForTimeout(300);await page.screenshot({path:join(tmpdir(),'origins-shared-light-'+width+'.png'),fullPage:true});
 if(width<=760)await page.locator('[data-nav-toggle]').click();await page.locator('.theme-toggle').click();if(width<=760)await page.locator('[data-nav-toggle]').click();
 await page.locator('#viewport').scrollIntoViewIfNeeded();await page.evaluate(()=>study.setProgress(.2));await page.waitForTimeout(300);await page.screenshot({path:join(tmpdir(),'origins-shared-space-'+width+'.png'),fullPage:true});
 if(width<=760)await page.locator('[data-nav-toggle]').click();await page.locator('.nav a[href="research.html"]').click();await page.waitForURL('**/research.html');assert.equal(await page.locator('.origins-study').count(),0);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+'px: shared shell, themes, chapters, controls and navigation');
}}finally{await browser.close();}
