import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const sharp=require('sharp');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
try {
  const page=await browser.newPage({viewport:{width:1440,height:1060},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/research.html`,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'astro-dev-toolbar,.obs-fx-settings{display:none!important}'});
  const root=page.locator('.planetary');
  assert.equal(await root.locator('[data-view="origins"]').count(),1);
  await root.locator('[data-view="origins"]').click();
  await root.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.modelReady==='origins');
  const frames=[];
  for(const material of ['orgueil','bennu','ryugu']) {
    await root.locator(`[data-material="${material}"]`).click();
    for(let stage=0;stage<4;stage++) {
      await root.locator(`[data-origin-step="${stage}"]`).click();
      await root.locator('canvas').scrollIntoViewIfNeeded();
      const buffer=await root.locator('canvas').screenshot();
      const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
      let count=0;
      for(let i=0;i<data.length;i+=3)if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>50)count++;
      assert.ok(count>info.width*info.height*.004,`${material}/${stage} nonblank`);
      if(material==='orgueil') {
        frames.push(buffer);
        await page.screenshot({path:`.codex_tmp/origins-desktop-${stage}.png`});
      }
      assert.equal(await root.getAttribute('data-origin-stage'),String(stage));
    }
    assert.match(await root.locator('[data-description]').innerText(),material==='orgueil'?/not identified/:new RegExp(material,'i'));
  }
  assert.ok(new Set(frames.map(buffer=>buffer.toString('base64'))).size===4);
  await root.locator('[data-origin-step="2"]').click();
  await root.locator('[data-origin-view="0"]').click();const intact=await root.locator('canvas').screenshot();
  await root.locator('[data-origin-view="1"]').click();const sliced=await root.locator('canvas').screenshot();
  assert.notDeepEqual(intact,sliced);
  await root.locator('[data-action="zoom-in"]').click();
  assert.ok(Number(await root.getAttribute('data-zoom'))>1);
  await root.locator('[data-action="reset"]').click();
  await root.locator('[data-stage]').focus();await page.keyboard.press('ArrowRight');
  await root.locator('[data-origin-step="0"]').click();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mads:fx-state',{detail:{enabled:true}})));
  const still=await root.locator('canvas').screenshot();
  await root.locator('[data-origin-play]').click();
  const before=Number(await root.getAttribute('data-origin-progress'));
  await page.waitForTimeout(500);
  assert.ok(Number(await root.getAttribute('data-origin-progress'))>before);
  assert.notDeepEqual(await root.locator('canvas').screenshot(),still,'Playback changes actual rendered pixels');
  await root.locator('[data-origin-play]').click();
  const paused=await root.getAttribute('data-origin-progress');await page.waitForTimeout(200);
  assert.equal(await root.getAttribute('data-origin-progress'),paused);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('[data-origin-play]').disabled);
  assert.equal(await root.locator('[data-origin-play]').isDisabled(),true);
  await root.locator('[data-origin-step="3"]').click();
  await root.locator('[data-origin-evidence="primary"]').click();
  assert.equal(await root.getAttribute('data-mode'),'shape');
  await root.locator('[data-view="origins"]').click();
  await root.locator('[data-material="orgueil"]').click();
  await root.locator('[data-origin-step="3"]').click();
  await root.locator('[data-origin-evidence="secondary"]').click();
  assert.equal(await root.getAttribute('data-mode'),'minerals');
  await root.locator('[data-view="origins"]').click();
  for(const theme of ['space','light']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    for(const width of [320,390,760,1440]) {
      await page.setViewportSize({width,height:1000});
      await root.locator('[data-origin-step="2"]').click();
      await root.locator('.planetary-origin-controls').scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${theme}/${width} overflow`);
      for(const button of await root.locator('.planetary-steps button,[data-origin-step]').all())assert.ok(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await page.screenshot({path:`.codex_tmp/origins-${theme}-${width}.png`});
    }
  }
  assert.deepEqual(errors,[]);
  console.log('Origins: all stages/materials, nonblank scenes, cutaway, playback, camera, reduced motion, evidence links and 8 responsive layouts passed.');
} finally {await browser.close();}
