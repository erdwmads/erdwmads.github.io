import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  await page.goto(`${process.env.SITE_TEST_URL||'http://127.0.0.1:4322'}/research.html#observe=1&view=origins&material=orgueil&originProgress=0.4375&originCutaway=0.85`,{waitUntil:'networkidle'});
  const root=page.locator('.planetary'),range=root.locator('[data-origin-progress]');
  await range.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.modelReady==='origins');
  for(const width of [1440,1000,760,390,320]) {
    await page.setViewportSize({width,height:1100});
    await root.locator('[data-origin-step="0"]').click();await range.scrollIntoViewIfNeeded();
    const initial=await range.boundingBox(),stage=await root.locator('[data-stage]').boundingBox();
    // Exercise actual pointer coordinates across both stage boundaries, not range.fill().
    await page.mouse.move(initial.x+8+(initial.width-16)*.125,initial.y+initial.height/2);await page.mouse.down();
    let previous=.125;
    for(let i=14;i<=98;i+=2) {
      const target=i/100;await page.mouse.move(initial.x+8+(initial.width-16)*target,initial.y+initial.height/2);
      const value=Number(await root.getAttribute('data-origin-progress')),box=await range.boundingBox();
      assert.ok(Math.abs(box.width-initial.width)<1,`${width}: timeline width changed while dragging: ${initial.width} -> ${box.width}`);
      assert.ok(Math.abs(box.y-initial.y)<1,`${width}: timeline moved vertically`);
      assert.ok(value>=previous-.006,`${width}: pointer moved forwards but timeline reversed ${previous} -> ${value}`);
      assert.ok(Math.abs(value-target)<.025,`${width}: pointer ${target} jumped to ${value}`);previous=value;
      assert.ok(Math.abs((await root.locator('[data-stage]').boundingBox()).y-stage.y)<1,`${width}: canvas moved on stage change`);
    }
    await page.mouse.up();
    await page.screenshot({path:`.codex_tmp/origins-drag-${width}.png`});
  }
  console.log('Origins: real pointer scrubbing remains monotonic, aligned and layout-stable across all stages at five viewport widths.');
} finally {await browser.close();}
