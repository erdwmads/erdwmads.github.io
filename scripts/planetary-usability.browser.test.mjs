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
try {
  await check('Direct tabs replace the guided tour for every material',async(page,root)=>{
    assert.equal(await root.locator('[data-action^="journey-"]').count(),0);
    for(const material of ['bennu','ryugu','orgueil']) {
      await root.locator('[data-material="'+material+'"]').click();
      for(const view of ['orbit','shape','sample','minerals']) {
        await root.locator('[data-view="'+view+'"]').click();
        assert.equal(await root.getAttribute('data-mode'),view);
        assert.equal(await root.locator('[data-view="'+view+'"]').getAttribute('aria-selected'),'true');
      }
    }
    await root.locator('[data-view="sample"]').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await root.getAttribute('data-mode'),'minerals');
    await root.locator('[data-mineral="matrix"]').click();await root.locator('[data-mineral-detail]').check();
    assert.equal(await root.getAttribute('data-focus'),'matrix');
  });
  await check('Selecting the active material is a no-op',async(page,root)=>{
    await root.locator('[data-material="ryugu"]').click();
    await root.locator('[data-material="ryugu"]').click();
    await root.locator('[data-view="orbit"]').click();
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
  await check('Direct controls fit compact screens in both themes',async(page,root)=>{
    await page.addStyleTag({content:'astro-dev-toolbar{display:none!important}'});
    for(const width of [320,390,760,1440]) {
      await page.setViewportSize({width,height:900});
      for(const theme of ['space','light']) {
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        for(const material of ['orgueil','bennu']) {
          await root.locator(`[data-material="${material}"]`).click();
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
          if((width===390||width===1440)&&material==='bennu') {
            await root.locator('.planetary-toolbar').scrollIntoViewIfNeeded();
            await page.screenshot({path:`.codex_tmp/usability-${width}-${theme}.png`});
          }
        }
      }
    }
  });
} finally {await browser.close();}
if(failures)process.exitCode=1;
