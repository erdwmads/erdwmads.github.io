import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import os from 'node:os';import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/index.html');await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('h1').innerText(),'Mads LIU Yong');assert.equal(await page.locator('.home-card-grid .card').count(),4);
 assert.equal(await page.locator('.hero-card .avatar img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
 await page.screenshot({path:path.join(os.tmpdir(),'folio100-home-desktop.png')});
for(const theme of ['space','light']) {
 await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
 for(const width of [320,390,641,700,760,1024,1440]) {
 await page.setViewportSize({width,height:1000});await page.waitForTimeout(60);
 const bounds=await page.locator('.hero h1').evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect(),h=e.getBoundingClientRect();return {textRight:r.right,boxRight:h.right,viewport:innerWidth};});
 assert.ok(bounds.textRight<=bounds.boxRight+1&&bounds.textRight<=bounds.viewport,theme+' '+width+' '+JSON.stringify(bounds));
 }}
await page.evaluate(()=>document.documentElement.dataset.theme='space');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(os.tmpdir(),'folio100-home-mobile.png')});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Home mobile overflow');
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/research.html#research-scale-title');
 const root=page.locator('[data-image-inspector]');await root.scrollIntoViewIfNeeded();await page.locator('[data-inspector-ready]').waitFor();
 assert.equal(await root.locator('img').count(),1);const original=await root.locator('img').getAttribute('src');
 const slider=page.locator('[data-inspector-zoom]');await slider.focus();await page.keyboard.press('End');
 assert.equal(await slider.inputValue(),'4');assert.equal(await page.locator('[data-inspector-output]').textContent(),'4.0×');
 await page.keyboard.press('Home');assert.equal(await slider.inputValue(),'1');
 await page.locator('[data-inspector-region="sem-detail"]').click();assert.equal(await slider.inputValue(),'2');
 const stage=page.locator('[data-inspector-stage]');await stage.focus();const before=await root.locator('img').getAttribute('style');await page.keyboard.press('ArrowLeft');assert.notEqual(await root.locator('img').getAttribute('style'),before);
 await page.keyboard.press('Home');assert.equal(await slider.inputValue(),'1');assert.equal(await page.locator('[data-inspector-region="all"]').getAttribute('aria-pressed'),'true');
 // Interrupt a captured drag; subsequent movement must not revive its old origin.
await page.locator('[data-inspector-region="optical"]').click();
await stage.scrollIntoViewIfNeeded();let box=await stage.boundingBox();
await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
assert.equal(await stage.getAttribute('data-dragging'),'');
await page.keyboard.press('Home');assert.equal(await stage.getAttribute('data-dragging'),null);
await page.keyboard.press('+');const resetStyle=await root.locator('img').getAttribute('style');
await page.mouse.move(box.x+box.width/2+45,box.y+box.height/2);assert.equal(await root.locator('img').getAttribute('style'),resetStyle);await page.mouse.up();
// Opt-in movement is available on mouse-primary hybrid devices too.
const move=page.locator('[data-inspector-touch]');assert.ok(await move.isVisible());await move.click();
await stage.scrollIntoViewIfNeeded();box=await stage.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
await page.keyboard.press('Escape');assert.equal(await stage.getAttribute('data-dragging'),null);assert.equal(await move.getAttribute('aria-pressed'),'false');await page.mouse.up();
await page.locator('[data-inspector-region="optical"]').click();await root.screenshot({path:path.join(os.tmpdir(),'folio100-inspector-desktop.png')});
 assert.equal(await root.locator('img').getAttribute('src'),original,'Inspector must keep the unchanged single source');
 await page.setViewportSize({width:390,height:844});await root.screenshot({path:path.join(os.tmpdir(),'folio100-inspector-mobile.png')});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Inspector mobile overflow');
 await page.goto(base+'/photography.html');await page.locator('[data-photo-layout-controls]').waitFor({state:'visible'});
 await page.evaluate(()=>window.originalPhotos=[...document.querySelectorAll('a[data-photo-index] img')]);
 const photos=await page.locator('a[data-photo-index]').count();await page.locator('[data-photo-layout="contact"]').click();
 assert.equal(await page.locator('a[data-photo-index]').count(),photos);assert.equal(await page.locator('.photo-index-label:visible').count(),photos);
 assert.ok(await page.evaluate(()=>window.originalPhotos.every((node,i)=>node===document.querySelectorAll('a[data-photo-index] img')[i])));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Contact sheet overflow');
 await page.screenshot({path:path.join(os.tmpdir(),'folio100-contact-sheet-mobile.png')});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(os.tmpdir(),'folio100-contact-sheet-desktop.png')});
 const selectedPhoto=page.locator('a[data-photo-index="1"]');const selectedAlt=await selectedPhoto.locator('img').getAttribute('alt');
await selectedPhoto.click();await page.waitForFunction(()=>document.querySelector('.obs-presentation-counter')?.textContent.includes('2 /'));
assert.ok((await page.locator('.obs-presentation-caption').textContent()).includes(selectedAlt));
await page.locator('.obs-present-close').click();await page.waitForFunction(()=>!document.querySelector('.obs-presentation')?.open);
await page.locator('.nav a[href="cv.html"]').click();await page.waitForURL('**/cv.html');await page.locator('.nav a[href="photography.html"]').click();await page.waitForURL('**/photography.html');
 await page.waitForFunction(()=>document.querySelector('[data-photo-experience]')?.dataset.photoLayout==='contact');
 await page.locator('[data-photo-layout="gallery"]').click();assert.equal(await page.locator('.photo-index-label:visible').count(),0);
 const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await nojs.goto(base+'/research.html');
 assert.equal(await nojs.locator('[data-inspector-controls]').isVisible(),false);assert.equal(await nojs.locator('[data-inspector-image]').count(),1);
 await nojs.goto(base+'/photography.html');assert.equal(await nojs.locator('[data-photo-layout-controls]').isVisible(),false);assert.equal(await nojs.locator('a[data-photo-index]').count(),photos);
 assert.deepEqual(errors,[]);console.log('Editorial identity, bounded image controls, keyboard isolation, same-image contact sheet, session restoration, no-JS fallback passed. Screenshots: TEMP/folio100-*.png');
}finally{await browser.close();}
