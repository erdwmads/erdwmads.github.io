import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try {
 const page=await browser.newPage({reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for (const width of [320,390,760,1024,1440]) {
  await page.setViewportSize({width,height:950});await page.goto(base+'/research.html');
  await page.locator('[data-research-guide][data-ready]').waitFor();await page.evaluate(()=>document.fonts.ready);
  const rects=[];
  for(const theme of ['space','light']) {
   if(await page.locator('html').getAttribute('data-theme')!==theme) {
    if(!await page.locator('.theme-toggle').isVisible())await page.locator('[data-nav-toggle]').click();
    await page.locator('.theme-toggle').click();
    if(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded')==='true')await page.locator('[data-nav-toggle]').click();
   }
   await page.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
   const geometry=await page.evaluate(()=>{const guide=document.querySelector('[data-research-guide]'),r=guide.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth,links:[...guide.querySelectorAll('a')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height)};});
   assert.equal(geometry.overflow,false,width+' '+theme);assert.ok(geometry.links.every(h=>h>=44),JSON.stringify(geometry));rects.push(geometry);
   if(width===390||width===1440)await page.screenshot({path:path.join(os.tmpdir(),'research-flow-'+width+'-'+theme+'.png')});
  }
  for(const key of ['x','y','width','height'])assert.ok(Math.abs(rects[0][key]-rects[1][key])<=1,'Theme movement '+width+' '+key);
 }
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/origins-study.html');
 assert.equal(await page.locator('.study-project-context a').getAttribute('href'),'research.html#research-focus-title');
 assert.ok(await page.locator('.study-project-context').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.goto(base+'/paper-shelf.html');
 await page.locator('#reading-context-title').scrollIntoViewIfNeeded();
 assert.equal(await page.locator('.research-reading-context a').count(),2);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('Research guide geometry stable across both themes at 320/390/760/1024/1440px; handoffs and visible target sizes verified. Screenshots in TEMP/research-flow-*.png');
} finally {await browser.close();}
