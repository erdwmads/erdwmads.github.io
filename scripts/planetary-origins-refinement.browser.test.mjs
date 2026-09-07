import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/research.html#observe=1&view=origins&material=orgueil&originProgress=0.65&originCutaway=0.85`,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'astro-dev-toolbar,.obs-fx-settings{display:none!important}'});
  const root=page.locator('.planetary'),canvas=root.locator('canvas');
  await root.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.modelReady==='origins');
  async function visibleFrame(label) {
    const frame=await canvas.screenshot(),{data,info}=await sharp(frame).removeAlpha().raw().toBuffer({resolveWithObject:true});
    let pixels=0;
    for(let i=0;i<data.length;i+=3)if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>45)pixels++;
    assert.ok(pixels>info.width*info.height*.005,label);return frame;
  }
  for(const depth of [0,1]) {
    await root.locator(`[data-origin-view="${depth}"]`).click();
    await visibleFrame(`Cut depth ${depth}`);
    await root.locator('[data-stage]').focus();
    for(let i=0;i<6;i++){await page.keyboard.press('ArrowRight');await visibleFrame(`Rotation ${depth}/${i}`);}
    await root.locator('[data-action="reset"]').click();
  }
  await root.locator('[data-origin-view="1"]').click();
  for(const theme of ['space','light']) {
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    for(const stage of [0,1,2,3]) {
      await root.locator(`[data-origin-step="${stage}"]`).click();
      await canvas.scrollIntoViewIfNeeded();await visibleFrame(`${theme}/${stage}`);
      await root.locator('.planetary-layout').screenshot({path:`.codex_tmp/origins-refined-${theme}-${stage}.png`});
    }
  }
  for(const width of [320,390,760,1440]) {
    await page.setViewportSize({width,height:1000});
    await root.locator('[data-origin-step="2"]').click();
    const controls=root.locator('[data-origin-controls]');
    assert.ok((await controls.boundingBox()).height<=200,`Compact controls at ${width}`);
    for(const button of await controls.locator('button').all()) {
      const box=await button.boundingBox();assert.ok(box.height>=44&&box.width>=44);
      assert.ok(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  assert.deepEqual(errors,[]);
  console.log('Refined Origins: exterior/interior, 12 rotations, both themes/four stages, compact controls and 44px targets at four widths passed.');
} finally {await browser.close();}
