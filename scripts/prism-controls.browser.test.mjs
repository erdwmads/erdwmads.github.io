import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const {chromium}=await import(pathToFileURL(`${process.env.PLAYWRIGHT_MODULE}/index.mjs`).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4322';
const failures=[];
try {
  for(const width of [1440,390,320]) for(const theme of ['space','light']) {
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<760,isMobile:width<760});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(theme=>{sessionStorage.setItem('mads-entry-gate-v1','done');sessionStorage.setItem('mads-cosmic-arrival-v1','done');localStorage.setItem('mads-theme',theme);},theme);
    await page.goto(`${base}/index.html`);await page.evaluate(()=>document.fonts.ready);
    const primary=page.locator('main .button:not(.secondary)').first();
    const secondary=page.locator('main .button.secondary').first();
    try {
      await primary.scrollIntoViewIfNeeded();await page.waitForTimeout(250);
      const resting=await primary.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundImage,shadow:s.boxShadow,arrow:getComputedStyle(el,'::after').content,color:s.color,transform:s.transform};});
      assert((await primary.evaluate(el=>getComputedStyle(el).fontFamily)).includes('Montserrat'),'controls use original Montserrat');
      assert.equal(await primary.evaluate(el=>getComputedStyle(el).fontWeight),'600');
      assert(await page.evaluate(()=>document.fonts.check('600 14px Montserrat')&&document.fonts.check('700 24px Montserrat')),'local fonts load');
      assert.notEqual(resting.background,await secondary.evaluate(el=>getComputedStyle(el).backgroundImage),'primary and secondary surfaces must be distinct');
      assert(resting.shadow.includes('3px'),'inner lip should be distinct from the outer border');
      const box=await primary.boundingBox();assert(box.height>=44);
      await primary.hover();await page.waitForTimeout(250);
      assert.deepEqual(await primary.boundingBox(),box,'hover must not move or resize controls');
      const hover=await primary.evaluate(el=>getComputedStyle(el).boxShadow);
      await page.mouse.down();await page.waitForTimeout(180);
      const pressed=await primary.evaluate(el=>getComputedStyle(el).boxShadow);
      assert.notEqual(pressed,hover,'pressed state must have a distinct contact shadow');
      assert.deepEqual(await primary.boundingBox(),box,'press must not move or resize controls');
      await page.mouse.move(1,999);await page.mouse.up();
      await page.keyboard.press('Tab');await primary.focus();assert.equal(await primary.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
      assert.equal(await primary.evaluate(el=>getComputedStyle(el,'::after').content),resting.arrow);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert(await primary.evaluate(el=>getComputedStyle(el).transitionDuration.split(',').every(n=>parseFloat(n)===0)),'reduced motion must disable material transitions');
      await page.emulateMedia({reducedMotion:'no-preference'});
      await primary.evaluate(el=>el.blur());await page.waitForTimeout(200);
      await primary.locator('..').screenshot({path:`.codex_tmp/prism-home-${width}-${theme}.png`});
      // Public stand-in controls exercise exactly the classes used by decrypted tools.
      await page.locator('main').evaluate(main=>{const section=document.createElement('section');section.id='prism-test-controls';section.style.cssText='display:flex;flex-wrap:wrap;gap:12px;padding:24px 0';section.innerHTML='<button class="button atlas-launch">Evidence atlas</button><button class="button secondary obs-present-launch">Present images</button><button class="button" disabled>Unavailable</button>';main.prepend(section);});
      const disabled=page.locator('#prism-test-controls button[disabled]');
      const atlas=page.locator('#prism-test-controls .atlas-launch');
      const face=await atlas.evaluate(el=>getComputedStyle(el).backgroundImage);
      await atlas.hover();await page.waitForTimeout(200);
      assert.equal(await atlas.evaluate(el=>getComputedStyle(el).backgroundImage),face,'tool hover must preserve its material');
      await page.locator('#prism-test-controls').evaluate(section=>{const button=document.createElement('button');button.className='paper-filter';button.setAttribute('aria-pressed','true');button.textContent='All';section.append(button);});
      const selected=page.locator('#prism-test-controls .paper-filter');
      const selectedBorder=await selected.evaluate(el=>getComputedStyle(el).borderColor);
      await selected.hover();await page.waitForTimeout(250);
      assert.equal(await selected.evaluate(el=>getComputedStyle(el).borderColor),selectedBorder,'selected filters retain their gold border on hover');
      assert(Number(await disabled.evaluate(el=>getComputedStyle(el).opacity))<.7,'disabled controls must look unavailable');
      assert.equal(await disabled.evaluate(el=>getComputedStyle(el).cursor),'not-allowed');
      await page.locator('#prism-test-controls').screenshot({path:`.codex_tmp/prism-tools-${width}-${theme}.png`});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px ${theme}: materials, press, dimensions, focus, arrows, disabled and reduced motion`);
    }catch(error){failures.push(`${width}px ${theme}: ${error.message}`);console.error(failures.at(-1));}
    finally{await context.close();}
  }
  assert.deepEqual(failures,[]);
}finally{await browser.close();}
