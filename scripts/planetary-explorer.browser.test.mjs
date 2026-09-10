import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sharp = require('sharp');
const browser = await chromium.launch({ headless: true, ...(process.env.EDGE_EXECUTABLE ? { executablePath: process.env.EDGE_EXECUTABLE } : {}) });
const base = process.env.SITE_TEST_URL || 'http://127.0.0.1:4322';
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  const errors = [];
  await page.addInitScript(() => {
    window.__sceneDraws = 0;
    for (const name of ['drawElements','drawArrays']) {
      const original = WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name] = function (...args) { window.__sceneDraws++; return original.apply(this,args); };
    }
  });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
  await page.addStyleTag({content:'astro-dev-toolbar { display:none !important; }'});
  assert.equal(await page.locator('[data-planetary-explorer]').count(), 1);
  const root = page.locator('[data-planetary-explorer]');
  await root.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-planetary-explorer]')?.dataset.renderState === 'ready');
  assert.ok(await root.locator('canvas').isVisible());
  async function pixels(container, model = false) {
    // Fixed site controls are outside the scene and must not enter its pixel bounds.
    const overlayStyle = await container.page().addStyleTag({content:'.obs-fx-settings,astro-dev-toolbar { visibility:hidden !important; }'});
    const labels = container.locator('[data-labels]');
    await labels.evaluate(el => el.style.visibility='hidden');
    const buffer = await container.locator('canvas').screenshot();
    await labels.evaluate(el => el.style.visibility='');
    await overlayStyle.evaluate(el=>el.remove());
    const {data: rgb, info} = await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
    let count=0, left=info.width, top=info.height, right=0, bottom=0;
    const background=(5*info.width+5)*3;
    // Fractional CSS bounds can include a page-coloured border; sample the canvas interior.
    for(let y=1;y<info.height-1;y++) for(let x=1;x<info.width-1;x++) {
      const i=(y*info.width+x)*3;
      if(Math.abs(rgb[i]-rgb[background])+Math.abs(rgb[i+1]-rgb[background+1])+Math.abs(rgb[i+2]-rgb[background+2])>60) { count++; left=Math.min(left,x); right=Math.max(right,x); top=Math.min(top,y); bottom=Math.max(bottom,y); }
    }
    assert.ok(count>(model?info.width*info.height*0.03:150),'Canvas must contain actual rendered geometry');
    if(model) {
      const framed = left>4&&top>4&&right<info.width-5&&bottom<info.height-5;
      if (!framed) {
        const path = join(tmpdir(),'planetary-framing-failure.png');
        await writeFile(path,buffer);
        console.log(`Framing diagnostic: ${path}`);
      }
      assert.ok(framed,`Model must fit without clipping: ${left},${top},${right},${bottom} in ${info.width}x${info.height}`);
    }
    return rgb;
  }
  await pixels(root);
  await root.locator('[data-scope]').selectOption('solar');
  await root.locator('[data-angle]').selectOption('tilt');
  await pixels(root);
  await root.locator('[data-scope]').selectOption('inner');
  await root.locator('[data-material="ryugu"]').click();
  await root.locator('[data-view="shape"]').click();
  await page.waitForFunction(() => document.querySelector('[data-planetary-explorer]')?.dataset.modelReady === 'ryugu');
  assert.ok(await root.locator('[data-summary]').innerText().then(s => s.includes('Ryugu')));
  const before = await pixels(root,true);
  await root.locator('[data-stage]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  const after = await pixels(root,true);
  assert.notDeepEqual(before,after,'Keyboard camera rotation must change model pixels');
  const box = await root.locator('canvas').boundingBox();
  await page.mouse.move(box.x+box.width*0.4,box.y+box.height*0.4);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*0.6,box.y+box.height*0.5,{steps:8});
  await page.mouse.up();
  assert.notDeepEqual(after,await pixels(root,true),'Pointer drag must rotate the mesh');
  await root.locator('[data-action="reset"]').click();
  await root.locator('[data-object="equator"]').click();
  assert.match(await root.locator('[data-description]').innerText(), /equatorial profile/);
  await root.locator('[data-action="compare"]').click();
  await page.waitForFunction(() => document.querySelector('[data-planetary-explorer]')?.dataset.modelReady === 'compare');
  await pixels(root,true);
  await root.locator('canvas').evaluate(canvas=>{
    window.__lostContext = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
    window.__lostContext.loseContext();
  });
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='error');
  assert.ok(await root.locator('[data-fallback]').isVisible());
  await page.evaluate(()=>window.__lostContext.restoreContext());
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  await pixels(root,true);
  await root.locator('[data-action="wireframe"]').click();
  assert.equal(await root.locator('[data-action="wireframe"]').getAttribute('aria-pressed'), 'true');
  await root.locator('[data-action="reset"]').click();
  await root.locator('[data-material="orgueil"]').click();
  assert.equal(await root.locator('[data-ci-figure]').isVisible(), true);
  assert.equal(await root.locator('canvas').isVisible(), false);
  await root.locator('[data-view="orbit"]').click();
  assert.match(await root.locator('[data-summary]').innerText(), /unknown|not established/i);
  await root.locator('[data-object="earth"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await root.locator('[data-object-title]').innerText(),'Earth');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.object),'earth');
  assert.match(await root.locator('[data-boundary]').innerText(),/Orgueil has no established/);
  await root.locator('[data-material="bennu"]').click();
  await root.locator('[data-object="earth"]').click();
  await root.locator('[data-material="bennu"]').click();
  assert.equal(await root.locator('[data-object-title]').innerText(),'Bennu','Material selection must restore inspection after inspecting a planet');
  await root.locator('[data-view="minerals"]').click();
  assert.ok(await root.locator('[data-mineral-diagram]').isVisible());
  for (const theme of ['space','light']) {
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    let previous;
    for (const id of ['carbonate','matrix','sulfide']) {
      await root.locator(`[data-mineral="${id}"]`).click();
      await page.waitForFunction(id=>document.querySelector('.planetary').dataset.modelReady===id,id);
      const solid = await pixels(root,true);
      if (previous) assert.notDeepEqual(solid,previous,'Mineral choice must change rendered shape');
      await root.locator('[data-mineral-detail]').check();
      const separated = await pixels(root,true);
      assert.notDeepEqual(solid,separated,'Separate mode must change the geometry');
      await root.locator('[data-mineral-detail]').uncheck();
      await root.locator('[data-stage]').focus();
      await page.keyboard.press('ArrowLeft');
      assert.notDeepEqual(solid,await pixels(root,true),'Mineral geometry must rotate');
      previous=solid;
    }
  }
  await root.locator('[data-material="bennu"]').click();
  assert.equal(await root.locator('[data-material="bennu"]').getAttribute('aria-pressed'), 'true');
  await page.locator('.nav a[href="contact.html"]').click();
  await page.waitForURL('**/contact.html');
  assert.equal(await page.locator('[data-planetary-explorer] canvas').count(), 0);
  await page.locator('.nav a[href="research.html"]').click();
  await page.waitForURL('**/research.html');
  await root.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-planetary-explorer]')?.dataset.renderState === 'ready');
  assert.equal(await root.locator('canvas').count(), 1);
  await page.evaluate(() => window.scrollTo(0,document.body.scrollHeight));
  await page.waitForTimeout(250);
  const draws = await page.evaluate(() => window.__sceneDraws);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__sceneDraws),draws,'Offscreen rendering must stop');
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await mobile.goto(`${base}/research.html`, { waitUntil: 'networkidle' });
  await mobile.addStyleTag({content:'astro-dev-toolbar { display:none !important; }'});
  const mr = mobile.locator('[data-planetary-explorer]');
  await mr.scrollIntoViewIfNeeded();
  await mr.locator('[data-material="ryugu"]').click();
  await mr.locator('[data-view="shape"]').click();
  await mobile.waitForFunction(() => document.querySelector('.planetary').dataset.modelReady==='ryugu');
  await pixels(mr,true);
  assert.equal(await mr.locator('canvas').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
  await mr.locator('[data-action="interact"]').click();
  assert.equal(await mr.locator('canvas').evaluate(el=>getComputedStyle(el).touchAction),'none');
  assert.equal(await mr.locator('[data-stage]').evaluate(el=>getComputedStyle(el).touchAction),'none');
  await mr.locator('canvas').scrollIntoViewIfNeeded();
  const mb = await mr.locator('canvas').boundingBox();
  const cdp = await mobile.context().newCDPSession(mobile);
  const fingers = distance => [{x:mb.x+mb.width/2-distance,y:mb.y+mb.height/2,id:1},{x:mb.x+mb.width/2+distance,y:mb.y+mb.height/2,id:2}];
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:fingers(30)});
  for (const distance of [40,50,60,70]) {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:fingers(distance)});
    await mobile.waitForTimeout(50);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.waitForTimeout(100);
  assert.ok(Number(await mr.getAttribute('data-zoom'))>1.2,'Two-finger spread must zoom the camera');
  await mr.locator('[data-action="reset"]').click();
  await cdp.detach();
  await mobile.keyboard.press('Escape');
  assert.equal(await mr.locator('canvas').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
  assert.equal(await mr.locator('[data-stage]').evaluate(el=>getComputedStyle(el).touchAction),'pan-y');
  for (const theme of ['space', 'light']) {
    await mobile.evaluate(t => document.documentElement.dataset.theme = t, theme);
    for (const width of [320,390,760]) {
      await mobile.setViewportSize({ width, height: 844 });
      for (const view of ['orbit','shape','minerals']) {
        await mr.locator(`[data-view="${view}"]`).click();
        assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme}/${width}/${view} overflow`);
        if (view === 'minerals') {
          for (const id of ['carbonate','matrix','sulfide']) {
            await mr.locator(`[data-mineral="${id}"]`).click();
            await pixels(mr,true);
          }
        }
      }
    }
  }
  await mobile.setViewportSize({width:320,height:844});
  await mr.locator('[data-view="shape"]').click();
  await mr.locator('[data-action="compare"]').click();
  await mobile.waitForFunction(() => document.querySelector('.planetary').dataset.modelReady==='compare');
  await pixels(mr,true);
  const failed = await browser.newPage();
  await failed.route('**/assets/data/planetary/orbits.json',route=>route.abort());
  await failed.goto(`${base}/research.html`,{waitUntil:'networkidle'});
  await failed.locator('.planetary-stage').scrollIntoViewIfNeeded();
  await failed.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='error');
  assert.ok(await failed.locator('[data-fallback]').isVisible());
  await failed.locator('.planetary [data-material="ryugu"]').click();
  assert.match(await failed.locator('[data-fallback]').getAttribute('src'),/ryugu-jaxa/);
  await failed.locator('.planetary [data-view="minerals"]').click();
  assert.ok(await failed.locator('[data-mineral-diagram]').isVisible());
  await failed.unroute('**/assets/data/planetary/orbits.json');
  await failed.locator('[data-retry]').click();
  await failed.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  await pixels(failed.locator('.planetary'),true);
  assert.equal(await failed.locator('[data-retry]').isVisible(),false);
  await failed.route('**/assets/data/planetary/bennu.glb',route=>route.abort());
  await failed.locator('.planetary [data-material="bennu"]').click();
  await failed.locator('.planetary [data-view="shape"]').click();
  await failed.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='error');
  await failed.unroute('**/assets/data/planetary/bennu.glb');
  await failed.locator('[data-retry]').click();
  await failed.waitForFunction(()=>document.querySelector('.planetary').dataset.modelReady==='bennu'&&document.querySelector('.planetary').dataset.renderState==='ready');
  await pixels(failed.locator('.planetary'),true);
  assert.deepEqual(errors, []);
  console.log('Planetary explorer passed: sourced scene, model loading, compare/wireframe, CI boundary, material sync, soft navigation, mobile and both themes.');
} finally { await browser.close(); }
