import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.EDGE_EXECUTABLE});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await page.goto((process.env.SITE_TEST_URL||'http://127.0.0.1:52523')+'/research.html',{waitUntil:'networkidle'});
const stage=page.locator('.planetary [data-stage]');await stage.scrollIntoViewIfNeeded();
await page.waitForFunction(()=>document.querySelector('.planetary').dataset.renderState==='ready');
const result=await stage.evaluate(el=>{const e=new WheelEvent('wheel',{deltaY:120,bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented;});
assert.equal(result,false,'ordinary wheel must scroll the page, not zoom the orbital model');
const before=await page.evaluate(()=>scrollY),box=await stage.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,250);await page.waitForTimeout(200);assert(await page.evaluate(()=>scrollY)>before+100);
console.log('PASS orbital viewer preserves page scrolling');
}finally{await browser.close();}
