import assert from 'node:assert/strict';import {createRequire} from 'node:module';import os from 'node:os';import path from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.goto(base+'/paper-shelf.html?q=Endress');await page.waitForFunction(()=>Boolean(window.__madsPaperShelfCleanup));
 assert.equal(await page.locator('[data-paper-card]:visible').count(),1);
 await page.locator('[data-paper-copy]:visible').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('[data-paper-copy-status]')].some(e=>e.textContent));
 await page.locator('.nav a[href="cv.html"]').click();await page.waitForURL('**/cv.html');
 await page.goBack();await page.waitForURL('**/paper-shelf.html?q=Endress');await page.waitForFunction(()=>Boolean(window.__madsPaperShelfCleanup));
 assert.equal(await page.locator('[data-paper-search]').inputValue(),'Endress');assert.equal(await page.locator('[data-paper-card]:visible').count(),1);
 await page.goto(base+'/cv.html');await page.locator('[data-print-cv]').waitFor({state:'visible'});await page.emulateMedia({media:'print'});
 assert.ok(await page.locator('.cv-print-identity').isVisible());
 assert.match(await page.locator('.cv-print-identity').innerText(),/rivieraliuyong@fuji\.waseda\.jp/);
 assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
 assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).colorScheme),'light');
 assert.equal(await page.locator('h1').evaluate(e=>getComputedStyle(e).textShadow),'none');assert.ok(await page.locator('.site-header').isHidden());assert.ok(await page.locator('.cv-print-action').isHidden());
 assert.ok(await page.locator('.cv-photo img').isVisible());await page.pdf({path:path.join(os.tmpdir(),'reviewed-cv.pdf'),format:'A4',printBackground:true});
 await page.emulateMedia({media:'screen'});await page.goto(base+'/contact.html');
 assert.equal(await page.locator('[data-email-compose]').getAttribute('href'),'mailto:rivieraliuyong@fuji.waseda.jp');
 const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await nojs.goto(base+'/contact.html');
 // Without JavaScript only the [at] form is published; the actions that need the real address stay hidden.
 assert.equal(await nojs.locator('[data-email-actions]').isVisible(),false);
 assert.ok(!(await nojs.content()).includes('rivieraliuyong@'),'static contact HTML must not carry the plain address');
 await nojs.goto(base+'/photography.html');assert.equal(await nojs.locator('[data-present-photos]').isVisible(),false);assert.equal(await nojs.locator('a[data-photo-index]').count(),21); // Existing anchors retain native originals.
 console.log('Paper restoration, script-assembled email and printable CV verified; PDF: '+path.join(os.tmpdir(),'reviewed-cv.pdf'));
}finally{await browser.close();}
