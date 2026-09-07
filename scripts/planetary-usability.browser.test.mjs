import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.EDGE_EXECUTABLE?{executablePath:process.env.EDGE_EXECUTABLE}:{})});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:4322';
let failures=0;
async function check(name,fn,options={}) {
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',...options});
  try {
    await page.goto(`${base}/research.html`,{waitUntil:'networkidle'});
    const root=page.locator('.planetary');
    await root.locator('[data-stage]').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
    await fn(page,root);console.log(`PASS ${name}`);
  } catch(error) {failures++;console.error(`FAIL ${name}: ${error.message}`);}
  finally {await page.close();}
}
const settled=page=>page.waitForFunction(()=>!document.querySelector('.planetary').dataset.transitioning);
try {
  await check('Material-specific tour names and explicit next destination',async(page,root)=>{
    await root.locator('[data-material="bennu"]').click();
    assert.match(await root.locator('[data-action="journey-start"]').innerText(),/From asteroid to minerals/);
    await root.locator('[data-action="journey-start"]').click();await settled(page);
    assert.match(await root.locator('[data-action="journey-next"]').getAttribute('aria-label'),/Next:.*shape/i);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'journey-next','Keyboard focus follows the opened tour');
    await root.locator('[data-material="orgueil"]').click();
    assert.match(await root.locator('[data-action="journey-start"]').innerText(),/From specimen to minerals/);
  });
  await check('Camera inspection and mineral options retain the current tour',async(page,root)=>{
    await root.locator('[data-material="bennu"]').click();
    await root.locator('[data-action="journey-start"]').click();await settled(page);
    await root.locator('[data-action="zoom-in"]').click();
    assert.equal(await root.getAttribute('data-journey'),'active');
    await root.locator('[data-stage]').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await root.getAttribute('data-journey'),'active');
    for(let i=0;i<3;i++){await root.locator('[data-action="journey-next"]').click();await settled(page);}
    await root.locator('[data-mineral="matrix"]').click();
    await root.locator('[data-mineral-detail]').check();
    assert.equal(await root.getAttribute('data-journey'),'active');
    assert.match(await root.locator('[data-journey-status]').innerText(),/4 \/ 4/);
    await root.locator('[data-action="journey-prev"]').click();await settled(page);
    assert.equal(await root.getAttribute('data-mode'),'sample');
    await root.locator('[data-action="journey-end"]').click();
    assert.equal(await root.getAttribute('data-journey'),'off');
  });
  await check('Selecting the active material is a no-op',async(page,root)=>{
    await root.locator('[data-material="ryugu"]').click();
    await root.locator('[data-action="journey-start"]').click();await settled(page);
    await root.locator('[data-material="ryugu"]').click();
    assert.equal(await root.getAttribute('data-journey'),'active');
    await root.locator('[data-view="orbit"]').click();
    assert.equal(await root.getAttribute('data-journey'),'active');
    await root.locator('[data-action="zoom-in"]').click();
    const before=await root.getAttribute('data-zoom');
    await root.locator('[data-material="ryugu"]').click();
    assert.equal(await root.getAttribute('data-zoom'),before);
  });
  await check('Touch mode announces its actual action and resets across views',async(page,root)=>{
    const toggle=root.locator('[data-action="interact"]');
    await toggle.click();assert.match(await toggle.getAttribute('aria-label'),/page scrolling/i);
    await root.locator('[data-view="sample"]').click();
    await root.locator('[data-view="orbit"]').click();
    assert.equal(await toggle.getAttribute('aria-pressed'),'false');
    assert.equal(await root.locator('[data-stage]').getAttribute('data-touch-active'),null);
  },{viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await check('Clock state accurately describes normal-speed historical playback',async(page,root)=>{
    await root.locator('[data-speed]').selectOption('1');
    await root.locator('[data-action="play"]').click();
    assert.doesNotMatch(await root.locator('[data-clock-status]').innerText(),/Accelerated/);
  });
  await check('Late clipboard denial never reopens a stale observation',async(page,root)=>{
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise((_,reject)=>{window.rejectCopy=reject;})}}));
    await root.locator('[data-action="share"]').click();
    await root.locator('[data-material="ryugu"]').click();
    await page.evaluate(()=>window.rejectCopy(new Error('Denied')));
    await page.waitForTimeout(60);
    assert.equal(await root.locator('[data-share-link]').isVisible(),false);
    assert.equal(await root.locator('[data-share-status]').innerText(),'');
  });
  await check('Manual camera control cancels motion but keeps the guide usable',async(page,root)=>{
    await root.locator('[data-material="bennu"]').click();
    await root.locator('[data-action="journey-start"]').click();await settled(page);
    await root.locator('[data-stage]').scrollIntoViewIfNeeded();await page.waitForTimeout(100);
    await page.evaluate(()=>{
      window.__madsPowerState={lowPower:false};
      window.dispatchEvent(new CustomEvent('mads:fx-state',{detail:{enabled:true}}));
      document.querySelector('[data-action="journey-next"]').click();
    });
    assert.equal(await root.locator('[data-action="journey-next"]').isDisabled(),true);
    await root.locator('[data-stage]').focus();await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(650);
    assert.equal(await root.getAttribute('data-journey'),'active');
    assert.equal(await root.getAttribute('data-mode'),'orbit');
    assert.equal(await root.locator('[data-action="journey-next"]').isDisabled(),false);
    await page.keyboard.press('Escape');
    assert.equal(await root.getAttribute('data-journey'),'off');
  },{reducedMotion:'no-preference'});
  await check('Long tour labels and progress fit compact screens in both themes',async(page,root)=>{
    await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
    for(const width of [320,390,760,1440]) {
      await page.setViewportSize({width,height:900});
      for(const theme of ['space','light']) {
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        for(const material of ['orgueil','bennu']) {
          await root.locator(`[data-material="${material}"]`).click();
          const label=root.locator('[data-journey-label]');
          assert.equal(await label.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,`${width}/${theme}/${material} label`);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
          if((width===390||width===1440)&&material==='bennu') {
            await root.locator('.planetary-toolbar').scrollIntoViewIfNeeded();
            await page.screenshot({path:`.codex_tmp/usability-${width}-${theme}.png`});
          }
        }
        await root.locator('[data-action="journey-start"]').click();await settled(page);
        const status=root.locator('[data-journey-status]');
        assert.equal(await status.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
        await root.locator('[data-action="journey-end"]').click();
      }
    }
  });
} finally {await browser.close();}
if(failures)process.exitCode=1;
