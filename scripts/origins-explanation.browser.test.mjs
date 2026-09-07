import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),sharp=require('sharp');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${process.env.SITE_TEST_URL||'http://127.0.0.1:4322'}/research.html#observe=1&view=origins&material=orgueil&originProgress=.65&originCutaway=.85`,{waitUntil:'networkidle'});
  await page.addStyleTag({content:'astro-dev-toolbar,.obs-fx-settings{display:none!important}'});
  const root=page.locator('.planetary'),stage=root.locator('[data-stage]'),canvas=root.locator('canvas');
  await stage.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  assert.equal(await root.locator('[data-origin-controls] input[type=range]').count(),1,'Only the formation sequence is a slider');
  for(const theme of ['space','light'])for(const width of [1440,390,320]) {
    await page.setViewportSize({width,height:1100});await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    await root.locator('[data-origin-step="2"]').click();
    await root.locator('[data-origin-view="0"]').click();await stage.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
    const exterior=await canvas.screenshot({path:'.codex_tmp/origins-explanation-exterior.png'});
    await root.locator('[data-origin-view="1"]').click();await stage.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
    assert.notDeepEqual(await canvas.screenshot({path:'.codex_tmp/origins-explanation-interior.png'}),exterior);
    for(const moment of ['0','1','2']) {
      await root.locator('[data-origin-moment]').selectOption(moment);
      assert.equal(await root.locator('[data-origin-moment]').inputValue(),moment);
      const frame=await canvas.screenshot({path:`.codex_tmp/origins-explanation-${theme}-${width}-${moment}.png`});
      const {data,info}=await sharp(frame).removeAlpha().raw().toBuffer({resolveWithObject:true});let different=0;
      for(let i=0;i<data.length;i+=3)if(Math.abs(data[i]-data[0])+Math.abs(data[i+1]-data[1])+Math.abs(data[i+2]-data[2])>45)different++;
      assert.ok(different>info.width*info.height*.03);
    }
    await root.locator('.planetary-layout').screenshot({path:`.codex_tmp/origins-explanation-${theme}-${width}-layout.png`});
    await root.locator('[data-origin-step="3"]').click();
    const timeline=root.locator('[data-origin-progress]');await timeline.fill('0.94');await timeline.dispatchEvent('input');
    await canvas.screenshot({path:`.codex_tmp/origins-explanation-${theme}-${width}-fragment.png`});
    await timeline.fill('1');await timeline.dispatchEvent('input');
    assert.equal(await root.locator('[data-origin-specimen]').isVisible(),true);
    assert.equal(await root.locator('[data-camera-tools]').isVisible(),false,'No meaningless 3D controls over a photograph');
    await page.waitForFunction(()=>{const img=document.querySelector('figure[data-origin-specimen] img');return img.complete&&img.naturalWidth>0;});
    await stage.screenshot({path:`.codex_tmp/origins-explanation-${theme}-${width}-specimen.png`});
    assert.equal(await root.locator('figure[data-origin-specimen]').evaluate(el=>getComputedStyle(el).backgroundColor),theme==='light'?'rgb(237, 243, 246)':'rgb(11, 18, 24)');
    await root.locator('[data-origin-return]').click();
    assert.equal(await root.getAttribute('data-origin-progress'),'0.940000');
    assert.equal(await root.locator('[data-origin-specimen]').isVisible(),false);
    assert.equal(await root.locator('[data-camera-tools]').isVisible(),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  assert.deepEqual(errors,[]);console.log('One meaningful timeline, fixed view switch, alteration chapters, isolated fragment and real specimen endpoint passed in both themes at desktop/mobile.');
} finally {await browser.close();}
