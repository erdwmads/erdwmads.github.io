import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try {
  // Reproduce the wide touch/WebView reported by the desktop browser.
  const page=await browser.newPage({viewport:{width:1280,height:900},hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/research-graduation.html#archive-access');
  await page.waitForFunction(()=>document.body.dataset.interface2046==='ready');
  assert.equal(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches),true);
  assert.equal(await page.locator('.ambient-pebble').count(),20,'A wide touch viewport must retain the asteroid background effects');
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('mads-mobile-lite')),false);
  assert.equal(await page.locator('.ui2046-layer').count(),1);
  assert.ok(await page.locator('.ambient-space-layer').isVisible());
  assert.ok(await page.locator('.ui2046-layer').isVisible());
  const pebble=page.locator('.ambient-pebble').first();
  const before=await pebble.evaluate(e=>getComputedStyle(e).transform);
  await page.waitForTimeout(300);
  assert.notEqual(await pebble.evaluate(e=>getComputedStyle(e).transform),before,'The restored pebbles actually move');
  await page.evaluate(()=>window.backgroundBefore=document.querySelector('.ambient-space-layer'));
  await page.locator('.nav a[href="index.html"]').click();await page.waitForURL('**/index.html');
  assert.equal(await page.evaluate(()=>window.backgroundBefore===document.querySelector('.ambient-space-layer')),true,'Navigation keeps the same background layer');
  await page.locator('.hero').waitFor();
  assert.equal(await page.locator('h1').innerText(),'Mads LIU Yong');
  assert.equal(await page.locator('.hero .avatar img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
  await page.locator('.obs-fx-settings').click();
  const fx=page.locator('.ambient-fx-toggle');
  assert.ok(await fx.isVisible(),'Wide touch users can access the FX switch');
  await fx.click();assert.equal(await page.locator('.ambient-space-layer').count(),0);
  await fx.click();assert.equal(await page.locator('.ambient-pebble').count(),20);
  await page.locator('.obs-fx-settings').click();
  for(const theme of ['space','light']) {
    if(await page.locator('html').getAttribute('data-theme')!==theme) await page.locator('.theme-toggle').click();
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(os.tmpdir(),'home-restored-'+theme+'.png')});
    for(const width of [320,390,760,1024,1280,1440]) {
      await page.setViewportSize({width,height:900});
      await page.waitForTimeout(180);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),theme+' '+width+' overflow');
      const bounds=await page.locator('.hero h1').evaluate(e=>{
        const range=document.createRange();range.selectNodeContents(e);
        return [...range.getClientRects()].every(r=>r.left>=0&&r.right<=innerWidth);
      });
      assert.ok(bounds,theme+' '+width+' heading bounds');
      assert.equal(await page.locator('.ambient-pebble').count(),width<=760?0:20,theme+' '+width+' background resize');
    }
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(os.tmpdir(),'home-restored-mobile.png')});
  await page.setViewportSize({width:1280,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
  assert.equal(await page.locator('.ambient-pebble').count(),0,'Respect reduced motion');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>localStorage.setItem('madsAmbientFxEnabled','0'));await page.reload();
  assert.equal(await page.locator('.ambient-pebble').count(),0,'Keep explicit FX-off preference');
  assert.deepEqual(errors,[]);
  console.log('Wide touch background, soft navigation, FX toggle, resize, reduced motion, saved preference and responsive home passed.');
} finally { await browser.close(); }
