// Home portrait and polarisation emblem (spec §4.1, §6.3). The portrait is a 4:5 Figure with square corners and no
// shadow or second frame. The source photograph is square, so the 4:5 frame (WP1's ratio figure, object-fit: cover)
// trims only its sides, never its top or bottom; the owner's own photograph may be framed that way (concept §3.5),
// where letterboxing would leave bands of plate ground above and below it. The emblem stays a real button with
// data-polarisation, a 44 px target, no filter or shadow at rest or hovered, and a solid focus outline.
// Widths 1440, 768, 390 and 320 px in both themes; no sideways scroll.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const failures=[];
try{
  for(const width of [1440,768,390,320])for(const theme of ['space','light']){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<760,isMobile:width<760,reducedMotion:'reduce'});
    const page=await context.newPage();
    await page.addInitScript(theme=>{sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',theme);},theme);
    await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:4322')+'/index.html');await page.evaluate(()=>document.fonts.ready);
    try{
      const figure=page.locator('figure.figure.home-portrait');
      assert.equal(await figure.count(),1,'the portrait is one Figure');
      const photo=figure.locator('img');await photo.evaluate(img=>img.decode());
      const frame=await figure.evaluate(el=>{
        const media=el.querySelector('.figure__media'),img=el.querySelector('img'),box=media.getBoundingClientRect(),s=getComputedStyle(media),i=getComputedStyle(img);
        return {ratio:box.width/box.height,radius:[getComputedStyle(el).borderRadius,s.borderRadius,i.borderRadius],shadow:[s.boxShadow,i.boxShadow],fit:i.objectFit,natural:img.naturalWidth/img.naturalHeight,imgHeight:img.getBoundingClientRect().height,boxHeight:media.clientHeight};
      });
      assert.ok(Math.abs(frame.ratio-.8)<.01,`4:5 frame, found ${frame.ratio.toFixed(3)}`);
      assert.deepEqual(frame.radius,['0px','0px','0px'],'square corners');
      assert.deepEqual(frame.shadow,['none','none'],'no shadow or spread ring');
      assert.equal(frame.fit,'cover');
      assert.ok(frame.natural>=frame.ratio&&Math.abs(frame.imgHeight-frame.boxHeight)<=1,'the frame trims only the sides of the photograph');
      const logo=page.locator('main .affiliation-emblem');
      await logo.locator('img').evaluate(img=>img.decode());
      assert.equal(await logo.evaluate(el=>el.tagName),'BUTTON');
      assert.equal(await logo.getAttribute('data-polarisation'),'');
      const target=await logo.boundingBox();assert.ok(target.width>=44&&target.height>=44,'44 px target');
      for(const hover of [false,true]){
        if(hover)await logo.hover();
        assert.equal(await logo.evaluate(el=>getComputedStyle(el).filter),'none');
        assert.equal(await logo.evaluate(el=>getComputedStyle(el).boxShadow),'none');
      }
      await page.keyboard.press('Tab');await logo.focus();
      assert.equal(await logo.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
      await logo.evaluate(el=>el.blur());await page.mouse.move(1,1);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll');
      console.log(`PASS portrait framing ${width}px ${theme}`);
    }catch(e){failures.push(`${width}px ${theme}: ${e.message}`);console.error(failures.at(-1));}
    await context.close();
  }
  assert.deepEqual(failures,[]);
}finally{await browser.close();}
