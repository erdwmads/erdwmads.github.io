import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {encodeObservation,decodeObservation} from '../src/scripts/planetary-view-link.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const sharp=require('sharp');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
try {
  const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(encodeObservation({view:'origins',material:'orgueil',originProgress:.65,originCutaway:.85},`${base}/research.html`),{waitUntil:'networkidle'});
  const root=page.locator('.planetary');
  await page.waitForFunction(()=>document.querySelector('[data-share-status]').textContent==='Saved observation restored');
  assert.equal(await root.getAttribute('data-origin-stage'),'2');
  assert.equal(await root.getAttribute('data-origin-playing'),'false');
  await page.evaluate(()=>{window.__madsPowerState={lowPower:false};window.dispatchEvent(new CustomEvent('mads:fx-state',{detail:{enabled:true}}));});
  await page.waitForFunction(()=>!document.querySelector('[data-origin-play]').disabled);
  await page.evaluate(()=>{
    const canvas=document.querySelector('.planetary canvas');
    window.restoreOrigins=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
    window.restoreOrigins.loseContext();
  });
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='error');
  assert.equal(await root.locator('[data-fallback]').isVisible(),true);
  assert.equal(await root.getAttribute('data-origin-playing'),'false');
  await page.waitForTimeout(150);
  await page.evaluate(()=>window.restoreOrigins.restoreContext());
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  assert.equal(await root.locator('[data-origin-play]').isEnabled(),true,'Recovered scene must re-enable playback');
  await root.locator('[data-origin-play]').click();
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.originPlaying==='false');
  const paused=await root.getAttribute('data-origin-progress');
  await page.waitForTimeout(120);assert.equal(await root.getAttribute('data-origin-progress'),paused);
  await root.locator('[data-stage]').scrollIntoViewIfNeeded();
  await root.locator('[data-origin-step="2"]').click();
  await root.locator('[data-action="zoom-in"]').click();
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async url=>{window.observation=url;}}}));
  await root.locator('[data-share]').click();
  const url=await page.evaluate(()=>window.observation),saved=decodeObservation(new URL(url).hash);
  assert.equal(saved.view,'origins');assert.equal(saved.originCutaway,.85);assert.equal(saved.originProgress,.65);assert.ok(saved.camera.zoom>1);
  await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.modelReady==='origins');
  await page.evaluate(url=>location.hash=new URL(url).hash,url);
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.zoom==='1.4000');
  assert.equal(await root.getAttribute('data-origin-playing'),'false');
  await root.locator('[data-view="orbit"]').click();
  assert.equal(await root.locator('[data-origin-controls]').isVisible(),false);
  await page.close();

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await mobile.goto(`${base}/research.html#observe=1&view=origins&material=orgueil&originProgress=0.65&originCutaway=0.85`,{waitUntil:'networkidle'});
  await mobile.addStyleTag({content:'astro-dev-toolbar,.obs-fx-settings{display:none!important}'});
  const mr=mobile.locator('.planetary');
  await mr.locator('[data-stage]').scrollIntoViewIfNeeded();
  await mobile.waitForFunction(()=>document.querySelector('.planetary').dataset.modelReady==='origins');
  assert.equal(await mr.locator('canvas').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
  await mr.locator('[data-action="interact"]').click();
  assert.equal(await mr.locator('canvas').evaluate(el=>getComputedStyle(el).touchAction),'none');
  await mr.locator('[data-view="orbit"]').click();await mr.locator('[data-view="origins"]').click();
  assert.equal(await mr.locator('canvas').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
  for(const theme of ['space','light']) {
    await mobile.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    for(const stage of [0,1,2,3]) {
      await mr.locator(`[data-origin-step="${stage}"]`).click();
      // Departing debris deliberately crosses the frame; check the retained fragment after dispersal.
      if(stage===3){await mr.locator('[data-origin-progress]').fill('0.94');}
      await mr.locator('[data-stage]').scrollIntoViewIfNeeded();
      const buffer=await mr.locator('canvas').screenshot();
      const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
      let pixels=0,left=info.width,right=0,top=info.height,bottom=0;
      for(let y=1;y<info.height-1;y++)for(let x=1;x<info.width-1;x++) {
        const i=(y*info.width+x)*3;
        if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>55){pixels++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      }
      assert.ok(pixels>info.width*info.height*.003,`${theme}/${stage} visible scene`);
      assert.ok(left>2&&top>2&&right<info.width-3&&bottom<info.height-3,`${theme}/${stage} model framed`);
      await mobile.screenshot({path:`.codex_tmp/origins-mobile-scene-${theme}-${stage}.png`});
    }
  }
  assert.deepEqual(errors,[]);
  console.log('Origins lifecycle: saved views, context recovery, offscreen pause, touch release, sharing and mobile scene pixels passed.');
} finally {await browser.close();}
