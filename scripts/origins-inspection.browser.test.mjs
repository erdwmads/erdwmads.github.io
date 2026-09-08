import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.SITE_TEST_URL||'http://127.0.0.1:4322'}/research.html#observe=1&view=origins&material=orgueil&originProgress=.65&originCutaway=.85`,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'astro-dev-toolbar,.obs-fx-settings{display:none!important}'});
  const root=page.locator('.planetary'),stage=root.locator('[data-stage]'),canvas=root.locator('canvas'),button=root.locator('[data-origin-inspect]');
  await stage.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  await stage.focus();await page.keyboard.press('ArrowRight');await root.locator('[data-action="zoom-in"]').click();
  await canvas.screenshot();const before=await canvas.screenshot(),zoom=await root.getAttribute('data-zoom');
  await button.click();await page.waitForFunction(()=>document.querySelector('.planetary').dataset.zoom==='5.8000');
  await canvas.screenshot({path:'.codex_tmp/origins-volume-closeup.png'});
  assert.equal(await button.getAttribute('aria-pressed'),'true');
  await button.click();assert.equal(await root.getAttribute('data-zoom'),zoom);
  const after=await canvas.screenshot(),a=await sharp(before).raw().toBuffer(),b=await sharp(after).raw().toBuffer();
  assert.equal(a.length,b.length);let difference=0;for(let i=0;i<a.length;i++)difference+=Math.abs(a[i]-b[i]);
  assert.ok(difference/a.length<.15,'Return restores the exact camera and unchanged model');
  await button.click();await page.waitForFunction(()=>document.querySelector('.planetary').dataset.zoom==='5.8000');
  await root.locator('[data-origin-step="3"]').click();assert.equal(await button.isDisabled(),true);
  assert.equal(await root.getAttribute('data-origin-focus'),null);
  await root.locator('[data-origin-step="2"]').click();await root.locator('[data-origin-moment]').selectOption('2');await button.click();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.zoom==='5.8000');
  await root.locator('[data-action="reset"]').click();
  assert.equal(await button.getAttribute('aria-pressed'),'false','Reset must clear inspection UI');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mads:fx-state',{detail:{enabled:true}})));
  const timeline=root.locator('[data-origin-progress]');await timeline.fill('0.54');await timeline.dispatchEvent('input');
  assert.equal(await button.isDisabled(),true);
  await root.locator('[data-origin-play]').click();
  await page.waitForFunction(()=>Number(document.querySelector('.planetary').dataset.originProgress)>.63);
  await root.locator('[data-origin-play]').click();
  assert.equal(await button.isDisabled(),false,'Autoplay must enable inspection after crossing its threshold');
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const theme of ['space','light'])for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1100});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    for(const phase of [2,3]) {
      await root.locator(`[data-origin-step="${phase}"]`).click();await stage.scrollIntoViewIfNeeded();
      await root.locator('[data-action="reset"]').click();
      const frame=await canvas.screenshot({path:`.codex_tmp/origins-volume-${theme}-${width}-${phase}.png`});
      const {data,info}=await sharp(frame).removeAlpha().raw().toBuffer({resolveWithObject:true});
      let count=0;for(let i=0;i<data.length;i+=3)if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>50)count++;
      assert.ok(count>info.width*info.height*.025);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
  }
  await root.locator('[data-origin-step="2"]').click();await root.locator('[data-origin-moment]').selectOption('2');await button.click();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.originFocus==='carbonate');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  assert.equal(await root.getAttribute('data-origin-focus'),null,'Disposal clears inspection state before page restoration');
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  assert.equal(await button.getAttribute('aria-pressed'),'false');
  assert.deepEqual(errors,[]);console.log('Embedded crystal inspection, exact camera return, autoplay threshold, reset, disposal/re-entry, stage exit and desktop/mobile theme frames passed.');
} finally {await browser.close();}
