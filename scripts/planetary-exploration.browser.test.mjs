import assert from 'node:assert/strict';
import {decodeObservation} from '../src/scripts/planetary-view-link.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/research.html`,{waitUntil:'networkidle'});
  const root=page.locator('.planetary');
  await root.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  await root.locator('[data-material="ryugu"]').click();
  assert.equal(await root.getAttribute('data-focus'),'ryugu');
  assert.equal(await root.locator('[data-object="ryugu"]').getAttribute('aria-pressed'),'true');
  assert.equal(await root.locator('[data-object="bennu"]').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mads:fx-state',{detail:{enabled:false}})));
  assert.equal(await root.getAttribute('data-focus-fx'),'off');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mads:fx-state',{detail:{enabled:true}})));
  assert.equal(await root.getAttribute('data-focus-fx'),'on');
  assert.equal(await root.locator('[data-questions]').count(),1);
  await root.locator('[data-questions] summary').click();
  await root.locator('[data-question="ratio"]').click();
  assert.match(await root.locator('[data-question-answer]').innerText(),/not sufficient|does not prove/i);
  assert.equal(await root.locator('[data-question-answer] li').count(),3);
  await root.locator('[data-question-explore]').click();
  assert.equal(await root.getAttribute('data-mode'),'minerals');
  assert.equal(await root.getAttribute('data-focus'),'carbonate');
  assert.equal(await root.locator('[data-object-title]').innerText(),'Dolomite');
  await root.locator('[data-question="contact"]').focus();
  await page.keyboard.press('Home');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.question),'target');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}}));
  await root.locator('[data-view="orbit"]').click();
  await root.locator('[data-material="bennu"]').click();
  await root.locator('[data-date]').fill('2026-09-07T12:00');
  await root.locator('[data-date]').dispatchEvent('change');
  await root.locator('[data-stage]').focus();
  await page.keyboard.press('ArrowRight');
  await root.locator('[data-action="zoom-in"]').click();
  await root.locator('[data-action="share"]').click();
  await root.locator('[data-share-link]').waitFor({state:'visible'});
  const savedUrl=await root.locator('[data-share-link]').inputValue();
  const saved=decodeObservation(new URL(savedUrl).hash);
  assert.equal(saved.camera.zoom,1.4);
  await page.goto(savedUrl,{waitUntil:'networkidle'});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-share-status]').textContent==='Saved observation restored');
  assert.equal(await root.locator('[data-date]').inputValue(),'2026-09-07T12:00');
  assert.equal(await root.locator('[data-action="play"]').getAttribute('aria-pressed'),'false');
  assert.equal(await root.getAttribute('data-zoom'),'1.4000');
  await root.locator('[data-view="sample"]').click();
  assert.equal(await root.locator('[data-sample-figure]').isVisible(),true);
  await root.locator('[data-material="ryugu"]').click();
  assert.match(await root.locator('[data-sample-image]').getAttribute('src'),/ryugu-sample/);
  await page.waitForFunction(()=>{const img=document.querySelector('[data-sample-image]');return img.complete&&img.naturalWidth>0;});
  for(const material of ['bennu','ryugu','orgueil']) {
    await root.locator('[data-material="'+material+'"]').click();
    for(const view of ['orbit','shape','sample','minerals']) {
      await root.locator('[data-view="'+view+'"]').click();
      assert.equal(await root.getAttribute('data-mode'),view);
      if(view==='sample')assert.equal(await root.locator('[data-stage]').isVisible(),false);
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await root.getAttribute('data-focus-fx'),'off');
  await root.locator('[data-view="minerals"]').click();
  await root.locator('[data-mineral="matrix"]').click();
  await root.locator('[data-mineral-detail]').check();
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}}));
  await root.locator('[data-action="share"]').click();
  await root.locator('[data-share-link]').waitFor({state:'visible'});
  const mineralUrl=await root.locator('[data-share-link]').inputValue();
  await page.goto(mineralUrl,{waitUntil:'networkidle'});
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-share-status]').textContent==='Saved observation restored');
  assert.equal(await root.getAttribute('data-focus'),'matrix');
  assert.equal(await root.locator('[data-mineral-detail]').isChecked(),true);
  for(const width of [320,390,760,1440]) {
    await page.setViewportSize({width,height:900});
    for(const theme of ['light','dark']) {
      await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
      await root.locator('[data-view="sample"]').click();
      await root.locator('[data-material="ryugu"]').click();
      await page.waitForFunction(()=>{const img=document.querySelector('[data-sample-image]');return img.complete&&img.naturalWidth>0;});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${width} ${theme} overflow`);
      assert.equal(await root.locator('[data-sample-image]').evaluate(img=>getComputedStyle(img).objectFit),'contain');
      if(width===390||width===1440) {
        await root.locator('[data-sample-figure]').scrollIntoViewIfNeeded();
        await page.screenshot({path:`.codex_tmp/exploration-${width}-${theme}.png`});
      }
    }
  }
  assert.deepEqual(errors,[]);
  console.log('Exploration: focus, questions, orbit/mineral links, sample images, direct view switching, reduced motion and 8 responsive layouts passed.');
} finally {await browser.close();}
