import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const failures=[];
try{
  for(const width of [1440,768,390,320])for(const theme of ['space','light']){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<760,isMobile:width<760,reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.addInitScript(theme=>{sessionStorage.setItem('mads-entry-gate-v1','done');localStorage.setItem('mads-theme',theme);},theme);
    await page.goto('http://127.0.0.1:4322/index.html');await page.evaluate(()=>document.fonts.ready);
    try{
      const card=page.locator('.hero-card');
      for(const selector of ['.hero-card','.affiliation-card']){
        const style=await page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return {overflow:s.overflow,radius:s.borderRadius};});
        assert.equal(style.overflow,'visible',`${selector} must not clip the portrait or logo`);
        assert.equal(style.radius,'0px',`${selector} must not leave a second rounded frame`);
      }
      const photo=card.locator('.avatar img');await photo.evaluate(img=>img.decode());
      assert.equal(await photo.evaluate(el=>getComputedStyle(el).objectFit),'contain');
      assert.equal(await card.locator('.avatar').evaluate(el=>getComputedStyle(el).boxShadow),'none','no spread ring around the portrait');
      const logo=card.locator('.affiliation-emblem');
      await logo.locator('img').evaluate(img=>img.decode());
      for(const hover of [false,true]){
        if(hover)await logo.hover();
        assert.equal(await logo.evaluate(el=>getComputedStyle(el).filter),'none');
        assert.equal(await logo.evaluate(el=>getComputedStyle(el).boxShadow),'none');
      }
      assert.equal(await logo.getAttribute('data-polarisation'),'');
      await page.keyboard.press('Tab');await logo.focus();
      assert.equal(await logo.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
      await logo.evaluate(el=>el.blur());await page.mouse.move(1,1);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await card.screenshot({path:`.codex_tmp/portrait-${width}-${theme}.png`});
      console.log(`PASS portrait framing ${width}px ${theme}`);
    }catch(e){failures.push(`${width}px ${theme}: ${e.message}`);console.error(failures.at(-1));}
    await context.close();
  }
  assert.deepEqual(failures,[]);
}finally{await browser.close();}
