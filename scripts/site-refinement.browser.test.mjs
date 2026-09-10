import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});const base=process.env.SITE_TEST_URL||'http://127.0.0.1:52523';
try{const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await page.addInitScript(()=>sessionStorage.setItem('mads-cosmic-arrival-v1','done'));
await page.goto(base+'/index.html',{waitUntil:'networkidle'});
assert.equal(await page.locator('.research-coordinates').isVisible(),false,'decorative metadata must not cover page content');
assert.equal(await page.locator('.obs-fx-dock > button:visible').count(),1,'one compact global display entry');
await page.locator('.obs-fx-settings').click();assert(await page.locator('.obs-fx-panel .ambient-fx-toggle').isVisible());
assert(await page.locator('.obs-fx-panel .research-coordinates').isVisible());await page.keyboard.press('Escape');assert(await page.locator('.obs-fx-panel').isHidden());
assert.match(await page.locator('.current-focus-section h2').innerText(),/^Dolomite in Orgueil CI1$/);
assert.match(await page.locator('.research-title-detail').innerText(),/Full research title/);
await page.locator('.research-title-detail summary').click();assert.match(await page.locator('.research-title-detail p').innerText(),/Cosmomineralogical Study/);
await page.goto(base+'/research.html',{waitUntil:'networkidle'});
await page.evaluate(()=>window.researchMain=document.querySelector('main'));
const links=page.locator('.page-outline a');assert.equal(await links.count(),5);
for(const link of await links.all()){const href=await link.getAttribute('href');assert.equal(await page.locator(href).count(),1);await link.click();await page.waitForTimeout(120);assert((await page.locator(href).boundingBox()).y<800);}
assert(await page.evaluate(()=>window.researchMain===document.querySelector('main')),'section anchors must not rebuild Research');
await page.goto(base+'/research-log.html',{waitUntil:'networkidle'});assert.doesNotMatch(await page.locator('main').innerText(),/Mission Log 010/);
const footer=await page.locator('.site-footer').boundingBox();assert(footer.y+footer.height>=999,'short pages place the footer at the viewport end');
for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('.research-coordinates').isVisible(),false);}
console.log('PASS unobstructed reading, display settings, Home hierarchy, Research section paths and stable archive overview');
}finally{await browser.close();}
