import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/assets/data/missions/**',async route=>{await gate;await route.continue();});
 await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/ryugu-bennu.html#mission-view=1&mission=hayabusa2&chapter=flyby&progress=0.5&focus=both&reference=earth&context=earth&cutaway=0',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('[data-sample-missions]')?.dataset.initialized);
 assert.equal(await page.locator('[data-mission-range]').textContent(),'Preparing trajectory…');
 release();await page.waitForFunction(()=>window.sampleMissions?.state.ready,null,{timeout:60000});
 assert.match(await page.locator('[data-mission-range]').textContent(),/km from Earth centre/);
 console.log('Pending trajectory is labeled as loading, then replaced by the measured range.');
} finally {await browser.close();}
