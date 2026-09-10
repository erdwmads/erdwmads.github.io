import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {encodeObservation} from '../src/scripts/planetary-view-link.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
let release=()=>{};
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  // Orbit view now preloads both asteroid meshes; block the first request.
  const hold=new Promise(resolve=>release=resolve);
  await page.route('**/bennu.glb',async route=>{await hold;await route.continue();});
  await page.goto(encodeObservation({material:'bennu',view:'shape'},`${base}/research.html`),{waitUntil:'domcontentloaded'});
  const root=page.locator('.planetary');
  await root.locator('[data-stage]').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.modelReady==='loading');
  await root.locator('[data-action="zoom-in"]').click();
  await root.locator('[data-action="wireframe"]').click();
  assert.equal(await root.locator('[data-share]').isDisabled(),true,'Never combine a loading view with an old camera');
  release();
  await page.waitForFunction(()=>document.querySelector('.planetary').dataset.modelReady==='bennu');
  assert.equal(await root.getAttribute('data-zoom'),'1.0000','Superseded model loads still reset from the last committed view');
  await page.waitForFunction(()=>!document.querySelector('[data-share]').disabled);
  await page.close();

  const slow=await browser.newPage();
  const holdData=new Promise(resolve=>release=resolve);
  await slow.route('**/orbits.json',async route=>{await holdData;await route.continue();});
  await slow.goto(encodeObservation({material:'ryugu',view:'shape',day:614},`${base}/research.html`),{waitUntil:'domcontentloaded'});
  await slow.waitForFunction(()=>document.querySelector('.planetary')?.dataset.initialized==='true');
  await slow.evaluate(()=>location.hash='planetary-title');
  await slow.waitForTimeout(60);
  release();
  await slow.locator('[data-stage]').scrollIntoViewIfNeeded();
  await slow.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
  assert.notEqual(await slow.locator('[data-share-status]').innerText(),'Saved observation restored');
  assert.equal(await slow.locator('.planetary').getAttribute('data-mode'),'orbit');
  await slow.route('**/ryugu-sample-jaxa.jpg',route=>route.abort());
  await slow.locator('.planetary [data-material="ryugu"]').click();
  await slow.locator('[data-view="sample"]').click();
  await slow.locator('[data-sample-error]').waitFor({state:'visible'});
  assert.equal(await slow.locator('[data-sample-image]').isVisible(),false);
  assert.match(await slow.locator('[data-source]').getAttribute('href'),/hayabusa2/);
  await slow.locator('.planetary [data-material="bennu"]').click();
  await slow.waitForFunction(()=>{const image=document.querySelector('[data-sample-image]');return image.complete&&image.naturalWidth>0;});
  assert.equal(await slow.locator('[data-sample-error]').isVisible(),false);
  await slow.close();

  const soft=await browser.newPage();
  await soft.goto(`${base}/index.html`,{waitUntil:'networkidle'});
  const share=encodeObservation({material:'ryugu',view:'sample',day:614},`${base}/research.html`);
  await soft.locator('.nav a[href="research.html"]').evaluate((link,href)=>link.href=href,share);
  await soft.locator('.nav a').filter({hasText:'Research'}).first().click();
  await soft.waitForFunction(()=>document.querySelector('[data-share-status]')?.textContent==='Saved observation restored');
  assert.equal(await soft.locator('.planetary').getAttribute('data-mode'),'sample');
  assert.equal(await soft.locator('.planetary').getAttribute('data-active-material'),'ryugu');
  for(const action of ['theme','view']) {
    const loading=await browser.newPage({reducedMotion:'reduce'});
    const pending=new Promise(resolve=>release=resolve);
    await loading.route('**/bennu.glb',async route=>{await pending;await route.continue();});
    const url=encodeObservation({material:'bennu',view:'shape',camera:{position:[0,0,4],target:[0,0,0],up:[0,1,0],zoom:2}},`${base}/research.html`);
    await loading.goto(url,{waitUntil:'domcontentloaded'});
    await loading.waitForFunction(()=>document.querySelector('.planetary')?.dataset.modelReady==='loading');
    if(action==='theme')await loading.evaluate(()=>document.documentElement.dataset.theme='light');
    else await loading.locator('[data-view="sample"]').click();
    release();
    if(action==='theme') {
      await loading.waitForFunction(()=>document.querySelector('[data-share-status]').textContent==='Saved observation restored');
      assert.equal(await loading.locator('.planetary').getAttribute('data-zoom'),'2.0000');
    } else {
      assert.equal(await loading.locator('.planetary').getAttribute('data-mode'),'sample');
    }
    await loading.waitForFunction(()=>!document.querySelector('[data-share]').disabled);
    await loading.close();
  }
  await soft.evaluate(()=>location.hash='observe=1&material=orgueil&view=minerals&mineral=sulfide');
  await soft.waitForFunction(()=>document.querySelector('.planetary').dataset.focus==='sulfide');
  await soft.goBack();
  await soft.waitForFunction(()=>document.querySelector('.planetary').dataset.mode==='sample');
  assert.equal(await soft.locator('.planetary').getAttribute('data-active-material'),'ryugu');
  console.log('Restoration races: canceled hash, consistent sharing and overlapping model camera reset passed.');
} finally {release();await browser.close();}
