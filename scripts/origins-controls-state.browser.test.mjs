import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.setDefaultTimeout(15000);
  let requested=false;
  await page.route('**/origins-volume-data.js*',async route=>{
    requested=true;
    await page.evaluate(()=>{
      document.querySelector('[data-origin-step="2"]').click();
      document.querySelector('[data-origin-view="0"]').click();
    });
    await route.continue();
  });
  await page.goto(`${process.env.SITE_TEST_URL||'http://127.0.0.1:4322'}/research.html`,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'astro-dev-toolbar,.obs-fx-settings{display:none!important}'});
  const root=page.locator('.planetary'),stage=root.locator('[data-stage]'),canvas=root.locator('canvas');
  await stage.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  await root.locator('[data-material="orgueil"]').click();
  await root.locator('[data-view="origins"]').click();
  await stage.scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const el=document.querySelector('.planetary');return el.dataset.modelReady==='origins'&&el.dataset.renderState==='ready';},null,{timeout:15000});
  assert.equal(requested,true,'Exercise the real pending geometry import');
  await page.waitForTimeout(300);const loaded=await canvas.screenshot({path:'.codex_tmp/origins-pending-loaded.png'});
  await root.locator('[data-origin-view="1"]').click();await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  const interior=await canvas.screenshot({path:'.codex_tmp/origins-pending-interior.png'});assert.notDeepEqual(interior,loaded);
  await root.locator('[data-origin-view="0"]').click();await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
  assert.deepEqual(await canvas.screenshot(),loaded,'Loading must apply the latest selected chapter and view');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{window.__madsPowerState={lowPower:false};window.dispatchEvent(new CustomEvent('mads:fx-state',{detail:{enabled:true}}));});
  await root.locator('[data-origin-progress]').fill('0.995');
  await root.locator('[data-origin-play]').click();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.originProgress==='1.000000');
  assert.equal(await root.getAttribute('data-origin-playing'),'false');
  assert.match(await root.locator('[data-origin-progress]').getAttribute('aria-valuetext'),/100 percent/);
  assert.equal(await root.locator('figure[data-origin-specimen]').isVisible(),true);
  await root.locator('[data-origin-return]').click();
  assert.equal(await root.getAttribute('data-origin-progress'),'0.940000');
  assert.equal(await root.locator('[data-camera-tools]').isVisible(),true);
  assert.deepEqual(errors,[]);console.log('Pending import applies latest controls; autoplay endpoint, accessible progress and photograph return passed.');
} finally {await browser.close();}
