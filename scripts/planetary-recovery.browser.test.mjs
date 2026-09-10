import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {decodeObservation,encodeObservation} from '../src/scripts/planetary-view-link.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
try {
  for(const failure of ['orbital-data','webgl']) {
    const page=await browser.newPage({reducedMotion:'reduce'});
    await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Use selectable link');}}}));
    if(failure==='orbital-data')await page.route('**/assets/data/planetary/*.json',route=>route.abort());
    else await page.addInitScript(()=>{
      const getContext=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:getContext.call(this,type,...args);};
    });
    await page.goto(encodeObservation({view:'sample',material:'ryugu',day:614},`${base}/research.html`),{waitUntil:'domcontentloaded'});
    const root=page.locator('.planetary');
    await page.waitForFunction(()=>document.querySelector('.planetary')?.dataset.mode==='sample');
    await root.locator('[data-sample-image]').waitFor({state:'visible'});
    assert.equal(await root.getAttribute('data-active-material'),'ryugu');
    await page.waitForFunction(()=>!document.querySelector('.planetary [data-share]').disabled);
    await root.locator('[data-share]').click();
    const saved=decodeObservation(new URL(await root.locator('[data-share-link]').inputValue()).hash);
    assert.equal(saved.view,'sample');assert.equal(saved.material,'ryugu');assert.equal(saved.day,614);
    assert.equal(await root.locator('canvas').count(),0,'Photographs require no renderer');
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('Use selectable link');}}});
    window.__planetaryRendererSignals=[];
    const add=EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener=function(type,listener,options){
      if(type==='wheel'&&this.matches?.('[data-stage]')&&options?.capture&&options.signal)window.__planetaryRendererSignals.push(options.signal);
      return add.call(this,type,listener,options);
    };
  });
  const initial={view:'orbit',material:'bennu',day:614,angle:'tilt',camera:{position:[0,-7,12],target:[0,0,0],up:[0,1,0],zoom:2}};
  await page.goto(encodeObservation(initial,`${base}/research.html`),{waitUntil:'domcontentloaded'});
  const root=page.locator('.planetary');
  const ready=()=>page.waitForFunction(()=>document.querySelector('.planetary')?.dataset.renderState==='ready'&&!document.querySelector('.planetary [data-share]').disabled);
  await root.locator('[data-stage]').scrollIntoViewIfNeeded();await ready();
  async function observation(){await ready();await root.locator('[data-share]').click();return decodeObservation(new URL(await root.locator('[data-share-link]').inputValue()).hash);}
  const before=await observation();
  for(const material of ['ryugu','bennu']) {
    await root.locator(`[data-material="${material}"]`).click();
    const selected=await observation();assert.deepEqual(selected.camera,before.camera,'Asteroid inspection preserves orbital viewpoint');
  }
  for(let attempt=0;attempt<2;attempt++) {
    await root.locator('canvas').evaluate(canvas=>{window.__oldPlanetaryCanvas=canvas;canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();});
    await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='error');
    await root.locator('[data-retry]').click();await ready();
    assert.equal(await root.locator('canvas').count(),1);
    assert.equal(await root.locator('canvas').evaluate(canvas=>canvas!==window.__oldPlanetaryCanvas),true);
    const restored=await observation();assert.deepEqual(restored.camera,before.camera);assert.equal(restored.day,before.day);
    assert.equal(restored.view,before.view);assert.equal(restored.material,'bennu');
    assert.equal(await page.evaluate(()=>window.__planetaryRendererSignals.slice(0,-1).every(signal=>signal.aborted)),true,'Disposed renderer listeners must be aborted');
  }
  await page.close();
  console.log('Planetary recovery: photographs without WebGL/data, sharing, selection viewpoint, repeated retry and renderer lifetime passed.');
} finally {await browser.close();}
